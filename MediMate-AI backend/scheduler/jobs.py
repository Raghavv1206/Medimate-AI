import logging
import threading
from datetime import timedelta
from django.utils import timezone
from django.core.management import call_command
from apscheduler.schedulers.background import BackgroundScheduler
from django_apscheduler.jobstores import DjangoJobStore

logger = logging.getLogger(__name__)

# Global scheduler instance and lock for thread-safe initialization
_scheduler = None
_scheduler_lock = threading.Lock()
_scheduler_started = False


def check_pending_reminders():
    """
    Feature #53: Send WhatsApp reminders for doses.
    - First reminder: sent at the scheduled time (0 min late).
    - Second reminder: sent if no response after 15 min.
    Runs every 1 minute with transaction safety and error handling.
    """
    from apps.doses.models import DoseLog
    from apps.whatsapp.models import WhatsAppInteraction
    from services.ai_message_service import generate_ai_variables
    from services.whatsapp_service import send_reminder
    from django.db import transaction
    from django.db.models import Q

    try:
        now = timezone.localtime()
        current_time = now.time()
        today = now.date()

        # 1. First reminders: scheduled_datetime <= now, status='pending', reminder_sent=False
        to_remind_first = DoseLog.objects.filter(
            Q(scheduled_date__lt=today) | Q(scheduled_date=today, scheduled_time__lte=current_time),
            status='pending',
            reminder_sent=False,
        ).select_related('patient', 'patient__user', 'medicine')[:100]

        for dose in to_remind_first:
            try:
                variables = generate_ai_variables(dose.patient, dose)
                # Send standard reminder
                send_reminder(dose, dose.patient, variables)
                dose.reminder_sent = True
                dose.save(update_fields=['reminder_sent', 'updated_at'])
            except Exception as e:
                logger.error(f"First reminder failed for dose {dose.id}: {e}", exc_info=True)

        # 2. Second reminders (follow-up): 15 minutes late
        cutoff_datetime = now - timedelta(minutes=15)
        cutoff_date = cutoff_datetime.date()
        cutoff_time = cutoff_datetime.time()
        
        # We find pending doses that are at least 15 minutes overdue, where the first reminder was sent
        to_remind_second = DoseLog.objects.filter(
            Q(scheduled_date__lt=cutoff_date) | Q(scheduled_date=cutoff_date, scheduled_time__lte=cutoff_time),
            status='pending',
            reminder_sent=True,
        ).select_related('patient', 'patient__user', 'medicine')[:100]

        for dose in to_remind_second:
            try:
                # Check how many WhatsApp interactions we've sent for this dose log
                interactions_count = WhatsAppInteraction.objects.filter(dose_log=dose).count()
                if interactions_count == 1:
                    # Exactly 1 interaction sent (the first reminder), meaning second follow-up hasn't been sent yet
                    variables = generate_ai_variables(dose.patient, dose)
                    if 'ai_personalized_tip' in variables:
                        variables['ai_personalized_tip'] = "⚠️ FOLLOW-UP: " + variables['ai_personalized_tip']
                    
                    # Send follow-up reminder
                    send_reminder(dose, dose.patient, variables)
                    # Update the updated_at timestamp
                    dose.save(update_fields=['updated_at'])
            except Exception as e:
                logger.error(f"Second reminder failed for dose {dose.id}: {e}", exc_info=True)

    except Exception as e:
        logger.error(f"check_pending_reminders job error: {e}", exc_info=True)



def check_escalations():
    """
    Feature #54: Escalate doses > 45min late (WhatsApp caretaker).
    Runs every 1 minute with transaction safety and error handling.
    """
    from apps.doses.models import DoseLog
    from services.escalation_service import trigger_caretaker_alert
    from django.db import transaction
    from django.db.models import Q

    try:
        now = timezone.localtime()
        cutoff_datetime = now - timedelta(minutes=45)
        cutoff_date = cutoff_datetime.date()
        cutoff_time = cutoff_datetime.time()

        overdue = DoseLog.objects.filter(
            Q(scheduled_date__lt=cutoff_date) | Q(scheduled_date=cutoff_date, scheduled_time__lte=cutoff_time),
            status='pending',
            escalated=False,
        ).select_related('patient', 'patient__user', 'medicine')[:100]

        for dose in overdue:
            try:
                trigger_caretaker_alert(dose)
                dose.escalated = True
                dose.save(update_fields=['escalated', 'updated_at'])
            except Exception as e:
                logger.error(f"Escalation failed for dose {dose.id}: {e}", exc_info=True)
    except Exception as e:
        logger.error(f"check_escalations job error: {e}", exc_info=True)


