"""
Custom exceptions for subscription limit enforcement.
"""
from django.core.exceptions import ValidationError
from rest_framework import status


class SubscriptionLimitExceeded(ValidationError):
    """
    Exception raised when a subscription limit is exceeded.
    
    Attributes:
        feature: Feature type that exceeded limit
        current_count: Current usage count
        limit: Limit value
        tier: User's subscription tier
        error_code: Error code for frontend handling
    """
    
    error_code = 'SUBSCRIPTION_LIMIT_EXCEEDED'
    status_code = status.HTTP_403_FORBIDDEN
    
    def __init__(
        self,
        feature: str,
        current_count: int,
        limit: int,
        tier: str,
        message: str = None
    ):
        self.feature = feature
        self.current_count = current_count
        self.limit = limit
        self.tier = tier
        
        if message is None:
            message = (
                f"Subscription limit exceeded for {feature}. "
                f"Current usage: {current_count}, Limit: {limit} "
                f"(Tier: {tier}). Please upgrade your subscription to continue."
            )
        
        # Store message as instance attribute for easy access
        self._message = message
        
        # Pass message as a list to ValidationError to avoid string conversion issues
        super().__init__([message])
    
    def to_dict(self) -> dict:
        """
        Convert exception to dictionary for API response.
        
        Returns:
            Dictionary with error details
        """
        # Use stored message or convert to string, handling list representation
        message = self._message if hasattr(self, '_message') else str(self)
        
        # If message is a list (from ValidationError), get first element
        if isinstance(message, list):
            message = message[0] if message else str(self)
        
        return {
            'status': 'error',
            'data': None,
            'message': message,
            'error_code': self.error_code,
            'error_details': {
                'feature': self.feature,
                'current_count': self.current_count,
                'limit': self.limit,
                'tier': self.tier,
                'upgrade_required': True,
            }
        }


class FeatureNotAvailable(ValidationError):
    """
    Exception raised when a feature is not available for the user's tier.
    
    Attributes:
        feature: Feature type that is not available
        tier: User's subscription tier
        error_code: Error code for frontend handling
    """
    
    error_code = 'FEATURE_NOT_AVAILABLE'
    status_code = status.HTTP_403_FORBIDDEN
    
    def __init__(
        self,
        feature: str,
        tier: str,
        message: str = None
    ):
        self.feature = feature
        self.tier = tier
        
        if message is None:
            tier_display = tier.title() if tier else 'Free'
            message = (
                f"Feature '{feature}' is not available for {tier_display} tier. "
                f"Please upgrade your subscription to access this feature."
            )
        
        # Store message as instance attribute for easy access
        self._message = message
        
        # Pass message as a list to ValidationError to avoid string conversion issues
        super().__init__([message])
    
    def to_dict(self) -> dict:
        """
        Convert exception to dictionary for API response.
        
        Returns:
            Dictionary with error details
        """
        # Use stored message or convert to string, handling list representation
        message = self._message if hasattr(self, '_message') else str(self)
        
        # If message is a list (from ValidationError), get first element
        if isinstance(message, list):
            message = message[0] if message else str(self)
        
        return {
            'status': 'error',
            'data': None,
            'message': message,
            'error_code': self.error_code,
            'error_details': {
                'feature': self.feature,
                'tier': self.tier,
                'upgrade_required': True,
            }
        }


class SubscriptionExpired(ValidationError):
    """
    Exception raised when a subscription has expired.
    
    Attributes:
        tier: User's subscription tier (may be downgraded)
        error_code: Error code for frontend handling
    """
    
    error_code = 'SUBSCRIPTION_EXPIRED'
    status_code = status.HTTP_403_FORBIDDEN
    
    def __init__(
        self,
        tier: str = 'free',
        message: str = None
    ):
        self.tier = tier
        
        if message is None:
            message = (
                "Your subscription has expired. "
                "Please renew your subscription to continue using premium features."
            )
        
        # Store message as instance attribute for easy access
        self._message = message
        
        # Pass message as a list to ValidationError to avoid string conversion issues
        super().__init__([message])
    
    def to_dict(self) -> dict:
        """
        Convert exception to dictionary for API response.
        
        Returns:
            Dictionary with error details
        """
        # Use stored message or convert to string, handling list representation
        message = self._message if hasattr(self, '_message') else str(self)
        
        # If message is a list (from ValidationError), get first element
        if isinstance(message, list):
            message = message[0] if message else str(self)
        
        return {
            'status': 'error',
            'data': None,
            'message': message,
            'error_code': self.error_code,
            'error_details': {
                'tier': self.tier,
                'upgrade_required': True,
            }
        }

