from rest_framework import serializers
from .models import EscalationLog


class EscalationLogSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.user.full_name', read_only=True)
    medicine_name = serializers.CharField(source='dose_log.medicine.name', read_only=True)
    medicine_dosage = serializers.CharField(source='dose_log.medicine.dosage', read_only=True)
    scheduled_time = serializers.TimeField(source='dose_log.scheduled_time', read_only=True)
    scheduled_date = serializers.DateField(source='dose_log.scheduled_date', read_only=True)
    dose_status = serializers.CharField(source='dose_log.status', read_only=True)

    class Meta:
        model = EscalationLog
        fields = [
            'id', 'dose_log', 'patient', 'patient_name', 'escalation_level',
            'recipient_phone', 'message_sent', 'success', 'error_message',
            'is_read', 'created_at', 'medicine_name', 'medicine_dosage',
            'scheduled_time', 'scheduled_date', 'dose_status'
        ]
        read_only_fields = ['created_at']
