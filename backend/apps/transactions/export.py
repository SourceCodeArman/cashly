"""
Export functionality for transactions (CSV/PDF).
"""
import csv
import io
import logging
from datetime import datetime
from decimal import Decimal
from django.http import HttpResponse
from django.db.models import Q
from rest_framework.response import Response
from rest_framework import status

from .models import Transaction
from apps.subscriptions.limit_service import SubscriptionLimitService
from apps.subscriptions.exceptions import FeatureNotAvailable
from apps.subscriptions.limits import FEATURE_EXPORT

logger = logging.getLogger(__name__)


def check_export_permission(user):
    """
    Check if user has permission to export transactions.
    
    Args:
        user: Django User instance
        
    Raises:
        FeatureNotAvailable: If export feature is not available for user's tier
    """
    SubscriptionLimitService.enforce_limit(
        user=user,
        feature_type=FEATURE_EXPORT
    )


def export_transactions_csv(user, transactions_queryset=None, date_from=None, date_to=None):
    """
    Export transactions to CSV format.
    
    Args:
        user: Django User instance
        transactions_queryset: Optional queryset of transactions (if None, fetches all user transactions)
        date_from: Optional start date filter
        date_to: Optional end date filter
        
    Returns:
        HttpResponse with CSV file
        
    Raises:
        FeatureNotAvailable: If export feature is not available for user's tier
    """
    # Check export permission
    check_export_permission(user)
    
    # Get transactions if not provided
    if transactions_queryset is None:
        transactions_queryset = Transaction.objects.for_user(user).filter(
            account__is_active=True
        )
    
    # Apply date filters
    if date_from:
        transactions_queryset = transactions_queryset.filter(date__gte=date_from)
    if date_to:
        transactions_queryset = transactions_queryset.filter(date__lte=date_to)
    
    # Apply subscription transaction history limit
    try:
        history_limit = SubscriptionLimitService.get_transaction_history_limit(user)
        if history_limit is not None:
            from django.utils import timezone
            min_date = timezone.now().date() - history_limit
            transactions_queryset = transactions_queryset.filter(date__gte=min_date)
    except Exception as e:
        logger.warning(f"Error applying transaction history limit: {e}")
    
    # Select related to optimize queries
    transactions = transactions_queryset.select_related('account', 'category').order_by('-date', '-created_at')
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    filename = f'transactions_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    writer = csv.writer(response)
    
    # Write header
    writer.writerow([
        'Date',
        'Merchant',
        'Description',
        'Amount',
        'Category',
        'Account',
        'Account Type',
        'Is Recurring',
        'Is Transfer',
        'Created At'
    ])
    
    # Write transaction data
    for transaction in transactions:
        writer.writerow([
            transaction.date.isoformat(),
            transaction.merchant_name or '',
            transaction.description or '',
            f"{transaction.amount:.2f}",
            transaction.category.name if transaction.category else '',
            transaction.account.institution_name if transaction.account else '',
            transaction.account.get_account_type_display() if transaction.account else '',
            'Yes' if transaction.is_recurring else 'No',
            'Yes' if transaction.is_transfer else 'No',
            transaction.created_at.isoformat() if transaction.created_at else '',
        ])
    
    return response


def export_transactions_pdf(user, transactions_queryset=None, date_from=None, date_to=None):
    """
    Export transactions to PDF format.
    
    Note: This is a placeholder. In production, you would use a library like
    reportlab or weasyprint to generate PDFs.
    
    Args:
        user: Django User instance
        transactions_queryset: Optional queryset of transactions
        date_from: Optional start date filter
        date_to: Optional end date filter
        
    Returns:
        HttpResponse with PDF file
        
    Raises:
        FeatureNotAvailable: If export feature is not available for user's tier
        NotImplementedError: PDF export not yet implemented
    """
    # Check export permission
    check_export_permission(user)
    
    # TODO: Implement PDF generation using reportlab or weasyprint
    raise NotImplementedError("PDF export is not yet implemented. Please use CSV export.")


def get_export_summary(user, date_from=None, date_to=None):
    """
    Get summary statistics for export preview.
    
    Args:
        user: Django User instance
        date_from: Optional start date filter
        date_to: Optional end date filter
        
    Returns:
        Dictionary with export summary statistics
    """
    queryset = Transaction.objects.for_user(user).filter(account__is_active=True)
    
    # Apply date filters
    if date_from:
        queryset = queryset.filter(date__gte=date_from)
    if date_to:
        queryset = queryset.filter(date__lte=date_to)
    
    # Apply subscription transaction history limit
    try:
        history_limit = SubscriptionLimitService.get_transaction_history_limit(user)
        if history_limit is not None:
            from django.utils import timezone
            min_date = timezone.now().date() - history_limit
            queryset = queryset.filter(date__gte=min_date)
    except Exception:
        pass
    
    total_count = queryset.count()
    expenses = queryset.filter(amount__lt=0)
    income = queryset.filter(amount__gt=0)
    
    from django.db.models import Sum
    expense_total = abs(expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00'))
    income_total = income.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    return {
        'total_transactions': total_count,
        'total_expenses': float(expense_total),
        'total_income': float(income_total),
        'date_from': date_from.isoformat() if date_from else None,
        'date_to': date_to.isoformat() if date_to else None,
    }

