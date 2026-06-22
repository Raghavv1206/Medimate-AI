from django.contrib import admin
from .models import PatientProfile, Caretaker


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'age', 'gender', 'blood_group', 'risk_level', 'adherence_score', 'onboarding_done']
    list_filter = ['gender', 'risk_level', 'onboarding_done']
    search_fields = ['user__full_name', 'user__email']


@admin.register(Caretaker)
class CaretakerAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone', 'is_primary', 'created_at']
    list_filter = ['is_primary']
    search_fields = ['user__full_name', 'user__email']
