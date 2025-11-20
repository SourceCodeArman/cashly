"""
Admin interface for subscriptions app.
"""
from django.contrib import admin
from .models import Subscription, PendingSubscription, StripeWebhookEvent, AccountDowngradeSelection


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """Admin interface for Subscription model."""
    list_display = [
        'subscription_id',
        'user',
        'plan',
        'billing_cycle',
        'status',
        'current_period_start',
        'current_period_end',
        'cancel_at_period_end',
        'created_at',
    ]
    list_filter = [
        'status',
        'plan',
        'billing_cycle',
        'cancel_at_period_end',
        'created_at',
    ]
    search_fields = [
        'user__email',
        'user__username',
        'stripe_subscription_id',
        'stripe_customer_id',
    ]
    readonly_fields = [
        'subscription_id',
        'stripe_subscription_id',
        'stripe_customer_id',
        'current_period_start',
        'current_period_end',
        'trial_start',
        'trial_end',
        'canceled_at',
        'created_at',
        'updated_at',
    ]
    ordering = ['-created_at']


@admin.register(PendingSubscription)
class PendingSubscriptionAdmin(admin.ModelAdmin):
    """Admin interface for PendingSubscription model."""
    list_display = [
        'id',
        'user',
        'plan',
        'billing_cycle',
        'status',
        'retry_count',
        'created_at',
        'updated_at',
    ]
    list_filter = [
        'status',
        'plan',
        'billing_cycle',
        'created_at',
    ]
    search_fields = [
        'user__email',
        'user__username',
        'payment_method_id',
    ]
    readonly_fields = [
        'id',
        'status',
        'retry_count',
        'error_message',
        'created_at',
        'updated_at',
    ]
    ordering = ['-created_at']


@admin.register(StripeWebhookEvent)
class StripeWebhookEventAdmin(admin.ModelAdmin):
    """Admin interface for StripeWebhookEvent model."""
    list_display = [
        'event_id',
        'stripe_event_id',
        'event_type',
        'processed',
        'processed_at',
        'created_at',
    ]
    list_filter = [
        'event_type',
        'processed',
        'created_at',
    ]
    search_fields = [
        'stripe_event_id',
        'event_type',
    ]
    readonly_fields = [
        'event_id',
        'stripe_event_id',
        'event_type',
        'payload',
        'processed',
        'processed_at',
        'created_at',
    ]
    ordering = ['-created_at']


@admin.register(AccountDowngradeSelection)
class AccountDowngradeSelectionAdmin(admin.ModelAdmin):
    """Admin interface for AccountDowngradeSelection model."""
    list_display = [
        'id',
        'user',
        'subscription',
        'accounts_to_keep_count',
        'selection_completed_at',
        'deactivation_scheduled_at',
        'deactivation_completed_at',
        'created_at',
    ]
    list_filter = [
        'selection_completed_at',
        'deactivation_completed_at',
        'created_at',
    ]
    search_fields = [
        'user__email',
        'user__username',
        'subscription__stripe_subscription_id',
    ]
    readonly_fields = [
        'id',
        'subscription',
        'user',
        'accounts_to_keep',
        'selection_completed_at',
        'deactivation_scheduled_at',
        'deactivation_completed_at',
        'created_at',
        'updated_at',
    ]
    ordering = ['-created_at']
    
    def accounts_to_keep_count(self, obj):
        """Display count of accounts to keep."""
        return len(obj.accounts_to_keep) if obj.accounts_to_keep else 0
    accounts_to_keep_count.short_description = 'Accounts to Keep'


