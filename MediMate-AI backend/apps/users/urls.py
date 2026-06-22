from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('google/login/', views.google_login, name='google-login'),
    path('callback/', views.google_callback, name='google-callback'),
    path('me/', views.auth_me, name='auth-me'),
    path('logout/', views.auth_logout, name='auth-logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
]
