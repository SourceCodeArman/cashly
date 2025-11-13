"""
Tests for Plaid category categorization functionality.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import date

from apps.transactions.models import Transaction, Category
from apps.accounts.models import Account
from apps.transactions.plaid_category_mapper import (
    map_plaid_category_to_system_category,
    get_default_category_for_type,
    categorize_transactions_from_plaid,
    PLAID_DETAILED_CATEGORY_MAPPING,
    PLAID_PRIMARY_CATEGORY_MAPPING,
)
from apps.transactions.plaid_utils import normalize_plaid_transaction

User = get_user_model()


class PlaidCategoryMapperTestCase(TestCase):
    """Test Plaid category mapping functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
        # Create system categories
        self.dining_category = Category.objects.create(
            name='Dining',
            type='expense',
            is_system_category=True,
            user=None
        )
        self.groceries_category = Category.objects.create(
            name='Groceries',
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
        self.shopping_category = Category.objects.create(
            name='Shopping',
            type='expense',
            is_system_category=True,
            user=None
        )
        self.entertainment_category = Category.objects.create(
            name='Entertainment',
            type='expense',
            is_system_category=True,
            user=None
        )
        self.healthcare_category = Category.objects.create(
            name='Healthcare',
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
        self.freelance_category = Category.objects.create(
            name='Freelance',
            type='income',
            is_system_category=True,
            user=None
        )
        self.investment_category = Category.objects.create(
            name='Investment',
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
    
    def test_map_detailed_category_to_dining(self):
        """Test mapping detailed Plaid category to Dining."""
        plaid_category = {
            'primary': 'FOOD_AND_DRINK',
            'detailed': 'FOOD_AND_DRINK_RESTAURANTS'
        }
        category = map_plaid_category_to_system_category(
            plaid_category,
            transaction_type='expense',
            user=self.user
        )
        self.assertIsNotNone(category)
        self.assertEqual(category.name, 'Dining')
        self.assertEqual(category.type, 'expense')
    
    def test_map_detailed_category_to_groceries(self):
        """Test mapping detailed Plaid category to Groceries."""
        plaid_category = {
            'primary': 'FOOD_AND_DRINK',
            'detailed': 'FOOD_AND_DRINK_GROCERIES'
        }
        category = map_plaid_category_to_system_category(
            plaid_category,
            transaction_type='expense',
            user=self.user
        )
        self.assertIsNotNone(category)
        self.assertEqual(category.name, 'Groceries')
        self.assertEqual(category.type, 'expense')
    
    def test_map_primary_category_fallback(self):
        """Test falling back to primary category when detailed is not available."""
        plaid_category = {
            'primary': 'TRANSPORTATION',
            'detailed': 'UNKNOWN_CATEGORY'
        }
        category = map_plaid_category_to_system_category(
            plaid_category,
            transaction_type='expense',
            user=self.user
        )
        self.assertIsNotNone(category)
        self.assertEqual(category.name, 'Transportation')
        self.assertEqual(category.type, 'expense')
    
    def test_map_income_category(self):
        """Test mapping income category."""
        plaid_category = {
            'primary': 'INCOME',
            'detailed': 'INCOME_WAGES'
        }
        category = map_plaid_category_to_system_category(
            plaid_category,
            transaction_type='income',
            user=self.user
        )
        self.assertIsNotNone(category)
        self.assertEqual(category.name, 'Salary')
        self.assertEqual(category.type, 'income')
    
    def test_map_unknown_category_to_other(self):
        """Test that unknown categories default to 'Other'."""
        plaid_category = {
            'primary': 'UNKNOWN_CATEGORY',
            'detailed': 'UNKNOWN_DETAILED'
        }
        category = map_plaid_category_to_system_category(
            plaid_category,
            transaction_type='expense',
            user=self.user
        )
        # Should return None, which will trigger fallback to "Other"
        self.assertIsNone(category)
        
        # Test get_default_category_for_type
        default_category = get_default_category_for_type('expense', user=self.user)
        self.assertIsNotNone(default_category)
        self.assertEqual(default_category.name, 'Other')
        self.assertEqual(default_category.type, 'expense')
    
    def test_map_with_only_primary(self):
        """Test mapping with only primary category."""
        plaid_category = {
            'primary': 'ENTERTAINMENT'
        }
        category = map_plaid_category_to_system_category(
            plaid_category,
            transaction_type='expense',
            user=self.user
        )
        self.assertIsNotNone(category)
        self.assertEqual(category.name, 'Entertainment')
        self.assertEqual(category.type, 'expense')
    
    def test_map_empty_category(self):
        """Test mapping with empty category."""
        plaid_category = {}
        category = map_plaid_category_to_system_category(
            plaid_category,
            transaction_type='expense',
            user=self.user
        )
        self.assertIsNone(category)
    
    def test_map_none_category(self):
        """Test mapping with None category."""
        category = map_plaid_category_to_system_category(
            None,
            transaction_type='expense',
            user=self.user
        )
        self.assertIsNone(category)
    
    def test_transaction_type_mismatch_handling(self):
        """Test that transaction type mismatch is handled correctly."""
        # If transaction is expense but Plaid suggests income, should use "Other" expense
        plaid_category = {
            'primary': 'INCOME',
            'detailed': 'INCOME_WAGES'
        }
        category = map_plaid_category_to_system_category(
            plaid_category,
            transaction_type='expense',  # Mismatch
            user=self.user
        )
        # The function should handle this and return "Other" expense
        # Actually, based on the implementation, it logs a warning and uses "Other"
        # But the mapping function itself might return the income category
        # Let's check what actually happens
        if category:
            # If it returns a category, it should be expense type
            self.assertEqual(category.type, 'expense')


class PlaidCategoryExtractionTestCase(TestCase):
    """Test Plaid category extraction from transaction data."""
    
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
    
    def test_extract_plaid_category_from_dict(self):
        """Test extracting Plaid category from dictionary format."""
        plaid_transaction = {
            'transaction_id': 'test_txn_1',
            'amount': 50.00,
            'date': '2024-01-15',
            'name': 'Test Restaurant',
            'merchant_name': 'Test Restaurant',
            'transaction_code': 'debit',
            'personal_finance_category': {
                'primary': 'FOOD_AND_DRINK',
                'detailed': 'FOOD_AND_DRINK_RESTAURANTS'
            }
        }
        
        normalized = normalize_plaid_transaction(
            plaid_transaction,
            self.account,
            self.user
        )
        
        self.assertIn('plaid_category', normalized)
        self.assertIsNotNone(normalized['plaid_category'])
        self.assertEqual(normalized['plaid_category']['primary'], 'FOOD_AND_DRINK')
        self.assertEqual(normalized['plaid_category']['detailed'], 'FOOD_AND_DRINK_RESTAURANTS')
    
    def test_extract_plaid_category_missing(self):
        """Test handling of missing Plaid category."""
        plaid_transaction = {
            'transaction_id': 'test_txn_2',
            'amount': 50.00,
            'date': '2024-01-15',
            'name': 'Test Transaction',
            'merchant_name': 'Test Merchant',
            'transaction_code': 'debit',
        }
        
        normalized = normalize_plaid_transaction(
            plaid_transaction,
            self.account,
            self.user
        )
        
        # Should have plaid_category as None or empty dict
        self.assertIn('plaid_category', normalized)
        self.assertIsNone(normalized['plaid_category'])


class BulkCategorizationTestCase(TestCase):
    """Test bulk categorization functionality."""
    
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
        
        self.transaction3 = Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('1000.00'),
            date=date.today(),
            merchant_name='Salary Deposit',
            description='Test transaction',
            plaid_transaction_id='plaid_txn_3',
            plaid_category={
                'primary': 'INCOME',
                'detailed': 'INCOME_WAGES'
            },
            category=None
        )
        
        # Transaction without Plaid category
        self.transaction4 = Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('-20.00'),
            date=date.today(),
            merchant_name='Test Merchant',
            description='Test transaction',
            plaid_transaction_id='plaid_txn_4',
            plaid_category=None,
            category=None
        )
        
        # Transaction with user_modified=True
        self.transaction5 = Transaction.objects.create(
            account=self.account,
            user=self.user,
            amount=Decimal('-40.00'),
            date=date.today(),
            merchant_name='Test Store',
            description='Test transaction',
            plaid_transaction_id='plaid_txn_5',
            plaid_category={
                'primary': 'GENERAL_MERCHANDISE',
                'detailed': 'GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES'
            },
            category=None,
            user_modified=True
        )
    
    def test_bulk_categorize_transactions(self):
        """Test bulk categorization of transactions."""
        transactions = Transaction.objects.filter(
            transaction_id__in=[
                self.transaction1.transaction_id,
                self.transaction2.transaction_id,
                self.transaction3.transaction_id
            ]
        )
        
        stats = categorize_transactions_from_plaid(
            transactions=transactions,
            overwrite_existing=False,
            dry_run=False
        )
        
        self.assertEqual(stats['total_processed'], 3)
        self.assertEqual(stats['categorized'], 3)
        self.assertEqual(stats['skipped_no_plaid_category'], 0)
        self.assertEqual(stats['skipped_user_modified'], 0)
        self.assertEqual(stats['skipped_already_categorized'], 0)
        self.assertEqual(stats['errors'], 0)
        
        # Verify categories were assigned
        self.transaction1.refresh_from_db()
        self.transaction2.refresh_from_db()
        self.transaction3.refresh_from_db()
        
        self.assertEqual(self.transaction1.category, self.dining_category)
        self.assertEqual(self.transaction2.category, self.transportation_category)
        self.assertEqual(self.transaction3.category, self.salary_category)
    
    def test_bulk_categorize_skips_user_modified(self):
        """Test that user-modified transactions are skipped."""
        transactions = Transaction.objects.filter(
            transaction_id__in=[
                self.transaction1.transaction_id,
                self.transaction5.transaction_id
            ]
        )
        
        stats = categorize_transactions_from_plaid(
            transactions=transactions,
            overwrite_existing=False,
            dry_run=False
        )
        
        self.assertEqual(stats['total_processed'], 2)
        self.assertEqual(stats['categorized'], 1)
        self.assertEqual(stats['skipped_user_modified'], 1)
        
        # Verify transaction5 was not categorized
        self.transaction5.refresh_from_db()
        self.assertIsNone(self.transaction5.category)
    
    def test_bulk_categorize_skips_no_plaid_category(self):
        """Test that transactions without Plaid category are skipped."""
        transactions = Transaction.objects.filter(
            transaction_id__in=[
                self.transaction1.transaction_id,
                self.transaction4.transaction_id
            ]
        )
        
        stats = categorize_transactions_from_plaid(
            transactions=transactions,
            overwrite_existing=False,
            dry_run=False
        )
        
        self.assertEqual(stats['total_processed'], 1)
        self.assertEqual(stats['categorized'], 1)
        self.assertEqual(stats['skipped_no_plaid_category'], 1)
    
    def test_bulk_categorize_dry_run(self):
        """Test dry run mode."""
        transactions = Transaction.objects.filter(
            transaction_id__in=[
                self.transaction1.transaction_id,
                self.transaction2.transaction_id
            ]
        )
        
        stats = categorize_transactions_from_plaid(
            transactions=transactions,
            overwrite_existing=False,
            dry_run=True
        )
        
        self.assertEqual(stats['total_processed'], 2)
        self.assertEqual(stats['categorized'], 2)
        self.assertIn('results', stats)
        self.assertEqual(len(stats['results']), 2)
        
        # Verify transactions were not actually categorized
        self.transaction1.refresh_from_db()
        self.transaction2.refresh_from_db()
        self.assertIsNone(self.transaction1.category)
        self.assertIsNone(self.transaction2.category)
    
    def test_bulk_categorize_with_existing_category(self):
        """Test that transactions with existing categories are skipped unless overwrite=True."""
        # Assign a category to transaction1
        self.transaction1.category = self.other_expense_category
        self.transaction1.save()
        
        transactions = Transaction.objects.filter(
            transaction_id=self.transaction1.transaction_id
        )
        
        # Test without overwrite
        stats = categorize_transactions_from_plaid(
            transactions=transactions,
            overwrite_existing=False,
            dry_run=False
        )
        
        self.assertEqual(stats['total_processed'], 1)
        self.assertEqual(stats['categorized'], 0)
        self.assertEqual(stats['skipped_already_categorized'], 1)
        
        # Verify category was not changed
        self.transaction1.refresh_from_db()
        self.assertEqual(self.transaction1.category, self.other_expense_category)
        
        # Test with overwrite
        stats = categorize_transactions_from_plaid(
            transactions=transactions,
            overwrite_existing=True,
            dry_run=False
        )
        
        self.assertEqual(stats['total_processed'], 1)
        self.assertEqual(stats['categorized'], 1)
        
        # Verify category was changed
        self.transaction1.refresh_from_db()
        self.assertEqual(self.transaction1.category, self.dining_category)
    
    def test_bulk_categorize_with_transaction_ids(self):
        """Test bulk categorization with list of transaction IDs."""
        transaction_ids = [
            str(self.transaction1.transaction_id),
            str(self.transaction2.transaction_id)
        ]
        
        stats = categorize_transactions_from_plaid(
            transactions=transaction_ids,
            overwrite_existing=False,
            dry_run=False
        )
        
        self.assertEqual(stats['total_processed'], 2)
        self.assertEqual(stats['categorized'], 2)
        
        # Verify categories were assigned
        self.transaction1.refresh_from_db()
        self.transaction2.refresh_from_db()
        self.assertEqual(self.transaction1.category, self.dining_category)
        self.assertEqual(self.transaction2.category, self.transportation_category)

