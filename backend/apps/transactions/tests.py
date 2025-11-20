"""
Tests for transactions app.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APITestCase
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


class TransactionAPITestCase(APITestCase):
    """API contract tests for transaction endpoints."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='apiuser@example.com',
            username='apiuser',
            password='testpass123'
        )
        self.account = Account.objects.create(
            user=self.user,
            institution_name='API Bank',
            account_type='checking',
            account_number_masked='****9876',
            balance=Decimal('2500.00'),
            plaid_account_id='api123',
            plaid_access_token='encrypted_token',
        )
        self.category = Category.objects.create(
            name='Dining',
            type='expense',
            color='#FF5733',
            icon='utensils',
            is_system_category=True,
        )
        today = timezone.now().date()
        self.expense = Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('-50.25'),
            date=today,
            merchant_name='Grocery Store',
            category=self.category,
            description='Weekly groceries'
        )
        self.income = Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('1200.00'),
            date=today,
            merchant_name='Employer Inc',
            description='Monthly salary'
        )
        self.client.force_authenticate(user=self.user)

    def test_transaction_list_matches_frontend_schema(self):
        """Ensure transaction list response matches frontend expectations."""
        url = reverse('transactions:transaction-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = response.data
        self.assertEqual(payload['status'], 'success')
        self.assertIn('data', payload)

        data = payload['data']
        self.assertEqual(data['count'], 2)
        self.assertIn('results', data)
        self.assertEqual(len(data['results']), 2)

        transactions = {t['merchantName']: t for t in data['results']}
        self.assertIn('Grocery Store', transactions)
        self.assertIn('Employer Inc', transactions)

        expense_payload = transactions['Grocery Store']
        self.assertEqual(expense_payload['type'], 'expense')
        self.assertEqual(expense_payload['category']['name'], 'Dining')
        self.assertEqual(expense_payload['formattedAmount'], '$50.25')
        self.assertEqual(expense_payload['account']['id'], str(self.account.account_id))
        self.assertTrue(expense_payload['account']['maskedAccountNumber'].endswith('9876'))

        income_payload = transactions['Employer Inc']
        self.assertEqual(income_payload['type'], 'income')
        self.assertEqual(income_payload['formattedAmount'], '$1,200.00')
        self.assertIsNone(income_payload['category'])

    def test_transaction_stats_schema(self):
        """Ensure stats endpoint returns camelCase totals."""
        url = reverse('transactions:transaction-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        payload = response.data
        self.assertEqual(payload['status'], 'success')

        stats = payload['data']
        self.assertEqual(stats['totalTransactions'], 2)
        self.assertEqual(stats['totalSpending'], '50.25')
        self.assertEqual(stats['totalIncome'], '1200.00')
        self.assertEqual(stats['net'], '1149.75')
