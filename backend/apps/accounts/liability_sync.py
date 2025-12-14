"""
Utility module for syncing Plaid liability data to Account model.

This module handles fetching and storing liability information from Plaid's
Liabilities API, including credit card details (APR, minimum payments) and
loan details (interest rates, payment amounts).
"""

import logging
from datetime import timedelta
from decimal import Decimal
from typing import Dict
from django.utils import timezone

from .plaid_service import PlaidService
from .plaid_utils import PlaidIntegrationError

logger = logging.getLogger(__name__)

# Cache duration for liability data (24 hours)
LIABILITIES_CACHE_DURATION = timedelta(hours=24)


def should_refresh_liabilities(account) -> bool:
    """
    Check if account's liability data should be refreshed.

    Args:
        account: Account instance

    Returns:
        True if liability data should be refreshed, False otherwise
    """
    if not account.plaid_liabilities_last_updated:
        return True

    age = timezone.now() - account.plaid_liabilities_last_updated
    return age > LIABILITIES_CACHE_DURATION


def sync_liabilities_for_account(account, force_refresh: bool = False) -> bool:
    """
    Fetch and sync liability data for a single account.

    Updates the account with latest liability information from Plaid.
    Uses cached data if available and recent (< 24 hours old) unless force_refresh=True.

    Args:
        account: Account instance with Plaid integration
        force_refresh: If True, ignore cache and fetch fresh data

    Returns:
        True if successful, False otherwise
    """
    try:
        # Check if we should use cached data
        if not force_refresh and not should_refresh_liabilities(account):
            logger.info(
                f"Using cached liability data for account {account.account_id} "
                f"(last updated: {account.plaid_liabilities_last_updated})"
            )
            return True

        # Fetch liability data from Plaid
        service = PlaidService(account)
        liabilities_response = service.get_liabilities()

        # Parse and update account
        updated = _update_account_with_liabilities(account, liabilities_response)

        if updated:
            logger.info(
                f"Successfully synced liabilities for account {account.account_id}"
            )
        else:
            logger.debug(f"No liability data found for account {account.account_id}")

        return True

    except PlaidIntegrationError as e:
        # Check if this is an encryption key mismatch (account needs re-linking)
        error_msg = str(e)
        if (
            "encryption key mismatch" in error_msg.lower()
            or "decrypt" in error_msg.lower()
        ):
            logger.warning(
                f"Account {account.account_id} has encryption key mismatch - "
                f"was likely created with a different PLAID_ENCRYPTION_KEY. "
                f"Account needs to be re-linked through Plaid. Skipping liability sync."
            )
            # Still return True to not fail the entire request
            return True
        else:
            logger.error(
                f"Failed to fetch liabilities for account {account.account_id}: {e}"
            )
            return False
    except Exception as e:
        logger.error(
            f"Unexpected error syncing liabilities for account {account.account_id}: {e}",
            exc_info=True,
        )
        return False


def sync_liabilities_for_user(user) -> Dict:
    """
    Sync liabilities for all of user's active Plaid accounts.

    Args:
        user: User instance

    Returns:
        Dict with summary of sync operation:
        {
            'total_accounts': int,
            'succeeded': int,
            'failed': int,
            'skipped': int (cached),
            'accounts': [list of account_ids processed]
        }
    """
    from .models import Account

    accounts = (
        Account.objects.for_user(user).active().filter(plaid_access_token__isnull=False)
    )

    result = {
        "total_accounts": accounts.count(),
        "succeeded": 0,
        "failed": 0,
        "skipped": 0,
        "accounts": [],
    }

    for account in accounts:
        account_id_str = str(account.account_id)

        # Check if we should skip (already cached)
        if not should_refresh_liabilities(account):
            result["skipped"] += 1
            result["accounts"].append(
                {"account_id": account_id_str, "status": "skipped", "reason": "cached"}
            )
            continue

        # Sync liabilities
        success = sync_liabilities_for_account(account, force_refresh=False)

        if success:
            result["succeeded"] += 1
            result["accounts"].append(
                {"account_id": account_id_str, "status": "success"}
            )
        else:
            result["failed"] += 1
            result["accounts"].append(
                {"account_id": account_id_str, "status": "failed"}
            )

    return result


def get_liabilities_for_display(account) -> Dict:
    """
    Get formatted liability data for API responses.

    Args:
        account: Account instance

    Returns:
        Dict with liability data suitable for API responses
    """
    # Determine which fields to use based on account type
    if account.account_type == "credit_card":
        return {
            "apr": float(account.plaid_apr) if account.plaid_apr else None,
            "minimum_payment": float(account.plaid_minimum_payment_amount)
            if account.plaid_minimum_payment_amount
            else None,
            "next_payment_due_date": account.plaid_next_payment_due_date.isoformat()
            if account.plaid_next_payment_due_date
            else None,
            "credit_limit": float(account.plaid_credit_limit)
            if account.plaid_credit_limit
            else None,
            "last_payment_amount": float(account.plaid_last_payment_amount)
            if account.plaid_last_payment_amount
            else None,
            "last_payment_date": account.plaid_last_payment_date.isoformat()
            if account.plaid_last_payment_date
            else None,
            "last_updated": account.plaid_liabilities_last_updated.isoformat()
            if account.plaid_liabilities_last_updated
            else None,
        }
    else:  # loan, mortgage types
        return {
            "interest_rate": float(account.plaid_interest_rate)
            if account.plaid_interest_rate
            else None,
            "payment_amount": float(account.plaid_payment_amount)
            if account.plaid_payment_amount
            else None,
            "loan_type": account.plaid_loan_type,
            "loan_term": account.plaid_loan_term,
            "origination_date": account.plaid_origination_date.isoformat()
            if account.plaid_origination_date
            else None,
            "maturity_date": account.plaid_maturity_date.isoformat()
            if account.plaid_maturity_date
            else None,
            "next_payment_due_date": account.plaid_next_payment_due_date.isoformat()
            if account.plaid_next_payment_due_date
            else None,
            "minimum_payment": float(account.plaid_minimum_payment_amount)
            if account.plaid_minimum_payment_amount
            else None,
            "last_updated": account.plaid_liabilities_last_updated.isoformat()
            if account.plaid_liabilities_last_updated
            else None,
        }


