"""
Utility to regenerate dose logs for a patient's active schedules.
Used when manually refreshing or when schedules are reactivated.
"""
from datetime import date, timedelta
from apps.doses.models import DoseLog
from apps.medicines.models import MedicineSchedule


def regenerate_dose_logs(patient_id, days=30):
    """
    Regenerate DoseLog entries for all active schedules of a patient.
    Uses bulk_create with ignore_conflicts to avoid duplicates (Feature #20).
    """
    schedules = MedicineSchedule.objects.filter(
        patient_id=patient_id,
        is_active=True,
    )

    logs_to_create = []
    today = date.today()

    for schedule in schedules:
        start = max(schedule.start_date or today, today)
        end = schedule.end_date or (today + timedelta(days=days))

        current = start
        while current <= end:
            logs_to_create.append(DoseLog(
                schedule=schedule,
                patient=schedule.patient,
                medicine=schedule.medicine,
                scheduled_date=current,
                scheduled_time=schedule.scheduled_time,
            ))
            current += timedelta(days=1)

    if logs_to_create:
        created = DoseLog.objects.bulk_create(logs_to_create, ignore_conflicts=True)
        return len(created)
    return 0
