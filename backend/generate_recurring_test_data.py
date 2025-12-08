"""
Script to generate recurring subscription test data.
Run this with: python manage.py shell < generate_recurring_test_data.py
"""
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from apps.accounts.models import Account, User
from apps.transactions.models import Transaction, Category
import uuid

# Get user and account
user = User.objects.first()
print(f"Using user: {user.email}")

account = Account.objects.filter(user=user, is_active=True).first()
print(f"Using account: {account.institution_name}")

# Get or create Subscription category
try:
    sub_cat = Category.objects.get(name__icontains='subscription', type='expense')
except Category.DoesNotExist:
    try:
        sub_cat = Category.objects.get(name__icontains='service', type='expense')
    except Category.DoesNotExist:
        sub_cat = Category.objects.filter(type='expense').first()

print(f"Using category: {sub_cat.name if sub_cat else 'None'}")

# Delete existing TEST_ transactions
deleted = Transaction.objects.filter(
    account__user=user,
    merchant_name__startswith='RECTEST_'
).delete()
print(f"\nCleared {deleted[0]} old recurring test transactions")

today = timezone.now().date()
created = 0

# Pattern 1: Netflix - Perfect monthly subscription (6 months)
print("\n✓ Creating Netflix pattern (monthly, 6 occurrences)...")
for i in range(6):
    Transaction.objects.create(
        transaction_id=str(uuid.uuid4()),
        account=account,
        user=user,
        merchant_name='RECTEST_Netflix',
        amount=Decimal('-15.99'),
        date=today - timedelta(days=30 * i),
        category=sub_cat,
        description='Streaming subscription',
        plaid_category=['Service', 'Entertainment', 'Music and Audio'],
    )
    created += 1

# Pattern 2: Spotify - Monthly subscription (5 months)
print("✓ Creating Spotify pattern (monthly, 5 occurrences)...")
for i in range(5):
    Transaction.objects.create(
        transaction_id=str(uuid.uuid4()),
        account=account,
        user=user,
        merchant_name='RECTEST_Spotify',
        amount=Decimal('-9.99'),
        date=today - timedelta(days=30 * i + 3),
        category=sub_cat,
        description='Music subscription',
        plaid_category=['Service', 'Entertainment', 'Music and Audio'],
    )
    created += 1

# Pattern 3: Weekly Gym - Should be detected
print("✓ Creating Gym pattern (weekly, 8 occurrences)...")
for i in range(8):
    Transaction.objects.create(
        transaction_id=str(uuid.uuid4()),
        account=account,
        user=user,
        merchant_name='RECTEST_FitnessGym',
        amount=Decimal('-25.00'),
        date=today - timedelta(days=7 * i),
        category=sub_cat,
        description='Gym membership',
        plaid_category=['Service', 'Gyms and Fitness Centers'],
    )
    created += 1

# Pattern 4: Biweekly Cloud Storage
print("✓ Creating Cloud Storage pattern (biweekly, 4 occurrences)...")
for i in range(4):
    Transaction.objects.create(
        transaction_id=str(uuid.uuid4()),
        account=account,
        user=user,
        merchant_name='RECTEST_CloudStorage',
        amount=Decimal('-19.99'),
        date=today - timedelta(days=14 * i),
        category=sub_cat,
        description='Cloud storage',
        plaid_category=['Service', 'Software'],
    )
    created += 1

# Pattern 5: Only 2 occurrences - Should be "Possible" not "Confirmed"  
print("✓ Creating New Subscription pattern (monthly, 2 occurrences - POSSIBLE)...")
for i in range(2):
    Transaction.objects.create(
        transaction_id=str(uuid.uuid4()),
        account=account,
        user=user,
        merchant_name='RECTEST_NewApp',
        amount=Decimal('-7.99'),
        date=today - timedelta(days=30 * i),
        category=sub_cat,
        description='New app subscription',
        plaid_category=['Service', 'Software'],
    )
    created += 1

# Pattern 6: Inconsistent intervals - Should NOT be detected
print("✓ Creating Irregular pattern (inconsistent - should NOT detect)...")
irregular_days = [10, 25, 70, 95]
for days in irregular_days:
    Transaction.objects.create(
        transaction_id=str(uuid.uuid4()),
        account=account,
        user=user,
        merchant_name='RECTEST_Irregular',
        amount=Decimal('-12.00'),
        date=today - timedelta(days=days),
        category=sub_cat,
        description='Irregular charges',
        plaid_category=['Service'],
    )
    created += 1

print(f"\n" + "="*60)
print(f"✓ Created {created} test recurring transactions!")
print("="*60)
print("\nExpected Detection Results:")
print("  ✓ RECTEST_Netflix: CONFIRMED (6 monthly)")
print("  ✓ RECTEST_Spotify: CONFIRMED (5 monthly)")
print("  ✓ RECTEST_FitnessGym: CONFIRMED (8 weekly)")
print("  ✓ RECTEST_CloudStorage: CONFIRMED (4 biweekly)")
print("  ? RECTEST_NewApp: POSSIBLE (2 monthly - not confirmed)")
print("  ✗ RECTEST_Irregular: Should NOT detect (inconsistent intervals)")
print("\nNow run 'Detect Recurring' in the app to test!")
