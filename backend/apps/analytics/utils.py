"""
Utility functions for dashboard analytics.
"""

from django.db.models import Sum, Count, F
from django.db.models.functions import TruncMonth, ExtractWeekDay
from django.utils import timezone
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
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
    checking_savings = accounts.filter(account_type__in=["checking", "savings"])
    total_balance = checking_savings.aggregate(total=Sum("balance"))[
        "total"
    ] or Decimal("0.00")

    # Calculate total investment from investment accounts
    investment_accounts = accounts.filter(account_type="investment")
    total_investment = investment_accounts.aggregate(total=Sum("balance"))[
        "total"
    ] or Decimal("0.00")

    # Calculate total debt from credit card accounts
    credit_card_accounts = accounts.filter(account_type="credit_card")
    total_debt = credit_card_accounts.aggregate(total=Sum("balance"))[
        "total"
    ] or Decimal("0.00")

    return {
        "total_balance": float(total_balance),
        "total_investment": float(total_investment),
        "total_debt": float(total_debt),
        "account_count": accounts.count(),
        "accounts": [
            {
                "account_id": str(acc.account_id),
                "institution_name": acc.institution_name,
                "custom_name": acc.custom_name,
                "account_type": acc.account_type,
                "account_number_masked": acc.account_number_masked,
                "balance": float(acc.balance),
            }
            for acc in accounts
        ],
    }


def get_account_data_optimized(user):
    """
    OPTIMIZED: Computes both account balance summary AND net worth in a single database pass.

    This eliminates duplicate queries to the accounts table by:
    1. Fetching all accounts once
    2. Aggregating balances by account type in a single query
    3. Computing both balance summary and net worth from that data

    Args:
        user: User instance

    Returns:
        dict: Contains 'balance_summary' and 'net_worth' keys
    """
    accounts = Account.objects.for_user(user).active()

    # Single query to aggregate balances by account type
    balances_by_type = accounts.values("account_type").annotate(total=Sum("balance"))

    # Build a map of account_type -> balance
    balance_map = {
        item["account_type"]: item["total"] or Decimal("0.00")
        for item in balances_by_type
    }

    # Calculate balance summary components
    checking_savings = balance_map.get("checking", Decimal("0.00")) + balance_map.get(
        "savings", Decimal("0.00")
    )
    investments = balance_map.get("investment", Decimal("0.00"))
    credit_debt = balance_map.get("credit_card", Decimal("0.00"))

    # Calculate net worth components (assets - liabilities)
    assets = (
        balance_map.get("checking", Decimal("0.00"))
        + balance_map.get("savings", Decimal("0.00"))
        + balance_map.get("investment", Decimal("0.00"))
        + balance_map.get("cash", Decimal("0.00"))
    )
    liabilities = (
        balance_map.get("credit_card", Decimal("0.00"))
        + balance_map.get("loan", Decimal("0.00"))
        + balance_map.get("mortgage", Decimal("0.00"))
    )

    # Fetch account details (still needed for accounts list)
    # This is a single query since accounts queryset is already filtered
    account_list = [
        {
            "account_id": str(acc.account_id),
            "institution_name": acc.institution_name,
            "custom_name": acc.custom_name,
            "account_type": acc.account_type,
            "account_number_masked": acc.account_number_masked,
            "balance": float(acc.balance),
        }
        for acc in accounts
    ]

    return {
        "balance_summary": {
            "total_balance": float(checking_savings),
            "total_investment": float(investments),
            "total_debt": float(credit_debt),
            "account_count": len(account_list),
            "accounts": account_list,
        },
        "net_worth": {
            "net_worth": float(assets - liabilities),
            "assets": float(assets),
            "liabilities": float(liabilities),
        },
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
        .select_related("account", "category")[:limit]
    )

    return TransactionFrontendSerializer(transactions, many=True).data


