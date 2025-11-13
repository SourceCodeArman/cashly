"""
Budget models for Cashly.
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from decimal import Decimal

User = get_user_model()


class Budget(models.Model):
    """
    Budget model for tracking spending limits by category.
    """
    PERIOD_TYPE_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    ]
    
    budget_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='budgets')
    category = models.ForeignKey(
        'transactions.Category',
        on_delete=models.CASCADE,
        related_name='budgets'
    )
    period_type = models.CharField(
        max_length=20,
        choices=PERIOD_TYPE_CHOICES,
        default='monthly'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    period_start = models.DateField()
    period_end = models.DateField()
    alerts_enabled = models.BooleanField(default=True)
    alert_threshold = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('80.00'),
        help_text="Percentage of budget spent before alert"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'budgets'
        verbose_name = 'Budget'
        verbose_name_plural = 'Budgets'
        indexes = [
            models.Index(fields=['user', 'period_start', 'period_end']),
            models.Index(fields=['category', 'period_start', 'period_end']),
        ]
    
    def __str__(self):
        return f"{self.category.name} - ${self.amount} ({self.get_period_type_display()})"
