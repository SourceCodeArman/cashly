from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.transactions.models import Transaction, Category
from apps.accounts.models import Account
from apps.analytics.utils import get_spending_trends
from datetime import timedelta
import uuid
from decimal import Decimal

User = get_user_model()

class SpendingTrendsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.category = Category.objects.create(name='Food', user=self.user)
        self.account = Account.objects.create(
            user=self.user, 
            institution_name='Bank',
            account_type='checking',
            account_number_masked='1234',
            plaid_account_id='plaid-acc-id',
            plaid_access_token='access-token-123',
            account_id=str(uuid.uuid4())
        )
        
        # Create transactions in different months
        self.create_transaction(days_ago=30, amount=100)
        self.create_transaction(days_ago=60, amount=200)

    def create_transaction(self, days_ago, amount):
        date = timezone.now() - timedelta(days=days_ago)
        Transaction.objects.create(
            user=self.user,
            account=self.account,
            category=self.category,
            date=date,
            amount=-amount, # Expense
            transaction_id=str(uuid.uuid4()),
            merchant_name='Test Transaction'
        )

    def test_get_spending_trends_format(self):
        trends = get_spending_trends(self.user, months=6)
        self.assertTrue(len(trends) > 0)
        
        # Check if the date format is YYYY-MM-DD
        for item in trends:
            self.assertRegex(item['month'], r'^\d{4}-\d{2}-\d{2}$')
            # specific check for day being 01
            self.assertTrue(item['month'].endswith('-01'))

    def test_get_spending_trends_amounts(self):
        trends = get_spending_trends(self.user, months=6)
        # We expect positive amounts because the utility converts negative expenses to positive
        for item in trends:
            self.assertGreater(item['amount'], 0)
