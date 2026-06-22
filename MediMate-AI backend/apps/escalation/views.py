from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import EscalationLog
from .serializers import EscalationLogSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_escalation_logs(request):
    """List escalation logs — filtered by role."""
    user = request.user
    if user.role == 'admin':
        logs = EscalationLog.objects.all()
    elif user.role == 'caretaker':
        # Show escalations for caretaker's assigned patients
        logs = EscalationLog.objects.filter(
            patient__caretakers__user=user
        )
    else:
        # Show only own escalations
        logs = EscalationLog.objects.filter(patient__user=user)

    logs = logs.order_by('-created_at')

    # Optional date filter
    date_filter = request.GET.get('date')
    if date_filter:
        logs = logs.filter(created_at__date=date_filter)

    return Response({
        'logs': EscalationLogSerializer(logs, many=True).data,
        'count': logs.count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """Mark all unread escalation logs for the user's role as read."""
    user = request.user
    if user.role == 'patient':
        EscalationLog.objects.filter(patient__user=user, is_read=False).update(is_read=True)
    elif user.role == 'caretaker':
        EscalationLog.objects.filter(patient__caretakers__user=user, is_read=False).update(is_read=True)
    else:  # admin
        EscalationLog.objects.filter(is_read=False).update(is_read=True)
    return Response({'status': 'success'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_log_read(request, pk):
    """Mark a single escalation log as read."""
    try:
        log = EscalationLog.objects.get(pk=pk)
    except EscalationLog.DoesNotExist:
        return Response({'error': 'Log not found'}, status=404)

    # Authorization checks
    if request.user.role == 'patient' and log.patient.user != request.user:
        return Response({'error': 'Unauthorized'}, status=403)
    elif request.user.role == 'caretaker':
        try:
            if not request.user.caretaker_profile.patients.filter(id=log.patient.id).exists():
                return Response({'error': 'Unauthorized'}, status=403)
        except Exception:
            return Response({'error': 'Unauthorized'}, status=403)

    log.is_read = True
    log.save()
    return Response({'status': 'success'})
