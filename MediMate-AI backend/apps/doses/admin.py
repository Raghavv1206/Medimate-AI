from django.contrib import admin
from .models import DoseLog


@admin.register(DoseLog)
class DoseLogAdmin(admin.ModelAdmin):
    list_display = ['medicine', 'patient', 'scheduled_date', 'scheduled_time', 'status', 'reminder_sent', 'escalated']
    list_filter = ['status', 'reminder_sent', 'escalated', 'scheduled_date']
    search_fields = ['medicine__name', 'patient__user__full_name']
