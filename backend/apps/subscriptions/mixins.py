"""
DRF mixins for subscription limit enforcement.
"""
import logging
from rest_framework import status
from rest_framework.response import Response

from .limit_service import SubscriptionLimitService
from .exceptions import (
    SubscriptionLimitExceeded,
    FeatureNotAvailable,
    SubscriptionExpired,
)

logger = logging.getLogger(__name__)


class SubscriptionLimitMixin:
    """
    Mixin for ViewSets to enforce subscription limits before resource creation.
    
    Usage:
        class MyViewSet(SubscriptionLimitMixin, viewsets.ModelViewSet):
            limit_feature_type = 'accounts'  # Feature to check
            limit_get_count = lambda user: user.accounts.count()  # Get current count
            
            def get_limit_feature_type(self):
                # Override to return feature type dynamically
                return 'accounts'
    """
    
    # Override these in your ViewSet
    limit_feature_type = None  # Feature type constant
    limit_get_count = None  # Callable to get current count
    
    def get_limit_feature_type(self):
        """
        Get feature type for limit checking.
        
        Override this method to return feature type dynamically.
        
        Returns:
            Feature type constant from limits module
        """
        if self.limit_feature_type is None:
            raise ValueError(
                "limit_feature_type must be set or get_limit_feature_type() must be overridden"
            )
        return self.limit_feature_type
    
    def get_limit_get_count(self):
        """
        Get callable to fetch current count.
        
        Override this method to return count function dynamically.
        
        Returns:
            Callable that takes a user and returns current count
        """
        return self.limit_get_count
    
    def check_feature_access(self, feature_type: str):
        """
        Check if user has access to a feature.
        
        Convenience method for checking feature access.
        
        Args:
            feature_type: Feature type constant
            
        Raises:
            FeatureNotAvailable: If feature is not available
            SubscriptionExpired: If subscription expired
        """
        SubscriptionLimitService.enforce_limit(
            user=self.request.user,
            feature_type=feature_type
        )
    
    def check_limit_before_create(self):
        """
        Check subscription limit before creating a resource.
        
        Called automatically in create() method.
        
        Raises:
            SubscriptionLimitExceeded: If limit exceeded
            SubscriptionExpired: If subscription expired
        """
        feature_type = self.get_limit_feature_type()
        get_count = self.get_limit_get_count()
        
        if get_count is None:
            raise ValueError(
                f"limit_get_count must be set or get_limit_get_count() must be overridden "
                f"for feature {feature_type}"
            )
        
        SubscriptionLimitService.enforce_limit(
            user=self.request.user,
            feature_type=feature_type,
            get_current_count=get_count
        )
    
    def create(self, request, *args, **kwargs):
        """
        Create resource with subscription limit checking.
        
        Overrides ModelViewSet.create() to check limits before creation.
        
        Returns:
            Response with created resource or error if limit exceeded
        """
        try:
            # Check limit before creation
            self.check_limit_before_create()
        except SubscriptionLimitExceeded as e:
            logger.info(f"Limit exceeded for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except FeatureNotAvailable as e:
            logger.info(f"Feature not available for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except SubscriptionExpired as e:
            logger.info(f"Subscription expired for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(f"Error checking limit for user {request.user.id}: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'An error occurred while checking subscription limits',
                'error_code': 'SUBSCRIPTION_CHECK_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Proceed with normal creation
        return super().create(request, *args, **kwargs)
    
    def get_usage_info(self):
        """
        Get usage information for the limit feature.
        
        Useful for including in API responses.
        
        Returns:
            Dictionary with usage information
        """
        feature_type = self.get_limit_feature_type()
        get_count = self.get_limit_get_count()
        
        if get_count is None:
            return None
        
        return SubscriptionLimitService.get_usage_info(
            user=self.request.user,
            feature_type=feature_type,
            get_current_count=get_count
        )

