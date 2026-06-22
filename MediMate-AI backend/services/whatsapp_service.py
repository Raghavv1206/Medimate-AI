import httpx
import os
import logging

logger = logging.getLogger(__name__)

META_URL = "https://graph.facebook.com/v20.0"

import re

def sanitize_whatsapp_param(param_val) -> str:
    """
    Sanitize parameter to comply with Meta WhatsApp Business API constraints:
    - No newlines or carriage returns (replaced by inline bullet ' · ')
    - No tabs or other unicode whitespace characters (replaced by space)
    - No consecutive spaces of 2 or more (collapsed to a single space)
    """
    if not param_val:
        return ""
    
    val_str = str(param_val)
    
    # Handle literal string representations of newlines (e.g. from raw inputs or AI text)
    val_str = val_str.replace('\\r\\n', '\n').replace('\\n', '\n').replace('\\r', '\n')
    val_str = val_str.replace('\\t', ' ')
    
    # Handle carriage return / newline variations
    val_str = val_str.replace('\r\n', '\n').replace('\r', '\n')
    
    # Replace any sequence of newlines with a clean inline bullet separator
    val_str = re.sub(r'\n+', ' · ', val_str)
    
    # Replace unicode spaces (like non-breaking space \xa0, tabs, etc.) with standard space
    val_str = re.sub(r'[\t\xa0\u2000-\u200a\u202f\u205f\u3000]', ' ', val_str)
    
    # Collapse multiple spaces (2 or more) to a single space
    val_str = re.sub(r' {2,}', ' ', val_str)
    
    return val_str.strip()


def send_whatsapp_template_message(phone: str, template_name: str, parameters: list) -> tuple[bool, str]:
    """
    Sends a template-based message via Meta WhatsApp Cloud API.
    Uses the system user access token and phone number ID from environment.
    Returns:
        tuple[bool, str]: (success, error_message)
    """
    token = os.environ.get('WHATSAPP_ACCESS_TOKEN', '')
    phone_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '')
    
    if not token or not phone_id:
        logger.warning("Meta WhatsApp credentials not set - simulating template message send")
        logger.info(f"SIMULATED Meta WhatsApp to {phone}: Template={template_name}, Params={parameters}")
        return True, ""
        
    url = f"{META_URL}/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Strip non-digits from phone number (Meta requires format like 919876543210 without '+')
    clean_phone = "".join(filter(str.isdigit, str(phone)))
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    
    if not clean_phone:
        err = f"Cannot send WhatsApp template: phone number is empty after cleaning. Original: '{phone}'"
        logger.error(err)
        return False, err

    # Sanitize each template parameter to comply with Meta restrictions
    sanitized_params = [sanitize_whatsapp_param(p) for p in parameters]

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "code": "en"
            },
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": p} for p in sanitized_params]
                }
            ]
        }
    }
    
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code >= 400:
                logger.error(f"Meta WhatsApp template send error details: {resp.text}")
                try:
                    err_json = resp.json()
                    err_detail = err_json.get('error', {}).get('error_data', {}).get('details', '')
                    if not err_detail:
                        err_detail = err_json.get('error', {}).get('message', '')
                    error_msg = f"Meta Error: {err_detail}"
                except Exception:
                    error_msg = f"HTTP {resp.status_code}: {resp.text[:500]}"
                return False, error_msg
                
            resp.raise_for_status()
            logger.info(f"Meta WhatsApp template sent successfully to {clean_phone}")
            return True, ""
    except Exception as e:
        error_str = str(e)
        logger.error(f"Failed to send Meta WhatsApp template to {clean_phone}: {error_str}")
        return False, error_str

def send_whatsapp_text_message(phone: str, text: str) -> bool:
    """
    Sends a free-text session message back to the user (within the 24-hour window).
    """
    token = os.environ.get('WHATSAPP_ACCESS_TOKEN', '')
    phone_id = os.environ.get('WHATSAPP_PHONE_NUMBER_ID', '')
    
    if not token or not phone_id:
        logger.warning("Meta WhatsApp credentials not set - simulating text reply")
        logger.info(f"SIMULATED Meta WhatsApp text to {phone}: {text}")
        return True
        
    url = f"{META_URL}/{phone_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    clean_phone = "".join(filter(str.isdigit, str(phone)))
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    
    if not clean_phone:
        logger.error(f"Cannot send WhatsApp text: phone number is empty after cleaning. Original: '{phone}'")
        return False

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_phone,
        "type": "text",
        "text": {
            "preview_url": False,
            "body": text
        }
    }
    
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code >= 400:
                logger.error(f"Meta WhatsApp text send error details: {resp.text}")
            resp.raise_for_status()
            logger.info(f"Meta WhatsApp text reply sent successfully to {clean_phone}")
            return True
    except Exception as e:
        logger.error(f"Failed to send Meta WhatsApp text reply to {clean_phone}: {e}")
        return False

def send_reminder(dose_log, patient, ai_variables: dict) -> bool:
    """
    Builds and sends a medication reminder to the patient.
    Uses the approved `medicine_reminder` template with 2 parameters:
    1: Patient name
    2: Reminder details (medicine, dosage, time, AI tip, streak)
    Interaction is handled via Meta template Quick Reply buttons.
    """
    if not patient.user.whatsapp_number:
        logger.warning(f"No WhatsApp number registered for patient {patient.id} — skipping reminder")
        return False
        
    patient_name = patient.user.full_name or patient.user.username or "Patient"
    
    # Format scheduled time nicely
    time_str = dose_log.scheduled_time.strftime('%I:%M %p') if hasattr(dose_log.scheduled_time, 'strftime') else str(dose_log.scheduled_time)
    
    ai_tip = ai_variables.get('ai_personalized_tip', 'Stay healthy!')
    streak_msg = ai_variables.get('streak', 'Keep it up!')
    
    body_text = (
        f"{dose_log.medicine.name} ({dose_log.medicine.dosage})\n"
        f"Scheduled: {time_str}\n\n"
        f"💡 AI Personalized Health Tip:\n{ai_tip}\n\n"
        f"🔥 {streak_msg}"
    )
    
    success, error_msg = send_whatsapp_template_message(
        phone=patient.user.whatsapp_number,
        template_name="medicine_reminder",
        parameters=[patient_name, body_text]
    )
    
    # Log the interaction
    from apps.whatsapp.models import WhatsAppInteraction
    WhatsAppInteraction.objects.create(
        dose_log=dose_log,
        patient=patient,
        whatsapp_number=patient.user.whatsapp_number,
        message_sent=body_text,
        ai_variables=ai_variables,
        status='sent' if success else 'failed'
    )
    return success
