"""
Subscription status service for retrieving user subscription information.
"""
import logging
from typing import Dict, Optional, Any
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import Subscription

User = get_user_model()
logger = logging.getLogger(__name__)


def get_user_subscription_status(user: User) -> Dict[str, Any]:
    """
    Get user's subscription status from Subscription model with fallback to user.subscription_tier.
    
    Prefers active subscription from Subscription model over user.subscription_tier field.
    Validates subscription hasn't expired.
    
    Args:
        user: Django User instance
        
    Returns:
        Dictionary with subscription information:
        {
            'tier': str,  # 'free', 'premium', or 'pro'
            'status': str,  # Subscription status from Subscription model
            'is_active': bool,  # Whether subscription is currently active
            'subscription': Subscription | None,  # Subscription instance if exists
            'expires_at': datetime | None,  # When subscription expires
            'source': str,  # 'subscription_model' or 'user_field'
        }
    """
    try:
        # First, try to get active subscription from Subscription model
        subscription = Subscription.objects.for_user(user).current().first()
        
        if subscription:
            # Check if subscription is still valid
            now = timezone.now()
            is_currently_active = subscription.is_active() and subscription.current_period_end > now
            
            # Map subscription plan to tier (premium -> premium, pro -> pro)
            tier = subscription.plan  # plan is 'premium' or 'pro'
            
            return {
                'tier': tier,
                'status': subscription.status,
                'is_active': is_currently_active,
                'subscription': subscription,
                'expires_at': subscription.current_period_end,
                'source': 'subscription_model',
            }
    except Exception as e:
        logger.warning(f"Error retrieving subscription for user {user.id}: {e}")
    
    # Fallback to user.subscription_tier field
    tier = user.subscription_tier or 'free'
    
    # If user has subscription_status but subscription is expired, check dates
    if user.subscription_end_date and user.subscription_end_date < timezone.now():
        # Subscription expired, downgrade to free
        tier = 'free'
        is_active = False
    elif user.subscription_status in ['active', 'trialing']:
        is_active = True
    else:
        is_active = False
    
    return {
        'tier': tier,
        'status': user.subscription_status or 'none',
        'is_active': is_active,
        'subscription': None,
        'expires_at': user.subscription_end_date,
        'source': 'user_field',
    }


def get_user_tier(user: User) -> str:
    """
    Get user's subscription tier.
    
    Convenience method that returns just the tier string.
    
    Args:
        user: Django User instance
        
    Returns:
        Subscription tier: 'free', 'premium', or 'pro'
    """
    status_info = get_user_subscription_status(user)
    return status_info['tier']


def is_subscription_active(user: User) -> bool:
    """
    Check if user has an active subscription.
    
    Convenience method that returns just the active status.
    
    Args:
        user: Django User instance
        
    Returns:
        True if subscription is active, False otherwise
    """
    status_info = get_user_subscription_status(user)
    return status_info['is_active']

