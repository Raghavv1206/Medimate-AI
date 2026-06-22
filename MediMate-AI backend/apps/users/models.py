from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom User model with Google OAuth fields and role-based access."""
    ROLE_CHOICES = (
        ('patient', 'Patient'),
        ('caretaker', 'Caretaker'),
        ('admin', 'Admin'),
    )
    google_id = models.CharField(max_length=128, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=255, blank=True)
    avatar_url = models.TextField(null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='patient')
    whatsapp_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.role})"
