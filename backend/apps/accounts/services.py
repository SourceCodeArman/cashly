"""
Service layer for account-related business logic.
"""
import secrets
from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate
from .models import EmailChangeRequest, User


def create_email_change_request(user: User, new_email: str, password: str) -> EmailChangeRequest:
    """
    Create an email change request with verification token.
    
    Args:
        user: The user requesting the email change
        new_email: The new email address
        password: User's current password for verification
        
    Returns:
        EmailChangeRequest instance
        
    Raises:
        ValidationError: If password is invalid or email already exists
    """
    # Verify password
    auth_user = authenticate(username=user.email, password=password)
    if not auth_user:
        raise ValidationError("Invalid password")
    
    # Check if email is already in use
    if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
        raise ValidationError("Email address is already in use")
    
    # Check if it's the same as current email
    if user.email == new_email:
        raise ValidationError("New email must be different from current email")
    
    # Delete any existing pending requests for this user
    EmailChangeRequest.objects.filter(user=user).delete()
    
    # Generate secure token
    token = secrets.token_hex(32)
    
    # Set expiration (15 minutes from now)
    expires_at = timezone.now() + timedelta(minutes=15)
    
    # Create and save request
    request = EmailChangeRequest.objects.create(
        user=user,
        new_email=new_email,
        token=token,
        expires_at=expires_at
    )
    
    return request


def verify_email_change_token(token: str) -> User:
    """
    Verify an email change token and update the user's email.
    
    Args:
        token: The verification token
        
    Returns:
        The updated User instance
        
    Raises:
        ValidationError: If token is invalid or expired
    """
    try:
        request = EmailChangeRequest.objects.get(token=token)
    except EmailChangeRequest.DoesNotExist:
        raise ValidationError("Invalid or expired token")
    
    # Check if expired
    if request.is_expired():
        request.delete()
        raise ValidationError("Token has expired")
    
    # Check if email is now already in use (race condition protection)
    if User.objects.filter(email=request.new_email).exclude(pk=request.user.pk).exists():
        request.delete()
        raise ValidationError("Email address is already in use")
    
    # Update user's email
    user = request.user
    old_email = user.email
    user.email = request.new_email
    user.username = request.new_email  # Keep username in sync with email
    user.save()
    
    # Delete the request
    request.delete()
    
    # Send notification to old email (security alert)
    from apps.notifications.tasks import send_email_change_notification
    send_email_change_notification.delay(old_email, request.new_email)
    
    return user
