from django.contrib import admin
from .models import Medicine, MedicineSchedule


@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ['name', 'dosage', 'created_at']
    search_fields = ['name']


@admin.register(MedicineSchedule)
class MedicineScheduleAdmin(admin.ModelAdmin):
    list_display = ['medicine', 'patient', 'scheduled_time', 'start_date', 'end_date', 'is_active']
    list_filter = ['is_active']
    search_fields = ['medicine__name']
