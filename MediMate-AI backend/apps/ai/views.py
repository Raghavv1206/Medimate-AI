from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from services.ai_service import calculate_risk_score, get_7d_predictions, get_adherence_trend as get_adherence_trend_service
from apps.patients.models import PatientProfile
from apps.doses.models import DoseLog

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_risk_score(request):
    """
    Feature #45, #46, #47, #48: Returns the risk score and details for the patient.
    """
    patient_id = request.GET.get('patient_id')
    user = request.user
    
    if user.role == 'patient':
        try:
            patient = user.patient_profile
        except PatientProfile.DoesNotExist:
            return Response({'error': 'Patient profile not found'}, status=404)
    elif user.role in ('caretaker', 'admin'):
        if not patient_id:
            return Response({'error': 'patient_id query parameter is required for caretakers/admins'}, status=400)
        if user.role == 'caretaker':
            try:
                patient = user.caretaker_profile.patients.filter(id=patient_id).first()
                if not patient:
                    return Response({'error': 'Unauthorized or patient not assigned'}, status=403)
            except Exception:
                return Response({'error': 'Caretaker profile not found'}, status=404)
        else:
            patient = PatientProfile.objects.filter(id=patient_id).first()
            if not patient:
                return Response({'error': 'Patient profile not found'}, status=404)
                
    result = calculate_risk_score(patient.id)
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_predictions(request):
    """
    Feature #49: Predicts upcoming doses in the next 7 days at risk.
    """
    patient_id = request.GET.get('patient_id')
    user = request.user
    
    if user.role == 'patient':
        try:
            patient = user.patient_profile
        except PatientProfile.DoesNotExist:
            return Response({'error': 'Patient profile not found'}, status=404)
    elif user.role in ('caretaker', 'admin'):
        if not patient_id:
            return Response({'error': 'patient_id query parameter is required for caretakers/admins'}, status=400)
        if user.role == 'caretaker':
            try:
                patient = user.caretaker_profile.patients.filter(id=patient_id).first()
                if not patient:
                    return Response({'error': 'Unauthorized or patient not assigned'}, status=403)
            except Exception:
                return Response({'error': 'Caretaker profile not found'}, status=404)
        else:
            patient = PatientProfile.objects.filter(id=patient_id).first()
            if not patient:
                return Response({'error': 'Patient profile not found'}, status=404)
                
    predictions = get_7d_predictions(patient.id)
    return Response({'predictions': predictions})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_adherence_trend(request):
    """
    Feature #50: Returns weekly compliance rates for charting.
    """
    patient_id = request.GET.get('patient_id')
    user = request.user
    
    if user.role == 'patient':
        try:
            patient = user.patient_profile
        except PatientProfile.DoesNotExist:
            return Response({'error': 'Patient profile not found'}, status=404)
    elif user.role in ('caretaker', 'admin'):
        if not patient_id:
            return Response({'error': 'patient_id query parameter is required for caretakers/admins'}, status=400)
        if user.role == 'caretaker':
            try:
                patient = user.caretaker_profile.patients.filter(id=patient_id).first()
                if not patient:
                    return Response({'error': 'Unauthorized or patient not assigned'}, status=403)
            except Exception:
                return Response({'error': 'Caretaker profile not found'}, status=404)
        else:
            patient = PatientProfile.objects.filter(id=patient_id).first()
            if not patient:
                return Response({'error': 'Patient profile not found'}, status=404)
                
    trend = get_adherence_trend_service(patient.id)
    return Response({'trend': trend})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_ai_message(request):
    """
    Day 5 Endpoint: POST /api/ai/generate-message/
    Takes a dose_log_id, generates AI tip variables, and returns it.
    """
    dose_log_id = request.data.get('dose_log_id')
    if not dose_log_id:
        return Response({'error': 'dose_log_id is required'}, status=400)
        
    try:
        if request.user.role == 'admin':
            dose_log = DoseLog.objects.get(id=dose_log_id)
        elif request.user.role == 'caretaker':
            dose_log = DoseLog.objects.get(
                id=dose_log_id, 
                patient__caretakers__user=request.user
            )
        else:
            dose_log = DoseLog.objects.get(id=dose_log_id, patient__user=request.user)
    except DoseLog.DoesNotExist:
        return Response({'error': 'Dose log not found or unauthorized'}, status=404)
        
    from services.ai_message_service import generate_ai_variables
    variables = generate_ai_variables(dose_log.patient, dose_log)
    return Response({'variables': variables})
