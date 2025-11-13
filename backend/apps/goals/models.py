"""
Savings Goal models for Cashly.
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone
from decimal import Decimal
from django.db.models import Sum, Q

User = get_user_model()


class Goal(models.Model):
    """
    Savings goal model.
    """
    GOAL_TYPE_CHOICES = [
        ('emergency_fund', 'Emergency Fund'),
        ('vacation', 'Vacation'),
        ('purchase', 'Major Purchase'),
        ('debt_payoff', 'Debt Payoff'),
        ('custom', 'Custom'),
    ]
    
    goal_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    name = models.CharField(max_length=200)
    target_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    current_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    deadline = models.DateField(null=True, blank=True)
    monthly_contribution = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    goal_type = models.CharField(
        max_length=20,
        choices=GOAL_TYPE_CHOICES,
        default='custom'
    )
    is_active = models.BooleanField(default=False, help_text="Goal is active and can receive contributions")
    is_completed = models.BooleanField(default=False)
    destination_account = models.ForeignKey(
        'accounts.Account',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='destination_goals',
        help_text="Destination account where goal funds accumulate. Null means cash savings."
    )
    transfer_authorized = models.BooleanField(
        default=False,
        help_text="User has authorized automatic transfers via Plaid"
    )
    initial_balance_synced = models.BooleanField(
        default=False,
        help_text="Destination account balance has been synced as initial current_amount"
    )
    contribution_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text="Contribution rules configuration with source accounts"
    )
    reminder_settings = models.JSONField(
        default=dict,
        blank=True,
        help_text="Reminder settings for cash goals"
    )
    inferred_category = models.ForeignKey(
        'transactions.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='goals',
        help_text="Category to track for automatic contributions"
    )
    priority = models.IntegerField(default=0, help_text="Goal priority for allocation")
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When goal was completed")
    archived_at = models.DateTimeField(null=True, blank=True, help_text="When goal was archived")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'goals'
        verbose_name = 'Goal'
        verbose_name_plural = 'Goals'
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'is_completed']),
            models.Index(fields=['inferred_category']),
            models.Index(fields=['user', 'archived_at']),
            models.Index(fields=['destination_account']),
            models.Index(fields=['transfer_authorized']),
        ]
    
    def __str__(self):
        return f"{self.name} - ${self.current_amount}/{self.target_amount}"
    
    def progress_percentage(self):
        """Calculate progress percentage."""
        if self.target_amount == 0:
            return 0
        percentage = float((self.current_amount / self.target_amount) * 100)
        # Cap at 100% if goal is completed or amount exceeds target
        if self.is_completed or self.current_amount >= self.target_amount:
            return min(100.0, percentage)
        return percentage
    
    def is_on_track(self):
        """Check if goal is on track based on deadline and current savings rate."""
        if not self.deadline:
            return None
        
        if self.is_completed:
            return True
        
        today = timezone.now().date()
        if today >= self.deadline:
            return self.current_amount >= self.target_amount
        
        days_remaining = (self.deadline - today).days
        if days_remaining <= 0:
            return False
        
        months_remaining = days_remaining / 30.0
        required_monthly = (self.target_amount - self.current_amount) / Decimal(str(months_remaining))
        
        return self.monthly_contribution >= required_monthly
    
    def days_remaining(self):
        """Calculate days remaining until deadline."""
        if not self.deadline:
            return None
        
        today = timezone.now().date()
        days = (self.deadline - today).days
        return max(0, days)
    
    def complete(self):
        """Mark goal as completed."""
        if not self.is_completed:
            self.is_completed = True
            self.completed_at = timezone.now()
            # Save current_amount along with completion fields to ensure it's persisted
            self.save(update_fields=['is_completed', 'completed_at', 'current_amount', 'updated_at'])
    
    def archive(self):
        """Archive goal (any goal can be archived)."""
        if not self.archived_at:
            self.archived_at = timezone.now()
            self.is_active = False
            self.save(update_fields=['archived_at', 'is_active', 'updated_at'])
    
    def unarchive(self):
        """Restore archived goal."""
        if self.archived_at:
            self.archived_at = None
            self.is_active = True
            self.save(update_fields=['archived_at', 'is_active', 'updated_at'])
    
    def sync_contributions(self):
        """Recalculate current_amount from contributions and auto-complete if target is reached."""
        total = self.contributions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        needs_update = False
        
        # Update current_amount if it changed
        if self.current_amount != total:
            self.current_amount = total
            needs_update = True
        
        # Check if goal should be automatically completed
        # This happens when current_amount >= target_amount and goal is not already completed
        # This check runs regardless of whether current_amount changed (e.g., if target_amount was reduced)
        if self.current_amount >= self.target_amount and not self.is_completed:
            # Complete the goal (this will save the goal with is_completed=True and current_amount)
            self.complete()
            return self.current_amount
        
        # If we updated current_amount but didn't complete, save the update
        if needs_update:
            self.save(update_fields=['current_amount', 'updated_at'])
        
        return self.current_amount
    
    def get_manual_contributions_total(self):
        """Get total of manual contributions."""
        return self.contributions.filter(source='manual').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
    
    def get_automatic_contributions_total(self, date_range=None):
        """Get total of automatic contributions."""
        queryset = self.contributions.filter(source='automatic')
        if date_range:
            start_date, end_date = date_range
            queryset = queryset.filter(date__gte=start_date, date__lte=end_date)
        return queryset.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    def get_contributions_by_source(self):
        """Get contributions grouped by source."""
        return self.contributions.values('source').annotate(
            total=Sum('amount'),
            count=models.Count('contribution_id')
        )
    
    def is_activation_pending(self):
        """Check if goal is waiting for transfer authorization."""
        if self.destination_account and not self.transfer_authorized:
            return True
        return False


class Contribution(models.Model):
    """
    Contribution model for tracking goal contributions.
    """
    CONTRIBUTION_SOURCE_CHOICES = [
        ('manual', 'Manual'),
        ('automatic', 'Automatic from Transaction'),
    ]
    
    contribution_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='contributions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goal_contributions')
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    date = models.DateField()
    note = models.TextField(blank=True)
    source = models.CharField(
        max_length=50,
        choices=CONTRIBUTION_SOURCE_CHOICES,
        default='manual'
    )
    transaction = models.ForeignKey(
        'transactions.Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='goal_contributions',
        help_text="Transaction that triggered this contribution (if automatic)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'contributions'
        verbose_name = 'Contribution'
        verbose_name_plural = 'Contributions'
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['goal', 'date']),
            models.Index(fields=['user', 'date']),
            models.Index(fields=['source']),
            models.Index(fields=['transaction']),
        ]
    
    def __str__(self):
        return f"{self.goal.name} - ${self.amount} ({self.date})"
    
    def save(self, *args, **kwargs):
        """Override save to update goal current_amount."""
        super().save(*args, **kwargs)
        # Sync goal contributions after saving
        self.goal.sync_contributions()
    
    def delete(self, *args, **kwargs):
        """Override delete to update goal current_amount."""
        goal = self.goal
        super().delete(*args, **kwargs)
        # Sync goal contributions after deleting
        goal.sync_contributions()


class TransferAuthorization(models.Model):
    """
    Model to track Plaid transfer authorizations for goals.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('revoked', 'Revoked'),
    ]
    
    authorization_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='transfer_authorizations')
    authorization_token = models.TextField(help_text="Encrypted Plaid authorization token")
    plaid_authorization_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text="Plaid authorization identifier"
    )
    authorized_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When authorization expires")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'transfer_authorizations'
        verbose_name = 'Transfer Authorization'
        verbose_name_plural = 'Transfer Authorizations'
        ordering = ['-authorized_at']
        indexes = [
            models.Index(fields=['goal', 'status']),
            models.Index(fields=['plaid_authorization_id']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"Authorization for {self.goal.name} - {self.status}"
