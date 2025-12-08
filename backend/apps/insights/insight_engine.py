"""
Insight Engine - Core analysis functions for generating financial insights.

This module contains the algorithms for detecting patterns in user's financial data
and generating actionable insights.
"""
import logging
from datetime import timedelta
from decimal import Decimal
from collections import defaultdict
from django.db.models import Sum, Count, Avg
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.transactions.models import Transaction
from apps.accounts.models import Account
from apps.budgets.models import Budget
from apps.goals.models import Goal
from .models import Insight, InsightType, InsightPriority

logger = logging.getLogger(__name__)


def detect_subscription_patterns(user):
    """
    Identify recurring monthly/weekly charges that look like subscriptions.
    
    Looks for transactions with:
    - Same merchant name
    - Similar amounts (within 5% tolerance)
    - Regular intervals (monthly or weekly)
    
    Args:
        user: User instance
        
    Returns:
        list: List of detected subscription patterns with merchant, amount, frequency
    """
    subscriptions = []
    
    # Get last 6 months of transactions
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=180)
    
    # Common non-subscription merchants to exclude
    EXCLUDED_MERCHANTS = {
        'mcdonald', 'starbucks', 'uber', 'lyft', 'doordash', 'grubhub', 
        'instacart', 'amazon', 'target', 'walmart', 'shell', 'bp', 'exxon',
        'chevron', '7-eleven', 'wawa', 'dunkin', 'costco', 'whole foods',
        'trader joe', 'safeway', 'kroger', 'publix', 'cvs', 'walgreens'
    }
    
    # Categories that are rarely subscriptions
    EXCLUDED_CATEGORIES = {
        'Dining', 'Food & Drink', 'Groceries', 'Gas', 'Transportation', 
        'Shopping', 'Travel', 'Personal Care'
    }

    transactions = Transaction.objects.filter(
        user=user,
        date__gte=start_date,
        date__lte=end_date,
        amount__lt=0  # Expenses only
    ).order_by('merchant_name', 'date')
    
    # Group by merchant name
    merchant_groups = defaultdict(list)
    for txn in transactions:
        if txn.merchant_name:
            # Check if merchant is in excluded list
            merchant_lower = txn.merchant_name.lower()
            if any(ex in merchant_lower for ex in EXCLUDED_MERCHANTS):
                continue
                
            # Check if category is excluded
            if txn.category and txn.category.name in EXCLUDED_CATEGORIES:
                continue
                
            merchant_groups[merchant_lower].append(txn)
    
    for merchant, txns in merchant_groups.items():
        # Increased threshold to 4 to reduce false positives
        if len(txns) < 4:
            continue
            
        # Check for similar amounts (within 5% tolerance)
        amounts = [abs(t.amount) for t in txns]
        avg_amount = sum(amounts) / len(amounts)
        
        similar_amounts = all(
            abs(amt - avg_amount) / avg_amount < 0.05 
            for amt in amounts if avg_amount > 0
        )
        
        if not similar_amounts or avg_amount < 1:
            continue
        
        # Check for regular interval (monthly = 25-35 days between transactions)
        dates = sorted([t.date for t in txns])
        intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
        
        if not intervals:
            continue
            
        avg_interval = sum(intervals) / len(intervals)
        
        frequency = None
        if 25 <= avg_interval <= 35:
            frequency = 'monthly'
        elif 5 <= avg_interval <= 9:
            frequency = 'weekly'
        
        if frequency:
            subscriptions.append({
                'merchant': txns[0].merchant_name,
                'amount': float(avg_amount),
                'frequency': frequency,
                'occurrences': len(txns),
                'category': txns[0].category.name if txns[0].category else 'Uncategorized',
                'last_charge': dates[-1].isoformat()
            })
    
    return subscriptions


