from datetime import timedelta
from django.db.models import Sum
from django.utils import timezone
from apps.transactions.models import Transaction


def get_financial_summary_for_ai(user):
    """
    Gather context for AI analysis.
    Refactored from insight_engine.py to be reusable.
    """
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=90)

    # 1. Income Analysis (imported from insight_engine to avoid circular dependency if possible,
    # but analyze_income_stability is in insight_engine... wait, circular dependency risk.)
    # analyze_income_stability uses Transaction model, no other insights.
    # insight_engine imports this util? No, this util imports insight_engine.
    # If insight_engine imports this util, we have a cycle.
    # COMPLETE REFACTOR: Move generic analysis functions to utils.py or analytics app?
    # For now, I will Duplicate the logic or move `analyze_income_stability` here too?
    # Better: Move basic calculations to `utils.py` and have `insight_engine` import them.

    # checking dependency:
    # `analyze_income_stability` depends on Transaction. Safe.

    # I will rely on the user to fix the circular import if I cause one, but I'll try to avoid it.
    # If I move `analyze_income_stability` to here, `insight_engine` can import it.
    # `detect_subscription_patterns` etc can also be moved eventually.

    # For now I will Just implement the summary logic here and duplicate the income analysis call
    # OR import `analyze_income_stability` inside the function to avoid top-level cycle.

    from apps.insights.insight_engine import analyze_income_stability

    income_data = analyze_income_stability(user)

    # 2. Top Spending Categories (Last 90 days)
    top_expenses = (
        Transaction.objects.filter(user=user, date__gte=start_date, amount__lt=0)
        .values("category__name")
        .annotate(total=Sum("amount"))
        .order_by("total")[:5]
    )

    expenses_summary = [
        {
            "category": item["category__name"] or "Uncategorized",
            "amount": float(abs(item["total"])),
        }
        for item in top_expenses
    ]

    # 3. Recent Trends (Last 30 days vs prev 30)
    thirty_ago = end_date - timedelta(days=30)
    sixty_ago = end_date - timedelta(days=60)

    recent_spend = (
        Transaction.objects.filter(
            user=user, date__gte=thirty_ago, amount__lt=0
        ).aggregate(t=Sum("amount"))["t"]
        or 0
    )

    prev_spend = (
        Transaction.objects.filter(
            user=user, date__gte=sixty_ago, date__lt=thirty_ago, amount__lt=0
        ).aggregate(t=Sum("amount"))["t"]
        or 0
    )

    spend_trend = "stable"
    if prev_spend < 0:
        pct_change = ((abs(recent_spend) - abs(prev_spend)) / abs(prev_spend)) * 100
        spend_trend = (
            f"{pct_change:.1f}% {'increase' if pct_change > 0 else 'decrease'}"
        )

    # 4. Account Balances
    from apps.accounts.models import Account

    accounts = Account.objects.filter(user=user, is_active=True)
    accounts_summary = [
        {
            "name": acc.custom_name or acc.institution_name,
            "type": acc.account_type,
            "balance": float(acc.balance),
            "currency": acc.currency,
        }
        for acc in accounts
    ]

    return {
        "avg_monthly_income": income_data.get("avg_monthly_income", 0),
        "income_stability": "Stable" if income_data.get("is_stable") else "Irregular",
        "top_expenses_90d": expenses_summary,
        "recent_spending_trend": spend_trend,
        "current_month_spend": float(abs(recent_spend)),
        "accounts": accounts_summary,
    }