def get_monthly_category_data_optimized(user, month=None, year=None):
    """
    OPTIMIZED: Computes both monthly spending summary AND category chart data in a single query.

    This eliminates duplicate queries to the transactions table by:
    1. Fetching monthly expense transactions once
    2. Aggregating by category with all needed fields
    3. Building both response structures from that data

    Args:
        user: User instance
        month: Month number (1-12), defaults to current month
        year: Year, defaults to current year

    Returns:
        dict: Contains 'monthly_spending' and 'category_spending' keys
    """
    if not month or not year:
        now = timezone.now()
        month = month or now.month
        year = year or now.year

    # Single query to get expense transactions with category info
    transactions = Transaction.objects.for_user(user).filter(
        date__year=year,
        date__month=month,
        amount__lt=0,  # Expenses only
    )

    # Aggregate with ALL fields needed by both responses
    category_data = (
        transactions.values(
            "category__category_id", "category__name", "category__color"
        )
        .annotate(total=Sum("amount"), count=Count("transaction_id"))
        .order_by("-total")
    )

    # Build both response structures from single query result
    total_expenses = Decimal("0.00")
    total_count = 0

    monthly_categories = []
    chart_categories = []

    for item in category_data:
        amount = abs(item["total"])
        total_expenses += amount
        total_count += item["count"]

        category_id = (
            str(item["category__category_id"])
            if item["category__category_id"]
            else None
        )
        category_name = item["category__name"] or "Uncategorized"

        # For monthly spending summary
        monthly_categories.append(
            {
                "category_id": category_id,
                "category_name": category_name,
                "total": float(amount),
                "count": item["count"],
            }
        )

        # For category chart
        chart_categories.append(
            {
                "category_id": category_id,
                "category_name": category_name,
                "amount": float(amount),
                "color": item["category__color"] or "#9E9E9E",
            }
        )

    return {
        "monthly_spending": {
            "month": month,
            "year": year,
            "total_expenses": float(total_expenses),
            "transaction_count": total_count,
            "by_category": monthly_categories,
        },
        "category_spending": chart_categories,
    }


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
        amount__lt=0,  # Expenses are negative
    )

    total_expenses = abs(
        transactions.aggregate(total=Sum("amount"))["total"] or Decimal("0.00")
    )

    # Group by category
    category_breakdown = (
        transactions.values("category__name", "category__category_id")
        .annotate(total=Sum("amount"), count=Count("transaction_id"))
        .order_by("-total")
    )

    category_data = [
        {
            "category_id": str(item["category__category_id"])
            if item["category__category_id"]
            else None,
            "category_name": item["category__name"] or "Uncategorized",
            "total": float(abs(item["total"])),
            "count": item["count"],
        }
        for item in category_breakdown
    ]

    return {
        "month": month,
        "year": year,
        "total_expenses": float(total_expenses),
        "transaction_count": transactions.count(),
        "by_category": category_data,
    }