def _update_account_with_liabilities(account, liabilities_response: Dict) -> bool:
    """
    Update account with liability data from Plaid response.

    Args:
        account: Account instance
        liabilities_response: Response from Plaid liabilities_get API

    Returns:
        True if account was updated, False if no liability data found
    """
    plaid_account_id = account.plaid_account_id

    # Look for this account in credit card liabilities
    credit_liabilities = liabilities_response.get("liabilities", {}).get("credit", [])
    for credit in credit_liabilities:
        if credit.get("account_id") == plaid_account_id:
            _update_credit_card_liability(account, credit)
            account.plaid_liabilities_last_updated = timezone.now()
            account.save()
            return True

    # Look in mortgage liabilities
    mortgage_liabilities = liabilities_response.get("liabilities", {}).get(
        "mortgage", []
    )
    for mortgage in mortgage_liabilities:
        if mortgage.get("account_id") == plaid_account_id:
            _update_mortgage_liability(account, mortgage)
            account.plaid_liabilities_last_updated = timezone.now()
            account.save()
            return True

    # Look in student loan liabilities
    student_liabilities = liabilities_response.get("liabilities", {}).get("student", [])
    for student in student_liabilities:
        if student.get("account_id") == plaid_account_id:
            _update_student_loan_liability(account, student)
            account.plaid_liabilities_last_updated = timezone.now()
            account.save()
            return True

    logger.debug(f"No liability data found for account {plaid_account_id}")
    return False


def _update_credit_card_liability(account, credit_data: Dict):
    """Update account with credit card liability data."""
    aprs = credit_data.get("aprs", [])
    if aprs:
        # Use the purchase APR if available, otherwise first APR
        purchase_apr = next(
            (apr for apr in aprs if apr.get("apr_type") == "purchase_apr"), aprs[0]
        )
        apr_percentage = purchase_apr.get("apr_percentage")
        if apr_percentage is not None:
            account.plaid_apr = Decimal(str(apr_percentage))

    # Last payment info
    last_payment = credit_data.get("last_payment_amount")
    if last_payment is not None:
        account.plaid_last_payment_amount = Decimal(str(last_payment))

    last_payment_date = credit_data.get("last_payment_date")
    if last_payment_date:
        account.plaid_last_payment_date = last_payment_date

    # Minimum payment
    min_payment = credit_data.get("minimum_payment_amount")
    if min_payment is not None:
        account.plaid_minimum_payment_amount = Decimal(str(min_payment))

    # Next payment due date
    next_due = credit_data.get("next_payment_due_date")
    if next_due:
        account.plaid_next_payment_due_date = next_due

    # Credit limit (from account-level data, not liabilities)
    # This is sometimes available in the accounts array, not just liabilities


def _update_mortgage_liability(account, mortgage_data: Dict):
    """Update account with mortgage liability data."""
    # Interest rate
    interest_rate = mortgage_data.get("interest_rate", {}).get("percentage")
    if interest_rate is not None:
        account.plaid_interest_rate = Decimal(str(interest_rate))

    # Loan type
    loan_type = mortgage_data.get("loan_type_description")
    if loan_type:
        account.plaid_loan_type = loan_type

    # Loan term
    loan_term = mortgage_data.get("loan_term")
    if loan_term:
        account.plaid_loan_term = loan_term

    # Origination date
    orig_date = mortgage_data.get("origination_date")
    if orig_date:
        account.plaid_origination_date = orig_date

    # Maturity date
    maturity_date = mortgage_data.get("maturity_date")
    if maturity_date:
        account.plaid_maturity_date = maturity_date

    # Payment amount (last payment or next payment)
    last_payment = mortgage_data.get("last_payment_amount")
    if last_payment is not None:
        account.plaid_payment_amount = Decimal(str(last_payment))

    # Next payment due date
    next_due = mortgage_data.get("next_payment_due_date")
    if next_due:
        account.plaid_next_payment_due_date = next_due


def _update_student_loan_liability(account, student_data: Dict):
    """Update account with student loan liability data."""
    # Interest rate
    interest_rate = student_data.get("interest_rate_percentage")
    if interest_rate is not None:
        account.plaid_interest_rate = Decimal(str(interest_rate))

    # Loan type/name
    loan_name = student_data.get("loan_name")
    if loan_name:
        account.plaid_loan_type = loan_name

    # Minimum payment
    min_payment = student_data.get("minimum_payment_amount")
    if min_payment is not None:
        account.plaid_minimum_payment_amount = Decimal(str(min_payment))

    # Origination/disbursement date
    orig_date = student_data.get("origination_date")
    if orig_date:
        account.plaid_origination_date = orig_date

    # Next payment due date
    next_due = student_data.get("next_payment_due_date")
    if next_due:
        account.plaid_next_payment_due_date = next_due

    # Expected payoff date (as maturity)
    expected_payoff = student_data.get("expected_payoff_date")
    if expected_payoff:
        account.plaid_maturity_date = expected_payoff
