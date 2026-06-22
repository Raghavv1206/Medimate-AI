from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.users import views as users_views

urlpatterns = [
    # Django admin panel — accessible at http://localhost:8000/admin/
    path('admin/', admin.site.urls),

    # Auth endpoints — /auth/google/login/, /auth/callback/, /auth/me/
    path('auth/', include('apps.users.urls')),

    # API endpoints
    path('api/patients/', include('apps.patients.urls')),
    path('api/medicines/', include('apps.medicines.urls')),
    path('api/doses/', include('apps.doses.urls')),
    path('api/ai/', include('apps.ai.urls')),
    path('api/escalation/', include('apps.escalation.urls')),
    path('api/whatsapp/', include('apps.whatsapp.urls')),
    path('api/admin/stats/', users_views.admin_stats, name='admin-stats'),
    path('api/admin/users/', users_views.admin_users, name='admin-users'),

    # API Documentation — Swagger UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]