"""
Serializers for subscription operations.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import Subscription, PendingSubscription

User = get_user_model()


class CreateSubscriptionSerializer(serializers.Serializer):
    """Serializer for creating a subscription."""
    payment_method_id = serializers.CharField(
        required=True,
        help_text="Stripe Payment Method ID"
    )
    plan = serializers.ChoiceField(
        choices=['premium', 'pro'],
        help_text="Subscription plan"
    )
    billing_cycle = serializers.ChoiceField(
        choices=['monthly', 'annual'],
        help_text="Billing cycle"
    )
    trial_enabled = serializers.BooleanField(
        default=False,
        help_text="Whether to enable 7-day trial"
    )
    
    def validate(self, attrs):
        """Validate subscription creation/update."""
        user = self.context['request'].user
        
        # Check for active subscription
        active_subscription = Subscription.objects.filter(
            user=user,
            status__in=['active', 'trialing']
        ).first()
        
        # If user has an active subscription, allow if they're upgrading/downgrading
        # The view will handle the update
        if active_subscription:
            # Check if they're trying to change plans
            new_plan = attrs.get('plan')
            if new_plan == active_subscription.plan:
                # Same plan - only allow if changing billing cycle
                new_billing_cycle = attrs.get('billing_cycle')
                if new_billing_cycle == active_subscription.billing_cycle:
                    # Same plan and billing cycle - this is allowed (will be handled by view)
                    pass
                # Different billing cycle - allowed (will be handled by view)
            # Different plan - allowed (will be handled by view as upgrade/downgrade)
        
        return attrs


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Subscription model."""
    
    class Meta:
        model = Subscription
        fields = [
            'subscription_id',
            'stripe_subscription_id',
            'stripe_customer_id',
            'status',
            'plan',
            'billing_cycle',
            'price_id_monthly',
            'price_id_annual',
            'current_period_start',
            'current_period_end',
            'trial_start',
            'trial_end',
            'cancel_at_period_end',
            'canceled_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'subscription_id',
            'stripe_subscription_id',
            'stripe_customer_id',
            'status',
            'current_period_start',
            'current_period_end',
            'trial_start',
            'trial_end',
            'canceled_at',
            'created_at',
            'updated_at',
        ]


class StripeConfigSerializer(serializers.Serializer):
    """Serializer for Stripe configuration."""
    publishable_key = serializers.CharField(
        help_text="Stripe publishable key"
    )


class PendingSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for PendingSubscription model."""
    
    class Meta:
        model = PendingSubscription
        fields = [
            'id',
            'payment_method_id',
            'plan',
            'billing_cycle',
            'trial_enabled',
            'status',
            'retry_count',
            'error_message',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'retry_count',
            'error_message',
            'created_at',
            'updated_at',
        ]


