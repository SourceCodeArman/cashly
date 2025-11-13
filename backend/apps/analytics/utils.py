"""
Utility functions for dashboard analytics.
"""
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import datetime
from decimal import Decimal
from apps.accounts.models import Account
from apps.transactions.models import Transaction
from apps.goals.models import Goal


def get_account_balance_summary(user):
    """
    Get total balance across all active accounts, separated by account type.
    
    Args:
        user: User instance
        
    Returns:
        dict: Balance summary data with separate totals for checking/savings,
              investments, and credit card debt
    """
    accounts = Account.objects.for_user(user).active()
    
    # Calculate total balance from checking and savings accounts only
    checking_savings = accounts.filter(account_type__in=['checking', 'savings'])
    total_balance = checking_savings.aggregate(total=Sum('balance'))['total'] or Decimal('0.00')
    
    # Calculate total investment from investment accounts
    investment_accounts = accounts.filter(account_type='investment')
    total_investment = investment_accounts.aggregate(total=Sum('balance'))['total'] or Decimal('0.00')
    
    # Calculate total debt from credit card accounts
    credit_card_accounts = accounts.filter(account_type='credit_card')
    total_debt = credit_card_accounts.aggregate(total=Sum('balance'))['total'] or Decimal('0.00')
    
    return {
        'total_balance': float(total_balance),
        'total_investment': float(total_investment),
        'total_debt': float(total_debt),
        'account_count': accounts.count(),
        'accounts': [
            {
                'account_id': str(acc.account_id),
                'institution_name': acc.institution_name,
                'custom_name': acc.custom_name,
                'account_type': acc.account_type,
                'account_number_masked': acc.account_number_masked,
                'balance': float(acc.balance),
            }
            for acc in accounts
        ]
    }


def get_recent_transactions(user, limit=15):
    """
    Get recent transactions for user.
    
    Args:
        user: User instance
        limit: Number of transactions to return
        
    Returns:
        list: List of transaction dictionaries
    """
    transactions = Transaction.objects.for_user(user).recent(days=30)[:limit]
    
    return [
        {
            'transaction_id': str(txn.transaction_id),
            'merchant_name': txn.merchant_name,
            'amount': float(txn.amount),
            'formatted_amount': f"${abs(txn.amount):,.2f}",
            'date': txn.date.isoformat(),
            'category_name': txn.category.name if txn.category else None,
            'account_name': txn.account.institution_name,
        }
        for txn in transactions
    ]


def get_monthly_spending_summary(user, month=None, year=None):
    """
    Get monthly spending summary by category.
    
    Args:
        user: User instance
        month: Month number (1-12), defaults to current month
        year: Year, defaults to current year
        
    Returns:
        dict: Spending summary data
    """
    if not month or not year:
        now = timezone.now()
        month = month or now.month
        year = year or now.year
    
    # Get all expense transactions for the month
    transactions = Transaction.objects.for_user(user).filter(
        date__year=year,
        date__month=month,
        amount__lt=0  # Expenses are negative
    )
    
    total_expenses = abs(transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00'))
    
    # Group by category
    category_breakdown = transactions.values('category__name', 'category__category_id').annotate(
        total=Sum('amount'),
        count=Count('transaction_id')
    ).order_by('-total')
    
    category_data = [
        {
            'category_id': str(item['category__category_id']) if item['category__category_id'] else None,
            'category_name': item['category__name'] or 'Uncategorized',
            'total': float(abs(item['total'])),
            'count': item['count'],
        }
        for item in category_breakdown
    ]
    
    return {
        'month': month,
        'year': year,
        'total_expenses': float(total_expenses),
        'transaction_count': transactions.count(),
        'by_category': category_data,
    }


def get_goal_progress(user):
    """
    Get progress data for all active goals with contribution statistics.
    
    Args:
        user: User instance
        
    Returns:
        list: List of goal progress dictionaries
    """
    goals = Goal.objects.filter(user=user, is_active=True, archived_at__isnull=True)
    
    goal_progress = []
    for goal in goals:
        # Get contribution statistics
        manual_total = goal.get_manual_contributions_total()
        automatic_total = goal.get_automatic_contributions_total()
        contributions_by_source = goal.get_contributions_by_source()
        
        goal_progress.append({
            'goal_id': str(goal.goal_id),
            'name': goal.name,
            'target_amount': float(goal.target_amount),
            'current_amount': float(goal.current_amount),
            'progress_percentage': goal.progress_percentage(),
            'deadline': goal.deadline.isoformat() if goal.deadline else None,
            'is_on_track': goal.is_on_track(),
            'days_remaining': goal.days_remaining(),
            'is_completed': goal.is_completed,
            'completed_at': goal.completed_at.isoformat() if goal.completed_at else None,
            'goal_type': goal.goal_type,
            'inferred_category_id': str(goal.inferred_category.category_id) if goal.inferred_category else None,
            'inferred_category_name': goal.inferred_category.name if goal.inferred_category else None,
            'contributions': {
                'manual_total': float(manual_total),
                'automatic_total': float(automatic_total),
                'total': float(goal.current_amount),
                'count': goal.contributions.count(),
                'by_source': [
                    {
                        'source': item['source'],
                        'total': float(item['total']),
                        'count': item['count']
                    }
                    for item in contributions_by_source
                ],
            },
        })
    
    return goal_progress


def get_category_spending_chart(user, month=None, year=None):
    """
    Get category spending breakdown for chart visualization.
    
    Args:
        user: User instance
        month: Month number (1-12), defaults to current month
        year: Year, defaults to current year
        
    Returns:
        list: List of category spending data for charts
    """
    if not month or not year:
        now = timezone.now()
        month = month or now.month
        year = year or now.year
    
    transactions = Transaction.objects.for_user(user).filter(
        date__year=year,
        date__month=month,
        amount__lt=0  # Expenses only
    )
    
    category_data = transactions.values(
        'category__name',
        'category__color',
        'category__category_id'
    ).annotate(
        total=Sum('amount')
    ).order_by('-total')
    
    return [
        {
            'category_id': str(item['category__category_id']) if item['category__category_id'] else None,
            'category_name': item['category__name'] or 'Uncategorized',
            'amount': float(abs(item['total'])),
            'color': item['category__color'] or '#9E9E9E',
        }
        for item in category_data
    ]

