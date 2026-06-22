import json
import logging
import os
from datetime import timedelta
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status as http_status

from .models import WhatsAppInteraction
from .serializers import WhatsAppInteractionSerializer
from apps.patients.models import PatientProfile, Caretaker
from apps.doses.models import DoseLog
from services.ai_message_service import generate_ai_variables
from services.whatsapp_service import send_reminder, send_whatsapp_text_message
from services.escalation_service import trigger_caretaker_alert

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_interactions(request):
    """
    List WhatsApp interactions with pagination and filtering.
    - Admin: can see all interactions.
    - Caretaker: can see interactions for their assigned patients.
    - Patient: can see their own interactions.
    """
    try:
        user = request.user
        
        # Get base queryset based on role
        if user.role == 'admin':
            interactions = WhatsAppInteraction.objects.all()
        elif user.role == 'caretaker':
            try:
                patient_ids = user.caretaker_profile.patients.values_list('id', flat=True)
                interactions = WhatsAppInteraction.objects.filter(patient_id__in=patient_ids)
            except Caretaker.DoesNotExist:
                logger.warning(f"Caretaker profile not found for user {user.id}")
                interactions = WhatsAppInteraction.objects.none()
        else:
            # Patient role
            try:
                patient_profile = user.patient_profile
                interactions = WhatsAppInteraction.objects.filter(patient=patient_profile)
            except PatientProfile.DoesNotExist:
                logger.warning(f"Patient profile not found for user {user.id}")
                interactions = WhatsAppInteraction.objects.none()

        # Apply optional filtering
        status_filter = request.query_params.get('status')
        if status_filter and status_filter in dict(WhatsAppInteraction.STATUS_CHOICES):
            interactions = interactions.filter(status=status_filter)

        # Apply pagination
        limit = min(int(request.query_params.get('limit', 50)), 500)
        offset = int(request.query_params.get('offset', 0))
        
        # Order and slice
        interactions_ordered = interactions.order_by('-created_at')[offset:offset+limit]
        total_count = interactions.count()
        
        serializer = WhatsAppInteractionSerializer(interactions_ordered, many=True)
        return Response({
            'interactions': serializer.data,
            'total': total_count,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        logger.error(f"Error listing WhatsApp interactions: {e}", exc_info=True)
        return Response(
            {'error': 'Failed to fetch interactions'},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_manual_reminder(request):
    """
    Manually triggers a WhatsApp medication reminder.
    Validates patient access and creates/retrieves dose log for reminder.
    """
    try:
        patient_id = request.data.get('patient_id')
        if not patient_id:
            return Response(
                {'error': 'patient_id is required'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        # Validate patient access
        try:
            if request.user.role == 'admin':
                patient = PatientProfile.objects.get(id=patient_id)
            elif request.user.role == 'caretaker':
                patient = request.user.caretaker_profile.patients.get(id=patient_id)
            else:
                # Patient can only send reminders for themselves
                patient = request.user.patient_profile
                if int(patient.id) != int(patient_id):
                    return Response(
                        {'error': 'Unauthorized access to patient'},
                        status=http_status.HTTP_403_FORBIDDEN
                    )
        except (PatientProfile.DoesNotExist, Caretaker.DoesNotExist, ValueError):
            return Response(
                {'error': 'Patient not found or unauthorized'},
                status=http_status.HTTP_404_NOT_FOUND
            )

        # Find pending dose log
        dose_log = DoseLog.objects.filter(
            patient=patient,
            status='pending'
        ).order_by('-scheduled_date', '-scheduled_time').first()

        if not dose_log:
            return Response(
                {'error': 'No pending doses found for this patient'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        # Check if patient has WhatsApp number
        if not patient.user.whatsapp_number:
            return Response(
                {'error': 'Patient WhatsApp number not set in profile'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        try:
            # Generate AI variables and send reminder
            with transaction.atomic():
                variables = generate_ai_variables(patient, dose_log)
                success = send_reminder(dose_log, patient, variables)
                
                if success:
                    dose_log.reminder_sent = True
                    dose_log.save(update_fields=['reminder_sent'])
                    
                    logger.info(f"Manual reminder sent successfully for dose_log {dose_log.id}, patient {patient.id}")
                    return Response({
                        'success': True,
                        'message': 'Reminder triggered successfully!',
                        'dose_id': dose_log.id
                    })
                else:
                    logger.warning(f"Failed to send reminder via WhatsApp API for dose_log {dose_log.id}")
                    return Response({
                        'success': False,
                        'message': 'Failed to send reminder via WhatsApp API'
                    }, status=http_status.HTTP_400_BAD_REQUEST)
                    
        except Exception as e:
            logger.error(f"Error sending manual reminder: {e}", exc_info=True)
            return Response(
                {'error': f'Failed to send reminder: {str(e)}'},
                status=http_status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    except Exception as e:
        logger.error(f"Unexpected error in send_manual_reminder: {e}", exc_info=True)
        return Response(
            {'error': 'An unexpected error occurred'},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
def whatsapp_webhook(request):
    """
    Meta Webhook endpoint for WhatsApp message handling.
    GET: Webhook verification handshake with Meta.
    POST: Process incoming patient replies to medication reminders.
    
    Production-ready with comprehensive error handling and logging.
    """
    if request.method == 'GET':
        # Webhook Verification Handshake with Meta
        try:
            verify_token = os.environ.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'medimate_token')
            mode = request.GET.get('hub.mode', '').strip()
            token = request.GET.get('hub.verify_token', '').strip()
            challenge = request.GET.get('hub.challenge', '').strip()
            
            if not all([mode, token, challenge]):
                logger.warning("Webhook verification missing parameters")
                return HttpResponse("Missing parameters", status=400)
            
            if mode == 'subscribe' and token == verify_token:
                logger.info("WhatsApp webhook verified successfully")
                return HttpResponse(challenge)
            else:
                logger.warning(f"Webhook verification failed: token mismatch")
                return HttpResponse("Invalid token", status=403)
                
        except Exception as e:
            logger.error(f"Webhook verification error: {e}", exc_info=True)
            return HttpResponse("Verification failed", status=500)

    elif request.method == 'POST':
        # Process incoming WhatsApp messages
        try:
            # Parse JSON payload
            try:
                payload = json.loads(request.body.decode('utf-8'))
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                logger.error(f"Invalid JSON payload: {e}")
                return HttpResponse("Invalid JSON", status=400)
            
            # Extract message data safely
            entries = payload.get('entry', [])
            if not entries:
                return HttpResponse("OK", status=200)
            
            changes = entries[0].get('changes', [])
            if not changes:
                return HttpResponse("OK", status=200)
            
            value = changes[0].get('value', {})
            messages = value.get('messages', [])
            
            # Not a message event (e.g., status update)
            if not messages:
                return HttpResponse("OK", status=200)
            
            message_obj = messages[0]
            sender_phone = str(message_obj.get('from', '')).strip()
            
            msg_type = message_obj.get('type', 'text')
            user_response = ""
            
            if msg_type == 'button':
                button_obj = message_obj.get('button', {})
                user_response = button_obj.get('payload', button_obj.get('text', '')).strip()
            elif msg_type == 'interactive':
                interactive_obj = message_obj.get('interactive', {})
                if interactive_obj.get('type') == 'button_reply':
                    button_reply = interactive_obj.get('button_reply', {})
                    user_response = button_reply.get('id', button_reply.get('title', '')).strip()
            else:
                user_response = message_obj.get('text', {}).get('body', '').strip()
            
            user_response = user_response[:1000]
            
            if not sender_phone or not user_response:
                logger.warning("Webhook message missing sender_phone or user_response")
                return HttpResponse("OK", status=200)
            
            # Process the patient response
            with transaction.atomic():
                _process_patient_reply(sender_phone, user_response)
            
            return HttpResponse("OK", status=200)
            
        except Exception as e:
            logger.error(f"Webhook POST processing error: {e}", exc_info=True)
            # Always return 200 to prevent Meta retries on webhook errors
            return HttpResponse("OK", status=200)
            
    return HttpResponse("Method Not Allowed", status=405)


def _process_patient_reply(sender_phone, text_body):
    """
    Process patient reply to medication reminder.
    Handles: 1 (taken), 2 (remind later), 3 (skipped/escalate).
    
    Args:
        sender_phone: WhatsApp phone number
        text_body: User's reply text
    """
    try:
        # Extract numeric part of phone
        clean_phone = "".join(filter(str.isdigit, sender_phone))
        last_10 = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
        
        # Find patient by WhatsApp number
        patient = PatientProfile.objects.select_related('user').filter(
            user__whatsapp_number__endswith=last_10
        ).first()
        
        if not patient:
            logger.warning(f"Patient not found for phone: {sender_phone}")
            return
        
        # Find most recent pending interaction
        interaction = WhatsAppInteraction.objects.select_related('dose_log', 'dose_log__medicine').filter(
            patient=patient
        ).order_by('-created_at').first()
        
        if not interaction or not interaction.dose_log:
            logger.warning(f"No pending interaction for patient {patient.id}")
            try:
                send_whatsapp_text_message(
                    sender_phone,
                    "No pending medication reminder found. Please use the app to log your dose."
                )
            except Exception as e:
                logger.error(f"Failed to send fallback message: {e}")
            return
        
        dose_log = interaction.dose_log
        reply_text = ""
        
        # Handle response options
        clean_reply = text_body.lower().strip()
        is_taken = clean_reply == '1' or 'taken' in clean_reply or 'yes' in clean_reply
        is_remind = clean_reply == '2' or 'remind' in clean_reply or 'later' in clean_reply
        is_skipped = clean_reply == '3' or 'skip' in clean_reply or 'not taking' in clean_reply
        
        if is_taken:
            # Dose marked as taken
            dose_log.status = 'taken'
            dose_log.taken_at = timezone.now()
            dose_log.save(update_fields=['status', 'taken_at', 'updated_at'])
            
            medicine_name = dose_log.medicine.name if dose_log.medicine else "Medication"
            dosage = dose_log.medicine.dosage if dose_log.medicine else ""
            reply_text = f"✅ Your dose of {medicine_name} {dosage} marked as taken!"
            logger.info(f"Dose {dose_log.id} marked TAKEN via WhatsApp for patient {patient.id}")
            
        elif is_remind:
            # Reschedule reminder for 15 minutes later
            now = timezone.now()
            new_time = (now + timedelta(minutes=15)).time()
            
            dose_log.status = 'pending'
            dose_log.scheduled_time = new_time
            dose_log.reminder_sent = False
            dose_log.save(update_fields=['status', 'scheduled_time', 'reminder_sent', 'updated_at'])
            
            reply_text = "⏰ Reminder rescheduled for 15 minutes later."
            logger.info(f"Dose {dose_log.id} rescheduled to {new_time} for patient {patient.id}")
            
        elif is_skipped:
            # Mark as skipped and escalate
            dose_log.status = 'skipped'
            dose_log.skip_reason = "User skipped via WhatsApp"
            dose_log.save(update_fields=['status', 'skip_reason', 'updated_at'])
            
            # Trigger escalation
            try:
                trigger_caretaker_alert(dose_log)
            except Exception as e:
                logger.error(f"Failed to trigger escalation for dose {dose_log.id}: {e}")
            
            reply_text = "🚨 Medication skipped. Your caretaker has been notified."
            logger.info(f"Dose {dose_log.id} skipped with escalation for patient {patient.id}")
            
        else:
            # Invalid input
            reply_text = (
                "Invalid option. Please tap one of the buttons or reply with:\n"
                "1️⃣ Taken\n"
                "2️⃣ Remind in 15 min\n"
                "3️⃣ Not taking"
            )
            logger.info(f"Invalid reply '{text_body}' from patient {patient.id}")
        
        # Send reply
        if reply_text:
            try:
                send_whatsapp_text_message(sender_phone, reply_text)
            except Exception as e:
                logger.error(f"Failed to send WhatsApp reply: {e}")
                
    except Exception as e:
        logger.error(f"Error processing patient reply: {e}", exc_info=True)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_escalation_manual(request):
    """
    Manually triggers caretaker WhatsApp escalation.
    """
    patient_id = request.data.get('patient_id')
    if not patient_id:
        return Response({'error': 'patient_id is required'}, status=400)

    try:
        if request.user.role == 'admin':
            patient = PatientProfile.objects.get(id=patient_id)
        elif request.user.role == 'caretaker':
            patient = request.user.caretaker_profile.patients.get(id=patient_id)
        else:
            patient = request.user.patient_profile
            if str(patient.id) != str(patient_id):
                return Response({'error': 'Unauthorized'}, status=403)
    except (PatientProfile.DoesNotExist, Caretaker.DoesNotExist):
        return Response({'error': 'Patient not found or unauthorized'}, status=404)

    # Find or create a dummy pending dose log if none exists to test
    dose_log = DoseLog.objects.filter(patient=patient, status='pending').first()
    if not dose_log:
        from apps.medicines.models import Medicine
        medicine = Medicine.objects.filter(patient=patient).first()
        if not medicine:
            return Response({'error': 'Patient has no medicines registered. Add a medicine first.'}, status=400)
        
        from apps.medicines.models import MedicineSchedule
        schedule = MedicineSchedule.objects.filter(medicine=medicine).first()
        if not schedule:
            schedule = MedicineSchedule.objects.create(
                medicine=medicine,
                patient=patient,
                day_of_week='all',
                time=timezone.now().time()
            )

        dose_log = DoseLog.objects.create(
            schedule=schedule,
            patient=patient,
            medicine=medicine,
            scheduled_date=timezone.now().date(),
            scheduled_time=timezone.now().time(),
            status='pending'
        )

    try:
        # Trigger caretaker alert escalation immediately
        success = trigger_caretaker_alert(dose_log)
        
        # Fetch the latest EscalationLog for this dose log to provide more detail
        from apps.escalation.models import EscalationLog
        log_entry = EscalationLog.objects.filter(
            dose_log=dose_log,
            escalation_level__in=['whatsapp_primary', 'whatsapp_secondary']
        ).order_by('-created_at').first()
        
        detail_msg = ""
        if log_entry:
            if log_entry.success:
                detail_msg = f" Details: {log_entry.message_sent.replace('\n', ' · ')}"
            else:
                detail_msg = f" Error: {log_entry.error_message or log_entry.message_sent}"
                
        return Response({
            'success': success,
            'message': ('Caretaker WhatsApp alert triggered successfully!' if success else 'Failed to send alert via Meta API.') + detail_msg
        })
    except Exception as e:
        logger.error(f"Manual escalation error: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_voice_manual(request):
    """
    Manually triggers caretaker Twilio Voice Call.
    """
    patient_id = request.data.get('patient_id')
    if not patient_id:
        return Response({'error': 'patient_id is required'}, status=400)

    try:
        if request.user.role == 'admin':
            patient = PatientProfile.objects.get(id=patient_id)
        elif request.user.role == 'caretaker':
            patient = request.user.caretaker_profile.patients.get(id=patient_id)
        else:
            patient = request.user.patient_profile
            if str(patient.id) != str(patient_id):
                return Response({'error': 'Unauthorized'}, status=403)
    except (PatientProfile.DoesNotExist, Caretaker.DoesNotExist):
        return Response({'error': 'Patient not found or unauthorized'}, status=404)

    # Find or create a dummy pending dose log if none exists to test
    dose_log = DoseLog.objects.filter(patient=patient, status='pending').first()
    if not dose_log:
        from apps.medicines.models import Medicine
        medicine = Medicine.objects.filter(patient=patient).first()
        if not medicine:
            return Response({'error': 'Patient has no medicines registered. Add a medicine first.'}, status=400)
        
        from apps.medicines.models import MedicineSchedule
        schedule = MedicineSchedule.objects.filter(medicine=medicine).first()
        if not schedule:
            schedule = MedicineSchedule.objects.create(
                medicine=medicine,
                patient=patient,
                day_of_week='all',
                time=timezone.now().time()
            )

        dose_log = DoseLog.objects.create(
            schedule=schedule,
            patient=patient,
            medicine=medicine,
            scheduled_date=timezone.now().date(),
            scheduled_time=timezone.now().time(),
            status='pending'
        )

    try:
        from services.call_service import make_bot_call
        from apps.escalation.models import EscalationLog
        
        success = make_bot_call(dose_log)
        
        # Fetch the latest EscalationLog for this dose log to provide more detail
        log_entry = EscalationLog.objects.filter(
            dose_log=dose_log,
            escalation_level='bot_call'
        ).order_by('-created_at').first()
        
        detail_msg = ""
        if log_entry:
            if log_entry.success:
                detail_msg = f" Details: {log_entry.message_sent}"
            else:
                detail_msg = f" Error: {log_entry.error_message or log_entry.message_sent}"
                
        return Response({
            'success': success,
            'message': ('Caretaker Twilio Voice call triggered successfully!' if success else 'Failed to trigger Twilio call.') + detail_msg
        })
    except Exception as e:
        logger.error(f"Manual voice call error: {e}")
        return Response({'error': str(e)}, status=500)

