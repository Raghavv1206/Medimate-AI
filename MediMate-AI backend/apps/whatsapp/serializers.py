from rest_framework import serializers
from .models import WhatsAppInteraction


class WhatsAppInteractionSerializer(serializers.ModelSerializer):
    """
    Serializer for WhatsAppInteraction with nested patient and medicine data.
    Handles read-only fields and provides comprehensive interaction details.
    """
    patient_name = serializers.CharField(
        source='patient.user.full_name',
        read_only=True,
        default=''
    )
    patient_id = serializers.IntegerField(
        source='patient.id',
        read_only=True
    )
    medicine_name = serializers.CharField(
        source='dose_log.medicine.name',
        read_only=True,
        default=''
    )
    scheduled_time = serializers.TimeField(
        source='dose_log.scheduled_time',
        read_only=True,
        required=False,
        allow_null=True
    )
    scheduled_date = serializers.DateField(
        source='dose_log.scheduled_date',
        read_only=True,
        required=False,
        allow_null=True
    )
    is_successful = serializers.BooleanField(read_only=True)
    is_failed = serializers.BooleanField(read_only=True)

    class Meta:
        model = WhatsAppInteraction
        fields = [
            'id', 'whatsapp_number', 'message_sent', 'status', 'created_at',
            'updated_at', 'patient_name', 'patient_id', 'medicine_name',
            'scheduled_time', 'scheduled_date', 'is_successful', 'is_failed',
            'external_message_id', 'ai_variables'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'is_successful', 'is_failed'
        ]
    
    def validate_whatsapp_number(self, value):
        """Validate WhatsApp number format."""
        if value and not str(value).replace('+', '').replace('-', '').replace(' ', '').isdigit():
            raise serializers.ValidationError(
                "WhatsApp number must contain only digits, +, -, or spaces."
            )
        return value
    
    def validate_status(self, value):
        """Validate status is one of the allowed choices."""
        valid_statuses = [choice[0] for choice in self.fields['status'].choices]
        if value not in valid_statuses:
            raise serializers.ValidationError(
                f"Status must be one of: {', '.join(valid_statuses)}."
            )
        return value
    
    def to_representation(self, instance):
        """
        Safely handle missing related objects without raising exceptions.
        """
        try:
            return super().to_representation(instance)
        except (AttributeError, ValueError) as e:
            # Gracefully handle missing related objects
            data = {
                'id': instance.id,
                'whatsapp_number': instance.whatsapp_number,
                'message_sent': instance.message_sent,
                'status': instance.status,
                'created_at': instance.created_at,
                'updated_at': instance.updated_at,
                'patient_name': '',
                'patient_id': instance.patient_id,
                'medicine_name': '',
                'scheduled_time': None,
                'scheduled_date': None,
                'is_successful': instance.is_successful,
                'is_failed': instance.is_failed,
                'external_message_id': instance.external_message_id,
                'ai_variables': instance.ai_variables,
            }
            return data
