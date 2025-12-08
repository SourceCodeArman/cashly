"""
Utility functions for dashboard analytics.
"""
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncMonth, ExtractWeekDay
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from apps.accounts.models import Account
from apps.transactions.models import Transaction
from apps.transactions.serializers import TransactionFrontendSerializer
from apps.goals.models import Goal
from apps.budgets.models import Budget


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
    transactions = (
        Transaction.objects.for_user(user)
        .recent(days=30)
        .select_related('account', 'category')[:limit]
    )
    
    return TransactionFrontendSerializer(transactions, many=True).data


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


def get_budget_summary(user, month=None, year=None):
    """
    Get budget summary with spending vs budgeted amounts.
    
    Args:
        user: User instance
        month: Month number (1-12), defaults to current month
        year: Year, defaults to current year
        
    Returns:
        dict: Budget summary data
    """
    if not month or not year:
        now = timezone.now()
        month = month or now.month
        year = year or now.year
    
    # Get active budgets for the period
    budgets = Budget.objects.filter(
        user=user,
        start_date__year=year,
        start_date__month=month
    )
    
    budget_data = []
    total_budgeted = Decimal('0.00')
    total_spent = Decimal('0.00')
    
    for budget in budgets:
        # Calculate spent amount for this budget's category
        spent = Transaction.objects.filter(
            user=user,
            category=budget.category,
            date__gte=budget.start_date,
            date__lte=budget.end_date,
            amount__lt=0  # Expenses only
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        spent = abs(spent)
        total_budgeted += budget.amount
        total_spent += spent
        
        budget_data.append({
            'budget_id': str(budget.budget_id),
            'category_name': budget.category.name,
            'amount': float(budget.amount),
            'spent': float(spent),
            'remaining': float(budget.amount - spent),
            'percentage': float((spent / budget.amount * 100) if budget.amount > 0 else 0),
        })
    
    return {
        'total_budgeted': float(total_budgeted),
        'total_spent': float(total_spent),
        'budgets': budget_data,
    }


def get_spending_trends(user, months=6):
    """
    Get month-over-month spending trends.
    """
    end_date = timezone.now()
    start_date = end_date - timedelta(days=months*30)
    
    trends = (
        Transaction.objects.filter(
            user=user,
            date__gte=start_date,
            amount__lt=0
        )
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(total=Sum('amount'))
        .order_by('month')
    )
    
    return [
        {
            'month': item['month'].strftime('%Y-%m'),
            'amount': float(abs(item['total']))
        }
        for item in trends
    ]


def calculate_net_worth(user):
    """
    Calculate total net worth (Assets - Liabilities).
    """
    accounts = Account.objects.for_user(user).active()
    
    assets = accounts.filter(
        account_type__in=['checking', 'savings', 'investment', 'cash']
    ).aggregate(total=Sum('balance'))['total'] or Decimal('0.00')
    
    liabilities = accounts.filter(
        account_type__in=['credit_card', 'loan', 'mortgage']
    ).aggregate(total=Sum('balance'))['total'] or Decimal('0.00')
    
    return {
        'net_worth': float(assets - liabilities),
        'assets': float(assets),
        'liabilities': float(liabilities)
    }


def get_spending_patterns(user, month=None, year=None):
    """
    Analyze spending by day of week.
    """
    if not month or not year:
        now = timezone.now()
        month = month or now.month
        year = year or now.year
        
    patterns = (
        Transaction.objects.filter(
            user=user,
            date__year=year,
            date__month=month,
            amount__lt=0
        )
        .annotate(day=ExtractWeekDay('date'))
        .values('day')
        .annotate(total=Sum('amount'), count=Count('transaction_id'))
        .order_by('day')
    )
    
    # Map 1 (Sunday) to 7 (Saturday)
    days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    result = []
    for i in range(1, 8):
        day_data = next((p for p in patterns if p['day'] == i), None)
        result.append({
            'day': days[i-1],
            'amount': float(abs(day_data['total'])) if day_data else 0.0,
            'count': day_data['count'] if day_data else 0
        })
        
    return result


def get_recommendations(user):
    """
    Generate personalized financial recommendations based on user's data.
    
    Analyzes budgets, goals, transactions, and accounts to provide actionable insights.
    
    Args:
        user: User instance
        
    Returns:
        list: List of recommendation dictionaries with:
            - id: Unique identifier
            - type: Recommendation type ('budget', 'goal', 'spending', 'savings', 'account')
            - icon: Icon type ('trending', 'target', 'alert', 'lightbulb')
            - title: Short recommendation title
            - description: Detailed recommendation text
            - priority: Priority level ('high', 'medium', 'low')
            - actionable: Boolean indicating if user can take action
            - metadata: Optional JSON with related IDs
    """
    import uuid
    recommendations = []
    now = timezone.now()
    current_month = now.month
    current_year = now.year
    
    # 1. Analyze Budgets
    budgets = Budget.objects.filter(
        user=user,
        period_start__year=current_year,
        period_start__month=current_month
    )
    
    for budget in budgets:
        # Calculate spent amount for this budget's category
        spent = Transaction.objects.filter(
            user=user,
            category=budget.category,
            date__gte=budget.period_start,
            date__lte=budget.period_end,
            amount__lt=0  # Expenses only
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        spent = abs(spent)
        percentage = float((spent / budget.amount * 100) if budget.amount > 0 else 0)
        
        if percentage >= 100:
            # Budget exceeded
            recommendations.append({
                'id': str(uuid.uuid4()),
                'type': 'budget',
                'icon': 'alert',
                'title': f'Budget Exceeded: {budget.category.name}',
                'description': f'{budget.category.name} budget has been exceeded by ${spent - budget.amount:.2f}. Consider reviewing your spending.',
                'priority': 'high',
                'actionable': True,
                'metadata': {
                    'budget_id': str(budget.budget_id),
                    'category_id': str(budget.category.category_id) if budget.category.category_id else None,
                }
            })
        elif percentage >= float(budget.alert_threshold):
            # Budget approaching threshold
            recommendations.append({
                'id': str(uuid.uuid4()),
                'type': 'budget',
                'icon': 'alert',
                'title': f'Budget Alert: {budget.category.name}',
                'description': f'{budget.category.name} budget is {percentage:.1f}% used (${spent:.2f} of ${budget.amount:.2f}). Pace yourself for the rest of the period.',
                'priority': 'medium',
                'actionable': True,
                'metadata': {
                    'budget_id': str(budget.budget_id),
                    'category_id': str(budget.category.category_id) if budget.category.category_id else None,
                }
            })
    
    # 2. Analyze Goals
    goals = Goal.objects.filter(user=user, is_active=True, archived_at__isnull=True)
    
    for goal in goals:
        progress = goal.progress_percentage()
        is_on_track = goal.is_on_track()
        days_remaining = goal.days_remaining()
        
        # Check if goal is off-track
        if goal.deadline and is_on_track is False:
            recommendations.append({
                'id': str(uuid.uuid4()),
                'type': 'goal',
                'icon': 'target',
                'title': f'Goal Off Track: {goal.name}',
                'description': f'{goal.name} needs attention to meet the deadline. Current progress: {progress:.1f}%. Consider increasing monthly contributions.',
                'priority': 'high',
                'actionable': True,
                'metadata': {
                    'goal_id': str(goal.goal_id),
                }
            })
        elif progress >= 25 and progress < 100 and (progress % 25 == 0 or progress >= 50):
            # Goal milestone reached
            recommendations.append({
                'id': str(uuid.uuid4()),
                'type': 'goal',
                'icon': 'target',
                'title': f'Goal Progress: {goal.name}',
                'description': f'{goal.name} is {progress:.1f}% complete (${goal.current_amount:.2f} of ${goal.target_amount:.2f}). Keep up the great work!',
                'priority': 'low',
                'actionable': False,
                'metadata': {
                    'goal_id': str(goal.goal_id),
                }
            })
    
    # 3. Analyze Spending Trends (month-over-month comparison)
    current_month_spending = Transaction.objects.filter(
        user=user,
        date__year=current_year,
        date__month=current_month,
        amount__lt=0
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    current_month_spending = abs(current_month_spending)
    
    # Get previous month spending
    prev_month = current_month - 1
    prev_year = current_year
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1
    
    prev_month_spending = Transaction.objects.filter(
        user=user,
        date__year=prev_year,
        date__month=prev_month,
        amount__lt=0
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    prev_month_spending = abs(prev_month_spending)
    
    # Check for significant spending increases by category
    if prev_month_spending > 0:
        current_category_spending = Transaction.objects.filter(
            user=user,
            date__year=current_year,
            date__month=current_month,
            amount__lt=0
        ).values('category__name', 'category__category_id').annotate(
            total=Sum('amount')
        )
        
        prev_category_spending = Transaction.objects.filter(
            user=user,
            date__year=prev_year,
            date__month=prev_month,
            amount__lt=0
        ).values('category__name', 'category__category_id').annotate(
            total=Sum('amount')
        )
        
        # Create dict for easy lookup
        prev_spending_dict = {
            str(item['category__category_id']) if item['category__category_id'] else 'uncategorized': abs(item['total'])
            for item in prev_category_spending
        }
        
        for item in current_category_spending:
            category_id = str(item['category__category_id']) if item['category__category_id'] else 'uncategorized'
            category_name = item['category__name'] or 'Uncategorized'
            current_amount = abs(item['total'])
            prev_amount = prev_spending_dict.get(category_id, 0)
            
            if prev_amount > 0 and current_amount > 0:
                increase_percentage = ((current_amount - prev_amount) / prev_amount) * 100
                
                if increase_percentage >= 30:  # 30%+ increase
                    recommendations.append({
                        'id': str(uuid.uuid4()),
                        'type': 'spending',
                        'icon': 'trending',
                        'title': f'Spending Increase: {category_name}',
                        'description': f'{category_name} spending increased {increase_percentage:.1f}% this month (${current_amount:.2f} vs ${prev_amount:.2f}). Review your expenses.',
                        'priority': 'medium',
                        'actionable': True,
                        'metadata': {
                            'category_id': str(item['category__category_id']) if item['category__category_id'] else None,
                        }
                    })
    
    # 4. Analyze Top Spending Categories
    top_categories = Transaction.objects.filter(
        user=user,
        date__year=current_year,
        date__month=current_month,
        amount__lt=0
    ).values('category__name', 'category__category_id').annotate(
        total=Sum('amount')
    ).order_by('-total')[:3]
    
    if top_categories:
        top_category = top_categories[0]
        top_amount = abs(top_category['total'])
        category_name = top_category['category__name'] or 'Uncategorized'
        
        # Only recommend if spending is significant (> $100)
        if top_amount > 100:
            recommendations.append({
                'id': str(uuid.uuid4()),
                'type': 'spending',
                'icon': 'lightbulb',
                'title': f'Top Spending Category: {category_name}',
                'description': f'{category_name} is your highest spending category this month (${top_amount:.2f}). Look for ways to optimize spending in this area.',
                'priority': 'low',
                'actionable': True,
                'metadata': {
                    'category_id': str(top_category['category__category_id']) if top_category['category__category_id'] else None,
                }
            })
    
    # 5. Analyze Account Balances
    accounts = Account.objects.for_user(user).active()
    
    for account in accounts:
        # Check for low balances in checking/savings accounts
        if account.account_type in ['checking', 'savings']:
            # Low balance threshold: $100 for checking, $500 for savings
            threshold = Decimal('100.00') if account.account_type == 'checking' else Decimal('500.00')
            
            if account.balance < threshold:
                recommendations.append({
                    'id': str(uuid.uuid4()),
                    'type': 'account',
                    'icon': 'alert',
                    'title': f'Low Balance: {account.custom_name or account.institution_name}',
                    'description': f'{account.custom_name or account.institution_name} balance is ${account.balance:.2f}, which is below the recommended threshold. Consider transferring funds.',
                    'priority': 'medium',
                    'actionable': True,
                    'metadata': {
                        'account_id': str(account.account_id),
                    }
                })
        
        # Check for account errors
        if hasattr(account, 'error_code') and account.error_code:
            recommendations.append({
                'id': str(uuid.uuid4()),
                'type': 'account',
                'icon': 'alert',
                'title': f'Account Sync Issue: {account.custom_name or account.institution_name}',
                'description': f'{account.custom_name or account.institution_name} has a sync issue. Please reconnect your account to continue syncing transactions.',
                'priority': 'high',
                'actionable': True,
                'metadata': {
                    'account_id': str(account.account_id),
                }
            })
    
    # Sort recommendations by priority (high -> medium -> low)
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    recommendations.sort(key=lambda x: priority_order.get(x['priority'], 3))
    
    return recommendations


