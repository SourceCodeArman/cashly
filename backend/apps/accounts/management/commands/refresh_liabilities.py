"""
Django management command to refresh Plaid liability data for all debt accounts.

Usage:
    python manage.py refresh_liabilities
    python manage.py refresh_liabilities --user-id <user_id>
    python manage.py refresh_liabilities --force
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.accounts.models import Account
from apps.accounts.liability_sync import (
    sync_liabilities_for_account,
    sync_liabilities_for_user,
)

User = get_user_model()


class Command(BaseCommand):
    help = "Refresh Plaid liability data for debt accounts"

    def add_arguments(self, parser):
        parser.add_argument(
            "--user-id",
            type=str,
            help="Refresh liabilities for a specific user ID",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force refresh (ignore 24-hour cache)",
        )

    def handle(self, *args, **options):
        user_id = options.get("user_id")
        force_refresh = options.get("force", False)

        self.stdout.write(self.style.SUCCESS("Starting liability data refresh..."))
        self.stdout.write(f"Force refresh: {force_refresh}")

        if user_id:
            # Refresh for specific user
            try:
                user = User.objects.get(id=user_id)
                self.stdout.write(f"Refreshing liabilities for user: {user.email}")
                result = self._refresh_for_user(user, force_refresh)
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"User with ID {user_id} not found"))
                return
        else:
            # Refresh for all users with debt accounts
            users_with_debt = User.objects.filter(
                accounts__account_type__in=["credit_card", "loan", "mortgage"],
                accounts__plaid_access_token__isnull=False,
                accounts__is_active=True,
            ).distinct()

            self.stdout.write(
                f"Found {users_with_debt.count()} users with debt accounts"
            )

            total_results = {
                "users": 0,
                "total_accounts": 0,
                "succeeded": 0,
                "failed": 0,
                "skipped": 0,
            }

            for user in users_with_debt:
                self.stdout.write(f"\nProcessing user: {user.email}")
                result = self._refresh_for_user(user, force_refresh)
                total_results["users"] += 1
                total_results["total_accounts"] += result["total_accounts"]
                total_results["succeeded"] += result["succeeded"]
                total_results["failed"] += result["failed"]
                total_results["skipped"] += result["skipped"]

            self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
            self.stdout.write(self.style.SUCCESS("FINAL SUMMARY"))
            self.stdout.write(self.style.SUCCESS("=" * 60))
            self.stdout.write(f"Total users processed: {total_results['users']}")
            self.stdout.write(f"Total accounts: {total_results['total_accounts']}")
            self.stdout.write(
                self.style.SUCCESS(f"Succeeded: {total_results['succeeded']}")
            )
            self.stdout.write(self.style.ERROR(f"Failed: {total_results['failed']}"))
            self.stdout.write(
                self.style.WARNING(f"Skipped (cached): {total_results['skipped']}")
            )

    def _refresh_for_user(self, user, force_refresh):
        """Refresh liabilities for a specific user."""
        # Get debt accounts
        debt_accounts = (
            Account.objects.for_user(user)
            .active()
            .filter(
                plaid_access_token__isnull=False,
                account_type__in=["credit_card", "loan", "mortgage"],
            )
        )

        if not debt_accounts.exists():
            self.stdout.write(self.style.WARNING("  No debt accounts found"))
            return {"total_accounts": 0, "succeeded": 0, "failed": 0, "skipped": 0}

        result = {
            "total_accounts": debt_accounts.count(),
            "succeeded": 0,
            "failed": 0,
            "skipped": 0,
        }

        for account in debt_accounts:
            account_name = account.custom_name or account.institution_name
            self.stdout.write(f"  Processing: {account_name} ({account.account_type})")

            # Check if we should skip (already cached)
            from apps.accounts.liability_sync import should_refresh_liabilities

            if not force_refresh and not should_refresh_liabilities(account):
                self.stdout.write(
                    self.style.WARNING(
                        f"    ⏩ Skipped (cached, last updated: {account.plaid_liabilities_last_updated})"
                    )
                )
                result["skipped"] += 1
                continue

            # Sync liabilities
            try:
                success = sync_liabilities_for_account(
                    account, force_refresh=force_refresh
                )

                if success:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"    ✓ Success (last updated: {account.plaid_liabilities_last_updated})"
                        )
                    )
                    result["succeeded"] += 1

                    # Show some data
                    if account.account_type == "credit_card":
                        if account.plaid_apr:
                            self.stdout.write(f"      APR: {account.plaid_apr}%")
                        if account.plaid_minimum_payment_amount:
                            self.stdout.write(
                                f"      Min Payment: ${account.plaid_minimum_payment_amount}"
                            )
                    else:
                        if account.plaid_interest_rate:
                            self.stdout.write(
                                f"      Interest Rate: {account.plaid_interest_rate}%"
                            )
                        if account.plaid_payment_amount:
                            self.stdout.write(
                                f"      Payment Amount: ${account.plaid_payment_amount}"
                            )
                else:
                    self.stdout.write(self.style.ERROR(f"    ✗ Failed"))
                    result["failed"] += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    ✗ Error: {str(e)}"))
                result["failed"] += 1

        # Summary for this user
        self.stdout.write(self.style.SUCCESS(f"\n  User Summary:"))
        self.stdout.write(
            f"  Total: {result['total_accounts']} | Success: {result['succeeded']} | Failed: {result['failed']} | Skipped: {result['skipped']}"
        )

        return result
