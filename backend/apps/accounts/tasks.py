"""
Celery tasks for Plaid account lifecycle events.
"""
import logging

from celery import shared_task
from django.utils import timezone

from .models import Account
from .plaid_service import PlaidService
from .plaid_utils import PlaidIntegrationError

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_transactions_webhook(self, plaid_item_id, account_ids=None):
    """
    Trigger transaction sync for accounts associated with a Plaid item.
    """
    try:
        from apps.transactions.tasks import sync_account_transactions

        accounts = Account.objects.filter(
            plaid_item_id=plaid_item_id,
            is_active=True,
        )
        if account_ids:
            accounts = accounts.filter(plaid_account_id__in=account_ids)

        for account in accounts:
            sync_account_transactions.delay(str(account.account_id))
        return {"accounts_triggered": accounts.count()}
    except Exception as exc:  # pragma: no cover - best effort with retry
        logger.error("Error processing transactions webhook for item %s: %s", plaid_item_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def process_item_error_webhook(self, plaid_item_id, error_code, error_message):
    """
    Persist Plaid item error metadata on associated accounts.
    """
    try:
        timestamp = timezone.now()
        updated = Account.objects.filter(plaid_item_id=plaid_item_id).update(
            error_code=error_code,
            error_message=error_message,
            last_error_at=timestamp,
        )
        logger.warning(
            "Recorded Plaid error %s for item %s on %s accounts",
            error_code,
            plaid_item_id,
            updated,
        )
        return {"updated_accounts": updated}
    except Exception as exc:  # pragma: no cover
        logger.error("Error recording item error for %s: %s", plaid_item_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def process_item_login_required(self, plaid_item_id):
    """
    Flag accounts requiring user re-authentication.
    """
    try:
        timestamp = timezone.now()
        updated = Account.objects.filter(plaid_item_id=plaid_item_id).update(
            error_code="ITEM_LOGIN_REQUIRED",
            error_message="Plaid item requires re-authentication.",
            last_error_at=timestamp,
        )
        logger.info(
            "Marked %s accounts for ITEM_LOGIN_REQUIRED (item %s)", updated, plaid_item_id
        )
        return {"updated_accounts": updated}
    except Exception as exc:  # pragma: no cover
        logger.error("Error processing login required webhook for %s: %s", plaid_item_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=180)
def sync_account_balances(self, plaid_item_id):
    """
    Synchronize account balances using Plaid Accounts Balance endpoint.
    """
    try:
        accounts = Account.objects.filter(
            plaid_item_id=plaid_item_id,
            is_active=True,
        )
        updated = 0
        for account in accounts:
            try:
                service = PlaidService(account)
                balances = service.fetch_balances()
                for balance in balances.get("accounts", []):
                    if balance.get("account_id") != account.plaid_account_id:
                        continue
                    account.balance = balance.get("balances", {}).get(
                        "current",
                        account.balance,
                    )
                    account.currency = (
                        balance.get("balances", {}).get("iso_currency_code") or account.currency
                    )
                    account.last_synced_at = timezone.now()
                    account.error_code = None
                    account.error_message = None
                    account.last_error_at = None
                    account.save(update_fields=[
                        "balance",
                        "currency",
                        "last_synced_at",
                        "error_code",
                        "error_message",
                        "last_error_at",
                    ])
                    updated += 1
                    break
            except PlaidIntegrationError as exc:
                logger.warning(
                    "Unable to sync balances for account %s: %s", account.account_id, exc
                )
        return {"balances_updated": updated}
    except Exception as exc:  # pragma: no cover
        logger.error("Error syncing balances for item %s: %s", plaid_item_id, exc)
        raise self.retry(exc=exc)

