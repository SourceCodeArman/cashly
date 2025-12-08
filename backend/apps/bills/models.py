"""
Bill models for Cashly.
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from dateutil.relativedelta import relativedelta

User = get_user_model()


class Bill(models.Model):
    """
    Bill model for tracking recurring bills.
    """
    FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'),
        ('biweekly', 'Biweekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]
    
    bill_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bills')
    name = models.CharField(max_length=200, help_text="Bill name (e.g., Netflix, Electric Bill)")
    category = models.ForeignKey(
        'transactions.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bills'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    frequency = models.CharField(
        max_length=20,
        choices=FREQUENCY_CHOICES,
        default='monthly'
    )
    due_day = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Day of month/period when bill is due"
    )
    next_due_date = models.DateField(help_text="Next payment due date")
    last_paid_date = models.DateField(null=True, blank=True, help_text="Last payment date")
    is_autopay = models.BooleanField(default=False, help_text="Whether bill is on autopay")
    payee = models.CharField(max_length=200, blank=True, help_text="Payee/company name")
    account = models.ForeignKey(
        'accounts.Account',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bills',
        help_text="Linked payment account"
    )
    notes = models.TextField(blank=True)
    reminder_days = models.IntegerField(
        default=3,
        validators=[MinValueValidator(0), MaxValueValidator(30)],
        help_text="Days before due date to send reminder"
    )
    reminder_enabled = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'bills'
        verbose_name = 'Bill'
        verbose_name_plural = 'Bills'
        ordering = ['next_due_date', 'name']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['user', 'next_due_date']),
            models.Index(fields=['next_due_date', 'is_active']),
            models.Index(fields=['frequency']),
        ]
    
    def __str__(self):
        return f"{self.name} - ${self.amount} ({self.get_frequency_display()})"
    
    def calculate_next_due_date(self, from_date=None):
        """
        Calculate next due date based on frequency.
        
        Args:
            from_date: Date to calculate from (defaults to last_paid_date or today)
        
        Returns:
            Next due date
        """
        if from_date is None:
            from_date = self.last_paid_date or timezone.now().date()
        
        if self.frequency == 'weekly':
            return from_date + timedelta(weeks=1)
        elif self.frequency == 'biweekly':
            return from_date + timedelta(weeks=2)
        elif self.frequency == 'monthly':
            # Add one month and set to due_day
            next_date = from_date + relativedelta(months=1)
            # Handle case where due_day doesn't exist in next month (e.g., 31st)
            try:
                return next_date.replace(day=self.due_day)
            except ValueError:
                # If day doesn't exist (e.g., Feb 31), use last day of month
                next_month = next_date.replace(day=1) + relativedelta(months=1)
                return (next_month - timedelta(days=1))
        elif self.frequency == 'quarterly':
            next_date = from_date + relativedelta(months=3)
            try:
                return next_date.replace(day=self.due_day)
            except ValueError:
                next_month = next_date.replace(day=1) + relativedelta(months=1)
                return (next_month - timedelta(days=1))
        elif self.frequency == 'yearly':
            next_date = from_date + relativedelta(years=1)
            try:
                return next_date.replace(day=self.due_day)
            except ValueError:
                next_month = next_date.replace(day=1) + relativedelta(months=1)
                return (next_month - timedelta(days=1))
        
        return from_date
    
    def mark_as_paid(self, payment_date=None):
        """
        Mark bill as paid and update next due date.
        
        Args:
            payment_date: Date payment was made (defaults to today)
        """
        if payment_date is None:
            payment_date = timezone.now().date()
        
        self.last_paid_date = payment_date
        self.next_due_date = self.calculate_next_due_date(payment_date)
        self.save(update_fields=['last_paid_date', 'next_due_date', 'updated_at'])
    
    @property
    def is_overdue(self):
        """Check if bill is overdue."""
        if not self.is_active:
            return False
        return timezone.now().date() > self.next_due_date
    
    @property
    def days_until_due(self):
        """Calculate days until due date."""
        delta = self.next_due_date - timezone.now().date()
        return delta.days


class BillPayment(models.Model):
    """
    Bill payment model for tracking payment history.
    """
    payment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='payments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bill_payments')
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Actual amount paid"
    )
    payment_date = models.DateField(default=timezone.now)
    transaction = models.ForeignKey(
        'transactions.Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bill_payments',
        help_text="Linked transaction"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bill_payments'
        verbose_name = 'Bill Payment'
        verbose_name_plural = 'Bill Payments'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['bill', '-payment_date']),
            models.Index(fields=['user', '-payment_date']),
            models.Index(fields=['transaction']),
        ]
    
    def __str__(self):
        return f"{self.bill.name} - ${self.amount} on {self.payment_date}"
