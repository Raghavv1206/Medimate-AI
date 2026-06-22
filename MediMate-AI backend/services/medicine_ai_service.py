import logging
import os
import requests
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def get_or_resolve_active_ingredient(medicine_name: str) -> str:
    """
    Resolve the active ingredient of a medicine name by querying OpenRouter.
    Uses the Meta Llama 3.3 70B Instruct model.
    Caches resolved generic ingredients in MedicineAICache.
    """
    from apps.medicines.models import MedicineAICache

    clean_name = medicine_name.strip()
    if not clean_name:
        return ""

    # 1. Check cache first (case-insensitive)
    cached = MedicineAICache.objects.filter(medicine_name__iexact=clean_name).first()
    if cached:
        return cached.active_ingredient

    # 2. Call OpenRouter if not cached
    api_key = os.environ.get('OPENROUTER_API_KEY', '')
    if not api_key:
        logger.warning("OPENROUTER_API_KEY not found in environment, returning medicine name as fallback.")
        return clean_name

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt = (
        f"Identify the active ingredient (generic name) and therapeutic category for the medicine name: \"{clean_name}\".\n"
        f"Respond ONLY with a JSON object in this format (no other text, no markdown block, no explanation):\n"
        f"{{\n"
        f"  \"active_ingredient\": \"generic name of the active ingredient, capitalized, e.g., Paracetamol\",\n"
        f"  \"category\": \"therapeutic category, e.g., Analgesic\"\n"
        f"}}"
    )

    payload = {
        "model": "meta-llama/llama-3.3-70b-instruct",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=8.0)
        resp.raise_for_status()
        data = resp.json()
        content = data['choices'][0]['message']['content'].strip()

        # Handle models wrapping response in ```json ... ``` codeblocks
        if content.startswith("```"):
            lines = content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()

        parsed = json.loads(content)
        active_ingredient = parsed.get('active_ingredient', clean_name).strip()
        category = parsed.get('category', '').strip()

        if not active_ingredient:
            active_ingredient = clean_name

        # Save to database cache
        MedicineAICache.objects.create(
            medicine_name=clean_name,
            active_ingredient=active_ingredient,
            category=category
        )
        logger.info(f"AI resolved active ingredient for '{clean_name}': {active_ingredient} (category: {category})")
        return active_ingredient

    except Exception as e:
        logger.error(f"Error calling OpenRouter for active ingredient: {e}", exc_info=True)
        # On failure, return medicine name as fallback without caching
        return clean_name


def check_duplicate_medicine(patient_profile, new_medicine, scheduled_time_str, exclude_schedule_id=None) -> str:
    """
    Check if the user has another active schedule for a medicine with the same active ingredient
    around the same time (within a 2-hour window).
    
    Returns:
        str: Warning message if a duplicate is found, otherwise None.
    """
    if not scheduled_time_str:
        return None

    # Parse scheduled_time_str to a time object
    if isinstance(scheduled_time_str, str):
        try:
            parsed_time = datetime.strptime(scheduled_time_str, "%H:%M").time()
        except ValueError:
            try:
                parsed_time = datetime.strptime(scheduled_time_str, "%H:%M:%S").time()
            except ValueError:
                return None
    else:
        parsed_time = scheduled_time_str

    # Resolve active ingredient of the new medicine
    new_ingredient = get_or_resolve_active_ingredient(new_medicine.name)
    if not new_ingredient:
        return None

    # Fetch existing active schedules for this patient
    from apps.medicines.models import MedicineSchedule
    schedules = MedicineSchedule.objects.filter(
        patient=patient_profile,
        is_active=True
    ).select_related('medicine')

    if exclude_schedule_id:
        schedules = schedules.exclude(id=exclude_schedule_id)

    # Compare ingredients and times (within 2-hour window)
    for sched in schedules:
        sched_ingredient = get_or_resolve_active_ingredient(sched.medicine.name)
        if sched_ingredient and sched_ingredient.lower() == new_ingredient.lower():
            # Calculate difference between times
            d1 = datetime.combine(datetime.today(), parsed_time)
            d2 = datetime.combine(datetime.today(), sched.scheduled_time)
            diff = abs(d1 - d2)
            
            # Handle 24-hour midnight wrap around
            diff_secs = diff.total_seconds()
            if diff_secs > 43200:  # More than 12 hours
                wrap_diff = 86400 - diff_secs
            else:
                wrap_diff = diff_secs

            # 2 hours = 7200 seconds
            if wrap_diff <= 7200:
                return f"{new_medicine.name} and {sched.medicine.name} both contain {new_ingredient}. You may be taking a duplicate dose around the same time."

    return None
