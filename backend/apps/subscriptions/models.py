"""
Subscription models for Stripe payment processing.
"""
import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class SubscriptionQuerySet(models.QuerySet):
    """Custom queryset for Subscription model with chainable helpers."""
    
    def for_user(self, user):
        """Return subscriptions for a specific user."""
        return self.filter(user=user)
    
    def active(self):
        """Return only active subscriptions."""
        return self.filter(status__in=['active', 'trialing'])
    
    def current(self):
        """Return current subscription for user (most recent active)."""
        return self.active().order_by('-created_at')


class SubscriptionManager(models.Manager):
    """Custom manager exposing queryset helpers."""
    
    def get_queryset(self):
        return SubscriptionQuerySet(self.model, using=self._db)
    
    def for_user(self, user):
        """Return subscriptions for a specific user."""
        return self.get_queryset().for_user(user)
    
    def active(self):
        """Return only active subscriptions."""
        return self.get_queryset().active()
    
    def current(self):
        """Return current subscription for user (most recent active)."""
        return self.get_queryset().current()


class Subscription(models.Model):
    """
    Subscription model for storing Stripe subscription data.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('trialing', 'Trialing'),
        ('past_due', 'Past Due'),
        ('canceled', 'Canceled'),
        ('incomplete', 'Incomplete'),
        ('incomplete_expired', 'Incomplete Expired'),
        ('unpaid', 'Unpaid'),
    ]
    
    PLAN_CHOICES = [
        ('premium', 'Premium'),
        ('pro', 'Pro'),
        ('enterprise', 'Enterprise'),
    ]
    
    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('annual', 'Annual'),
    ]
    
    subscription_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='subscriptions')
    stripe_subscription_id = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Stripe subscription ID"
    )
    stripe_customer_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Stripe customer ID"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='trialing',
        help_text="Current subscription status"
    )
    plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        help_text="Subscription plan (premium or pro)"
    )
    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CYCLE_CHOICES,
        help_text="Billing cycle (monthly or annual)"
    )
    price_id_monthly = models.CharField(
        max_length=255,
        help_text="Stripe Price ID for monthly billing"
    )
    price_id_annual = models.CharField(
        max_length=255,
        help_text="Stripe Price ID for annual billing"
    )
    current_period_start = models.DateTimeField(
        help_text="Start of current billing period"
    )
    current_period_end = models.DateTimeField(
        help_text="End of current billing period"
    )
    trial_start = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Start of trial period"
    )
    trial_end = models.DateTimeField(
        null=True,
        blank=True,
        help_text="End of trial period"
    )
    cancel_at_period_end = models.BooleanField(
        default=False,
        help_text="Whether subscription will cancel at period end"
    )
    canceled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date when subscription was canceled"
    )
    pending_plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        null=True,
        blank=True,
        help_text="Pending plan to apply at next renewal"
    )
    pending_billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CYCLE_CHOICES,
        null=True,
        blank=True,
        help_text="Pending billing cycle to apply at next renewal"
    )
    pending_price_id_monthly = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Monthly price ID for pending plan change"
    )
    pending_price_id_annual = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Annual price ID for pending plan change"
    )
    pending_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the pending plan change was requested"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = SubscriptionManager()
    
    class Meta:
        db_table = 'subscriptions'
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['stripe_subscription_id']),
            models.Index(fields=['stripe_customer_id']),
            models.Index(fields=['status', 'current_period_end']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.plan} ({self.status})"
    
    def is_active(self):
        """Check if subscription is currently active."""
        return self.status in ['active', 'trialing']
    
    def is_currently_active(self):
        """
        Check if subscription is currently active and hasn't expired.
        
        Returns:
            True if subscription is active and current_period_end hasn't passed
        """
        if not self.is_active():
            return False
        return timezone.now() < self.current_period_end
    
    def is_expired(self):
        """
        Check if subscription has expired.
        
        Returns:
            True if subscription period has ended or subscription is canceled
        """
        if self.status == 'canceled':
            return True
        return timezone.now() >= self.current_period_end
    
    def get_effective_tier(self):
        """
        Get the effective subscription tier.
        
        Returns:
            'premium' or 'pro' if subscription is active, 'free' otherwise
        """
        if self.is_currently_active():
            return self.plan  # 'premium' or 'pro'
        return 'free'
    
    def days_remaining(self):
        """Get days remaining in current period or trial."""
        if self.trial_end and timezone.now() < self.trial_end:
            return (self.trial_end - timezone.now()).days
        return (self.current_period_end - timezone.now()).days


class PendingSubscription(models.Model):
    """
    Model for queuing subscription creation during Stripe downtime.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('failed', 'Failed'),
        ('completed', 'Completed'),
    ]
    
    PLAN_CHOICES = [
        ('premium', 'Premium'),
        ('pro', 'Pro'),
        ('enterprise', 'Enterprise'),
    ]
    
    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('annual', 'Annual'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='pending_subscriptions')
    payment_method_id = models.CharField(
        max_length=255,
        help_text="Stripe Payment Method ID"
    )
    plan = models.CharField(
        max_length=20,
        choices=PLAN_CHOICES,
        help_text="Subscription plan"
    )
    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CYCLE_CHOICES,
        help_text="Billing cycle"
    )
    trial_enabled = models.BooleanField(
        default=True,
        help_text="Whether 7-day trial is enabled"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Processing status"
    )
    retry_count = models.IntegerField(
        default=0,
        help_text="Number of retry attempts"
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Error message if processing failed"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pending_subscriptions'
        verbose_name = 'Pending Subscription'
        verbose_name_plural = 'Pending Subscriptions'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.plan} ({self.status})"


class StripeWebhookEvent(models.Model):
    """
    Model for logging Stripe webhook events.
    """
    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stripe_event_id = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Stripe event ID"
    )
    event_type = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Type of webhook event"
    )
    payload = models.JSONField(
        default=dict,
        blank=True,
        help_text="Full webhook payload"
    )
    processed = models.BooleanField(
        default=False,
        help_text="Whether event has been processed"
    )
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When event was processed"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'stripe_webhook_events'
        verbose_name = 'Stripe Webhook Event'
        verbose_name_plural = 'Stripe Webhook Events'
        indexes = [
            models.Index(fields=['stripe_event_id']),
            models.Index(fields=['event_type', 'processed']),
            models.Index(fields=['processed', 'created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.event_type} ({self.stripe_event_id})"


class AccountDowngradeSelection(models.Model):
    """
    Model for tracking which accounts users want to keep when downgrading from Pro/Premium to Free.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='account_downgrade_selections',
        help_text="Subscription being cancelled"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='account_downgrade_selections',
        help_text="User making the selection"
    )
    accounts_to_keep = models.JSONField(
        default=list,
        help_text="List of account UUIDs to keep active (max 3 for free tier)"
    )
    selection_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When user completed account selection"
    )
    deactivation_scheduled_at = models.DateTimeField(
        help_text="When excess accounts should be deactivated (subscription period end)"
    )
    deactivation_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When excess accounts were actually deactivated"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'account_downgrade_selections'
        verbose_name = 'Account Downgrade Selection'
        verbose_name_plural = 'Account Downgrade Selections'
        indexes = [
            models.Index(fields=['subscription', 'user']),
            models.Index(fields=['deactivation_scheduled_at', 'deactivation_completed_at']),
            models.Index(fields=['user', 'selection_completed_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {len(self.accounts_to_keep)} accounts selected"


