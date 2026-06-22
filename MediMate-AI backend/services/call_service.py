import os
import logging
import re
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from twilio.twiml.voice_response import VoiceResponse
from apps.escalation.models import EscalationLog

logger = logging.getLogger(__name__)

def make_bot_call(dose_log):
    """
    Feature #56: Automated Twilio voice call reads alert message to caretaker's phone.
    Returns:
        bool: True if call successfully placed/simulated, False otherwise.
    """
    patient = dose_log.patient
    caretaker = patient.caretakers.filter(is_primary=True).first()
    
    # If no caretaker, fallback to emergency phone of the patient
    if not caretaker:
        phone = patient.emergency_phone
        recipient_name = "Emergency Contact"
    else:
        phone = caretaker.user.whatsapp_number or caretaker.phone
        recipient_name = caretaker.user.full_name

    if not phone:
        logger.warning(f"No phone number available for voice call (Patient #{patient.id})")
        return False

    # Ensure phone number formatting is normalized to E.164 format
    raw_phone = str(phone).strip()
    cleaned_phone = re.sub(r'[^\d+]', '', raw_phone)
    if len(cleaned_phone) == 10 and cleaned_phone.isdigit():
        phone_str = '+91' + cleaned_phone
    else:
        if not cleaned_phone.startswith('+'):
            if len(cleaned_phone) == 12 and cleaned_phone.startswith('91'):
                phone_str = '+' + cleaned_phone
            else:
                phone_str = '+' + cleaned_phone
        else:
            phone_str = cleaned_phone

    sid = os.environ.get('TWILIO_ACCOUNT_SID', '').strip()
    token = os.environ.get('TWILIO_AUTH_TOKEN', '').strip()
    
    raw_from_phone = os.environ.get('TWILIO_PHONE', '').strip()
    if raw_from_phone:
        cleaned_from = re.sub(r'[^\d+]', '', raw_from_phone)
        if not cleaned_from.startswith('+'):
            cleaned_from = '+' + cleaned_from
        from_phone = cleaned_from
    else:
        from_phone = ''

    # Check for empty credentials or placeholder settings in .env
    is_placeholder = (
        not sid or not token or not from_phone or
        'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' in sid or
        'your-twilio-auth-token' in token or
        '+1xxxxxxxxxx' in from_phone
    )

    if is_placeholder:
        logger.warning("Twilio credentials are not configured or are placeholders — simulating voice call")
        # Log as attempted even if simulated
        dose_log.call_attempted = True
        dose_log.save()
        _log_call(
            dose_log, 
            patient, 
            phone_str, 
            f"SIMULATED Voice Call to {recipient_name} — Twilio credentials are not configured.", 
            True
        )
        return True

    # Build TwiML voice response
    twiml = VoiceResponse()
    voice_name = os.environ.get('TWILIO_VOICE', 'Polly.Aditi').strip()
    voice_lang = os.environ.get('TWILIO_LANGUAGE', 'en-IN').strip()
    
    twiml.say(
        f"Alert from MediMate. Patient {patient.user.full_name} has missed their "
        f"{dose_log.medicine.name} medication scheduled for "
        f"{dose_log.scheduled_time.strftime('%I:%M %p')}. "
        f"Please contact them immediately. This is an automated alert.",
        voice=voice_name,
        language=voice_lang,
    )

    try:
        client = Client(sid, token)
        call = client.calls.create(
            twiml=str(twiml),
            to=phone_str,
            from_=from_phone,
        )
        dose_log.call_attempted = True
        dose_log.save()
        _log_call(dose_log, patient, phone_str, f"Call SID: {call.sid}", True)
        return True
    except TwilioRestException as e:
        error_str = f"Twilio API Error {e.code}: {e.msg}"
        if e.code == 21210:
            logger.warning(
                f"Twilio Configuration Error: The source number {from_phone} is not verified or purchased for your Twilio account. "
                "Please verify it in the Twilio Console (https://www.twilio.com/console)."
            )
        elif e.code == 21608:
            logger.warning(
                f"Twilio Trial Account Limitation: The recipient phone number {phone_str} is not verified. "
                "For Twilio Trial Accounts, you must verify the recipient number in your Verified Caller IDs first."
            )
        else:
            logger.error(f"Twilio call failed to {phone_str}: {error_str}")

        _log_call(
            dose_log, 
            patient, 
            phone_str, 
            "Twilio Voice Call failed.", 
            False, 
            error_message=error_str
        )
        dose_log.call_attempted = True
        dose_log.save()
        return False
    except Exception as e:
        error_str = str(e)
        logger.error(f"Bot call failed to {phone_str}: {error_str}", exc_info=True)
        _log_call(
            dose_log, 
            patient, 
            phone_str, 
            "Twilio Voice Call failed.", 
            False, 
            error_message=error_str
        )
        dose_log.call_attempted = True
        dose_log.save()
        return False


def _log_call(dose_log, patient, phone, message, success, error_message=""):
    EscalationLog.objects.create(
        dose_log=dose_log,
        patient=patient,
        escalation_level='bot_call',
        recipient_phone=phone,
        message_sent=message,
        success=success,
        error_message=error_message,
    )

