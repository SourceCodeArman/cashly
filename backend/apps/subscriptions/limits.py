"""
Subscription limits configuration for different tiers.
"""
from typing import Dict, Any, Optional
from datetime import timedelta


# Feature types
FEATURE_ACCOUNTS = 'accounts'
FEATURE_GOALS = 'goals'
FEATURE_BUDGETS = 'budgets'
FEATURE_TRANSACTION_HISTORY = 'transaction_history'
FEATURE_AI_CATEGORIZATION = 'ai_categorization'
FEATURE_ADVANCED_ANALYTICS = 'advanced_analytics'
FEATURE_EXPORT = 'export'
FEATURE_TRANSFER_AUTHORIZATION = 'transfer_authorization'

# Tier constants
TIER_FREE = 'free'
TIER_PREMIUM = 'premium'
TIER_PRO = 'pro'
TIER_ENTERPRISE = 'enterprise'

# Unlimited constant for numeric limits
UNLIMITED = None


def _transaction_history_days(days: int) -> timedelta:
    """Helper to create timedelta for transaction history limits."""
    return timedelta(days=days)


# Subscription limits configuration
# Format: {tier: {feature: limit}}
SUBSCRIPTION_LIMITS: Dict[str, Dict[str, Any]] = {
    TIER_FREE: {
        FEATURE_ACCOUNTS: 3,
        FEATURE_GOALS: 3,
        FEATURE_BUDGETS: 5,
        FEATURE_TRANSACTION_HISTORY: _transaction_history_days(30),
        FEATURE_AI_CATEGORIZATION: False,
        FEATURE_ADVANCED_ANALYTICS: False,
        FEATURE_EXPORT: False,
        FEATURE_TRANSFER_AUTHORIZATION: False,
    },
    TIER_PREMIUM: {
        FEATURE_ACCOUNTS: UNLIMITED,
        FEATURE_GOALS: UNLIMITED,
        FEATURE_BUDGETS: UNLIMITED,
        FEATURE_TRANSACTION_HISTORY: UNLIMITED,
        FEATURE_AI_CATEGORIZATION: True,
        FEATURE_ADVANCED_ANALYTICS: True,
        FEATURE_EXPORT: True,
        FEATURE_TRANSFER_AUTHORIZATION: True,
    },
    TIER_PRO: {
        FEATURE_ACCOUNTS: 10,  # Up to 10 connected accounts
        FEATURE_GOALS: UNLIMITED,
        FEATURE_BUDGETS: UNLIMITED,
        FEATURE_TRANSACTION_HISTORY: UNLIMITED,
        FEATURE_AI_CATEGORIZATION: True,
        FEATURE_ADVANCED_ANALYTICS: True,
        FEATURE_EXPORT: True,
        FEATURE_TRANSFER_AUTHORIZATION: True,
    },
    TIER_ENTERPRISE: {
        FEATURE_ACCOUNTS: UNLIMITED,  # 20+ accounts, effectively unlimited
        FEATURE_GOALS: UNLIMITED,
        FEATURE_BUDGETS: UNLIMITED,
        FEATURE_TRANSACTION_HISTORY: UNLIMITED,
        FEATURE_AI_CATEGORIZATION: True,
        FEATURE_ADVANCED_ANALYTICS: True,
        FEATURE_EXPORT: True,
        FEATURE_TRANSFER_AUTHORIZATION: True,
    },
}


def get_limit(tier: str, feature_type: str) -> Any:
    """
    Get the limit for a specific tier and feature.
    
    Args:
        tier: Subscription tier (free, premium, pro)
        feature_type: Feature type constant
        
    Returns:
        Limit value (int, bool, timedelta, or None for unlimited)
        
    Raises:
        KeyError: If tier or feature_type doesn't exist
    """
    if tier not in SUBSCRIPTION_LIMITS:
        raise KeyError(f"Unknown subscription tier: {tier}")
    
    tier_limits = SUBSCRIPTION_LIMITS[tier]
    if feature_type not in tier_limits:
        raise KeyError(f"Unknown feature type: {feature_type}")
    
    return tier_limits[feature_type]


def is_unlimited(limit: Any) -> bool:
    """
    Check if a limit value represents unlimited access.
    
    Args:
        limit: Limit value to check
        
    Returns:
        True if limit is unlimited, False otherwise
    """
    return limit is UNLIMITED


def is_boolean_feature(feature_type: str) -> bool:
    """
    Check if a feature is a boolean (access/no access) feature.
    
    Args:
        feature_type: Feature type constant
        
    Returns:
        True if feature is boolean, False if it's a numeric limit
    """
    boolean_features = {
        FEATURE_AI_CATEGORIZATION,
        FEATURE_ADVANCED_ANALYTICS,
        FEATURE_EXPORT,
        FEATURE_TRANSFER_AUTHORIZATION,
    }
    return feature_type in boolean_features


def get_all_limits(tier: str) -> Dict[str, Any]:
    """
    Get all limits for a subscription tier.
    
    Args:
        tier: Subscription tier (free, premium, pro)
        
    Returns:
        Dictionary of all feature limits for the tier
        
    Raises:
        KeyError: If tier doesn't exist
    """
    if tier not in SUBSCRIPTION_LIMITS:
        raise KeyError(f"Unknown subscription tier: {tier}")
    
    return SUBSCRIPTION_LIMITS[tier].copy()


def format_limit_for_response(limit: Any) -> Any:
    """
    Format limit value for API response.
    
    Converts timedelta to days, preserves other types.
    
    Args:
        limit: Limit value to format
        
    Returns:
        Formatted limit value (int for days, bool, or None for unlimited)
    """
    if limit is UNLIMITED:
        return None
    
    if isinstance(limit, timedelta):
        return limit.days
    
    return limit

