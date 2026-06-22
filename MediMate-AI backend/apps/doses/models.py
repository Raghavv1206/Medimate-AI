from django.db import models


class DoseLog(models.Model):
    """Individual dose log entry — tracks whether a specific dose was taken, missed, skipped, etc."""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('taken', 'Taken'),
        ('missed', 'Missed'),
        ('skipped', 'Skipped'),
        ('rescheduled', 'Rescheduled'),
    )
    schedule = models.ForeignKey('medicines.MedicineSchedule', on_delete=models.CASCADE)
    patient = models.ForeignKey('patients.PatientProfile', on_delete=models.CASCADE)
    medicine = models.ForeignKey('medicines.Medicine', on_delete=models.CASCADE)
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    taken_at = models.DateTimeField(null=True, blank=True)
    missed_at = models.DateTimeField(null=True, blank=True)
    skip_reason = models.TextField(blank=True)
    reminder_sent = models.BooleanField(default=False)
    escalated = models.BooleanField(default=False)
    call_attempted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('schedule', 'scheduled_date', 'scheduled_time')

    def __str__(self):
        return f"{self.medicine.name} on {self.scheduled_date} at {self.scheduled_time} — {self.status}"