def detect_unusual_spending(user):
    """
    Flag spending anomalies compared to historical averages.
    
    Compares current month spending to previous 3-month average by category.
    Flags categories with >30% increase.
    
    Args:
        user: User instance
        
    Returns:
        list: List of unusual spending alerts with category, amount, percentage increase
    """
    unusual = []
    now = timezone.now()
    current_month_start = now.replace(day=1)
    
    # Get previous 3 months for comparison
    prev_months_start = (current_month_start - timedelta(days=90)).replace(day=1)
    
    # Current month spending by category
    current_spending = Transaction.objects.filter(
        user=user,
        date__gte=current_month_start,
        amount__lt=0
    ).values('category__name', 'category__category_id').annotate(
        total=Sum('amount')
    )
    
    current_by_category = {
        str(item['category__category_id']) if item['category__category_id'] else 'uncategorized': {
            'name': item['category__name'] or 'Uncategorized',
            'total': abs(item['total'])
        }
        for item in current_spending
    }
    
    # Historical average by category (per month)
    historical = Transaction.objects.filter(
        user=user,
        date__gte=prev_months_start,
        date__lt=current_month_start,
        amount__lt=0
    ).values('category__name', 'category__category_id').annotate(
        total=Sum('amount'),
        count=Count('transaction_id')
    )
    
    historical_by_category = {
        str(item['category__category_id']) if item['category__category_id'] else 'uncategorized': {
            'name': item['category__name'] or 'Uncategorized',
            'monthly_avg': abs(item['total']) / 3  # 3-month average
        }
        for item in historical
    }
    
    # Compare current to historical
    for cat_id, current_data in current_by_category.items():
        historical_data = historical_by_category.get(cat_id)
        
        if not historical_data or historical_data['monthly_avg'] < 10:
            continue
            
        current_amount = float(current_data['total'])
        historical_avg = float(historical_data['monthly_avg'])
        
        if historical_avg > 0:
            increase_pct = ((current_amount - historical_avg) / historical_avg) * 100
            
            if increase_pct > 30:  # 30%+ increase threshold
                unusual.append({
                    'category_id': cat_id if cat_id != 'uncategorized' else None,
                    'category': current_data['name'],
                    'current_amount': current_amount,
                    'historical_avg': historical_avg,
                    'increase_percentage': round(increase_pct, 1)
                })
    
    return sorted(unusual, key=lambda x: x['increase_percentage'], reverse=True)


def detect_merchant_patterns(user):
    """
    Find frequently visited merchants and spending patterns.
    
    Args:
        user: User instance
        
    Returns:
        list: Top merchants by frequency and spend
    """
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=90)
    
    patterns = Transaction.objects.filter(
        user=user,
        date__gte=start_date,
        amount__lt=0
    ).exclude(
        merchant_name__isnull=True
    ).exclude(
        merchant_name=''
    ).values('merchant_name').annotate(
        total_spent=Sum('amount'),
        visit_count=Count('transaction_id'),
        avg_amount=Avg('amount')
    ).order_by('-visit_count')[:10]
    
    return [
        {
            'merchant': item['merchant_name'],
            'total_spent': float(abs(item['total_spent'])),
            'visit_count': item['visit_count'],
            'avg_per_visit': float(abs(item['avg_amount']))
        }
        for item in patterns
    ]


def analyze_income_stability(user):
    """
    Analyze income consistency over time.
    
    Args:
        user: User instance
        
    Returns:
        dict: Income analysis with stability score and trends
    """
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=180)
    
    monthly_income = Transaction.objects.filter(
        user=user,
        date__gte=start_date,
        amount__gt=0  # Income is positive
    ).annotate(
        month=TruncMonth('date')
    ).values('month').annotate(
        total=Sum('amount')
    ).order_by('month')
    
    incomes = [float(m['total']) for m in monthly_income]
    
    if len(incomes) < 2:
        return {
            'is_stable': None,
            'avg_monthly_income': incomes[0] if incomes else 0,
            'months_analyzed': len(incomes)
        }
    
    avg_income = sum(incomes) / len(incomes)
    variance = sum((x - avg_income) ** 2 for x in incomes) / len(incomes)
    std_dev = variance ** 0.5
    
    # Coefficient of variation - lower is more stable
    cv = (std_dev / avg_income * 100) if avg_income > 0 else 0
    
    return {
        'is_stable': cv < 15,  # Less than 15% variation = stable
        'avg_monthly_income': round(avg_income, 2),
        'variation_coefficient': round(cv, 1),
        'months_analyzed': len(incomes),
        'trend': 'increasing' if incomes[-1] > incomes[0] else 'decreasing' if incomes[-1] < incomes[0] else 'stable'
    }


def generate_savings_opportunities(user):
    """
    Identify areas where user could potentially save money.
    
    NOTE: Subscription-related savings are handled by detect_subscription_patterns
    to avoid duplicate insights.
    
    Args:
        user: User instance
        
    Returns:
        list: Potential savings opportunities
    """
    opportunities = []
    
    # Check for categories with high spending (NOT subscriptions - those are handled separately)
    now = timezone.now()
    current_month_start = now.replace(day=1)
    
    category_spending = Transaction.objects.filter(
        user=user,
        date__gte=current_month_start,
        amount__lt=0
    ).values('category__name').annotate(
        total=Sum('amount')
    ).order_by('total')[:5]
    
    for cat in category_spending:
        amount = abs(float(cat['total']))
        category_name = cat['category__name'] or 'Uncategorized'
        
        if amount > 500 and category_name in ['Dining', 'Entertainment', 'Shopping', 'Food & Drink']:
            opportunities.append({
                'type': 'category_reduction',
                'title': f'Reduce {category_name} Spending',
                'description': f"You've spent ${amount:.2f} on {category_name} this month. Setting a budget could help.",
                'potential_savings': amount * 0.15,
                'category': category_name
            })
    
    return opportunities


