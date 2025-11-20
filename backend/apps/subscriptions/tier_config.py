"""
Centralized subscription tier configuration shared between API responses and UI.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Any

from django.conf import settings


DEFAULT_CURRENCY = 'usd'


@dataclass(frozen=True)
class TierDefinition:
    """Simple data container describing a subscription tier."""

    id: str
    name: str
    description: str
    monthly_price: float
    monthly_price_id: str
    features: List[str]
    badge: str | None = None
    highlight: str | None = None
    annual_price: float | None = None
    annual_price_id: str | None = None

    def serialize(self) -> Dict[str, Any]:
        """Return JSON-serializable representation."""
        billing_cycles = [
            {
                'id': 'monthly',
                'price': self.monthly_price,
                'price_display': f"${self.monthly_price:,.2f}",
                'price_id': self.monthly_price_id,
                'currency': DEFAULT_CURRENCY,
            }
        ]

        if self.annual_price is not None and self.annual_price_id:
            billing_cycles.append(
                {
                    'id': 'annual',
                    'price': self.annual_price,
                    'price_display': f"${self.annual_price:,.2f}",
                    'price_id': self.annual_price_id,
                    'currency': DEFAULT_CURRENCY,
                }
            )

        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price': self.monthly_price,
            'price_display': f"${self.monthly_price:,.2f}",
            'price_id': self.monthly_price_id,
            'currency': DEFAULT_CURRENCY,
            'features': self.features,
            'badge': self.badge,
            'highlight': self.highlight,
            'billing_cycles': billing_cycles,
        }


def _tier_definitions() -> List[TierDefinition]:
    """Build tier definitions with environment-aware price IDs."""
    return [
        TierDefinition(
            id='free',
            name='Free Tier',
            description='Kickstart smarter spending with core tracking tools.',
            monthly_price=0.0,
            monthly_price_id='free',
            features=[
                'Up to 3 connected accounts',
                'Basic transaction tracking',
                'Monthly spending reports',
                'Mobile app access',
            ],
            badge='Start for free',
        ),
        TierDefinition(
            id='pro',
            name='Pro Tier',
            description='Unlock advanced planning tools for growing households.',
            monthly_price=12.99,
            monthly_price_id=settings.STRIPE_PRO_MONTHLY_PRICE_ID or '',
            annual_price=99.0,
            annual_price_id=settings.STRIPE_PRO_ANNUAL_PRICE_ID or '',
            features=[
                'Up to 10 connected accounts',
                'AI categorization enabled',
                'Advanced analytics & insights',
                'Custom categories & budgets',
                'Goal tracking & forecasting',
                'Export to CSV/PDF',
                'Priority support',
                'Unlimited transaction history',
            ],
            badge='Most popular',
        ),
        TierDefinition(
            id='premium',
            name='Premium Tier',
            description='Enterprise-grade insights plus concierge-level guidance.',
            monthly_price=19.99,
            monthly_price_id=settings.STRIPE_PREMIUM_MONTHLY_PRICE_ID or '',
            annual_price=199.0,
            annual_price_id=settings.STRIPE_PREMIUM_ANNUAL_PRICE_ID or '',
            features=[
                'Everything in Pro',
                'Investment portfolio tracking',
                'Tax optimization suggestions',
                'Dedicated account manager',
                'Custom integrations',
                'Advanced security features',
            ],
            badge='All-access',
            highlight='Includes AI insights & dedicated advisor',
        ),
        TierDefinition(
            id='enterprise',
            name='Enterprise Tier',
            description='For businesses or high-use users with 20+ accounts. Custom pricing and features.',
            monthly_price=49.0,  # Starting price, actual pricing is custom
            monthly_price_id=settings.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID or '',
            annual_price=None,  # Custom pricing for annual
            annual_price_id=settings.STRIPE_ENTERPRISE_ANNUAL_PRICE_ID or None,
            features=[
                'Everything in Premium',
                '20+ connected accounts',
                'Custom integrations',
                'API access',
                'Advanced reporting',
                'Dedicated support',
                'Custom pricing',
            ],
            badge='Custom',
            highlight='Contact us for custom pricing',
        ),
    ]


def get_subscription_tiers() -> List[Dict[str, Any]]:
    """
    Return serialized subscription tier definitions.

    Returns:
        List of dictionaries describing each subscription tier.
        Note: Enterprise tier is currently hidden from public API.
    """
    # Filter out enterprise tier for now (hidden from public)
    tiers = [tier for tier in _tier_definitions() if tier.id != 'enterprise']
    return [tier.serialize() for tier in tiers]

