"""
Custom permission classes for Cashly API.
"""
from rest_framework.permissions import BasePermission


class IsOwnerOrReadOnly(BasePermission):
    """
    Custom permission to only allow owners to edit their objects.
    Read permissions are allowed for any request.
    Write permissions are only allowed to the owner of the object.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any request
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # Write permissions only to the owner
        return obj.user == request.user


class IsAccountOwner(BasePermission):
    """
    Allow only the owner of the account to access it.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # For account-specific views, check ownership
        if hasattr(view, 'get_object'):
            try:
                account = view.get_object()
                return account.user == request.user
            except Exception:
                return True  # Let other permission checks handle it
        
        return True

