from django.db import models
from django.core.validators import MinValueValidator


class PatientProfile(models.Model):
    """Patient profile with medical info, linked to User."""
    GENDER_CHOICES = (('male', 'Male'), ('female', 'Female'), ('other', 'Other'))

    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='patient_profile')
    age = models.PositiveIntegerField(validators=[MinValueValidator(1)], null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, default='')
    blood_group = models.CharField(max_length=5, null=True, blank=True)
    diseases = models.JSONField(default=list, blank=True)
    allergies = models.JSONField(default=list, blank=True)
    chronic_conditions = models.JSONField(default=list, blank=True)
    emergency_phone = models.CharField(max_length=15, null=True, blank=True)
    adherence_score = models.FloatField(default=100.0)
    risk_level = models.CharField(max_length=10, default='low')
    onboarding_done = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile: {self.user.full_name}"


class Caretaker(models.Model):
    """Caretaker linked to User, can be assigned to multiple patients."""
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='caretaker_profile')
    patients = models.ManyToManyField(PatientProfile, related_name='caretakers', blank=True)
    phone = models.CharField(max_length=15, null=True, blank=True)
    is_primary = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Caretaker: {self.user.full_name}"