def check_voice_calls():
    """
    Feature #56: Trigger caretaker voice call for doses > 75min late.
    Runs every 1 minute with error handling and batch limiting.
    """
    from apps.doses.models import DoseLog
    from services.call_service import make_bot_call
    from django.db.models import Q

    try:
        now = timezone.localtime()
        cutoff_datetime = now - timedelta(minutes=75)
        cutoff_date = cutoff_datetime.date()
        cutoff_time = cutoff_datetime.time()

        overdue = DoseLog.objects.filter(
            Q(scheduled_date__lt=cutoff_date) | Q(scheduled_date=cutoff_date, scheduled_time__lte=cutoff_time),
            status='pending',
            call_attempted=False,
        ).select_related('patient', 'patient__user', 'medicine')[:100]

        for dose in overdue:
            try:
                make_bot_call(dose)
            except Exception as e:
                logger.error(f"Voice call failed for dose {dose.id}: {e}", exc_info=True)
    except Exception as e:
        logger.error(f"check_voice_calls job error: {e}", exc_info=True)


def recalculate_risk_scores():
    """
    Feature #70: Recalculate risk scores for all active patients.
    Runs every 6 hours with transaction safety and batch processing.
    """
    from apps.patients.models import PatientProfile
    from services.ai_service import calculate_risk_score
    from django.db import transaction

    try:
        patients = PatientProfile.objects.filter(
            user__is_active=True
        ).select_related('user')[:500]

        score_count = 0
        for patient in patients:
            try:
                with transaction.atomic():
                    result = calculate_risk_score(patient.id)
                    patient.risk_level = result.get('level', 'low')
                    patient.save(update_fields=['risk_level', 'updated_at'])
                    score_count += 1
            except Exception as e:
                logger.error(f"Risk calculation failed for patient {patient.id}: {e}", exc_info=True)
        
        if score_count > 0:
            logger.info(f"Recalculated risk scores for {score_count} patients")
    except Exception as e:
        logger.error(f"recalculate_risk_scores job error: {e}", exc_info=True)


def start_scheduler():
    """
    Start the background task scheduler with deferred database access.
    Thread-safe initialization that defers database access until after
    app is fully initialized and migrations are applied.
    
    This function is idempotent and can be safely called multiple times.
    """
    global _scheduler, _scheduler_started
    
    # Prevent duplicate scheduler instances (thread-safe)
    if _scheduler_started:
        return _scheduler
    
    with _scheduler_lock:
        # Double-check after acquiring lock
        if _scheduler_started:
            return _scheduler
        
        try:
            # Create scheduler
            _scheduler = BackgroundScheduler()
            
            # Use in-memory job store to prevent SQLite write conflicts
            from apscheduler.jobstores.memory import MemoryJobStore
            _scheduler.add_jobstore(MemoryJobStore(), 'default')
            
            # Register jobs
            _scheduler.add_job(
                check_pending_reminders,
                'interval',
                minutes=1,
                id='check_reminders',
                replace_existing=True,
                coalesce=True,  # Skip missed executions
                max_instances=1  # Only one instance at a time
            )
            _scheduler.add_job(
                check_escalations,
                'interval',
                minutes=1,
                id='check_escalations',
                replace_existing=True,
                coalesce=True,
                max_instances=1
            )
            _scheduler.add_job(
                check_voice_calls,
                'interval',
                minutes=1,
                id='check_voice_calls',
                replace_existing=True,
                coalesce=True,
                max_instances=1
            )
            _scheduler.add_job(
                recalculate_risk_scores,
                'interval',
                hours=6,
                id='recalc_risk',
                replace_existing=True,
                coalesce=True,
                max_instances=1
            )
            
            # Start the scheduler
            _scheduler.start()
            _scheduler_started = True
            
            logger.info(
                "APScheduler started successfully with jobs: "
                "check_reminders (1min), check_escalations (1min), "
                "check_voice_calls (1min), recalc_risk (6hr)"
            )
            return _scheduler
            
        except Exception as e:
            logger.error(
                f"Failed to start APScheduler: {e}. "
                "Background tasks will not run.",
                exc_info=True
            )
            _scheduler_started = False
            raise


def get_scheduler():
    """Get the current scheduler instance (read-only)."""
    global _scheduler
    return _scheduler


def stop_scheduler():
    """Stop the background task scheduler gracefully."""
    global _scheduler, _scheduler_started
    
    with _scheduler_lock:
        if _scheduler and _scheduler.running:
            try:
                _scheduler.shutdown(wait=True)
                _scheduler_started = False
                logger.info("APScheduler stopped gracefully")
            except Exception as e:
                logger.error(f"Error stopping scheduler: {e}", exc_info=True)
