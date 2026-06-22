from django.urls import path
from . import views

urlpatterns = [
    path('today/', views.today_doses, name='doses-today'),
    path('<int:pk>/take/', views.take_dose, name='doses-take'),
    path('<int:pk>/skip/', views.skip_dose, name='doses-skip'),
    path('history/', views.dose_history, name='doses-history'),
    path('weekly/', views.weekly_doses, name='doses-weekly'),
    path('missed/', views.missed_doses, name='doses-missed'),
    path('summary/', views.dose_summary, name='doses-summary'),
]
