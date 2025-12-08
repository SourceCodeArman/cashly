"""
URLs for accounts app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

router = DefaultRouter()
router.register(r'', views.AccountViewSet, basename='account')

app_name = 'accounts'
urlpatterns = [
    # Authentication endpoints
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('login/', views.UserLoginView.as_view(), name='login'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('password-reset/', views.PasswordResetView.as_view(), name='password-reset'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('password-change/', views.PasswordChangeView.as_view(), name='password-change'),
    path('email-change/request/', views.RequestEmailChangeView.as_view(), name='email-change-request'),
    path('email-change/verify/', views.VerifyEmailChangeView.as_view(), name='email-change-verify'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # MFA endpoints
    path('mfa/setup/', views.MFASetupView.as_view(), name='mfa-setup'),
    path('mfa/verify-setup/', views.MFAVerifySetupView.as_view(), name='mfa-verify-setup'),
    path('mfa/verify-login/', views.MFALoginVerifyView.as_view(), name='mfa-verify-login'),
    path('mfa/disable/', views.MFADisableView.as_view(), name='mfa-disable'),
    path('mfa/backup-codes/generate/', views.MFAGenerateBackupCodesView.as_view(), name='mfa-backup-codes-generate'),
    path('mfa/backup-codes/verify/', views.MFAVerifyBackupCodeView.as_view(), name='mfa-backup-codes-verify'),
    
    # Account endpoints are in account_urls.py
]

