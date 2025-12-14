import os
import django
import time
from datetime import timedelta, date
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

from django.contrib.auth import get_user_model
from django.db.models import (
    Sum,
    OuterRef,
    Subquery,
    Q,
    F,
    FloatField,
    DecimalField,
    Value,
)
from django.db.models.functions import Coalesce, Greatest
from django.utils import timezone

from apps.budgets.models import Budget
from apps.transactions.models import Transaction
from apps.budgets.utils import calculate_budget_usage
from apps.subscriptions.limit_service import SubscriptionLimitService
from apps.subscriptions.exceptions import SubscriptionExpired

User = get_user_model()
try:
    user = User.objects.get(email="armanghev747@gmail.com")
except User.DoesNotExist:
    # Fallback to first user if specific user not found
    user = User.objects.first()

print(f"Testing for user: {user.email} (ID: {user.id})")

# 1. Benchmark current approach
print("\n--- Current Approach ---")
start_time = time.time()
budgets = list(Budget.objects.filter(user=user))
print(f"Fetched {len(budgets)} budgets object (ignoring fetch time)")

try:
    history_limit = SubscriptionLimitService.get_transaction_history_limit(user)
except SubscriptionExpired:
    history_limit = timedelta(days=30)
except Exception:
    history_limit = None

calc_start = time.time()
for budget in budgets:
    usage = calculate_budget_usage(budget, history_limit=history_limit)
print(f"Calculation loop took: {time.time() - calc_start:.4f}s")
print(f"Total time: {time.time() - start_time:.4f}s")


# 2. Benchmark Subquery approach
print("\n--- Subquery Approach ---")
start_time = time.time()

# Handle history limit
min_date = date.min
if history_limit:
    min_date = timezone.now().date() - history_limit

# We need to construct the subquery carefully
# Transaction filters:
# user=user (from Budget's user)
# category=category (from Budget's category)
# amount < 0
# date >= budget.period_start AND date <= budget.period_end
# AND date >= min_date (history limit)

# Note: In Subquery, OuterRef refers to the Budget instance
expenses_qs = (
    Transaction.objects.filter(
        user=OuterRef("user"),
        category=OuterRef("category"),
        amount__lt=0,
        date__lte=OuterRef("period_end"),
        date__gte=Greatest(OuterRef("period_start"), Value(min_date)),
    )
    .values("category")
    .annotate(total=Sum("amount"))
    .values("total")
)

budgets_opt = Budget.objects.filter(user=user).annotate(
    spent_raw=Coalesce(
        Subquery(expenses_qs, output_field=DecimalField()),
        Value(0),
        output_field=DecimalField(),
    )
)

# Force execution
results = list(budgets_opt)
print(f"Query execution took: {time.time() - start_time:.4f}s")

# Check accuracy
# for b in results:
#     print(f"Budget {b.category.name}: Spent {abs(b.spent_raw)}")
