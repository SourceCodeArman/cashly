"""
Integration tests for Plaid category categorization.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import date
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from rest_framework import status

from apps.transactions.models import Transaction, Category
from apps.accounts.models import Account
from apps.transactions.tasks import _sync_account_transactions_impl
from django.conf import settings

User = get_user_model()


class PlaidCategorizationIntegrationTestCase(TestCase):
    """Integration tests for Plaid categorization in transaction sync."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.account = Account.objects.create(
            user=self.user,
            institution_name='Test Bank',
            account_type='checking',
            balance=Decimal('1000.00'),
            plaid_account_id='test_account_id',
            plaid_access_token='encrypted_token'
        )
        
        # Create system categories
        self.dining_category = Category.objects.create(
            name='Dining',
            type='expense',
            is_system_category=True,
            user=None
        )
        self.transportation_category = Category.objects.create(
            name='Transportation',
            type='expense',
            is_system_category=True,
            user=None
        )
        self.other_expense_category = Category.objects.create(
            name='Other',
            type='expense',
            is_system_category=True,
            user=None
        )
        self.salary_category = Category.objects.create(
            name='Salary',
            type='income',
            is_system_category=True,
            user=None
        )
        self.other_income_category = Category.objects.create(
            name='Other',
            type='income',
            is_system_category=True,
            user=None
        )
    
    @patch('apps.transactions.plaid_utils.fetch_transactions')
    @patch('apps.accounts.plaid_utils.decrypt_token')
    @patch('apps.accounts.plaid_service.PlaidService.fetch_balances')
    def test_sync_categorizes_transactions_with_plaid_category(
        self, mock_fetch_balances, mock_decrypt_token, mock_fetch_transactions
    ):
        """Test that transaction sync categorizes transactions using Plaid categories."""
        # Mock Plaid API responses
        mock_decrypt_token.return_value = 'decrypted_token'
        mock_fetch_balances.return_value = {
            'accounts': [{
                'account_id': 'test_account_id',
                'balances': {
                    'current': 1000.00,
                    'iso_currency_code': 'USD'
                }
            }]
        }
        
        # Mock Plaid transactions with categories
        mock_fetch_transactions.return_value = [
            {
                'transaction_id': 'plaid_txn_1',
                'amount': 50.00,
                'date': date.today(),
                'name': 'Test Restaurant',
                'merchant_name': 'Test Restaurant',
                'transaction_code': 'debit',
                'personal_finance_category': {
                    'primary': 'FOOD_AND_DRINK',
                    'detailed': 'FOOD_AND_DRINK_RESTAURANTS'
                }
            },
            {
                'transaction_id': 'plaid_txn_2',
                'amount': 30.00,
                'date': date.today(),
                'name': 'Test Gas Station',
                'merchant_name': 'Test Gas Station',
                'transaction_code': 'debit',
                'personal_finance_category': {
                    'primary': 'TRANSPORTATION',
                    'detailed': 'TRANSPORTATION_GAS_STATIONS'
                }
            }
        ]
        
        # Enable Plaid auto-categorization
        with patch.object(settings, 'PLAID_AUTO_CATEGORIZE_ON_SYNC', True):
            with patch.object(settings, 'PLAID_CATEGORIZATION_OVERWRITE_EXISTING', False):
                result = _sync_account_transactions_impl(self.account.account_id)
        
        # Verify transactions were created and categorized
        transaction1 = Transaction.objects.get(plaid_transaction_id='plaid_txn_1')
        transaction2 = Transaction.objects.get(plaid_transaction_id='plaid_txn_2')
        
        self.assertEqual(transaction1.category, self.dining_category)
        self.assertEqual(transaction2.category, self.transportation_category)
        self.assertEqual(result['created'], 2)
    
    @patch('apps.transactions.plaid_utils.fetch_transactions')
    @patch('apps.accounts.plaid_utils.decrypt_token')
    @patch('apps.accounts.plaid_service.PlaidService.fetch_balances')
    def test_sync_respects_user_modified_flag(
        self, mock_fetch_balances, mock_decrypt_token, mock_fetch_transactions
    ):
        """Test that sync doesn't overwrite user-modified transactions."""
        # Mock Plaid API responses
        mock_decrypt_token.return_value = 'decrypted_token'
        mock_fetch_balances.return_value = {
            'accounts': [{
                'account_id': 'test_account_id',
                'balances': {
                    'current': 1000.00,
                    'iso_currency_code': 'USD'
                }
            }]
        }
        
        # Create an existing transaction that's user-modified
        existing_transaction = Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('-50.00'),
            date=date.today(),
            merchant_name='Test Restaurant',
            description='Test transaction',
            plaid_transaction_id='plaid_txn_1',
            plaid_category={
                'primary': 'FOOD_AND_DRINK',
                'detailed': 'FOOD_AND_DRINK_RESTAURANTS'
            },
            category=self.other_expense_category,  # User set it to "Other"
            user_modified=True
        )
        
        # Mock Plaid transaction with different category
        mock_fetch_transactions.return_value = [
            {
                'transaction_id': 'plaid_txn_1',
                'amount': 50.00,
                'date': date.today(),
                'name': 'Test Restaurant',
                'merchant_name': 'Test Restaurant',
                'transaction_code': 'debit',
                'personal_finance_category': {
                    'primary': 'FOOD_AND_DRINK',
                    'detailed': 'FOOD_AND_DRINK_RESTAURANTS'
                }
            }
        ]
        
        # Enable Plaid auto-categorization
        with patch.object(settings, 'PLAID_AUTO_CATEGORIZE_ON_SYNC', True):
            with patch.object(settings, 'PLAID_CATEGORIZATION_OVERWRITE_EXISTING', False):
                result = _sync_account_transactions_impl(self.account.account_id)
        
        # Verify transaction category was not changed
        existing_transaction.refresh_from_db()
        self.assertEqual(existing_transaction.category, self.other_expense_category)
        self.assertEqual(result['updated'], 1)


