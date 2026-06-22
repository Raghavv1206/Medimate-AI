from datetime import date
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import PatientProfile, Caretaker
from .serializers import PatientProfileSerializer, CaretakerSerializer
from apps.doses.models import DoseLog
from apps.doses.serializers import DoseLogSerializer

class PatientProfileViewSet(viewsets.ModelViewSet):
    """
    Feature #8: Patient Profile CRUD.
    """
    serializer_class = PatientProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return PatientProfile.objects.all()
        elif user.role == 'caretaker':
            try:
                return user.caretaker_profile.patients.all()
            except Caretaker.DoesNotExist:
                return PatientProfile.objects.none()
        return PatientProfile.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def save_whatsapp(self, request):
        """Feature #9: Save WhatsApp number directly without OTP verification."""
        number = request.data.get('whatsapp_number')
        if not number:
            return Response({'error': 'WhatsApp number required'}, status=400)
        request.user.whatsapp_number = number
        request.user.save()
        return Response({'success': True, 'whatsapp_number': number})

    @action(detail=False, methods=['post'])
    def complete_onboarding(self, request):
        """Feature #13: Mark patient onboarding as done."""
        try:
            profile = request.user.patient_profile
            profile.onboarding_done = True
            profile.save()
            return Response({'onboarding_done': True})
        except PatientProfile.DoesNotExist:
            return Response({'error': 'Patient profile not found'}, status=404)


class CaretakerViewSet(viewsets.ModelViewSet):
    """
    Feature #61: Caretaker Patient Assignment.
    """
    serializer_class = CaretakerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Caretaker.objects.all()
        return Caretaker.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def assign_patient(self, request, pk=None):
        caretaker = self.get_object()
        patient_id = request.data.get('patient_id')
        try:
            patient = PatientProfile.objects.get(id=patient_id)
            caretaker.patients.add(patient)
            return Response({'success': True})
        except PatientProfile.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def caretaker_dashboard(request):
    """
    Feature #63: aggregate patient data for caretaker view.
    Returns caretaker's assigned patients with today's dose statuses.
    """
    user = request.user
    if user.role != 'caretaker' and user.role != 'admin':
        return Response({'error': 'Access denied: Caretaker or Admin role required'}, status=403)
    
    try:
        if user.role == 'admin':
            patients = PatientProfile.objects.all()
        else:
            patients = user.caretaker_profile.patients.all()
    except Caretaker.DoesNotExist:
        return Response({'error': 'Caretaker profile not found'}, status=404)
        
    result = []
    today = date.today()
    for patient in patients:
        doses = DoseLog.objects.filter(patient=patient, scheduled_date=today).select_related('medicine')
        taken_count = doses.filter(status='taken').count()
        total_count = doses.count()
        
        result.append({
            'patient_id': patient.id,
            'patient_name': patient.user.full_name,
            'email': patient.user.email,
            'whatsapp_number': patient.user.whatsapp_number,
            'age': patient.age,
            'gender': patient.gender,
            'risk_level': patient.risk_level,
            'adherence_score': patient.adherence_score,
            'today_doses': DoseLogSerializer(doses, many=True).data,
            'compliance': {
                'taken': taken_count,
                'total': total_count,
            }
        })
        
    return Response({'patients': result})


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def own_patient_profile(request):
    """
    GET  → Returns the patient's own profile.
    PUT/PATCH → Updates the patient's own profile and whatsapp number.
    Handles gender field validation and conversion.
    """
    try:
        profile, created = PatientProfile.objects.get_or_create(user=request.user)
    except Exception as e:
        return Response({"error": f"Failed to get/create profile: {str(e)}"}, status=500)

    if request.method == 'GET':
        serializer = PatientProfileSerializer(profile)
        return Response(serializer.data)

    # PUT or PATCH
    try:
        # Extract and clean the data
        data = request.data.copy()
        
        # Normalize gender to lowercase for validation
        if 'gender' in data and data['gender']:
            data['gender'] = str(data['gender']).lower().strip()
        
        # Validate and update through serializer
        partial = request.method == 'PATCH'
        serializer = PatientProfileSerializer(
            profile, data=data, partial=partial
        )
        
        if not serializer.is_valid():
            return Response(
                {"detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save the profile (serializer handles whatsapp_number and User update)
        serializer.save()
        
        # Return updated profile
        updated_serializer = PatientProfileSerializer(profile)
        return Response(updated_serializer.data, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {"error": f"Failed to update profile: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def patient_onboarding(request):
    """
    POST → Completes patient onboarding.
    Updates whatsapp_number, patient profile, and marks onboarding_done = True.
    """
    try:
        profile, created = PatientProfile.objects.get_or_create(user=request.user)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

    whatsapp_number = request.data.get('whatsapp_number')
    if whatsapp_number is not None:
        request.user.whatsapp_number = whatsapp_number
        request.user.save()

    # Get onboarding fields
    age = request.data.get('age')
    gender = request.data.get('gender', 'male')
    blood_group = request.data.get('blood_group')
    medical_conditions = request.data.get('medical_conditions', '')
    emergency_contact = request.data.get('emergency_contact')

    if age is not None:
        profile.age = int(age)
    if gender is not None:
        profile.gender = gender
    if blood_group is not None:
        profile.blood_group = blood_group
    if emergency_contact is not None:
        profile.emergency_phone = emergency_contact
    if medical_conditions:
        profile.diseases = medical_conditions

    profile.onboarding_done = True
    profile.save()

    return Response({
        'success': True,
        'onboarding_done': True,
        'profile': PatientProfileSerializer(profile).data
    })
