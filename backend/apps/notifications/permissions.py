"""
Permissions for notifications app.
"""
from rest_framework import permissions
from .models import Notification


class IsNotificationOwner(permissions.BasePermission):
    """
    Permission to only allow owners to access their notifications.
    """
    
    def has_object_permission(self, request, view, obj):
        """Check if user owns the notification."""
        if isinstance(obj, Notification):
            return obj.user == request.user
        return False
    
    def has_permission(self, request, view):
        """Check if user is authenticated."""
        return request.user and request.user.is_authenticated

