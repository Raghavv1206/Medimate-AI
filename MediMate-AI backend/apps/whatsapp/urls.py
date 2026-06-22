from django.urls import path
from . import views

urlpatterns = [
    path('interactions/', views.list_interactions, name='whatsapp-interactions'),
    path('send-reminder/', views.send_manual_reminder, name='whatsapp-send-reminder'),
    path('trigger-escalation/', views.trigger_escalation_manual, name='whatsapp-trigger-escalation'),
    path('trigger-voice/', views.trigger_voice_manual, name='whatsapp-trigger-voice'),
    path('webhook/', views.whatsapp_webhook, name='whatsapp-webhook'),
]
