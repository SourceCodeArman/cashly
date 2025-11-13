"""
API URLs for health checks and utilities.
"""
from django.urls import path
from . import views

app_name = 'api'
urlpatterns = [
    path('', views.HealthCheckView.as_view(), name='health-check'),
]

