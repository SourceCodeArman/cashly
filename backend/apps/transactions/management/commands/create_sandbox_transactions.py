"""
Management command to create test transactions with categories in Plaid Sandbox.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.accounts.models import Account
from apps.transactions.sandbox_utils import create_test_transactions_with_categories, TEST_TRANSACTIONS


class Command(BaseCommand):
    help = 'Create test transactions with categories in Plaid Sandbox'

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
        
        if not account.plaid_access_token:
            self.stdout.write(
                self.style.ERROR('Account is not connected to Plaid')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Creating {count} test transactions for account: {account.institution_name}'
            )
        )
        self.stdout.write(f'Transactions will be spread over the past {days_back} days')
        
        # Create transactions
        results = create_test_transactions_with_categories(
            account=account,
            count=count,
            days_back=days_back,
        )
        
        # Display results
        successful = [r for r in results if r.get('success')]
        failed = [r for r in results if not r.get('success')]
        
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('Results:'))
        self.stdout.write('=' * 80)
        self.stdout.write(f'Successfully created: {len(successful)}')
        self.stdout.write(f'Failed: {len(failed)}')
        
        if successful:
            self.stdout.write('\nCreated Transactions:')
            for result in successful:
                self.stdout.write(
                    f"  ✓ {result['merchant_name']}: ${result['amount']:.2f} "
                    f"(ID: {result['transaction_id']})"
                )
        
        if failed:
            self.stdout.write('\nFailed Transactions:')
            for result in failed:
                self.stdout.write(
                    self.style.ERROR(
                        f"  ✗ {result.get('merchant_name', 'Unknown')}: "
                        f"{result.get('error_message', result.get('error', 'Unknown error'))}"
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Created {len(successful)} test transactions. '
                f'Run sync on the account to import them with categories.'
            )
        )

