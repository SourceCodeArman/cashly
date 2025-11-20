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
        choices=['premium', 'pro', 'enterprise'],
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
            'pending_plan',
            'pending_billing_cycle',
            'pending_price_id_monthly',
            'pending_price_id_annual',
            'pending_requested_at',
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
            'pending_plan',
            'pending_billing_cycle',
            'pending_price_id_monthly',
            'pending_price_id_annual',
            'pending_requested_at',
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


class UpdatePaymentMethodSerializer(serializers.Serializer):
    """Serializer for updating default payment method."""
    payment_method_id = serializers.CharField(
        required=True,
        help_text="Stripe payment method ID"
    )


class AccountSelectionSerializer(serializers.Serializer):
    """Serializer for selecting accounts to keep during subscription downgrade."""
    account_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=True,
        help_text="List of account UUIDs to keep active (max 3 for free tier)"
    )
    
    def validate_account_ids(self, value):
        """Validate account IDs."""
        if not value:
            raise serializers.ValidationError("At least one account must be selected.")
        
        if len(value) > 3:
            raise serializers.ValidationError("Free tier allows a maximum of 3 accounts.")
        
        # Check for duplicates
        if len(value) != len(set(value)):
            raise serializers.ValidationError("Duplicate account IDs are not allowed.")
        
        return value
    
    def validate(self, attrs):
        """Validate that all accounts belong to the user."""
        user = self.context['request'].user
        account_ids = attrs.get('account_ids', [])
        
        # Import here to avoid circular dependency
        from apps.accounts.models import Account
        
        # Get user's account IDs
        user_account_ids = set(
            Account.objects.for_user(user).values_list('account_id', flat=True)
        )
        
        # Check all provided account IDs belong to user
        invalid_ids = set(account_ids) - user_account_ids
        if invalid_ids:
            raise serializers.ValidationError(
                f"Invalid account IDs: {', '.join(str(id) for id in invalid_ids)}. "
                "All accounts must belong to you."
            )
        
        return attrs