class PlaidCategorizationAPITestCase(TestCase):
    """Integration tests for Plaid categorization API endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.account = Account.objects.create(
            user=self.user,
            institution_name='Test Bank',
            account_type='checking',
            balance=Decimal('1000.00'),
            plaid_account_id='test_account_id',
            plaid_access_token='encrypted_token'
        )
        
        # Create system categories
        self.dining_category = Category.objects.create(
            name='Dining',
            type='expense',
            is_system_category=True,
            user=None
        )
        self.transportation_category = Category.objects.create(
            name='Transportation',
            type='expense',
            is_system_category=True,
            user=None
        )
        self.other_expense_category = Category.objects.create(
            name='Other',
            type='expense',
            is_system_category=True,
            user=None
        )
        
        # Create transactions with Plaid categories
        self.transaction1 = Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('-50.00'),
            date=date.today(),
            merchant_name='Test Restaurant',
            description='Test transaction',
            plaid_transaction_id='plaid_txn_1',
            plaid_category={
                'primary': 'FOOD_AND_DRINK',
                'detailed': 'FOOD_AND_DRINK_RESTAURANTS'
            },
            category=None
        )
        
        self.transaction2 = Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('-30.00'),
            date=date.today(),
            merchant_name='Test Gas Station',
            description='Test transaction',
            plaid_transaction_id='plaid_txn_2',
            plaid_category={
                'primary': 'TRANSPORTATION',
                'detailed': 'TRANSPORTATION_GAS_STATIONS'
            },
            category=None
        )
    
    def test_bulk_categorize_from_plaid_api_endpoint(self):
        """Test bulk categorize from Plaid API endpoint."""
        # The URL will be automatically generated by DRF router
        # Format: /api/v1/transactions/bulk_categorize_from_plaid/
        url = '/api/v1/transactions/bulk_categorize_from_plaid/'
        data = {
            'transaction_ids': [
                str(self.transaction1.transaction_id),
                str(self.transaction2.transaction_id)
            ],
            'overwrite_existing': False
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['data']['categorized'], 2)
        self.assertEqual(response.data['data']['total_processed'], 2)
        
        # Verify transactions were categorized
        self.transaction1.refresh_from_db()
        self.transaction2.refresh_from_db()
        self.assertEqual(self.transaction1.category, self.dining_category)
        self.assertEqual(self.transaction2.category, self.transportation_category)
    
    def test_bulk_categorize_from_plaid_api_endpoint_no_transaction_ids(self):
        """Test bulk categorize from Plaid API endpoint with no transaction IDs (categorizes all)."""
        url = '/api/v1/transactions/bulk_categorize_from_plaid/'
        data = {
            'overwrite_existing': False
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertGreaterEqual(response.data['data']['categorized'], 2)
        
        # Verify transactions were categorized
        self.transaction1.refresh_from_db()
        self.transaction2.refresh_from_db()
        self.assertEqual(self.transaction1.category, self.dining_category)
        self.assertEqual(self.transaction2.category, self.transportation_category)
    
    def test_bulk_categorize_from_plaid_api_endpoint_unauthorized(self):
        """Test that unauthorized users cannot access the endpoint."""
        self.client.force_authenticate(user=None)
        
        url = '/api/v1/transactions/bulk_categorize_from_plaid/'
        data = {
            'transaction_ids': [str(self.transaction1.transaction_id)]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_bulk_categorize_from_plaid_api_endpoint_wrong_user(self):
        """Test that users cannot categorize transactions belonging to other users."""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=other_user)
        
        url = '/api/v1/transactions/bulk_categorize_from_plaid/'
        data = {
            'transaction_ids': [str(self.transaction1.transaction_id)]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not found', response.data['message'].lower())

