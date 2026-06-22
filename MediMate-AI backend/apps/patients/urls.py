from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'profiles', views.PatientProfileViewSet, basename='patient-profile')
router.register(r'caretakers', views.CaretakerViewSet, basename='caretaker')

urlpatterns = [
    path('caretaker-dashboard/', views.caretaker_dashboard, name='caretaker-dashboard'),
    path('me/', views.own_patient_profile, name='patient-me'),
    path('onboarding/', views.patient_onboarding, name='patient-onboarding'),
    path('', include(router.urls)),
]
