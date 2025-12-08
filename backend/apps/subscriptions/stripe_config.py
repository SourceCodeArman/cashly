"""
Stripe configuration and helper functions.
"""
from django.conf import settings


# Stripe Price IDs - Set via environment variables after creating products in Stripe
PREMIUM_MONTHLY_PRICE_ID = getattr(settings, 'STRIPE_PREMIUM_MONTHLY_PRICE_ID', 'price_1SU4th9FH3KQIIeT32lJfeW2')
PREMIUM_ANNUAL_PRICE_ID = getattr(settings, 'STRIPE_PREMIUM_ANNUAL_PRICE_ID', 'price_1SU4th9FH3KQIIeT32lJfeW2_annual')
PRO_MONTHLY_PRICE_ID = getattr(settings, 'STRIPE_PRO_MONTHLY_PRICE_ID', 'price_1SU4sS9FH3KQIIeTUG3QLP7T')
PRO_ANNUAL_PRICE_ID = getattr(settings, 'STRIPE_PRO_ANNUAL_PRICE_ID', 'price_1SU4sS9FH3KQIIeTUG3QLP7T_annual')
ENTERPRISE_MONTHLY_PRICE_ID = getattr(settings, 'STRIPE_ENTERPRISE_MONTHLY_PRICE_ID', '')
ENTERPRISE_ANNUAL_PRICE_ID = getattr(settings, 'STRIPE_ENTERPRISE_ANNUAL_PRICE_ID', '')


def get_price_id(plan: str, billing_cycle: str) -> str:
    """
    Get Stripe Price ID for given plan and billing cycle.
    
    Args:
        plan: 'premium', 'pro', or 'enterprise'
        billing_cycle: 'monthly' or 'annual'
    
    Returns:
        Stripe Price ID
    
    Raises:
        ValueError: If plan or billing_cycle is invalid
    """
    plan = plan.lower()
    billing_cycle = billing_cycle.lower()
    
    if plan == 'premium':
        if billing_cycle == 'monthly':
            return PREMIUM_MONTHLY_PRICE_ID
        elif billing_cycle == 'annual':
            return PREMIUM_ANNUAL_PRICE_ID
        else:
            raise ValueError(f"Invalid billing_cycle: {billing_cycle}")
    elif plan == 'pro':
        if billing_cycle == 'monthly':
            return PRO_MONTHLY_PRICE_ID
        elif billing_cycle == 'annual':
            return PRO_ANNUAL_PRICE_ID
        else:
            raise ValueError(f"Invalid billing_cycle: {billing_cycle}")
    elif plan == 'enterprise':
        if billing_cycle == 'monthly':
            return ENTERPRISE_MONTHLY_PRICE_ID
        elif billing_cycle == 'annual':
            return ENTERPRISE_ANNUAL_PRICE_ID
        else:
            raise ValueError(f"Invalid billing_cycle: {billing_cycle}")
    else:
        raise ValueError(f"Invalid plan: {plan}")


def get_all_price_ids() -> dict:
    """
    Get all configured Stripe Price IDs.
    
    Returns:
        Dictionary mapping plan and billing_cycle to Price IDs
    """
    return {
        'premium': {
            'monthly': PREMIUM_MONTHLY_PRICE_ID,
            'annual': PREMIUM_ANNUAL_PRICE_ID,
        },
        'pro': {
            'monthly': PRO_MONTHLY_PRICE_ID,
            'annual': PRO_ANNUAL_PRICE_ID,
        },
        'enterprise': {
            'monthly': ENTERPRISE_MONTHLY_PRICE_ID,
            'annual': ENTERPRISE_ANNUAL_PRICE_ID,
        },
    }


def validate_price_ids() -> bool:
    """
    Validate that all required Price IDs are configured.
    
    Note: Enterprise tier price IDs are optional as pricing is custom.
    
    Returns:
        True if all required Price IDs are set, False otherwise
    """
    return all([
        PREMIUM_MONTHLY_PRICE_ID,
        PREMIUM_ANNUAL_PRICE_ID,
        PRO_MONTHLY_PRICE_ID,
        PRO_ANNUAL_PRICE_ID,
        # Enterprise price IDs are optional (custom pricing)
    ])

