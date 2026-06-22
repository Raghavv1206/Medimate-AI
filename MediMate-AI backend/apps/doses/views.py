from datetime import date, timedelta
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import DoseLog
from .serializers import DoseLogSerializer
from apps.patients.models import PatientProfile

def get_target_patient_profile(request, patient_id=None):
    """
    Helper to get the target patient profile based on user role and patient_id.
    Ensures that caretakers can only access their assigned patients' profiles.
    """
    user = request.user
    if user.role == 'admin':
        if patient_id:
            return PatientProfile.objects.filter(id=patient_id).first()
        return None
    elif user.role == 'caretaker':
        if not patient_id:
            return None
        try:
            return user.caretaker_profile.patients.filter(id=patient_id).first()
        except Exception:
            return None
    else:
        # Patient role can only access their own profile
        try:
            return user.patient_profile
        except PatientProfile.DoesNotExist:
            return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def today_doses(request):
    """
    Feature #23: Today's Doses View.
    GET /api/doses/today/
    """
    patient_id = request.GET.get('patient_id')
    patient = get_target_patient_profile(request, patient_id)
    if patient_id and not patient:
        return Response({'error': 'Unauthorized or patient profile not found'}, status=403)
    
    if not patient:
        if request.user.role == 'admin':
            doses = DoseLog.objects.filter(scheduled_date=date.today())
        else:
            return Response({'error': 'Patient profile not found'}, status=404)
    else:
        doses = DoseLog.objects.filter(patient=patient, scheduled_date=date.today())
        
    doses = doses.select_related('medicine').order_by('scheduled_time')
    serializer = DoseLogSerializer(doses, many=True)
    summary = {
        'total': doses.count(),
        'taken': doses.filter(status='taken').count(),
        'pending': doses.filter(status='pending').count(),
        'missed': doses.filter(status='missed').count(),
        'skipped': doses.filter(status='skipped').count(),
    }
    return Response({'doses': serializer.data, 'summary': summary})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def take_dose(request, pk):
    """
    Feature #24: Mark Dose as Taken.
    POST /api/doses/{id}/take/
    Feature #26: Duplicate take prevention.
    """
    try:
        dose = DoseLog.objects.get(pk=pk)
    except DoseLog.DoesNotExist:
        return Response({'error': 'Dose not found'}, status=404)
        
    # Check authorization
    if request.user.role == 'patient' and dose.patient.user != request.user:
        return Response({'error': 'Unauthorized'}, status=403)
    elif request.user.role == 'caretaker':
        try:
            if not request.user.caretaker_profile.patients.filter(id=dose.patient.id).exists():
                return Response({'error': 'Unauthorized'}, status=403)
        except Exception:
            return Response({'error': 'Unauthorized'}, status=403)
            
    if dose.status == 'taken':
        return Response({'error': 'Already marked as taken'}, status=409)
        
    dose.status = 'taken'
    dose.taken_at = timezone.now()
    dose.save()
    return Response({'status': 'taken', 'taken_at': dose.taken_at})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def skip_dose(request, pk):
    """
    Feature #25: Skip Dose with Reason.
    POST /api/doses/{id}/skip/
    """
    try:
        dose = DoseLog.objects.get(pk=pk)
    except DoseLog.DoesNotExist:
        return Response({'error': 'Dose not found'}, status=404)
        
    # Check authorization
    if request.user.role == 'patient' and dose.patient.user != request.user:
        return Response({'error': 'Unauthorized'}, status=403)
    elif request.user.role == 'caretaker':
        try:
            if not request.user.caretaker_profile.patients.filter(id=dose.patient.id).exists():
                return Response({'error': 'Unauthorized'}, status=403)
        except Exception:
            return Response({'error': 'Unauthorized'}, status=403)
            
    dose.status = 'skipped'
    dose.skip_reason = request.data.get('reason', '')
    dose.save()
    return Response({'status': 'skipped'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dose_history(request):
    """
    Feature #27: Dose History with Filters.
    GET /api/doses/history/
    """
    patient_id = request.GET.get('patient_id')
    patient = get_target_patient_profile(request, patient_id)
    if patient_id and not patient:
        return Response({'error': 'Unauthorized or patient profile not found'}, status=403)
        
    from_date = request.GET.get('from', (date.today() - timedelta(days=30)).isoformat())
    to_date = request.GET.get('to', date.today().isoformat())
    status_filter = request.GET.get('status')
    
    if not patient:
        if request.user.role == 'admin':
            qs = DoseLog.objects.filter(scheduled_date__gte=from_date, scheduled_date__lte=to_date)
        else:
            return Response({'error': 'Patient profile not found'}, status=404)
    else:
        qs = DoseLog.objects.filter(
            patient=patient,
            scheduled_date__gte=from_date,
            scheduled_date__lte=to_date,
        )
        
    qs = qs.select_related('medicine').order_by('-scheduled_date', '-scheduled_time')
    if status_filter:
        qs = qs.filter(status=status_filter)
        
    return Response({'doses': DoseLogSerializer(qs, many=True).data, 'total': qs.count()})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weekly_doses(request):
    """
    Feature #28: Weekly Calendar Grid.
    GET /api/doses/weekly/
    """
    patient_id = request.GET.get('patient_id')
    patient = get_target_patient_profile(request, patient_id)
    if patient_id and not patient:
        return Response({'error': 'Unauthorized or patient profile not found'}, status=403)
        
    if not patient:
        return Response({'error': 'Patient profile required'}, status=400)
        
    today = date.today()
    start = today - timedelta(days=today.weekday())
    week_grid = []
    for i in range(7):
        day = start + timedelta(days=i)
        doses = DoseLog.objects.filter(patient=patient, scheduled_date=day)
        week_grid.append({
            'date': day.isoformat(),
            'day_name': day.strftime('%A'),
            'total': doses.count(),
            'taken': doses.filter(status='taken').count(),
            'missed': doses.filter(status='missed').count(),
            'skipped': doses.filter(status='skipped').count(),
        })
    return Response({'week_grid': week_grid})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def missed_doses(request):
    """
    Feature #29: Missed Doses Report.
    GET /api/doses/missed/
    """
    patient_id = request.GET.get('patient_id')
    patient = get_target_patient_profile(request, patient_id)
    if patient_id and not patient:
        return Response({'error': 'Unauthorized or patient profile not found'}, status=403)
        
    days = int(request.GET.get('days', 7))
    cutoff = date.today() - timedelta(days=days)
    
    if not patient:
        if request.user.role == 'admin':
            missed = DoseLog.objects.filter(status='missed', scheduled_date__gte=cutoff)
        else:
            return Response({'error': 'Patient profile not found'}, status=404)
    else:
        missed = DoseLog.objects.filter(
            patient=patient, status='missed', scheduled_date__gte=cutoff
        )
        
    missed = missed.select_related('medicine')
    return Response({'missed': DoseLogSerializer(missed, many=True).data, 'count': missed.count()})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dose_summary(request):
    """
    Returns adherence summary for the past N days.
    GET /api/doses/summary/?days=7
    """
    patient_id = request.GET.get('patient_id')
    patient = get_target_patient_profile(request, patient_id)
    if patient_id and not patient:
        return Response({'error': 'Unauthorized or patient profile not found'}, status=403)
        
    days = int(request.GET.get('days', 7))
    cutoff = date.today() - timedelta(days=days - 1)
    
    if not patient:
        if request.user.role == 'admin':
            doses = DoseLog.objects.filter(scheduled_date__gte=cutoff)
        else:
            return Response({'error': 'Patient profile not found'}, status=404)
    else:
        doses = DoseLog.objects.filter(patient=patient, scheduled_date__gte=cutoff)
        
    total_doses = doses.count()
    taken_doses = doses.filter(status='taken').count()
    
    adherence_percentage = 100
    if total_doses > 0:
        adherence_percentage = round((taken_doses / total_doses) * 100)
        
    return Response({
        'adherence_percentage': adherence_percentage,
        'total_doses': total_doses,
        'taken': taken_doses,
    })

