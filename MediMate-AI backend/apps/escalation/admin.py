from django.contrib import admin
from .models import EscalationLog


@admin.register(EscalationLog)
class EscalationLogAdmin(admin.ModelAdmin):
    list_display = ['patient', 'escalation_level', 'recipient_phone', 'success', 'created_at']
    list_filter = ['escalation_level', 'success']
    search_fields = ['patient__user__full_name', 'recipient_phone']