def get_goal_progress(user):
    """
    Get progress data for all active goals with contribution statistics.

    Args:
        user: User instance

    Returns:
        list: List of goal progress dictionaries
    """
    # Use prefetch_related to fetch all contributions in one query
    # Use select_related to fetch inferred_category in the same query
    goals = (
        Goal.objects.filter(user=user, is_active=True, archived_at__isnull=True)
        .select_related("inferred_category")
        .prefetch_related("contributions")
    )

    goal_progress = []
    for goal in goals:
        # Calculate contribution statistics from prefetched data (in Python, not DB)
        contributions = list(goal.contributions.all())  # Already prefetched, no query
        manual_total = sum(c.amount for c in contributions if c.source == "manual")
        automatic_total = sum(
            c.amount for c in contributions if c.source == "automatic"
        )

        # Group by source for by_source data
        by_source_dict = {}
        for contrib in contributions:
            if contrib.source not in by_source_dict:
                by_source_dict[contrib.source] = {"total": Decimal("0.00"), "count": 0}
            by_source_dict[contrib.source]["total"] += contrib.amount
            by_source_dict[contrib.source]["count"] += 1

        contributions_by_source = [
            {"source": source, "total": float(data["total"]), "count": data["count"]}
            for source, data in by_source_dict.items()
        ]

        goal_progress.append(
            {
                "goal_id": str(goal.goal_id),
                "name": goal.name,
                "target_amount": float(goal.target_amount),
                "current_amount": float(goal.current_amount),
                "progress_percentage": goal.progress_percentage(),
                "deadline": goal.deadline.isoformat() if goal.deadline else None,
                "is_on_track": goal.is_on_track(),
                "days_remaining": goal.days_remaining(),
                "is_completed": goal.is_completed,
                "completed_at": goal.completed_at.isoformat()
                if goal.completed_at
                else None,
                "goal_type": goal.goal_type,
                "inferred_category_id": str(goal.inferred_category.category_id)
                if goal.inferred_category
                else None,
                "inferred_category_name": goal.inferred_category.name
                if goal.inferred_category
                else None,
                "contributions": {
                    "manual_total": float(manual_total),
                    "automatic_total": float(automatic_total),
                    "total": float(goal.current_amount),
                    "count": len(contributions),
                    "by_source": contributions_by_source,
                },
            }
        )

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
        amount__lt=0,  # Expenses only
    )

    category_data = (
        transactions.values(
            "category__name", "category__color", "category__category_id"
        )
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    return [
        {
            "category_id": str(item["category__category_id"])
            if item["category__category_id"]
            else None,
            "category_name": item["category__name"] or "Uncategorized",
            "amount": float(abs(item["total"])),
            "color": item["category__color"] or "#9E9E9E",
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

    # Get active budgets for the period with category prefetched
    budgets = Budget.objects.filter(
        user=user, period_start__year=year, period_start__month=month
    ).select_related("category")

    if not budgets.exists():
        return {
            "total_budgeted": 0.0,
            "total_spent": 0.0,
            "budgets": [],
        }

    # Fetch ALL transactions for all budgets at once
    # Build Q objects for OR conditions across all budget periods
    from django.db.models import Q

    transaction_filters = Q()
    for budget in budgets:
        transaction_filters |= Q(
            category=budget.category,
            date__gte=budget.period_start,
            date__lte=budget.period_end,
        )

    # Execute single query to get all relevant transactions
    all_transactions = (
        Transaction.objects.filter(
            user=user,
            amount__lt=0,  # Expenses only
        )
        .filter(transaction_filters)
        .values("category_id", "amount")
    )

    # Group transactions by category in Python
    spending_by_category = {}
    for txn in all_transactions:
        category_id = txn["category_id"]
        if category_id not in spending_by_category:
            spending_by_category[category_id] = Decimal("0.00")
        spending_by_category[category_id] += abs(txn["amount"])

    budget_data = []
    total_budgeted = Decimal("0.00")
    total_spent = Decimal("0.00")

    for budget in budgets:
        spent = spending_by_category.get(budget.category.category_id, Decimal("0.00"))
        total_budgeted += budget.amount
        total_spent += spent

        budget_data.append(
            {
                "budget_id": str(budget.budget_id),
                "category_name": budget.category.name,
                "amount": float(budget.amount),
                "spent": float(spent),
                "remaining": float(budget.amount - spent),
                "percentage": float(
                    (spent / budget.amount * 100) if budget.amount > 0 else 0
                ),
            }
        )

    return {
        "total_budgeted": float(total_budgeted),
        "total_spent": float(total_spent),
        "budgets": budget_data,
    }


def get_spending_trends(user, months=4):
    """
    Get month-over-month spending trends.
    """
    end_date = timezone.now()
    start_date = end_date - timedelta(days=months * 30)

    trends = (
        Transaction.objects.filter(user=user, date__gte=start_date, amount__lt=0)
        .annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(total=Sum("amount"))
        .order_by("month")
    )

    return [
        {
            "month": item["month"].strftime("%Y-%m-%d"),
            "amount": float(abs(item["total"])),
        }
        for item in trends
    ]


def calculate_net_worth(user):
    """
    Calculate total net worth (Assets - Liabilities).
    """
    accounts = Account.objects.for_user(user).active()

    assets = accounts.filter(
        account_type__in=["checking", "savings", "investment", "cash"]
    ).aggregate(total=Sum("balance"))["total"] or Decimal("0.00")

    liabilities = accounts.filter(
        account_type__in=["credit_card", "loan", "mortgage"]
    ).aggregate(total=Sum("balance"))["total"] or Decimal("0.00")

    return {
        "net_worth": float(assets - liabilities),
        "assets": float(assets),
        "liabilities": float(liabilities),
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
            user=user, date__year=year, date__month=month, amount__lt=0
        )
        .annotate(day=ExtractWeekDay("date"))
        .values("day")
        .annotate(total=Sum("amount"), count=Count("transaction_id"))
        .order_by("day")
    )

    # Map 1 (Sunday) to 7 (Saturday)
    days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
    ]

    result = []
    for i in range(1, 8):
        day_data = next((p for p in patterns if p["day"] == i), None)
        result.append(
            {
                "day": days[i - 1],
                "amount": float(abs(day_data["total"])) if day_data else 0.0,
                "count": day_data["count"] if day_data else 0,
            }
        )

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
    from django.db.models import Q

    recommendations = []
    now = timezone.now()
    current_month = now.month
    current_year = now.year

    # PRE-FETCH ALL DATA UPFRONT TO AVOID N+1 QUERIES

    # 1. Get all budgets with categories
    budgets = Budget.objects.filter(
        user=user, period_start__year=current_year, period_start__month=current_month
    ).select_related("category")

    # 2. Get all goals with prefetched contributions
    goals = Goal.objects.filter(
        user=user, is_active=True, archived_at__isnull=True
    ).prefetch_related("contributions")

    # 3. Get all current month transactions (for budgets and spending analysis)
    current_month_transactions = Transaction.objects.filter(
        user=user, date__year=current_year, date__month=current_month, amount__lt=0
    ).values("category_id", "category__name", "category__category_id", "amount")

    # 4. Calculate spending by category for current month (reuse data)
    current_category_spending = {}
    current_month_total = Decimal("0.00")
    for txn in current_month_transactions:
        category_id = txn["category_id"]
        amount = abs(txn["amount"])
        current_month_total += amount

        if category_id not in current_category_spending:
            current_category_spending[category_id] = {
                "amount": Decimal("0.00"),
                "name": txn["category__name"] or "Uncategorized",
                "category_id": txn["category__category_id"],
            }
        current_category_spending[category_id]["amount"] += amount

    # 5. Get previous month transactions for trend comparison
    prev_month = current_month - 1
    prev_year = current_year
    if prev_month == 0:
        prev_month = 12
        prev_year -= 1

    prev_month_transactions = Transaction.objects.filter(
        user=user, date__year=prev_year, date__month=prev_month, amount__lt=0
    ).values("category_id", "category__name", "category__category_id", "amount")

    prev_category_spending = {}
    prev_month_total = Decimal("0.00")
    for txn in prev_month_transactions:
        category_id = txn["category_id"]
        amount = abs(txn["amount"])
        prev_month_total += amount

        if category_id not in prev_category_spending:
            prev_category_spending[category_id] = amount
        else:
            prev_category_spending[category_id] += amount

    # 6. Get accounts with active ones
    accounts = Account.objects.for_user(user).active()

    # NOW USE THE PRE-FETCHED DATA FOR ANALYSIS (NO MORE QUERIES)

    # 1. Analyze Budgets (using pre-fetched data)
    for budget in budgets:
        category_id = budget.category.category_id
        spent = current_category_spending.get(category_id, {}).get(
            "amount", Decimal("0.00")
        )
        percentage = float((spent / budget.amount * 100) if budget.amount > 0 else 0)

        if percentage >= 100:
            # Budget exceeded
            recommendations.append(
                {
                    "id": str(uuid.uuid4()),
                    "type": "budget",
                    "icon": "alert",
                    "title": f"Budget Exceeded: {budget.category.name}",
                    "description": f"{budget.category.name} budget has been exceeded by ${spent - budget.amount:.2f}. Consider reviewing your spending.",
                    "priority": "high",
                    "actionable": True,
                    "metadata": {
                        "budget_id": str(budget.budget_id),
                        "category_id": str(budget.category.category_id),
                    },
                }
            )
        elif percentage >= float(budget.alert_threshold):
            # Budget approaching threshold
            recommendations.append(
                {
                    "id": str(uuid.uuid4()),
                    "type": "budget",
                    "icon": "alert",
                    "title": f"Budget Alert: {budget.category.name}",
                    "description": f"{budget.category.name} budget is {percentage:.1f}% used (${spent:.2f} of ${budget.amount:.2f}). Pace yourself for the rest of the period.",
                    "priority": "medium",
                    "actionable": True,
                    "metadata": {
                        "budget_id": str(budget.budget_id),
                        "category_id": str(budget.category.category_id),
                    },
                }
            )

    # 2. Analyze Goals (using pre-fetched data)
    for goal in goals:
        progress = goal.progress_percentage()
        is_on_track = goal.is_on_track()

        # Check if goal is off-track
        if goal.deadline and is_on_track is False:
            recommendations.append(
                {
                    "id": str(uuid.uuid4()),
                    "type": "goal",
                    "icon": "target",
                    "title": f"Goal Off Track: {goal.name}",
                    "description": f"{goal.name} needs attention to meet the deadline. Current progress: {progress:.1f}%. Consider increasing monthly contributions.",
                    "priority": "high",
                    "actionable": True,
                    "metadata": {
                        "goal_id": str(goal.goal_id),
                    },
                }
            )
        elif (
            progress >= 25 and progress < 100 and (progress % 25 == 0 or progress >= 50)
        ):
            # Goal milestone reached
            recommendations.append(
                {
                    "id": str(uuid.uuid4()),
                    "type": "goal",
                    "icon": "target",
                    "title": f"Goal Progress: {goal.name}",
                    "description": f"{goal.name} is {progress:.1f}% complete (${goal.current_amount:.2f} of ${goal.target_amount:.2f}). Keep up the great work!",
                    "priority": "low",
                    "actionable": False,
                    "metadata": {
                        "goal_id": str(goal.goal_id),
                    },
                }
            )

    # 3. Analyze Spending Trends (using pre-calculated data)
    if prev_month_total > 0:
        for category_id, current_data in current_category_spending.items():
            category_name = current_data["name"]
            current_amount = current_data["amount"]
            prev_amount = prev_category_spending.get(category_id, Decimal("0.00"))

            if prev_amount > 0 and current_amount > 0:
                increase_percentage = (
                    (current_amount - prev_amount) / prev_amount
                ) * 100

                if increase_percentage >= 30:  # 30%+ increase
                    recommendations.append(
                        {
                            "id": str(uuid.uuid4()),
                            "type": "spending",
                            "icon": "trending",
                            "title": f"Spending Increase: {category_name}",
                            "description": f"{category_name} spending increased {increase_percentage:.1f}% this month (${current_amount:.2f} vs ${prev_amount:.2f}). Review your expenses.",
                            "priority": "medium",
                            "actionable": True,
                            "metadata": {
                                "category_id": str(current_data["category_id"]),
                            },
                        }
                    )

    # 4. Analyze Top Spending Categories (using pre-calculated data)
    if current_category_spending:
        # Sort by amount and get top category
        sorted_categories = sorted(
            current_category_spending.items(),
            key=lambda x: x[1]["amount"],
            reverse=True,
        )

        if sorted_categories:
            top_category_id, top_data = sorted_categories[0]
            top_amount = top_data["amount"]
            category_name = top_data["name"]

            # Only recommend if spending is significant (> $100)
            if top_amount > 100:
                recommendations.append(
                    {
                        "id": str(uuid.uuid4()),
                        "type": "spending",
                        "icon": "lightbulb",
                        "title": f"Top Spending Category: {category_name}",
                        "description": f"{category_name} is your highest spending category this month (${top_amount:.2f}). Look for ways to optimize spending in this area.",
                        "priority": "low",
                        "actionable": True,
                        "metadata": {
                            "category_id": str(top_data["category_id"]),
                        },
                    }
                )

    # 5. Analyze Account Balances (using pre-fetched data)
    for account in accounts:
        # Check for low balances in checking/savings accounts
        if account.account_type in ["checking", "savings"]:
            # Low balance threshold: $100 for checking, $500 for savings
            threshold = (
                Decimal("100.00")
                if account.account_type == "checking"
                else Decimal("500.00")
            )

            if account.balance < threshold:
                recommendations.append(
                    {
                        "id": str(uuid.uuid4()),
                        "type": "account",
                        "icon": "alert",
                        "title": f"Low Balance: {account.custom_name or account.institution_name}",
                        "description": f"{account.custom_name or account.institution_name} balance is ${account.balance:.2f}, which is below the recommended threshold. Consider transferring funds.",
                        "priority": "medium",
                        "actionable": True,
                        "metadata": {
                            "account_id": str(account.account_id),
                        },
                    }
                )

        # Check for account errors
        if hasattr(account, "error_code") and account.error_code:
            recommendations.append(
                {
                    "id": str(uuid.uuid4()),
                    "type": "account",
                    "icon": "alert",
                    "title": f"Account Sync Issue: {account.custom_name or account.institution_name}",
                    "description": f"{account.custom_name or account.institution_name} has a sync issue. Please reconnect your account to continue syncing transactions.",
                    "priority": "high",
                    "actionable": True,
                    "metadata": {
                        "account_id": str(account.account_id),
                    },
                }
            )

    # Sort recommendations by priority (high -> medium -> low)
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda x: priority_order.get(x["priority"], 3))

    return recommendations


