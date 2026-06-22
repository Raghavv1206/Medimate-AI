from django.db import models
from django.core.validators import RegexValidator


class WhatsAppInteraction(models.Model):
    """
    Logs patient medication reminder notifications sent via WhatsApp.
    Handles message tracking, status management, and AI variable storage.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
    ]
    
    dose_log = models.ForeignKey(
        'doses.DoseLog',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='whatsapp_interactions',
        help_text="Associated dose log if applicable"
    )
    patient = models.ForeignKey(
        'patients.PatientProfile',
        on_delete=models.CASCADE,
        related_name='whatsapp_interactions',
        help_text="Patient who received the message"
    )
    whatsapp_number = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex=r'^\+?[1-9]\d{1,14}$',
                message='Enter a valid phone number (E.164 format)',
                code='invalid_phone'
            )
        ],
        help_text="WhatsApp number in E.164 format"
    )
    message_sent = models.TextField(help_text="Content of the message sent")
    ai_variables = models.JSONField(
        null=True,
        blank=True,
        help_text="AI variables used for message generation"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='sent',
        db_index=True,
        help_text="Delivery status of the message"
    )
    external_message_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        unique=True,
        help_text="External WhatsApp/provider message ID for tracking"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when message was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last update timestamp"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient', '-created_at']),
            models.Index(fields=['status', '-created_at']),
        ]
        verbose_name = "WhatsApp Interaction"
        verbose_name_plural = "WhatsApp Interactions"

    def __str__(self):
        return f"WhatsApp to {self.whatsapp_number} ({self.status}) - {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
    
    @property
    def is_successful(self):
        """Check if message was successfully delivered."""
        return self.status in ['delivered', 'read']
    
    @property
    def is_failed(self):
        """Check if message delivery failed."""
        return self.status == 'failed'
