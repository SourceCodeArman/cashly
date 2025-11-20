"""
Admin-only permission classes.
"""
from rest_framework.permissions import BasePermission


class IsSuperUser(BasePermission):
    """
    Permission class that only allows superusers to access the view.
    """
    
    def has_permission(self, request, view):
        """
        Check if user is authenticated and is a superuser.
        """
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.is_superuser
        )
