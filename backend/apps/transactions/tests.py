"""
Tests for transactions app.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from apps.accounts.models import Account
from apps.transactions.models import Transaction, Category

User = get_user_model()


class TransactionModelTestCase(TestCase):
    """Test Transaction model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.account = Account.objects.create(
            user=self.user,
            institution_name='Test Bank',
            account_type='checking',
            account_number_masked='****1234',
            balance=Decimal('1000.00'),
            plaid_account_id='test123',
            plaid_access_token='encrypted_token',
        )
        self.category = Category.objects.create(
            name='Groceries',
            type='expense',
            is_system_category=True,
        )
    
    def test_transaction_creation(self):
        """Test transaction creation."""
        transaction = Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('-50.00'),
            date='2024-01-15',
            merchant_name='Test Store',
            category=self.category,
        )
        self.assertEqual(transaction.merchant_name, 'Test Store')
        self.assertEqual(transaction.amount, Decimal('-50.00'))
        self.assertTrue(transaction.is_expense())
        self.assertFalse(transaction.is_income())
    
    def test_transaction_manager_methods(self):
        """Test transaction manager methods."""
        Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('-50.00'),
            date='2024-01-15',
            merchant_name='Expense',
            category=self.category,
        )
        Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('1000.00'),
            date='2024-01-15',
            merchant_name='Income',
            category=self.category,
        )
        
        expenses = Transaction.objects.expenses()
        self.assertEqual(expenses.count(), 1)
        
        income = Transaction.objects.income()
        self.assertEqual(income.count(), 1)
