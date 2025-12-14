import logging
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum, Q
from apps.transactions.models import Transaction

logger = logging.getLogger(__name__)


def calculate_budget_usage(budget, history_limit=None):
    """
    Calculate budget usage and remaining amount.

    Args:
        budget: Budget model instance
        history_limit: Optional pre-fetched transaction history limit (timedelta)

    Returns:
        dict: Dictionary containing usage statistics
    """
    # Get transactions for this category within the budget period
    transactions = Transaction.objects.filter(
        user=budget.user,
        category=budget.category,
        date__gte=budget.period_start,
        date__lte=budget.period_end,
        amount__lt=0,  # Only expenses
    )

    # Apply subscription transaction history limit if applicable
    try:
        if history_limit is None:
            # Fallback to fetching it if not provided (legacy behavior)
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import SubscriptionExpired

            try:
                history_limit = SubscriptionLimitService.get_transaction_history_limit(
                    budget.user
                )
            except SubscriptionExpired:
                history_limit = timedelta(days=30)

        if history_limit is not None:
            min_date = timezone.now().date() - history_limit
            transactions = transactions.filter(date__gte=min_date)

    except Exception as e:
        logger.warning(f"Error checking subscription limits in budget calculation: {e}")

    spent = abs(transactions.aggregate(total=Sum("amount"))["total"] or 0)
    remaining = max(0, float(budget.amount) - float(spent))
    percentage_used = (
        (float(spent) / float(budget.amount) * 100) if budget.amount > 0 else 0
    )

    return {
        "spent": f"{spent:.2f}",
        "remaining": f"{remaining:.2f}",
        "percentage_used": round(percentage_used, 2),
        "is_over_budget": float(spent) > float(budget.amount),
        "alert_threshold_reached": percentage_used >= float(budget.alert_threshold),
    }


def get_budget_status(budget):
    """
    Get the status of a budget based on its usage.

    Args:
        budget: Budget model instance

    Returns:
        str: 'exceeded', 'warning', or 'on_track'
    """
    usage = calculate_budget_usage(budget)

    if usage["is_over_budget"]:
        return "exceeded"
    elif usage["alert_threshold_reached"]:
        return "warning"
    else:
        return "on_track"


def get_budgets_needing_alerts(user):
    """
    Find budgets that have exceeded their alert threshold or amount.

    Args:
        user: User model instance

    Returns:
        QuerySet: List of Budget objects needing alerts
    """
    from .models import Budget

    # Get all active budgets for the user
    today = timezone.now().date()
    active_budgets = Budget.objects.filter(
        user=user, period_start__lte=today, period_end__gte=today, alerts_enabled=True
    )

    needing_alerts = []

    for budget in active_budgets:
        status = get_budget_status(budget)
        if status in ["warning", "exceeded"]:
            needing_alerts.append(budget)

    return needing_alerts


def get_active_budgets_for_period(user, month, year):
    """
    Get budgets active during a specific month and year.

    Args:
        user: User model instance
        month (int): Month number (1-12)
        year (int): Year number

    Returns:
        QuerySet: Filtered Budget objects
    """
    from .models import Budget
    import calendar
    from datetime import date

    # Calculate start and end of the month
    _, last_day = calendar.monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)

    # Find budgets that overlap with this month
    # Logic: budget_start <= month_end AND budget_end >= month_start
    return Budget.objects.filter(
        user=user, period_start__lte=month_end, period_end__gte=month_start
    )
