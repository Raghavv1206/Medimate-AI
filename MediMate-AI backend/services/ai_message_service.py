"""
Feature #37: AI-Personalized Messages
Feature #51: Hugging Face AI Tips (GPT-2 via HF free Inference API)
Feature #52: Fallback Tip System (5 hardcoded motivational tips)

Generates personalized AI variables for WhatsApp messages including
risk-based tips, streak info, and motivational content.
"""
import requests
import os
import random
import logging

logger = logging.getLogger(__name__)

HF_API_URL = "https://api-inference.huggingface.co/models/gpt2"

# Feature #52: Hardcoded fallback tips when HF API is down
FALLBACK_TIPS = [
    "Consistency is key — your health depends on it! 💪",
    "Taking your medicine at the same time every day helps it work better. ⏰",
    "You're doing great — keep up the streak! 🔥",
    "Small steps today lead to big health wins tomorrow! 🌟",
    "Your future self will thank you for staying on track! 🎯",
]


def generate_ai_variables(patient, dose_log) -> dict:
    """
    Feature #37: Build the full variable dict for a WhatsApp message.
    Includes patient name, medicine info, AI tip, risk insight, and streak.
    """
    # Calculate risk (lazy import to avoid circular dependency)
    try:
        from services.ai_service import calculate_risk_score
        risk = calculate_risk_score(patient.id)
    except Exception:
        risk = {'score': 0, 'level': 'low', 'insight': 'Stay consistent!'}

    # Calculate streak
    streak = _get_streak(patient.id)

    # Feature #51: Generate AI tip from Hugging Face
    ai_tip = _call_huggingface(
        patient.user.full_name,
        dose_log.medicine.name,
        risk['score']
    )

    return {
        "patient_name": patient.user.full_name,
        "medicine_name": dose_log.medicine.name,
        "dosage": dose_log.medicine.dosage,
        "scheduled_time": dose_log.scheduled_time.strftime("%I:%M %p"),
        "ai_personalized_tip": ai_tip,
        "risk_insight": risk.get("insight", ""),
        "streak": f"🔥 {streak}-day streak!" if streak > 1 else "💫 Start your streak today!",
    }


def _get_streak(patient_id: int) -> int:
    """Calculate consecutive days where all doses were taken."""
    from apps.doses.models import DoseLog
    from datetime import date, timedelta

    streak = 0
    check_date = date.today() - timedelta(days=1)
    while True:
        day_doses = DoseLog.objects.filter(
            patient_id=patient_id, scheduled_date=check_date
        )
        if not day_doses.exists():
            break
        if day_doses.exclude(status='taken').exists():
            break
        streak += 1
        check_date -= timedelta(days=1)
    return streak


def _call_huggingface(name: str, medicine: str, risk_score: float) -> str:
    """
    Feature #51: Call Hugging Face GPT-2 API for personalized motivational tip.
    Falls back to hardcoded tips if API fails (Feature #52).
    """
    hf_token = os.environ.get('HF_API_TOKEN', '')
    if not hf_token:
        return random.choice(FALLBACK_TIPS)

    prompt = f"{name} should take {medicine}. Risk score: {risk_score}. Motivational health tip:"
    try:
        resp = requests.post(
            HF_API_URL,
            headers={"Authorization": f"Bearer {hf_token}"},
            json={"inputs": prompt, "parameters": {"max_new_tokens": 50}},
            timeout=5,
        )
        resp.raise_for_status()
        result = resp.json()
        generated = result[0]["generated_text"].replace(prompt, "").strip()
        return generated[:200] if generated else random.choice(FALLBACK_TIPS)
    except Exception as e:
        logger.warning(f"HF API failed, using fallback: {e}")
        return random.choice(FALLBACK_TIPS)
