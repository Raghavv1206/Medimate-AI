from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import timedelta, date
from .models import MedicineSchedule
from apps.doses.models import DoseLog


@receiver(post_save, sender=MedicineSchedule)
def generate_dose_logs(sender, instance, created, **kwargs):
    """Auto-create DoseLog entries for 30 days when a schedule is created."""
    if created and instance.is_active:
        current = instance.start_date or date.today()
        end = instance.end_date or (current + timedelta(days=30))
        logs_to_create = []
        while current <= end:
            logs_to_create.append(DoseLog(
                schedule=instance,
                patient=instance.patient,
                medicine=instance.medicine,
                scheduled_date=current,
                scheduled_time=instance.scheduled_time,
            ))
            current += timedelta(days=1)
        DoseLog.objects.bulk_create(logs_to_create, ignore_conflicts=True)
