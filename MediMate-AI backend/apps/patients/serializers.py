from rest_framework import serializers
from django.db import transaction
from .models import PatientProfile, Caretaker
from apps.users.serializers import UserSerializer

class PatientProfileSerializer(serializers.ModelSerializer):
    """Serializer for PatientProfile with proper validation and user field handling."""
    user = UserSerializer(read_only=True)
    whatsapp_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = PatientProfile
        fields = [
            'id', 'user', 'age', 'gender', 'blood_group', 'diseases', 'allergies',
            'chronic_conditions', 'emergency_phone', 'adherence_score', 'risk_level',
            'onboarding_done', 'created_at', 'updated_at', 'whatsapp_number'
        ]
        read_only_fields = [
            'id', 'user', 'adherence_score', 'risk_level', 'created_at', 'updated_at'
        ]
    
    def validate_age(self, value):
        """Validate age is within reasonable bounds."""
        if value is not None and (value < 1 or value > 150):
            raise serializers.ValidationError("Age must be between 1 and 150.")
        return value
    
    def validate_gender(self, value):
        """Validate gender is one of the allowed choices."""
        if value and value not in ['male', 'female', 'other']:
            raise serializers.ValidationError(
                "Gender must be 'male', 'female', or 'other'."
            )
        return value
    
    def validate_blood_group(self, value):
        """Validate blood group format."""
        valid_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
        if value and value not in valid_groups:
            raise serializers.ValidationError(
                f"Blood group must be one of: {', '.join(valid_groups)}."
            )
        return value
    
    def validate_emergency_phone(self, value):
        """Validate emergency phone number."""
        if value and not str(value).replace('+', '').replace('-', '').replace(' ', '').isdigit():
            raise serializers.ValidationError(
                "Emergency phone must contain only digits, +, -, or spaces."
            )
        return value
    
    @transaction.atomic
    def update(self, instance, validated_data):
        """Update patient profile and associated user fields."""
        # Extract whatsapp_number if provided
        whatsapp_number = validated_data.pop('whatsapp_number', None)
        
        # Update PatientProfile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update User model's whatsapp_number if provided
        if whatsapp_number is not None:
            user = instance.user
            user.whatsapp_number = whatsapp_number
            user.save(update_fields=['whatsapp_number'])
        
        return instance

class CaretakerSerializer(serializers.ModelSerializer):
    """Serializer for Caretaker model."""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Caretaker
        fields = ['id', 'user', 'patients', 'phone', 'is_primary', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
