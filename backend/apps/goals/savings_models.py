"""
Models for automated savings features.
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid


class SavingsRule(models.Model):
    """Model for automated savings rules."""
    
    RULE_TYPE_CHOICES = [
        ('roundup', 'Round-up'),
        ('percentage', 'Percentage-based'),
    ]
    
    TRIGGER_CHOICES = [
        ('all_expenses', 'All Expenses'),
        ('income', 'Income Only'),
        ('category', 'Specific Category'),
    ]
    
    rule_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='savings_rules')
    goal = models.ForeignKey('goals.Goal', on_delete=models.CASCADE, related_name='savings_rules')
    
    rule_type = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES)
    trigger = models.CharField(max_length=20, choices=TRIGGER_CHOICES, default='all_expenses')
    
    # For percentage-based savings
    percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(Decimal('100.00'))]
    )
    
    # For category-specific rules
    category = models.ForeignKey(
        'transactions.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='savings_rules'
    )
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'savings_rules'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.get_rule_type_display()} - {self.user.email} -> {self.goal.name}"
    
    def calculate_contribution(self, transaction):
        """Calculate the contribution amount for a transaction."""
        from decimal import Decimal, ROUND_UP
        
        # Get absolute value of transaction amount
        amount = abs(Decimal(str(transaction.amount)))
        
        if self.rule_type == 'roundup':
            # Round up to nearest dollar (only for expenses/negative transactions)
            # For round-up, we round up the expense amount and save the difference
            rounded = amount.quantize(Decimal('1'), rounding=ROUND_UP)
            contribution = rounded - amount
            # Only return contribution if it's positive (we rounded up)
            return contribution if contribution > 0 else Decimal('0')
        
        elif self.rule_type == 'percentage':
            # Calculate percentage of amount (works for both income and expenses)
            if self.percentage:
                contribution = (amount * self.percentage / Decimal('100')).quantize(Decimal('0.01'))
                return contribution
        
        return Decimal('0')


class SavingsContribution(models.Model):
    """Model to track automated savings contributions."""
    
    contribution_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rule = models.ForeignKey(SavingsRule, on_delete=models.CASCADE, related_name='contributions')
    transaction = models.ForeignKey('transactions.Transaction', on_delete=models.CASCADE, related_name='savings_contributions')
    goal = models.ForeignKey('goals.Goal', on_delete=models.CASCADE, related_name='automated_contributions')
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    applied_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'savings_contributions'
        ordering = ['-applied_at']
        unique_together = ['rule', 'transaction']  # Prevent duplicate contributions
        
    def __str__(self):
        return f"${self.amount} contribution to {self.goal.name}"
