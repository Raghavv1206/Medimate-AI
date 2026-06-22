from rest_framework import serializers
from .models import DoseLog
from apps.medicines.serializers import MedicineSerializer

class DoseLogSerializer(serializers.ModelSerializer):
    medicine = MedicineSerializer(read_only=True)
    class Meta:
        model = DoseLog
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
