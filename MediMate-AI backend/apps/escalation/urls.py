from django.urls import path
from . import views

urlpatterns = [
    path('logs/', views.list_escalation_logs, name='escalation-logs-list'),
    path('logs/mark-read/', views.mark_all_read, name='escalation-logs-mark-all-read'),
    path('logs/<int:pk>/mark-read/', views.mark_log_read, name='escalation-logs-mark-read'),
]