def generate_insights(user):
    """
    Main orchestrator function to generate all insights for a user.
    
    Analyzes various aspects of the user's financial data and creates
    Insight records in the database.
    
    Args:
        user: User instance
        
    Returns:
        list: List of created Insight instances
    """
    created_insights = []
    
    # 1. Subscription patterns
    subscriptions = detect_subscription_patterns(user)
    if subscriptions:
        total_monthly = sum(s['amount'] for s in subscriptions if s['frequency'] == 'monthly')
        
        # Create insight about subscriptions
        if len(subscriptions) >= 3:
            insight, created = Insight.objects.update_or_create(
                user=user,
                insight_type=InsightType.SUBSCRIPTION,
                defaults={
                    'title': f'{len(subscriptions)} Recurring Subscriptions Detected',
                    'description': f"We found {len(subscriptions)} recurring charges totaling approximately ${total_monthly:.2f}/month. Review them to ensure you're still using all these services.",
                    'priority': InsightPriority.MEDIUM,
                    'metadata': {
                        'subscriptions': subscriptions,  # Include ALL subscriptions
                        'total_monthly': total_monthly,
                        'count': len(subscriptions)
                    }
                }
            )
            if created:
                created_insights.append(insight)
    
    # 2. Unusual spending
    unusual = detect_unusual_spending(user)
    for item in unusual[:3]:  # Top 3 unusual spending categories
        if item['increase_percentage'] > 50:  # More than 50% increase
            insight, created = Insight.objects.update_or_create(
                user=user,
                insight_type=InsightType.UNUSUAL_SPENDING,
                metadata__category_id=item['category_id'],
                defaults={
                    'title': f"Unusual Spending in {item['category']}",
                    'description': f"Your spending in {item['category']} is up {item['increase_percentage']:.0f}% compared to your 3-month average (${item['current_amount']:.2f} vs ${item['historical_avg']:.2f}).",
                    'priority': InsightPriority.HIGH if item['increase_percentage'] > 100 else InsightPriority.MEDIUM,
                    'metadata': item
                }
            )
            if created:
                created_insights.append(insight)
    
    # 3. Merchant patterns
    merchants = detect_merchant_patterns(user)
    if merchants and merchants[0]['visit_count'] >= 10:
        top_merchant = merchants[0]
        insight, created = Insight.objects.update_or_create(
            user=user,
            insight_type=InsightType.MERCHANT_PATTERN,
            metadata__merchant=top_merchant['merchant'],
            defaults={
                'title': f"Frequent Visits to {top_merchant['merchant']}",
                'description': f"You've visited {top_merchant['merchant']} {top_merchant['visit_count']} times in the last 90 days, spending ${top_merchant['total_spent']:.2f} total.",
                'priority': InsightPriority.LOW,
                'metadata': top_merchant
            }
        )
        if created:
            created_insights.append(insight)
    
    # 4. Savings opportunities
    opportunities = generate_savings_opportunities(user)
    for opp in opportunities:
        insight, created = Insight.objects.update_or_create(
            user=user,
            insight_type=InsightType.SAVINGS_OPPORTUNITY,
            title=opp['title'],
            defaults={
                'description': opp['description'],
                'priority': InsightPriority.MEDIUM,
                'metadata': {
                    'potential_savings': opp['potential_savings'],
                    'type': opp['type']
                }
            }
        )
        if created:
            created_insights.append(insight)
    
    # 5. Income stability
    income_analysis = analyze_income_stability(user)
    if income_analysis['is_stable'] is not None:
        if not income_analysis['is_stable']:
            insight, created = Insight.objects.update_or_create(
                user=user,
                insight_type=InsightType.INCOME_ANALYSIS,
                defaults={
                    'title': 'Irregular Income Detected',
                    'description': f"Your monthly income varies by about {income_analysis['variation_coefficient']:.0f}%. Consider building a larger emergency fund to handle fluctuations.",
                    'priority': InsightPriority.MEDIUM,
                    'metadata': income_analysis
                }
            )
            if created:
                created_insights.append(insight)
    
    logger.info(f"Generated {len(created_insights)} new insights for user {user.id}")
    return created_insights
