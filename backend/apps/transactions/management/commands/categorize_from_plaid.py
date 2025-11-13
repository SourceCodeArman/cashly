"""
Management command to categorize transactions from Plaid categories.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
import uuid

from apps.transactions.models import Transaction
from apps.accounts.models import Account
from apps.transactions.plaid_category_mapper import categorize_transactions_from_plaid

User = get_user_model()


class Command(BaseCommand):
    help = 'Categorize transactions in bulk using Plaid category data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-id',
            type=str,
            help='UUID of user to categorize transactions for',
        )
        parser.add_argument(
            '--account-id',
            type=str,
            help='UUID of account to categorize transactions for',
        )
        parser.add_argument(
            '--date-from',
            type=str,
            help='Start date for filtering transactions (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--date-to',
            type=str,
            help='End date for filtering transactions (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--overwrite',
            action='store_true',
            help='Overwrite existing categories (default: False)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be categorized without making changes',
        )

    def handle(self, *args, **options):
        user_id = options.get('user_id')
        account_id = options.get('account_id')
        date_from = options.get('date_from')
        date_to = options.get('date_to')
        overwrite = options.get('overwrite', False)
        dry_run = options.get('dry_run', False)

        # Build queryset
        queryset = Transaction.objects.all()

        # Filter by user
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                queryset = queryset.filter(user=user)
                self.stdout.write(
                    self.style.SUCCESS(f'Filtering transactions for user: {user.email}')
                )
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'User with ID {user_id} not found')
                )
                return
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(f'Invalid user ID format: {user_id}')
                )
                return

        # Filter by account
        if account_id:
            try:
                account = Account.objects.get(account_id=account_id)
                queryset = queryset.filter(account=account)
                self.stdout.write(
                    self.style.SUCCESS(f'Filtering transactions for account: {account.institution_name}')
                )
            except Account.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Account with ID {account_id} not found')
                )
                return
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(f'Invalid account ID format: {account_id}')
                )
                return

        # Filter by date range
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=date_from_obj)
                self.stdout.write(
                    self.style.SUCCESS(f'Filtering transactions from: {date_from}')
                )
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(f'Invalid date format for date-from: {date_from}. Use YYYY-MM-DD')
                )
                return

        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=date_to_obj)
                self.stdout.write(
                    self.style.SUCCESS(f'Filtering transactions to: {date_to}')
                )
            except ValueError:
                self.stdout.write(
                    self.style.ERROR(f'Invalid date format for date-to: {date_to}. Use YYYY-MM-DD')
                )
                return

        # Display mode
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN MODE: No changes will be made')
            )

        # Count total transactions
        total_count = queryset.count()
        self.stdout.write(
            self.style.SUCCESS(f'Found {total_count} transactions to process')
        )

        if total_count == 0:
            self.stdout.write(self.style.WARNING('No transactions found matching criteria'))
            return

        # Run categorization
        self.stdout.write('Starting categorization...')
        stats = categorize_transactions_from_plaid(
            transactions=queryset,
            overwrite_existing=overwrite,
            dry_run=dry_run
        )

        # Display results
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS('Categorization Results:'))
        self.stdout.write('=' * 50)
        self.stdout.write(f"Total processed: {stats['total_processed']}")
        self.stdout.write(f"Categorized: {self.style.SUCCESS(str(stats['categorized']))}")
        self.stdout.write(f"Skipped (no Plaid category): {stats['skipped_no_plaid_category']}")
        self.stdout.write(f"Skipped (user modified): {stats['skipped_user_modified']}")
        self.stdout.write(f"Skipped (already categorized): {stats['skipped_already_categorized']}")
        self.stdout.write(f"Skipped (no mapping): {stats['skipped_no_mapping']}")
        self.stdout.write(f"Errors: {self.style.ERROR(str(stats['errors'])) if stats['errors'] > 0 else str(stats['errors'])}")

        # Show sample results in dry-run mode
        if dry_run and stats.get('results'):
            self.stdout.write('\n' + '=' * 50)
            self.stdout.write(self.style.SUCCESS('Sample Results (first 10):'))
            self.stdout.write('=' * 50)
            for result in stats['results'][:10]:
                self.stdout.write(f"Transaction: {result['merchant_name']}")
                self.stdout.write(f"  Plaid Category: {result['plaid_category']}")
                self.stdout.write(f"  Current Category: {result['current_category'] or 'None'}")
                self.stdout.write(f"  Suggested Category: {result['suggested_category_name']} ({result['suggested_category_id']})")
                self.stdout.write('')

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nSuccessfully categorized {stats["categorized"]} transactions'
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    f'\nDry run complete. {stats["categorized"]} transactions would be categorized.'
                )
            )

