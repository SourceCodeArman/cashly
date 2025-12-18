from django.core.management.base import BaseCommand
from apps.transactions.models import Transaction
from django.db.models import Q


class Command(BaseCommand):
    help = "Fix incorrectly detected transfers"

    def handle(self, *args, **options):
        # Transactions that are marked as transfer but have specific merchant names
        # or Plaid categories that indicate otherwise

        # 1. Fix by Merchant Name (Uber, United, etc.)
        merchants = [
            "Uber",
            "United Airlines",
            "Lyft",
            "Delta",
            "American Airlines",
            "Southwest",
        ]

        updated_count = 0

        for merchant in merchants:
            txns = Transaction.objects.filter(
                is_transfer=True, merchant_name__icontains=merchant
            )
            count = txns.update(is_transfer=False)
            updated_count += count
            if count > 0:
                self.stdout.write(
                    self.style.SUCCESS(f"Fixed {count} transactions for {merchant}")
                )

        # 2. Fix by Plaid Category (Travel, Transportation, Food, etc.)
        # If Plaid says it's Travel but we marked it as Transfer -> revert
        # We need to check if plaid_category contains these types
        # Note: plaid_category is a JSONField

        # In the user data: {"primary": "TRAVEL", ...}

        # Fix TRAVEL
        travel_txns = Transaction.objects.filter(
            is_transfer=True, plaid_category__primary="TRAVEL"
        )
        t_count = travel_txns.update(is_transfer=False)
        if t_count > 0:
            updated_count += t_count
            self.stdout.write(
                self.style.SUCCESS(f"Fixed {t_count} TRAVEL transactions")
            )

        # Fix TRANSPORTATION
        transport_txns = Transaction.objects.filter(
            is_transfer=True, plaid_category__primary="TRANSPORTATION"
        )
        tr_count = transport_txns.update(is_transfer=False)
        if tr_count > 0:
            updated_count += tr_count
            self.stdout.write(
                self.style.SUCCESS(f"Fixed {tr_count} TRANSPORTATION transactions")
            )

        # Fix ENTERTAINMENT (CD DEPOSIT?)
        # Wait, CD DEPOSIT might actually be a transfer if it's internal.
        # But "CD DEPOSIT .INITIAL." sounds like opening a CD account.

        # Fix Rent/Utilities (GUSTO PAY?) - GUSTO PAY is usually income (Salary).
        # If it's income, is_transfer=True might be valid if it's a transfer from employer?
        # But for personal finance, Salary is Income, not Transfer.
        gusto_txns = Transaction.objects.filter(
            is_transfer=True, merchant_name__icontains="GUSTO"
        )
        g_count = gusto_txns.update(is_transfer=False)
        if g_count > 0:
            updated_count += g_count
            self.stdout.write(self.style.SUCCESS(f"Fixed {g_count} Gusto transactions"))

        self.stdout.write(
            self.style.SUCCESS(f"Total transactions fixed: {updated_count}")
        )
