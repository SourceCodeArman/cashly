"""
Plaid API configuration utilities.
"""
import logging
from functools import lru_cache

from django.conf import settings
from plaid import ApiClient, Configuration, Environment
from plaid.api import plaid_api
from plaid.model.products import Products

logger = logging.getLogger(__name__)


PLAID_ENVIRONMENTS = {
    "SANDBOX": Environment.Sandbox,
    "DEVELOPMENT": Environment.Development,
    "PRODUCTION": Environment.Production,
}


def _validate_plaid_settings():
    """
    Ensure Plaid configuration is present and valid.
    """
    missing = []
    if not getattr(settings, "PLAID_CLIENT_ID", None):
        missing.append("PLAID_CLIENT_ID")
    if not getattr(settings, "PLAID_SECRET", None):
        missing.append("PLAID_SECRET")

    if missing:
        logger.error("Missing Plaid configuration values: %s", ", ".join(missing))
        raise ValueError(f"Missing Plaid configuration values: {', '.join(missing)}")

    env_key = getattr(settings, "PLAID_ENV", "sandbox").upper()
    if env_key not in PLAID_ENVIRONMENTS:
        logger.warning(
            "Unknown PLAID_ENV '%s'. Falling back to sandbox environment.", env_key
        )


def _resolve_environment():
    """
    Resolve the Plaid environment from settings.
    """
    env_key = getattr(settings, "PLAID_ENV", "sandbox").upper()
    environment = PLAID_ENVIRONMENTS.get(env_key, Environment.Sandbox)
    if environment is Environment.Production and settings.DEBUG:
        logger.warning(
            "PLAID_ENV is set to production while DEBUG=True. "
            "Ensure this is intentional."
        )
    return environment


@lru_cache(maxsize=1)
def get_plaid_configuration():
    """
    Return a cached Plaid Configuration instance.
    """
    _validate_plaid_settings()
    configuration = Configuration(
        host=_resolve_environment(),
        api_key={
            "clientId": settings.PLAID_CLIENT_ID,
            "secret": settings.PLAID_SECRET,
        },
    )
    if getattr(settings, "PLAID_API_TIMEOUT", None):
        configuration.timeout = settings.PLAID_API_TIMEOUT
    return configuration


def get_plaid_client():
    """
    Get configured Plaid API client.
    """
    configuration = get_plaid_configuration()
    api_client = ApiClient(configuration)
    return plaid_api.PlaidApi(api_client)


def ensure_products_supported(requested_products):
    """
    Validate requested Plaid products by attempting to construct each enum value.
    """
    invalid_products = []
    for product in requested_products or []:
        try:
            # Will raise if not a valid product
            Products(product)
        except Exception:
            invalid_products.append(product)
    if invalid_products:
        raise ValueError(f"Unsupported Plaid products requested: {', '.join(invalid_products)}")

