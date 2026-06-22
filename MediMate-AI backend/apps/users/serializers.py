from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'role', 'avatar_url',
                  'whatsapp_number', 'is_active', 'created_at']
        read_only_fields = ['id', 'google_id', 'created_at']
