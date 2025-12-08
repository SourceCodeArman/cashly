"""
Fix test transactions by adding proper subscription categories
"""
from django.utils import timezone
from apps.accounts.models import User
from apps.transactions.models import Transaction, Category

# Get user
user = User.objects.first()
print(f"Using user: {user.email}")

# Create or get a Subscription category
sub_cat, created = Category.objects.get_or_create(
    name='Subscriptions & Memberships',
    type='expense',
    defaults={'user': None}  # System category
)
print(f"Category: {sub_cat.name} ({'created' if created else 'existing'})")

# Update all RECTEST_ transactions to have the subscription category
updated = Transaction.objects.filter(
    account__user=user,
    merchant_name__startswith='RECTEST_'
).update(category=sub_cat)

print(f"\n✓ Updated {updated} test transactions with subscription category")
print("\nNow run 'Detect Recurring' again - they should be detected!")
