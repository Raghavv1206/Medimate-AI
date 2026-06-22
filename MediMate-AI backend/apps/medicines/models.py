from django.db import models


class Medicine(models.Model):
    """A medicine with name, dosage, and instructions."""
    patient = models.ForeignKey(
        'patients.PatientProfile',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='medicines'
    )
    name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50)
    instructions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()

    def __str__(self):
        return f"{self.name} ({self.dosage})"


class MedicineSchedule(models.Model):
    """A specific schedule for a patient to take a medicine at a given time."""
    patient = models.ForeignKey('patients.PatientProfile', on_delete=models.CASCADE, related_name='schedules')
    medicine = models.ForeignKey(Medicine, on_delete=models.CASCADE)
    scheduled_time = models.TimeField()
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = models.Manager()

    def __str__(self):
        return f"{self.medicine.name} at {self.scheduled_time} for Patient #{self.patient.id}"


class MedicineAICache(models.Model):
    """Cache for AI resolved active ingredient and category of a medicine name."""
    medicine_name = models.CharField(max_length=100, unique=True)
    active_ingredient = models.CharField(max_length=100)
    category = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medicine_name} -> {self.active_ingredient}"


