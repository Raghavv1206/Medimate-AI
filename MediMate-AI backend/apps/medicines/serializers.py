from rest_framework import serializers
from .models import Medicine, MedicineSchedule


class MedicineSerializer(serializers.ModelSerializer):
    """
    Serializer for Medicine model with comprehensive validation.
    - Validates name length (1-100 chars)
    - Validates dosage length (1-50 chars)
    - Validates instructions length (max 1000 chars)
    - Ensures data integrity and consistency
    """

    def validate_name(self, value):
        """Validate medicine name."""
        if not value or not value.strip():
            raise serializers.ValidationError('Medicine name is required.')
        name = value.strip()
        if len(name) > 100:
            raise serializers.ValidationError('Medicine name must be less than 100 characters.')
        if len(name) < 1:
            raise serializers.ValidationError('Medicine name must have at least 1 character.')
        return name

    def validate_dosage(self, value):
        """Validate dosage field."""
        if not value or not value.strip():
            raise serializers.ValidationError('Dosage is required.')
        dosage = value.strip()
        if len(dosage) > 50:
            raise serializers.ValidationError('Dosage must be less than 50 characters.')
        if len(dosage) < 1:
            raise serializers.ValidationError('Dosage must have at least 1 character.')
        return dosage

    def validate_instructions(self, value):
        """Validate instructions field."""
        if value and len(value) > 1000:
            raise serializers.ValidationError('Instructions must be less than 1000 characters.')
        return value or ''

    class Meta:
        model = Medicine
        fields = ['id', 'patient', 'name', 'dosage', 'instructions', 'created_at']
        read_only_fields = ['id', 'patient', 'created_at']



class MedicineScheduleSerializer(serializers.ModelSerializer):
    """
    Serializer for MedicineSchedule model with validation.
    - Validates date range (end_date >= start_date)
    - Validates time format
    - Ensures data consistency
    """
    medicine = MedicineSerializer(read_only=True)
    medicine_id = serializers.PrimaryKeyRelatedField(
        queryset=Medicine.objects.all(), source='medicine', write_only=True
    )

    def validate(self, attrs):
        """Validate schedule dates."""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError(
                {'end_date': 'End date must be after or equal to start date.'}
            )
        return attrs

    class Meta:
        model = MedicineSchedule
        fields = ['id', 'medicine', 'medicine_id', 'scheduled_time', 'start_date', 'end_date', 'is_active', 'created_at']
        read_only_fields = ['id', 'patient', 'created_at']
