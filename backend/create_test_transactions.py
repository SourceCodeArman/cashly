"""
Script to create test transactions for Sankey diagram testing.
Run with: python manage.py shell < create_test_transactions.py
"""
from django.contrib.auth import get_user_model
from apps.accounts.models import Account
from apps.transactions.models import Transaction, Category
from apps.budgets.models import Budget
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone

User = get_user_model()

# Get testuser@email.com
try:
    user = User.objects.get(email="testuser@email.com")
except User.DoesNotExist:
    print("User testuser@email.com not found! Please create this user first.")
    exit()

print(f"Creating test data for user: {user.email}")

# Get or create a test account
# First, try to find an existing test account for this user
account = Account.objects.filter(
    user=user,
    institution_name="Test Bank"
).first()

if not account:
    # If not found, create a new one
    account = Account.objects.create(
        user=user,
        institution_name="Test Bank",
        custom_name='Test Checking Account',
        account_type='checking',
        balance=Decimal('5000.00'),
        account_number_masked='****1234',
        is_active=True,
        plaid_account_id=f'test_{user.pk}'  # Unique plaid_account_id
    )
    
print(f"Account: {account.institution_name} - {account.custom_name}")

# Create categories
categories = {}

# Income categories
income_cat, _ = Category.objects.get_or_create(
    user=user,
    name="Salary",
    defaults={'type': 'income', 'color': '#10b981'}
)
categories['Salary'] = income_cat

freelance_cat, _ = Category.objects.get_or_create(
    user=user,
    name="Freelance",
    defaults={'type': 'income', 'color': '#059669'}
)
categories['Freelance'] = freelance_cat

# Expense categories
groceries_cat, _ = Category.objects.get_or_create(
    user=user,
    name="Groceries",
    defaults={'type': 'expense', 'color': '#f59e0b'}
)
categories['Groceries'] = groceries_cat

rent_cat, _ = Category.objects.get_or_create(
    user=user,
    name="Rent",
    defaults={'type': 'expense', 'color': '#ef4444'}
)
categories['Rent'] = rent_cat

utilities_cat, _ = Category.objects.get_or_create(
    user=user,
    name="Utilities",
    defaults={'type': 'expense', 'color': '#3b82f6'}
)
categories['Utilities'] = utilities_cat

transport_cat, _ = Category.objects.get_or_create(
    user=user,
    name="Transportation",
    defaults={'type': 'expense', 'color': '#8b5cf6'}
)
categories['Transportation'] = transport_cat

entertainment_cat, _ = Category.objects.get_or_create(
    user=user,
    name="Entertainment",
    defaults={'type': 'expense', 'color': '#ec4899'}
)
categories['Entertainment'] = entertainment_cat

print(f"Created {len(categories)} categories")

# Create transactions for the last 30 days
now = timezone.now()
transactions_created = 0

# Income transactions
income_data = [
    ('Salary', Decimal('3000.00'), 1),
    ('Freelance', Decimal('500.00'), 5),
    ('Freelance', Decimal('750.00'), 15),
]

for cat_name, amount, days_ago in income_data:
    Transaction.objects.create(
        user=user,
        account=account,
        category=categories[cat_name],
        amount=amount,
        description=f"{cat_name} payment",
        date=(now - timedelta(days=days_ago)).date(),
        is_transfer=False,
    )
    transactions_created += 1
    print(f"Created income: +${amount} - {cat_name}")

# Expense transactions (negative amounts)
expense_data = [
    ('Rent', Decimal('-1200.00'), 2),
    ('Utilities', Decimal('-150.00'), 3),
    ('Groceries', Decimal('-120.00'), 4),
    ('Groceries', Decimal('-85.00'), 11),
    ('Groceries', Decimal('-95.00'), 18),
    ('Groceries', Decimal('-110.00'), 25),
    ('Transportation', Decimal('-60.00'), 5),
    ('Transportation', Decimal('-45.00'), 12),
    ('Transportation', Decimal('-55.00'), 19),
    ('Entertainment', Decimal('-80.00'), 6),
    ('Entertainment', Decimal('-45.00'), 13),
    ('Entertainment', Decimal('-30.00'), 20),
]

for cat_name, amount, days_ago in expense_data:
    Transaction.objects.create(
        user=user,
        account=account,
        category=categories[cat_name],
        amount=amount,
        description=f"{cat_name} expense",
        date=(now - timedelta(days=days_ago)).date(),
        is_transfer=False,
    )
    transactions_created += 1
    print(f"Created expense: ${amount} - {cat_name}")

print(f"\n✅ Created {transactions_created} test transactions")
print(f"Total transactions for {user.email}: {Transaction.objects.filter(user=user).count()}")
