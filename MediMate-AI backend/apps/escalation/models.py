from django.db import models


class EscalationLog(models.Model):
    """Logs every escalation action (WhatsApp, SMS, bot call)."""
    LEVEL_CHOICES = (
        ('whatsapp_primary', 'WhatsApp Primary Caretaker'),
        ('whatsapp_secondary', 'WhatsApp Secondary Caretaker'),
        ('bot_call', 'Bot Call'),
    )
    dose_log = models.ForeignKey('doses.DoseLog', on_delete=models.CASCADE)
    patient = models.ForeignKey('patients.PatientProfile', on_delete=models.CASCADE)
    escalation_level = models.CharField(max_length=30, choices=LEVEL_CHOICES)
    recipient_phone = models.CharField(max_length=15)
    message_sent = models.TextField()
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Escalation ({self.escalation_level}) for Patient #{self.patient_id} — {'✅' if self.success else '❌'}"
