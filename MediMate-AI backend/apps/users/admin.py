from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'full_name', 'role', 'whatsapp_number', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'is_deleted']
    search_fields = ['username', 'email', 'full_name', 'whatsapp_number']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('MediMate Fields', {
            'fields': ('google_id', 'full_name', 'avatar_url', 'role', 'whatsapp_number', 'is_deleted'),
        }),
    )
