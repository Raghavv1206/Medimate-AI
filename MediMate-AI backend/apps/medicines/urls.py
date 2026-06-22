from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicineViewSet, MedicineScheduleViewSet

router = DefaultRouter()
router.register(r'list', MedicineViewSet, basename='medicine')
router.register(r'schedules', MedicineScheduleViewSet, basename='medicine-schedule')

urlpatterns = [
    path('', include(router.urls)),
]