def get_monthly_spending(user):
    """
    Return spending totals for the past 12 months.
    Returns all months even if there's no spending (amount = 0).
    """
    today = timezone.now().date()
    result = []

    for i in range(12):
        target_date = today - relativedelta(months=i)
        month_label = target_date.strftime("%b")  # "Jan", "Feb", etc.
        year = target_date.year
        month = target_date.month

        total = (
            Transaction.objects.filter(
                user=user, date__year=year, date__month=month, amount__lt=0
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )

        result.append({"month": month_label, "year": year, "amount": float(abs(total))})

    return list(reversed(result))  # Oldest first


def get_weekly_spending(user):
    """
    Return spending by day for the past 4 weeks.
    Each week is split into 7 days (Sun-Sat).
    Returns 0 for days with no spending.
    """
    today = timezone.now().date()
    days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    # Find start of current week (Sunday)
    # weekday() returns 0 for Monday, 6 for Sunday
    days_since_sunday = (today.weekday() + 1) % 7
    start_of_week = today - timedelta(days=days_since_sunday)

    weeks = []
    for week_offset in range(4):
        week_start = start_of_week - timedelta(weeks=week_offset)
        week_end = week_start + timedelta(days=6)

        week_data = {
            "week_index": week_offset,
            "label": (
                "This Week"
                if week_offset == 0
                else f"{week_start.strftime('%m/%d')} - {week_end.strftime('%m/%d')}"
            ),
            "days": [],
        }

        for day_offset in range(7):
            current_day = week_start + timedelta(days=day_offset)

            total = (
                Transaction.objects.filter(
                    user=user, date=current_day, amount__lt=0
                ).aggregate(total=Sum("amount"))["total"]
                or 0
            )

            week_data["days"].append(
                {
                    "day": days[day_offset],
                    "date": current_day.isoformat(),
                    "amount": float(abs(total)),
                }
            )

        weeks.append(week_data)

    return weeks
