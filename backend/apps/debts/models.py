"""
Debt models for Cashly.
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


class DebtAccount(models.Model):
    """
    Debt account model for tracking debts and loans.
    """

    DEBT_TYPE_CHOICES = [
        ("credit_card", "Credit Card"),
        ("personal_loan", "Personal Loan"),
        ("mortgage", "Mortgage"),
        ("auto_loan", "Auto Loan"),
        ("student_loan", "Student Loan"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("paid_off", "Paid Off"),
        ("closed", "Closed"),
    ]

    debt_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="debts")
    name = models.CharField(
        max_length=200, help_text="Debt name (e.g., Chase Credit Card)"
    )
    debt_type = models.CharField(
        max_length=20, choices=DEBT_TYPE_CHOICES, default="other"
    )

    current_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Current outstanding balance",
    )
    original_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Original loan/debt amount",
    )
    interest_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Annual Percentage Rate (APR)",
    )
    minimum_payment = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Minimum monthly payment",
    )
    due_day = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Day of month when payment is due",
    )

    creditor_name = models.CharField(
        max_length=200, blank=True, help_text="Creditor/lender name"
    )
    account_number_masked = models.CharField(
        max_length=20, blank=True, help_text="Last 4 digits"
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    opened_date = models.DateField(
        null=True, blank=True, help_text="Date debt was opened"
    )
    target_payoff_date = models.DateField(
        null=True, blank=True, help_text="Target date to pay off"
    )
    last_payment_date = models.DateField(
        null=True, blank=True, help_text="Last payment date"
    )
    last_payment_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Last payment amount",
    )

    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "debts"
        verbose_name = "Debt Account"
        verbose_name_plural = "Debt Accounts"
        ordering = ["-current_balance", "name"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["debt_type"]),
            models.Index(fields=["due_day"]),
        ]

    def __str__(self):
        return f"{self.name} - ${self.current_balance} @ {self.interest_rate}%"

    @property
    def monthly_interest(self):
        """Calculate monthly interest amount."""
        if self.interest_rate == 0:
            return Decimal("0.00")
        monthly_rate = self.interest_rate / Decimal("100") / Decimal("12")
        return (self.current_balance * monthly_rate).quantize(Decimal("0.01"))

    @property
    def next_due_date(self):
        """Calculate next payment due date."""
        today = timezone.now().date()

        # Try current month
        try:
            next_date = today.replace(day=self.due_day)
            if next_date > today:
                return next_date
        except ValueError:
            # Day doesn't exist in current month
            pass

        # Try next month
        next_month = today + relativedelta(months=1)
        try:
            return next_month.replace(day=self.due_day)
        except ValueError:
            # Day doesn't exist in next month (e.g., Feb 31), use last day
            following_month = next_month + relativedelta(months=1)
            return following_month.replace(day=1) - timedelta(days=1)

    @property
    def days_until_due(self):
        """Calculate days until next payment due."""
        delta = self.next_due_date - timezone.now().date()
        return delta.days

    def calculate_payoff_date(self, monthly_payment):
        """
        Calculate when debt will be paid off at given monthly payment.

        Args:
            monthly_payment: Decimal, monthly payment amount

        Returns:
            tuple: (months_to_payoff, total_interest_paid)
        """
        if monthly_payment <= self.monthly_interest:
            # Payment doesn't cover interest, will never pay off
            return (None, None)

        balance = self.current_balance
        total_interest = Decimal("0.00")
        months = 0

        while balance > Decimal("0.00") and months < 600:  # Cap at 50 years
            interest = balance * (self.interest_rate / Decimal("100") / Decimal("12"))
            interest = interest.quantize(Decimal("0.01"))
            principal = monthly_payment - interest

            if principal <= 0:
                return (None, None)

            total_interest += interest
            balance -= principal
            months += 1

            if balance < Decimal("0.00"):
                balance = Decimal("0.00")

        return (months, total_interest.quantize(Decimal("0.01")))

    def mark_as_paid_off(self):
        """Mark debt as paid off."""
        self.status = "paid_off"
        self.current_balance = Decimal("0.00")
        self.is_active = False
        self.save(
            update_fields=["status", "current_balance", "is_active", "updated_at"]
        )


class DebtPayment(models.Model):
    """
    Debt payment model for tracking payment history.
    """

    PAYMENT_TYPE_CHOICES = [
        ("minimum", "Minimum Payment"),
        ("extra", "Extra Payment"),
        ("full", "Full Payoff"),
    ]

    payment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    debt = models.ForeignKey(
        DebtAccount, on_delete=models.CASCADE, related_name="payments"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="debt_payments"
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Total payment amount",
    )
    payment_date = models.DateField(default=timezone.now)
    payment_type = models.CharField(
        max_length=20, choices=PAYMENT_TYPE_CHOICES, default="minimum"
    )

    applied_to_principal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Amount applied to principal",
    )
    applied_to_interest = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Amount applied to interest",
    )

    transaction = models.ForeignKey(
        "transactions.Transaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="debt_payments",
        help_text="Linked transaction",
    )

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "debt_payments"
        verbose_name = "Debt Payment"
        verbose_name_plural = "Debt Payments"
        ordering = ["-payment_date", "-created_at"]
        indexes = [
            models.Index(fields=["debt", "-payment_date"]),
            models.Index(fields=["user", "-payment_date"]),
            models.Index(fields=["transaction"]),
        ]

    def __str__(self):
        return f"{self.debt.name} - ${self.amount} on {self.payment_date}"


class DebtPayoffStrategy(models.Model):
    """
    Debt payoff strategy model for planning debt elimination.
    """

    STRATEGY_TYPE_CHOICES = [
        ("snowball", "Snowball (Smallest Balance First)"),
        ("avalanche", "Avalanche (Highest Interest First)"),
        ("custom", "Custom Order"),
    ]

    strategy_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="debt_strategies"
    )

    strategy_type = models.CharField(max_length=20, choices=STRATEGY_TYPE_CHOICES)
    monthly_budget = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Total monthly budget for debt payments",
    )

    priority_order = models.JSONField(
        default=list,
        help_text="List of debt_ids in priority order (for custom strategy)",
    )

    target_payoff_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "debt_strategies"
        verbose_name = "Debt Payoff Strategy"
        verbose_name_plural = "Debt Payoff Strategies"
        ordering = ["-is_active", "-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["strategy_type"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.get_strategy_type_display()} (${self.monthly_budget}/mo)"
