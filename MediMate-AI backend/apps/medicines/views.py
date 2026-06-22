from typing import cast
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Q
from apps.users.models import User
from apps.patients.models import PatientProfile
from .models import Medicine, MedicineSchedule
from .serializers import MedicineSerializer, MedicineScheduleSerializer


class MedicineViewSet(viewsets.ModelViewSet):
    """
    Feature #16: Medicine CRUD — Add, edit, delete medicines.
    - Only authenticated users can manage medicines
    - Medicine ownership verified through patient profile
    - All operations are transaction-safe for data consistency
    """
    serializer_class = MedicineSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter medicines to those belonging to the user's patient profile (created by or scheduled)."""
        user = cast(User, self.request.user)
        if user.role == 'admin':
            return Medicine.objects.all()

        try:
            patient_profile = PatientProfile.objects.get(user=user)
            return Medicine.objects.filter(
                Q(patient=patient_profile) |
                Q(medicineschedule__patient=patient_profile)
            ).distinct()
        except PatientProfile.DoesNotExist:
            if user.role == 'caretaker':
                return Medicine.objects.filter(
                    Q(patient__caretakers__user=user) |
                    Q(medicineschedule__patient__caretakers__user=user)
                ).distinct()
            return Medicine.objects.none()

    def _verify_medicine_ownership(self, medicine):
        """Verify that the current user owns this medicine (created it or has a schedule for it)."""
        user = cast(User, self.request.user)
        if user.role == 'admin':
            return True

        try:
            patient_profile = PatientProfile.objects.get(user=user)
            is_owner = (medicine.patient == patient_profile) or medicine.medicineschedule_set.filter(
                patient=patient_profile
            ).exists()
        except PatientProfile.DoesNotExist:
            if user.role == 'caretaker':
                is_owner = (medicine.patient and medicine.patient.caretakers.filter(user=user).exists()) or medicine.medicineschedule_set.filter(
                    patient__caretakers__user=user
                ).exists()
            else:
                is_owner = False

        if not is_owner:
            raise PermissionDenied(
                'You do not have permission to edit this medicine.'
            )
        return True

    @transaction.atomic
    def perform_create(self, serializer):
        """Create medicine with transaction safety and associate with patient profile."""
        try:
            user = cast(User, self.request.user)
            patient_profile = PatientProfile.objects.get(user=user)
            serializer.save(patient=patient_profile)
        except PatientProfile.DoesNotExist:
            serializer.save()

    @transaction.atomic
    def perform_update(self, serializer):
        """Update medicine with transaction safety and ownership verification."""
        medicine = self.get_object()
        self._verify_medicine_ownership(medicine)
        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        """Delete medicine with transaction safety and ownership verification."""
        self._verify_medicine_ownership(instance)
        instance.delete()



class MedicineScheduleViewSet(viewsets.ModelViewSet):
    """
    Feature #17: Medicine Schedule CRUD — Set daily times with start/end dates.
    Feature #21: Schedule Activation Toggle — is_active flag to pause/resume.
    - Only authenticated users can manage their schedules
    - Schedules are automatically associated with patient profile
    - All operations are transaction-safe
    """
    serializer_class = MedicineScheduleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter schedules to authenticated user's schedules."""
        user = cast(User, self.request.user)
        if user.role == 'admin':
            return MedicineSchedule.objects.all().select_related('medicine', 'patient')
        return MedicineSchedule.objects.filter(
            patient__user=user
        ).select_related('medicine', 'patient')

    def create(self, request, *args, **kwargs):
        """Override create to check for duplicate active ingredients around the same time."""
        medicine_id = request.data.get('medicine_id')
        scheduled_time = request.data.get('scheduled_time')
        ignore_warning = request.data.get('ignore_warning', False)
        
        # Standard validation first
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if not ignore_warning:
            try:
                user = cast(User, self.request.user)
                patient_profile = PatientProfile.objects.get(user=user)
                medicine = Medicine.objects.get(id=medicine_id)
                
                from services.medicine_ai_service import check_duplicate_medicine
                warning_msg = check_duplicate_medicine(patient_profile, medicine, scheduled_time)
                if warning_msg:
                    return Response({
                        'warning': warning_msg,
                        'is_duplicate': True
                    }, status=status.HTTP_409_CONFLICT)
            except (PatientProfile.DoesNotExist, Medicine.DoesNotExist):
                pass
                
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Override update to check for duplicate active ingredients around the same time."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        medicine_id = request.data.get('medicine_id', instance.medicine.id)
        scheduled_time = request.data.get('scheduled_time', instance.scheduled_time)
        ignore_warning = request.data.get('ignore_warning', False)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        if not ignore_warning:
            try:
                user = cast(User, self.request.user)
                patient_profile = PatientProfile.objects.get(user=user)
                medicine = Medicine.objects.get(id=medicine_id)
                
                from services.medicine_ai_service import check_duplicate_medicine
                warning_msg = check_duplicate_medicine(patient_profile, medicine, scheduled_time, exclude_schedule_id=instance.id)
                if warning_msg:
                    return Response({
                        'warning': warning_msg,
                        'is_duplicate': True
                    }, status=status.HTTP_409_CONFLICT)
            except (PatientProfile.DoesNotExist, Medicine.DoesNotExist):
                pass
                
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    def perform_create(self, serializer):
        """Create schedule linked to user's patient profile."""
        try:
            user = cast(User, self.request.user)
            patient_profile = PatientProfile.objects.get(user=user)
        except PatientProfile.DoesNotExist:
            raise PermissionDenied('User does not have a patient profile.')
        serializer.save(patient=patient_profile)

    @transaction.atomic
    def perform_update(self, serializer):
        """Update schedule with transaction safety."""
        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        """Delete schedule with transaction safety."""
        instance.delete()

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def toggle_active(self, request, pk=None):
        """Feature #21: Toggle is_active flag without deleting the schedule."""
        schedule = self.get_object()
        schedule.is_active = not schedule.is_active
        schedule.save(update_fields=['is_active'])
        return Response({
            'id': schedule.id,
            'is_active': schedule.is_active,
            'message': f"Schedule {'activated' if schedule.is_active else 'paused'}",
        }, status=status.HTTP_200_OK)

