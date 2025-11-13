"""
Account-specific URLs (separate from auth URLs).
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views
from .webhooks import PlaidWebhookView

router = DefaultRouter()
router.register(r'', views.AccountViewSet, basename='account')

app_name = 'accounts_api'  # Changed from 'accounts' to avoid namespace conflict
urlpatterns = [
    path('create-link-token/', views.CreateLinkTokenView.as_view(), name='create-link-token'),
    path('connect/', views.AccountConnectionView.as_view(), name='connect'),
    path('webhook/', PlaidWebhookView.as_view(), name='webhook'),
    path('', include(router.urls)),
]

