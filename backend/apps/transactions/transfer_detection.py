"""
Transfer detection and matching algorithm.
"""
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Transaction
import logging

logger = logging.getLogger(__name__)


def detect_transfers(user, lookback_days=30):
    """
    Detect and match transfers between user's accounts.
    
    A transfer is identified when:
    - Two transactions happen within 2 days of each other
    - Amounts are equal (or very close, within $0.50)
    - One is positive (income), one is negative (expense)
    - Both belong to the same user
    - Accounts are different
    
    Args:
        user: User object
        lookback_days: Number of days to look back
    
    Returns:
        dict: {
            'matched_pairs': List of matched transfer pairs,
            'updated_count': Number of transactions marked as transfers
        }
    """
    start_date = timezone.now().date() - timedelta(days=lookback_days)
    
    # Get all transactions in the period
    transactions = Transaction.objects.filter(
        user=user,
        date__gte=start_date
    ).select_related('account').order_by('date')
    
    # Separate into income and expenses
    expenses = [t for t in transactions if t.amount < 0]
    income = [t for t in transactions if t.amount > 0]
    
    matched_pairs = []
    matched_transaction_ids = set()
    
    for expense in expenses:
        if expense.transaction_id in matched_transaction_ids:
            continue
        
        expense_amount = abs(expense.amount)
        
        # Look for matching income within 2 days
        for income_tx in income:
            if income_tx.transaction_id in matched_transaction_ids:
                continue
            
            # Check if amounts are close enough (within $0.50)
            if abs(income_tx.amount - expense_amount) <= Decimal('0.50'):
                # Check if dates are within 2 days
                date_diff = abs((income_tx.date - expense.date).days)
                if date_diff <= 2:
                    # Check if accounts are different
                    if expense.account_id != income_tx.account_id:
                        # Found a transfer!
                        matched_pairs.append({
                            'from_transaction_id': str(expense.transaction_id),
                            'to_transaction_id': str(income_tx.transaction_id),
                            'from_account': expense.account.institution_name,
                            'to_account': income_tx.account.institution_name,
                            'amount': float(expense_amount),
                            'date': str(expense.date),
                            'date_diff_days': date_diff,
                        })
                        
                        matched_transaction_ids.add(expense.transaction_id)
                        matched_transaction_ids.add(income_tx.transaction_id)
                        break  # Found match for this expense
    
    # Mark matched transactions as transfers
    if matched_transaction_ids:
        Transaction.objects.filter(
            transaction_id__in=matched_transaction_ids
        ).update(is_transfer=True, user_modified=False)
    
    return {
        'matched_pairs': matched_pairs,
        'updated_count': len(matched_transaction_ids)
    }


def auto_categorize_transfer(transaction):
    """
    Auto-categorize a transaction as a transfer.
    Sets is_transfer=True and assigns a 'Transfer' category if available.
    """
    from .models import Category
    
    transaction.is_transfer = True
    
    # Try to find or create a Transfer category
    transfer_category = Category.objects.filter(
        Q(is_system_category=True, name__iexact='transfer') |
        Q(user=transaction.user, name__iexact='transfer')
    ).first()
    
    if transfer_category:
        transaction.category = transfer_category
    
    transaction.save(update_fields=['is_transfer', 'category', 'updated_at'])
    return transaction


def find_potential_transfer_pairs(transaction, max_results=5):
    """
    Find transactions that might be the matching transfer for a given transaction.
    """
    # Determine search criteria
    is_expense = transaction.amount < 0
    target_amount = abs(transaction.amount)
    
    # Search for opposite type transactions
    potential_matches = Transaction.objects.filter(
        user=transaction.user,
        date__gte=transaction.date - timedelta(days=2),
        date__lte=transaction.date + timedelta(days=2),
    ).exclude(
        transaction_id=transaction.transaction_id
    ).exclude(
        account=transaction.account  # Different account
    )
    
    if is_expense:
        # Looking for income (positive amount)
        potential_matches = potential_matches.filter(
            amount__gt=0,
            amount__gte=target_amount - Decimal('0.50'),
            amount__lte=target_amount + Decimal('0.50'),
        )
    else:
        # Looking for expense (negative amount)
        potential_matches = potential_matches.filter(
            amount__lt=0,
            amount__gte=-(target_amount + Decimal('0.50')),
            amount__lte=-(target_amount - Decimal('0.50')),
        )
    
    return list(potential_matches.select_related('account')[:max_results])


def mark_as_transfer_pair(transaction1, transaction2):
    """
    Manually mark two transactions as a transfer pair.
    """
    transaction1.is_transfer = True
    transaction1.user_modified = True
    transaction1.save(update_fields=['is_transfer', 'user_modified', 'updated_at'])
    
    transaction2.is_transfer = True
    transaction2.user_modified = True
    transaction2.save(update_fields=['is_transfer', 'user_modified', 'updated_at'])
    
    return (transaction1, transaction2)
