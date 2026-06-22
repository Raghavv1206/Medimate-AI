from django.urls import path
from . import views

urlpatterns = [
    path('risk-score/', views.get_risk_score, name='ai-risk-score'),
    path('predictions/', views.get_predictions, name='ai-predictions'),
    path('adherence-trend/', views.get_adherence_trend, name='ai-adherence-trend'),
    path('generate-message/', views.generate_ai_message, name='ai-generate-message'),
]
