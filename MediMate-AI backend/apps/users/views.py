import os
from typing import Any, cast
from django.shortcuts import redirect
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
import requests

User = get_user_model()



@api_view(['GET'])
@permission_classes([AllowAny])
def google_login(request):
    """
    Feature #1: Google OAuth 2.0 Login
    Returns the Google OAuth2 authorization URL for the frontend to redirect to.
    """
    client_id = os.environ.get('GOOGLE_CLIENT_ID')
    redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:8000/auth/callback/')
    scope = 'openid email profile'
    
    # Read the role from frontend query parameters
    role = request.GET.get('role', 'patient').strip().lower()
    if role not in ['patient', 'caretaker']:
        role = 'patient'
        
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&state={role}"
    )
    return Response({'auth_url': auth_url})


@api_view(['GET'])
@permission_classes([AllowAny])
def google_callback(request):
    """
    Feature #2: JWT Session Management + Feature #14: Avatar from Google
    Exchanges Google authorization code for tokens, creates/gets User,
    saves avatar from Google profile, and issues JWT tokens.
    """
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    
    # Handle error or user cancellation from Google OAuth redirect
    error = request.GET.get('error')
    if error:
        return redirect(f"{frontend_url}/login?error={error}")

    code = request.GET.get('code')
    if not code:
        return redirect(f"{frontend_url}/login?error=no_code")

    # Exchange code for Google tokens
    try:
        token_resp = requests.post('https://oauth2.googleapis.com/token', data={
            'code': code,
            'client_id': os.environ.get('GOOGLE_CLIENT_ID'),
            'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET'),
            'redirect_uri': os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:8000/auth/callback/'),
            'grant_type': 'authorization_code',
        }, timeout=10.0)
        token_resp.raise_for_status()
        token_data = token_resp.json()
    except Exception:
        return redirect(f"{frontend_url}/login?error=token_exchange_failed")

    if 'error' in token_data:
        return redirect(f"{frontend_url}/login?error={token_data['error']}")

    # Get user info from Google
    try:
        userinfo_resp = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f"Bearer {token_data['access_token']}"},
            timeout=10.0
        )
        userinfo_resp.raise_for_status()
        userinfo = userinfo_resp.json()
    except Exception:
        return redirect(f"{frontend_url}/login?error=userinfo_fetch_failed")

    # Retrieve and validate state parameter (representing the selected role)
    role = request.GET.get('state', 'patient').strip().lower()
    if role not in ['patient', 'caretaker']:
        role = 'patient'

    # Create or get user — Feature #14: avatar_url saved from Google profile
    user_obj, created = User.objects.get_or_create(
        google_id=userinfo['id'],
        defaults={
            'username': userinfo['email'].split('@')[0],
            'email': userinfo['email'],
            'full_name': userinfo.get('name', ''),
            'avatar_url': userinfo.get('picture', ''),
            'role': role,
        }
    )
    user = cast(Any, user_obj)
    if not created:
        # Update profile info on each login
        user.full_name = userinfo.get('name', user.full_name)
        user.avatar_url = userinfo.get('picture', user.avatar_url)
        user.save()

    # Issue JWT tokens — Feature #2
    refresh = cast(Any, RefreshToken.for_user(user))
    refresh['role'] = user.role
    refresh['email'] = user.email

    # Redirect to frontend with tokens in URL params
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    redirect_url = (
        f"{frontend_url}/login"
        f"?access={str(refresh.access_token)}"
        f"&refresh={str(refresh)}"
        f"&user_id={user.id}"
        f"&role={user.role}"
        f"&name={user.full_name}"
        f"&avatar={user.avatar_url or ''}"
    )
    return redirect(redirect_url)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_me(request):
    """Return current authenticated user's info."""
    user = cast(Any, request.user)
    return Response({
        'id': user.id,
        'email': user.email,
        'full_name': user.full_name,
        'role': user.role,
        'avatar_url': user.avatar_url,
        'whatsapp_number': user.whatsapp_number,
        'has_profile': hasattr(user, 'patient_profile'),
        'onboarding_done': getattr(user, 'patient_profile', None) and user.patient_profile.onboarding_done or False,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auth_logout(request):
    """
    Feature #6: Secure Logout
    Blacklists the refresh token so it can't be reused.
    Frontend should also clear its local state.
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass  # Token may already be invalid/expired — that's fine
    return Response({'success': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """
    Feature #69: System-wide statistics endpoint (admin only).
    """
    user = cast(Any, request.user)
    if user.role != 'admin':
        return Response({'error': 'Access denied: Admin role required'}, status=403)
        
    from apps.patients.models import PatientProfile, Caretaker
    from apps.medicines.models import MedicineSchedule
    from apps.doses.models import DoseLog
    from apps.escalation.models import EscalationLog
    
    total_patients = PatientProfile.objects.count()
    total_caretakers = Caretaker.objects.count()
    total_users = User.objects.count()
    total_schedules = MedicineSchedule.objects.count()
    total_doses = DoseLog.objects.count()
    total_escalations = EscalationLog.objects.count()
    
    # Compliance rate calculation
    non_pending = DoseLog.objects.exclude(status='pending')
    total_non_pending = non_pending.count()
    taken_doses = non_pending.filter(status='taken').count()
    compliance_rate = round((taken_doses / total_non_pending * 100), 1) if total_non_pending > 0 else 100.0
    
    # Risk level breakdown
    risk_breakdown = {
        'low': PatientProfile.objects.filter(risk_level='low').count(),
        'medium': PatientProfile.objects.filter(risk_level='medium').count(),
        'high': PatientProfile.objects.filter(risk_level='high').count(),
        'critical': PatientProfile.objects.filter(risk_level='critical').count(),
    }
    
    stats = {
        'total_patients': total_patients,
        'total_caretakers': total_caretakers,
        'total_users': total_users,
        'total_schedules': total_schedules,
        'total_doses': total_doses,
        'total_escalations': total_escalations,
        'compliance_rate': compliance_rate,
        'risk_breakdown': risk_breakdown,
    }
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_users(request):
    """
    Feature #65: View all users (paginated table, restricted to admin).
    """
    user = cast(Any, request.user)
    if user.role != 'admin':
        return Response({'error': 'Access denied: Admin role required'}, status=403)
        
    from django.core.paginator import Paginator
    from django.db.models import Q
    from .serializers import UserSerializer
    
    role_filter = request.GET.get('role')
    search_query = request.GET.get('search')
    users = User.objects.all().order_by('-created_at')
    
    if role_filter:
        users = users.filter(role=role_filter)
    if search_query:
        users = users.filter(
            Q(email__icontains=search_query) | 
            Q(username__icontains=search_query) | 
            Q(full_name__icontains=search_query)
        )
        
    paginator = Paginator(users, 10) # 10 users per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    serializer = UserSerializer(page_obj, many=True)
    return Response({
        'users': serializer.data,
        'total_count': paginator.count,
        'total_pages': paginator.num_pages,
        'current_page': page_obj.number,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
    })
