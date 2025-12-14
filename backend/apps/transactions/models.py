"""
Transaction and Category models for Cashly.
"""

import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinLengthValidator, MaxLengthValidator
from django.utils import timezone
from decimal import Decimal

User = get_user_model()


class CategoryManager(models.Manager):
    """Custom manager for Category model."""

    def system_categories(self):
        """Return only system-defined categories."""
        return self.filter(is_system_category=True)

    def user_categories(self, user):
        """Return user-created categories."""
        return self.filter(user=user, is_system_category=False)

    def for_user(self, user):
        """Return all categories available to a user (system + user's custom)."""
        return self.filter(models.Q(is_system_category=True) | models.Q(user=user))


class Category(models.Model):
    """
    Transaction category model.
    """

    CATEGORY_TYPE_CHOICES = [
        ("income", "Income"),
        ("expense", "Expense"),
        ("transfer", "Transfer"),
    ]

    category_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="categories",
        null=True,
        blank=True,
        help_text="Null for system categories",
    )
    name = models.CharField(
        max_length=100, validators=[MinLengthValidator(2), MaxLengthValidator(100)]
    )
    type = models.CharField(max_length=20, choices=CATEGORY_TYPE_CHOICES)
    parent_category = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subcategories",
        help_text="For subcategories",
    )
    icon = models.CharField(max_length=50, blank=True, help_text="Icon identifier")
    color = models.CharField(
        max_length=7, default="#000000", help_text="Hex color code"
    )
    is_system_category = models.BooleanField(default=False)
    rules = models.JSONField(
        default=list, blank=True, help_text="Auto-categorization rules"
    )
    rules_combination = models.CharField(
        max_length=3,
        choices=[("AND", "All rules must match"), ("OR", "Any rule can match")],
        default="AND",
        help_text="How to combine multiple rules when categorizing transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CategoryManager()

    class Meta:
        db_table = "categories"
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        unique_together = [["user", "name", "type"]]
        indexes = [
            models.Index(fields=["user", "type"]),
            models.Index(fields=["is_system_category"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"


class TransactionQuerySet(models.QuerySet):
    """Custom queryset for Transaction model."""

    def for_user(self, user):
        """Return transactions for a specific user."""
        return self.filter(user=user)

    def expenses(self):
        """Return only expense transactions (negative amounts)."""
        return self.filter(amount__lt=0)

    def income(self):
        """Return only income transactions (positive amounts)."""
        return self.filter(amount__gt=0)

    def recent(self, days=30):
        """Return recent transactions within specified days."""
        since = timezone.now() - timezone.timedelta(days=days)
        return self.filter(date__gte=since)

    def by_category(self, category):
        """Return transactions for a specific category."""
        return self.filter(category=category)


class TransactionManager(models.Manager):
    """Custom manager for Transaction model."""

    def get_queryset(self):
        return TransactionQuerySet(self.model, using=self._db)

    def for_user(self, user):
        """Return transactions for a specific user."""
        return self.get_queryset().for_user(user)

    def expenses(self):
        """Return only expense transactions (negative amounts)."""
        return self.get_queryset().expenses()

    def income(self):
        """Return only income transactions (positive amounts)."""
        return self.get_queryset().income()

    def recent(self, days=30):
        """Return recent transactions within specified days."""
        return self.get_queryset().recent(days=days)

    def by_category(self, category):
        """Return transactions for a specific category."""
        return self.get_queryset().by_category(category)


class Transaction(models.Model):
    """
    Transaction model representing financial transactions.
    """

    transaction_id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    account = models.ForeignKey(
        "accounts.Account", on_delete=models.CASCADE, related_name="transactions"
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="transactions"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Positive for income, negative for expenses",
    )
    date = models.DateField()
    merchant_name = models.CharField(
        max_length=200, validators=[MinLengthValidator(2), MaxLengthValidator(200)]
    )
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    tags = models.JSONField(default=list, blank=True, help_text="Array of tag strings")
    notes = models.TextField(blank=True, null=True)
    is_recurring = models.BooleanField(default=False)
    is_transfer = models.BooleanField(
        default=False, help_text="Internal transfer between accounts"
    )
    plaid_transaction_id = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        null=True,
        blank=True,
        help_text="External transaction identifier from Plaid",
    )
    location = models.JSONField(
        default=dict,
        blank=True,
        help_text="Location data: latitude, longitude, address",
    )
    plaid_category = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="Plaid personal finance category: primary and detailed",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user_modified = models.BooleanField(
        default=False, help_text="Whether user manually edited this transaction"
    )
    is_recurring_dismissed = models.BooleanField(
        default=False, help_text="User explicitly dismissed recurring status"
    )

    objects = TransactionManager()

    class Meta:
        db_table = "transactions"
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["account", "date"]),
            models.Index(fields=["category", "date"]),
            models.Index(fields=["plaid_transaction_id"]),
        ]

    def __str__(self):
        return f"{self.merchant_name} - {self.amount} ({self.date})"

    def is_expense(self):
        """Check if transaction is an expense."""
        return self.amount < 0

    def is_income(self):
        """Check if transaction is income."""
        return self.amount > 0


class TransactionSplit(models.Model):
    """
    Model for splitting transactions across multiple categories.
    """

    split_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(
        Transaction, on_delete=models.CASCADE, related_name="splits"
    )
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="transaction_splits"
    )
    amount = models.DecimalField(
        max_digits=12, decimal_places=2, help_text="Amount for this split"
    )
    description = models.CharField(
        max_length=255, blank=True, help_text="Optional description for this split"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "transaction_splits"
        verbose_name = "Transaction Split"
        verbose_name_plural = "Transaction Splits"
        ordering = ["created_at"]

    def __str__(self):
        return f"Split: {self.category.name} - {self.amount}"


class Receipt(models.Model):
    """
    Model for storing receipt images/PDFs associated with transactions.
    """

    receipt_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(
        Transaction, on_delete=models.CASCADE, related_name="receipts"
    )
    file = models.FileField(
        upload_to="receipts/%Y/%m/%d/",
        max_length=500,
        help_text="Receipt file (image or PDF)",
    )
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text="File size in bytes")
    content_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "receipts"
        verbose_name = "Receipt"
        verbose_name_plural = "Receipts"
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"Receipt for {self.transaction} - {self.file_name}"
