"""
Service layer for complex Plaid interactions.
"""
import logging
import time
from typing import Dict, Optional

from django.conf import settings
from plaid.exceptions import ApiException
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from plaid.model.asset_report_create_request import AssetReportCreateRequest
from plaid.model.asset_report_filter_request import AssetReportFilterRequest
from plaid.model.asset_report_get_request import AssetReportGetRequest
from plaid.model.liabilities_get_request import LiabilitiesGetRequest

from .plaid_config import get_plaid_client
from .plaid_utils import (
    PlaidIntegrationError,
    decrypt_token,
    get_accounts,
    get_auth,
    get_identity,
    get_investments,
    get_item,
)

logger = logging.getLogger(__name__)


class PlaidService:
    """
    Thin service wrapper around Plaid operations for a specific account.
    """

    def __init__(self, account):
        self.account = account
        if not account.plaid_access_token:
            raise PlaidIntegrationError("Account is not connected to Plaid")
        self.access_token = decrypt_token(account.plaid_access_token)
        self.client = get_plaid_client()

    # ---------------------------------------------------------------------
    # Core helpers
    # ---------------------------------------------------------------------
    def fetch_accounts(self):
        return get_accounts(self.access_token)

    def fetch_item(self):
        return get_item(self.access_token)

    def fetch_balances(self):
        """
        Retrieve real-time balances via Plaid.
        """
        try:
            request = AccountsBalanceGetRequest(access_token=self.access_token)
            response = self.client.accounts_balance_get(request)
            return response.to_dict()
        except ApiException as exc:
            logger.error("Plaid API error fetching balances: %s", exc)
            raise PlaidIntegrationError(
                f"Failed to fetch account balances: {exc.body}"
            ) from exc

    # ---------------------------------------------------------------------
    # Products
    # ---------------------------------------------------------------------
    def get_auth(self):
        return get_auth(self.access_token)

    def get_identity(self):
        return get_identity(self.access_token)

    def get_investments(self):
        return get_investments(self.access_token)

    def get_liabilities(self):
        try:
            request = LiabilitiesGetRequest(access_token=self.access_token)
            response = self.client.liabilities_get(request)
            return response.to_dict()
        except ApiException as exc:
            logger.error("Plaid API error fetching liabilities data: %s", exc)
            raise PlaidIntegrationError(
                f"Failed to fetch liabilities data: {exc.body}"
            ) from exc

    def get_asset_report(
        self,
        *,
        days_requested: int = 60,
    ):
        """
        Generate an asset report. Plaid requires multiple steps; this helper
        handles the synchronous polling loop suitable for small reports.

        For larger or production uses, offload to Celery and increase the
        polling timeout.
        """
        try:
            create_request = AssetReportCreateRequest(
                access_tokens=[self.access_token],
                days_requested=days_requested,
            )
            create_response = self.client.asset_report_create(create_request)
            asset_report_token = create_response["asset_report_token"]

            # Poll for completion (Plaid suggests polling with exponential backoff)
            timeout = getattr(settings, "PLAID_ASSET_REPORT_TIMEOUT", 30)
            interval = 2
            elapsed = 0
            while elapsed < timeout:
                try:
                    get_request = AssetReportGetRequest(
                        asset_report_token=asset_report_token
                    )
                    report_response = self.client.asset_report_get(get_request)
                    return report_response.to_dict()
                except ApiException as exc:
                    if exc.status == 400 and "PRODUCT_NOT_READY" in exc.body:
                        time.sleep(interval)
                        elapsed += interval
                        interval = min(interval * 2, 8)
                        continue
                    raise

            logger.warning(
                "Asset report generation timed out after %s seconds", timeout
            )
            return {"asset_report_token": asset_report_token, "status": "pending"}
        except ApiException as exc:
            logger.error("Plaid API error fetching asset report: %s", exc)
            raise PlaidIntegrationError(
                f"Failed to fetch asset report: {exc.body}"
            ) from exc

    def filter_asset_report(self, asset_report_token: str, account_ids):
        """
        Filter an existing asset report for specific accounts.
        """
        try:
            request = AssetReportFilterRequest(
                asset_report_token=asset_report_token,
                account_ids=account_ids,
            )
            response = self.client.asset_report_filter(request)
            return response.to_dict()
        except ApiException as exc:
            logger.error("Plaid API error filtering asset report: %s", exc)
            raise PlaidIntegrationError(
                f"Failed to filter asset report: {exc.body}"
            ) from exc

    # ---------------------------------------------------------------------
    # Utility helpers
    # ---------------------------------------------------------------------
    def snapshot(self) -> Dict[str, Optional[Dict]]:
        """
        Collect a snapshot of available Plaid data for the account.
        """
        snapshot = {
            "item": None,
            "accounts": None,
            "balances": None,
            "auth": None,
            "identity": None,
            "investments": None,
        }
        try:
            snapshot["item"] = self.fetch_item()
        except PlaidIntegrationError:
            logger.debug("Item metadata unavailable for account %s", self.account_id)
        try:
            snapshot["accounts"] = self.fetch_accounts()
        except PlaidIntegrationError:
            logger.debug("Accounts unavailable for account %s", self.account_id)
        try:
            snapshot["balances"] = self.fetch_balances()
        except PlaidIntegrationError:
            logger.debug("Balances unavailable for account %s", self.account_id)

        for product, method in [
            ("auth", self.get_auth),
            ("identity", self.get_identity),
            ("investments", self.get_investments),
        ]:
            try:
                snapshot[product] = method()
            except PlaidIntegrationError:
                logger.debug(
                    "%s data unavailable for account %s", product, self.account_id
                )
        return snapshot

    @property
    def account_id(self):
        return getattr(self.account, "account_id", None)

