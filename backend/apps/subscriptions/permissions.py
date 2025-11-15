"""
DRF permission classes for subscription limit enforcement.
"""
import logging
from rest_framework.permissions import BasePermission

from .limit_service import SubscriptionLimitService
from .exceptions import (
    SubscriptionLimitExceeded,
    FeatureNotAvailable,
    SubscriptionExpired,
)
from .limits import is_boolean_feature

logger = logging.getLogger(__name__)


class HasSubscriptionFeature(BasePermission):
    """
    Permission class to check if user has access to a subscription feature.
    
    Usage:
        permission_classes = [HasSubscriptionFeature('ai_categorization')]
    """
    
    def __init__(self, feature_type: str):
        """
        Initialize permission with feature type.
        
        Args:
            feature_type: Feature type constant from limits module
        """
        self.feature_type = feature_type
    
    def has_permission(self, request, view):
        """
        Check if user has permission to access the feature.
        
        Args:
            request: DRF request object
            view: DRF view object
            
        Returns:
            True if user has access, False otherwise
        """
        if not request.user or not request.user.is_authenticated:
            return False
        
        try:
            return SubscriptionLimitService.can_access_feature(
                request.user,
                self.feature_type
            )
        except (FeatureNotAvailable, SubscriptionExpired) as e:
            logger.info(f"Feature access denied for user {request.user.id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Error checking feature access for user {request.user.id}: {e}")
            return False
    
    def has_object_permission(self, request, view, obj):
        """
        Check object-level permission.
        
        For feature permissions, object-level permission is same as view-level.
        
        Args:
            request: DRF request object
            view: DRF view object
            obj: Object being accessed
            
        Returns:
            True if user has access, False otherwise
        """
        return self.has_permission(request, view)


class WithinSubscriptionLimit(BasePermission):
    """
    Permission class to check if user is within subscription limit for a resource.
    
    Usage:
        permission_classes = [WithinSubscriptionLimit('accounts', lambda user: user.accounts.count())]
    """
    
    def __init__(self, feature_type: str, get_current_count=None):
        """
        Initialize permission with feature type and count function.
        
        Args:
            feature_type: Feature type constant from limits module
            get_current_count: Callable that takes a user and returns current count
        """
        self.feature_type = feature_type
        self.get_current_count = get_current_count
    
    def has_permission(self, request, view):
        """
        Check if user is within subscription limit.
        
        Args:
            request: DRF request object
            view: DRF view object
            
        Returns:
            True if user is within limit, False otherwise
        """
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Boolean features should use HasSubscriptionFeature
        if is_boolean_feature(self.feature_type):
            logger.warning(
                f"WithinSubscriptionLimit used for boolean feature {self.feature_type}. "
                f"Use HasSubscriptionFeature instead."
            )
            try:
                return SubscriptionLimitService.can_access_feature(
                    request.user,
                    self.feature_type
                )
            except Exception as e:
                logger.error(f"Error checking feature access: {e}")
                return False
        
        # Numeric features
        try:
            return SubscriptionLimitService.check_limit(
                user=request.user,
                feature_type=self.feature_type,
                get_current_count=self.get_current_count
            )
        except (SubscriptionLimitExceeded, SubscriptionExpired) as e:
            logger.info(f"Limit check failed for user {request.user.id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Error checking limit for user {request.user.id}: {e}")
            return False
    
    def has_object_permission(self, request, view, obj):
        """
        Check object-level permission.
        
        For limit permissions, object-level permission is same as view-level.
        
        Args:
            request: DRF request object
            view: DRF view object
            obj: Object being accessed
            
        Returns:
            True if user is within limit, False otherwise
        """
        return self.has_permission(request, view)

