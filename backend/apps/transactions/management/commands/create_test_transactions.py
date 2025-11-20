"""
Management command to create test transactions directly in the database with categories.
This is more reliable than using Plaid Sandbox API which doesn't reliably return categories.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from apps.accounts.models import Account
from apps.transactions.models import Transaction, Category
from apps.transactions.sandbox_utils import TEST_TRANSACTIONS


class Command(BaseCommand):
    help = 'Create test transactions directly in the database with proper categories'

    def add_arguments(self, parser):
        parser.add_argument(
            'account_id',
            type=str,
            help='Account ID (UUID) to create transactions for',
        )
        parser.add_argument(
            '--count',
            type=int,
            default=10,
            help='Number of transactions to create (default: 10)',
        )
        parser.add_argument(
            '--days-back',
            type=int,
            default=30,
            help='Spread transactions over the past N days (default: 30)',
        )
        parser.add_argument(
            '--list-available',
            action='store_true',
            help='List available test transaction templates',
        )

    def handle(self, *args, **options):
        if options['list_available']:
            self.stdout.write('\nAvailable Test Transaction Templates:')
            self.stdout.write('=' * 80)
            for i, txn in enumerate(TEST_TRANSACTIONS, 1):
                self.stdout.write(
                    f"{i}. {txn['merchant_name']}: ${abs(txn['amount']):.2f} "
                    f"({txn['primary']}/{txn['detailed']})"
                )
            self.stdout.write(f'\nTotal available: {len(TEST_TRANSACTIONS)}')
            return
        
        account_id = options['account_id']
        count = options['count']
        days_back = options['days_back']
        
        try:
            account = Account.objects.get(account_id=account_id)
        except Account.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Account with ID {account_id} not found')
            )
            return
        
        user = account.user
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Creating {count} test transactions for account: {account.institution_name}'
            )
        )
        self.stdout.write(f'Transactions will be spread over the past {days_back} days')
        
        # Get all categories for mapping
        categories_by_name_type = {}
        for cat in Category.objects.for_user(user):
            key = (cat.name, cat.type)
            if key not in categories_by_name_type:
                categories_by_name_type[key] = cat
        
        # Get default categories
        other_expense = categories_by_name_type.get(('Other Expenses', 'expense'))
        other_income = categories_by_name_type.get(('Other Income', 'income'))
        
        if not other_expense or not other_income:
            self.stdout.write(
                self.style.ERROR(
                    'Default categories not found. Please run: python manage.py create_system_categories'
                )
            )
            return
        
        # Import mapping from plaid_category_mapper
        from apps.transactions.plaid_category_mapper import (
            PLAID_DETAILED_CATEGORY_MAPPING,
        )
        
        # Create transactions
        transactions_to_create = TEST_TRANSACTIONS[:count]
        base_date = timezone.now().date()
        created_count = 0
        failed_count = 0
        
        for i, txn_data in enumerate(transactions_to_create):
            try:
                # Spread transactions over the past N days
                days_ago = (i % days_back) if days_back > 0 else 0
                transaction_date = base_date - timedelta(days=days_ago)
                
                # Map category using Plaid category mapper
                detailed = txn_data.get('detailed')
                category = None
                
                if detailed and detailed in PLAID_DETAILED_CATEGORY_MAPPING:
                    category_name, category_type = PLAID_DETAILED_CATEGORY_MAPPING[detailed]
                    category = categories_by_name_type.get((category_name, category_type))
                
                # Fallback to default category
                if not category:
                    category = other_income if txn_data['amount'] > 0 else other_expense
                
                # Create transaction
                transaction = Transaction.objects.create(
                    account=account,
                    user=user,
                    amount=Decimal(str(txn_data['amount'])),
                    date=transaction_date,
                    merchant_name=txn_data['merchant_name'],
                    description=txn_data.get('description', txn_data['merchant_name']),
                    category=category,
                    plaid_category={
                        'primary': txn_data.get('primary'),
                        'detailed': txn_data.get('detailed'),
                    } if txn_data.get('primary') else None,
                    plaid_transaction_id=f'test_{account.account_id}_{i}_{transaction_date.isoformat()}',
                    is_transfer=False,
                    is_recurring=False,
                )
                
                created_count += 1
                self.stdout.write(
                    f"  ✓ Created: {txn_data['merchant_name']} "
                    f"${abs(txn_data['amount']):.2f} -> {category.name}"
                )
                
            except Exception as e:
                failed_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"  ✗ Failed to create {txn_data['merchant_name']}: {str(e)}"
                    )
                )
        
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('Results:'))
        self.stdout.write('=' * 80)
        self.stdout.write(f'Successfully created: {created_count}')
        self.stdout.write(f'Failed: {failed_count}')
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Created {created_count} test transactions with categories!'
            )
        )

