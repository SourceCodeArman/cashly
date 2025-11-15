"""
Subscription limit service for checking and enforcing subscription limits.
"""
import logging
from typing import Optional, Callable
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone

from .limits import (
    get_limit,
    is_unlimited,
    is_boolean_feature,
    format_limit_for_response,
    TIER_FREE,
)
from .services import get_user_subscription_status
from .exceptions import (
    SubscriptionLimitExceeded,
    FeatureNotAvailable,
    SubscriptionExpired,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class SubscriptionLimitService:
    """
    Service for checking and enforcing subscription limits.
    
    This service provides methods to validate user entitlements before
    allowing resource creation or feature access.
    """
    
    @staticmethod
    def get_limit(user: User, feature_type: str) -> Optional[int]:
        """
        Get user's limit for a specific feature.
        
        Args:
            user: Django User instance
            feature_type: Feature type constant from limits module
            
        Returns:
            Limit value (int for numeric limits, bool for feature flags, 
            timedelta for time-based limits, or None for unlimited)
        """
        status_info = get_user_subscription_status(user)
        tier = status_info['tier']
        
        # If subscription expired and user was on a paid tier, downgrade to free
        if not status_info['is_active'] and tier != TIER_FREE:
            tier = TIER_FREE
            logger.info(f"Subscription expired for user {user.id}, using free tier limits")
        
        try:
            return get_limit(tier, feature_type)
        except KeyError as e:
            logger.error(f"Error getting limit for user {user.id}, tier {tier}, feature {feature_type}: {e}")
            # Default to free tier limits if tier doesn't exist
            return get_limit(TIER_FREE, feature_type)
    
    @staticmethod
    def can_access_feature(user: User, feature_type: str) -> bool:
        """
        Check if user can access a boolean feature (feature flag).
        
        For boolean features, returns True if feature is available for user's tier.
        
        Args:
            user: Django User instance
            feature_type: Feature type constant from limits module
            
        Returns:
            True if feature is available, False otherwise
            
        Raises:
            ValueError: If feature_type is not a boolean feature
        """
        if not is_boolean_feature(feature_type):
            raise ValueError(f"Feature {feature_type} is not a boolean feature. Use check_limit() for numeric limits.")
        
        limit = SubscriptionLimitService.get_limit(user, feature_type)
        return bool(limit)
    
    @staticmethod
    def check_limit(
        user: User,
        feature_type: str,
        current_count: Optional[int] = None,
        get_current_count: Optional[Callable[[User], int]] = None
    ) -> bool:
        """
        Check if user is within their subscription limit for a feature.
        
        For boolean features, checks if feature is available.
        For numeric features, checks if current_count is below limit.
        
        Args:
            user: Django User instance
            feature_type: Feature type constant from limits module
            current_count: Current usage count (optional, will be fetched if not provided)
            get_current_count: Callable to fetch current count if current_count not provided
            
        Returns:
            True if within limit, False otherwise
        """
        limit = SubscriptionLimitService.get_limit(user, feature_type)
        
        # Boolean features
        if is_boolean_feature(feature_type):
            return bool(limit)
        
        # Numeric features with unlimited
        if is_unlimited(limit):
            return True
        
        # Numeric features with limit
        if current_count is None:
            if get_current_count is None:
                raise ValueError(
                    f"Either current_count or get_current_count must be provided "
                    f"for numeric feature {feature_type}"
                )
            current_count = get_current_count(user)
        
        return current_count < limit
    
    @staticmethod
    def enforce_limit(
        user: User,
        feature_type: str,
        current_count: Optional[int] = None,
        get_current_count: Optional[Callable[[User], int]] = None
    ) -> None:
        """
        Enforce subscription limit, raising exception if exceeded.
        
        Args:
            user: Django User instance
            feature_type: Feature type constant from limits module
            current_count: Current usage count (optional)
            get_current_count: Callable to fetch current count if current_count not provided
            
        Raises:
            FeatureNotAvailable: If feature is not available for user's tier
            SubscriptionLimitExceeded: If numeric limit is exceeded
            SubscriptionExpired: If subscription has expired
        """
        status_info = get_user_subscription_status(user)
        tier = status_info['tier']
        
        # Check if subscription expired for paid tiers
        if not status_info['is_active'] and tier != TIER_FREE:
            raise SubscriptionExpired(tier=TIER_FREE)
        
        limit = SubscriptionLimitService.get_limit(user, feature_type)
        
        # Boolean features
        if is_boolean_feature(feature_type):
            if not limit:
                raise FeatureNotAvailable(feature_type, tier)
            return  # Feature is available
        
        # Numeric features with unlimited
        if is_unlimited(limit):
            return  # No limit to enforce
        
        # Numeric features with limit
        if current_count is None:
            if get_current_count is None:
                raise ValueError(
                    f"Either current_count or get_current_count must be provided "
                    f"for numeric feature {feature_type}"
                )
            current_count = get_current_count(user)
        
        if current_count >= limit:
            raise SubscriptionLimitExceeded(
                feature=feature_type,
                current_count=current_count,
                limit=int(limit) if not isinstance(limit, timedelta) else limit.days,
                tier=tier
            )
    
    @staticmethod
    def get_transaction_history_limit(user: User) -> Optional[timedelta]:
        """
        Get transaction history date range limit for user.
        
        Convenience method for transaction history limits.
        
        Args:
            user: Django User instance
            
        Returns:
            timedelta object representing the limit, or None for unlimited
        """
        limit = SubscriptionLimitService.get_limit(user, 'transaction_history')
        
        if is_unlimited(limit):
            return None
        
        if isinstance(limit, timedelta):
            return limit
        
        # If limit is stored as days, convert to timedelta
        if isinstance(limit, int):
            return timedelta(days=limit)
        
        return None
    
    @staticmethod
    def get_usage_info(user: User, feature_type: str, get_current_count: Callable[[User], int]) -> dict:
        """
        Get usage information for a feature (current usage and limits).
        
        Useful for API responses that include usage statistics.
        
        Args:
            user: Django User instance
            feature_type: Feature type constant from limits module
            get_current_count: Callable to get current usage count
            
        Returns:
            Dictionary with usage information:
            {
                'current_count': int,
                'limit': int | None,
                'is_unlimited': bool,
                'tier': str,
                'remaining': int | None,
            }
        """
        status_info = get_user_subscription_status(user)
        tier = status_info['tier']
        limit = SubscriptionLimitService.get_limit(user, feature_type)
        
        # Boolean features
        if is_boolean_feature(feature_type):
            return {
                'has_access': bool(limit),
                'tier': tier,
            }
        
        # Numeric features
        current_count = get_current_count(user)
        is_unlimited_limit = is_unlimited(limit)
        
        # Format limit for response
        limit_value = None if is_unlimited_limit else (
            limit.days if isinstance(limit, timedelta) else int(limit)
        )
        
        remaining = None
        if not is_unlimited_limit and isinstance(limit, (int, timedelta)):
            limit_int = limit.days if isinstance(limit, timedelta) else int(limit)
            remaining = max(0, limit_int - current_count)
        
        return {
            'current_count': current_count,
            'limit': limit_value,
            'is_unlimited': is_unlimited_limit,
            'tier': tier,
            'remaining': remaining,
        }

