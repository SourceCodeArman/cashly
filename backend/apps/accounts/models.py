"""
Account models for Cashly.
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinLengthValidator
from django.utils import timezone


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    """
    email = models.EmailField(unique=True, db_index=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    preferences = models.JSONField(default=dict, blank=True)
    subscription_tier = models.CharField(
        max_length=20,
        choices=[('free', 'Free'), ('premium', 'Premium'), ('pro', 'Pro')],
        default='free'
    )
    stripe_customer_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text="Stripe customer ID"
    )
    subscription_status = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Current subscription status (active, trialing, past_due, canceled, etc.)"
    )
    subscription_end_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date when subscription ends"
    )
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=255, blank=True, null=True)
    tour_done = models.BooleanField(default=False, help_text="Whether the user has completed the welcome tour")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.email

    def has_active_subscription(self):
        """
        Check if user has an active subscription.
        
        Prefers Subscription model over user.subscription_tier field.
        
        Returns:
            True if user has an active subscription, False otherwise
        """
        try:
            from apps.subscriptions.services import is_subscription_active
            return is_subscription_active(self)
        except Exception:
            # Fallback to checking subscription_tier and dates
            if self.subscription_tier in ['premium', 'pro']:
                if self.subscription_end_date:
                    return timezone.now() < self.subscription_end_date
                return self.subscription_status in ['active', 'trialing']
            return False
    
    def get_subscription_tier(self):
        """
        Get user's subscription tier.
        
        Prefers Subscription model over user.subscription_tier field.
        
        Returns:
            Subscription tier: 'free', 'premium', or 'pro'
        """
        try:
            from apps.subscriptions.services import get_user_tier
            return get_user_tier(self)
        except Exception:
            # Fallback to subscription_tier field
            return self.subscription_tier or 'free'


class AccountQuerySet(models.QuerySet):
    """Custom queryset for Account model with chainable helpers."""
    
    def for_user(self, user):
        """Return accounts for a specific user."""
        return self.filter(user=user)
    
    def active(self):
        """Return only active accounts."""
        return self.filter(is_active=True)


class AccountManager(models.Manager):
    """Custom manager exposing queryset helpers."""
    
    def get_queryset(self):
        return AccountQuerySet(self.model, using=self._db)
    
    def for_user(self, user):
        """Return accounts for a specific user."""
        return self.get_queryset().for_user(user)
    
    def active(self):
        """Return only active accounts."""
        return self.get_queryset().active()


class Account(models.Model):
    """
    Bank account model connected via Plaid.
    """
    ACCOUNT_TYPE_CHOICES = [
        ('checking', 'Checking'),
        ('savings', 'Savings'),
        ('credit_card', 'Credit Card'),
        ('investment', 'Investment'),
    ]
    
    account_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts')
    institution_name = models.CharField(max_length=200)
    custom_name = models.CharField(max_length=200, blank=True, null=True, help_text="User-defined custom name for the account")
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES)
    account_number_masked = models.CharField(max_length=20, help_text="Last 4 digits for display")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=3, default='USD')
    plaid_account_id = models.CharField(max_length=255, unique=True, db_index=True)
    plaid_access_token = models.TextField(help_text="Encrypted Plaid access token")
    plaid_item_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text="Plaid item identifier associated with the account"
    )
    plaid_institution_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Plaid institution identifier"
    )
    plaid_products = models.JSONField(
        default=list,
        blank=True,
        help_text="List of Plaid products enabled for the item"
    )
    webhook_url = models.URLField(
        blank=True,
        null=True,
        help_text="Webhook configured for Plaid item events"
    )
    error_code = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Last Plaid error code received for this account"
    )
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Last Plaid error message received for this account"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_error_at = models.DateTimeField(null=True, blank=True)
    
    objects = AccountManager()
    
    class Meta:
        db_table = 'accounts'
        verbose_name = 'Account'
        verbose_name_plural = 'Accounts'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['plaid_account_id']),
            models.Index(fields=['plaid_item_id']),
        ]
    
    def __str__(self):
        return f"{self.institution_name} - {self.account_type} ({self.account_number_masked})"


class PlaidWebhookEvent(models.Model):
    """
    Stored Plaid webhook events for diagnostics and replay.
    """

    event_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_id = models.CharField(max_length=255, db_index=True)
    webhook_type = models.CharField(max_length=100)
    webhook_code = models.CharField(max_length=100)
    payload = models.JSONField(default=dict, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'plaid_webhook_events'
        ordering = ['-received_at']
        indexes = [
            models.Index(fields=['item_id', 'webhook_type', 'webhook_code', 'received_at']),
        ]

    def __str__(self):
        return f"{self.webhook_type}:{self.webhook_code} ({self.item_id})"
