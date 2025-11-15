"""
Plaid utility functions for account connection and token management.
"""
import base64
import logging
import os
import uuid
from typing import Iterable, List, Optional, Sequence

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import ValidationError
from plaid.exceptions import ApiException
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.auth_get_request import AuthGetRequest
from plaid.model.country_code import CountryCode
from plaid.model.identity_get_request import IdentityGetRequest
from plaid.model.investments_holdings_get_request import InvestmentsHoldingsGetRequest
from plaid.model.item_get_request import ItemGetRequest
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.item_remove_request import ItemRemoveRequest
from plaid.model.item_webhook_update_request import ItemWebhookUpdateRequest
from plaid.model.link_token_account_filters import LinkTokenAccountFilters
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_account_subtypes import (
    LinkTokenCreateRequestAccountSubtypes,
)
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products

from .plaid_config import ensure_products_supported, get_plaid_client

logger = logging.getLogger(__name__)

DEFAULT_PLAID_PRODUCTS = getattr(
    settings,
    "PLAID_PRODUCTS",
    ["transactions", "auth", "identity", "investments", "assets", "liabilities"],
)
DEFAULT_COUNTRY_CODES = getattr(settings, "PLAID_COUNTRY_CODES", ["US"])
DEFAULT_LANGUAGE = getattr(settings, "PLAID_LANGUAGE", "en")


class PlaidIntegrationError(ValidationError):
    """Custom validation error for Plaid operations."""
    
    def __init__(self, message, error_code=None, error_type=None):
        super().__init__(message)
        self.code = error_code
        self.error_type = error_type


# Module-level cache for generated encryption key (for development)
_encryption_key_cache = None


def get_encryption_key():
    """
    Get or generate a valid Fernet key (32 url-safe base64-encoded bytes).
    - If PLAID_ENCRYPTION_KEY is provided, validate it.
    - Otherwise, generate a key once and cache it, or load from file (dev only).
    
    For development, the key is cached in memory and persisted to a file
    to ensure consistency across server restarts.
    In production, always set PLAID_ENCRYPTION_KEY as an environment variable.
    """
    global _encryption_key_cache
    
    env_key = os.environ.get("PLAID_ENCRYPTION_KEY")
    if env_key:
        key_bytes = env_key.encode() if isinstance(env_key, str) else env_key
        try:
            # Validate by constructing Fernet; this also implicitly verifies base64/length
            Fernet(key_bytes)
            return key_bytes
        except Exception:
            logger.error("Invalid PLAID_ENCRYPTION_KEY. It must be a Fernet key (base64 url-safe 32 bytes).")
            raise ValidationError("Invalid PLAID_ENCRYPTION_KEY format")
    
    # Development fallback: use cached key or load/generate from file
    if _encryption_key_cache is None:
        # Try to load from a persistent file (for development)
        # Use Django's BASE_DIR if available, otherwise calculate relative to this file
        try:
            base_dir = settings.BASE_DIR
        except (AttributeError, TypeError):
            # Fallback: calculate relative to this file (backend/apps/accounts/plaid_utils.py)
            # Go up: accounts -> apps -> backend
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        key_file_path = os.path.join(str(base_dir), '.plaid_encryption_key')
        
        try:
            if os.path.exists(key_file_path):
                # Load existing key from file
                with open(key_file_path, 'rb') as f:
                    _encryption_key_cache = f.read()
                logger.info("Loaded PLAID_ENCRYPTION_KEY from file (development mode)")
            else:
                # Generate new key and save to file
                _encryption_key_cache = Fernet.generate_key()
                with open(key_file_path, 'wb') as f:
                    f.write(_encryption_key_cache)
                # Set restrictive permissions (readable only by owner)
                os.chmod(key_file_path, 0o600)
                logger.warning(
                    f"PLAID_ENCRYPTION_KEY not set, generated and saved to {key_file_path} "
                    "(development mode only). Set PLAID_ENCRYPTION_KEY environment variable for production."
                )
        except Exception as e:
            # If file operations fail, fall back to in-memory cache only
            logger.warning(f"Could not persist encryption key to file: {e}. Using in-memory cache only.")
            if _encryption_key_cache is None:
                _encryption_key_cache = Fernet.generate_key()
                logger.warning(
                    "PLAID_ENCRYPTION_KEY not set, using generated key (in-memory only, not persistent). "
                    "Set PLAID_ENCRYPTION_KEY environment variable for production."
                )
    
    return _encryption_key_cache


def encrypt_token(token: str) -> str:
    """
    Encrypt Plaid access token before storing in database.
    """
    try:
        f = Fernet(get_encryption_key())
        encrypted_token = f.encrypt(token.encode())
        return encrypted_token.decode()
    except Exception as exc:  # pragma: no cover - unexpected errors
        logger.error("Error encrypting token: %s", exc)
        raise PlaidIntegrationError("Failed to encrypt token") from exc


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt Plaid access token from database.
    """
    try:
        f = Fernet(get_encryption_key())
        decrypted_token = f.decrypt(encrypted_token.encode())
        return decrypted_token.decode()
    except Exception as exc:
        # Check if this is an InvalidToken error (key mismatch)
        from cryptography.fernet import InvalidToken
        if isinstance(exc, (InvalidToken, ValueError)) or "InvalidToken" in str(type(exc)):
            logger.error(
                "Failed to decrypt token - encryption key mismatch. "
                "This usually happens when PLAID_ENCRYPTION_KEY changes or accounts were created "
                "with a different key. Accounts may need to be re-linked. Error: %s", exc
            )
            raise PlaidIntegrationError(
                "Failed to decrypt token - encryption key mismatch. "
                "Account may need to be re-linked. If this is development, the encryption key may have changed."
            ) from exc
        logger.error("Error decrypting token: %s", exc)
        raise PlaidIntegrationError("Failed to decrypt token") from exc


def validate_plaid_token(token: str) -> str:
    """
    Validate Plaid access token format.
    """
    if not token or len(token) < 20:
        raise PlaidIntegrationError("Invalid Plaid token format")
    return token


def _normalize_products(products: Optional[Iterable[str]]) -> List[Products]:
    requested = list(products or DEFAULT_PLAID_PRODUCTS)
    ensure_products_supported(requested)
    normalized: List[Products] = []
    for product in requested:
        if isinstance(product, Products):
            normalized.append(product)
        else:
            normalized.append(Products(product))
    return normalized


def _normalize_country_codes(country_codes: Optional[Sequence[str]]) -> List[CountryCode]:
    return [CountryCode(code.upper()) for code in (country_codes or DEFAULT_COUNTRY_CODES)]


def create_link_token(
    user,
    *,
    products: Optional[Iterable[str]] = None,
    webhook: Optional[str] = None,
    access_token: Optional[str] = None,
    account_filters: Optional[dict] = None,
) -> str:
    """
    Create Plaid Link token for account connection or update mode.
    
    Args:
        user: User instance
        products: Iterable of Plaid products to enable
        webhook: Optional webhook URL override
        access_token: Existing access token for update mode
        account_filters: Optional account subtype filters
        
    Returns:
        str: Link token for Plaid Link
    """
    try:
        client = get_plaid_client()
        plaid_products = _normalize_products(products)
        country_codes = _normalize_country_codes(
            getattr(settings, "PLAID_COUNTRY_CODES", DEFAULT_COUNTRY_CODES)
        )

        link_user = LinkTokenCreateRequestUser(client_user_id=str(user.id))
        filters = None
        if account_filters:
            filters = LinkTokenAccountFilters(
                account_subtypes=LinkTokenCreateRequestAccountSubtypes(
                    **account_filters
                )
            )

        request_kwargs = {
            "products": plaid_products,
            "client_name": getattr(settings, "PLATFORM_NAME", "Cashly"),
            "country_codes": country_codes,
            "language": getattr(settings, "PLAID_LANGUAGE", DEFAULT_LANGUAGE),
            "user": link_user,
        }

        if webhook:
            request_kwargs["webhook"] = webhook
        elif getattr(settings, "PLAID_WEBHOOK_URL", None):
            request_kwargs["webhook"] = settings.PLAID_WEBHOOK_URL

        if filters:
            request_kwargs["account_filters"] = filters

        if access_token:
            request_kwargs["access_token"] = access_token

        request = LinkTokenCreateRequest(**request_kwargs)
        response = client.link_token_create(request)
        return response["link_token"]
    except ApiException as exc:
        logger.error("Plaid API error creating link token: %s", exc)
        raise PlaidIntegrationError(
            f"Failed to create link token: {exc.body}"
        ) from exc
    except Exception as exc:  # pragma: no cover - unexpected errors
        logger.error("Unexpected error creating link token: %s", exc)
        raise PlaidIntegrationError("Failed to create link token") from exc


def exchange_public_token(public_token: str) -> dict:
    """
    Exchange Plaid public token for access token and item ID.
    
    Args:
        public_token: Public token from Plaid Link
        
    Returns:
        dict: {'access_token': str, 'item_id': str}
    """
    try:
        client = get_plaid_client()
        request = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = client.item_public_token_exchange(request)
        return {
            "access_token": response["access_token"],
            "item_id": response["item_id"],
        }
    except ApiException as exc:
        logger.error("Plaid API error exchanging public token: %s", exc)
        raise PlaidIntegrationError(
            f"Failed to exchange public token: {exc.body}"
        ) from exc
    except Exception as exc:  # pragma: no cover - unexpected errors
        logger.error("Unexpected error exchanging public token: %s", exc)
        raise PlaidIntegrationError("Failed to exchange public token") from exc


def get_accounts(access_token: str):
    """
    Retrieve all accounts for a Plaid item.
    """
    try:
        client = get_plaid_client()
        request = AccountsGetRequest(access_token=access_token)
        response = client.accounts_get(request)
        return response.to_dict().get("accounts", [])
    except ApiException as exc:
        logger.error("Plaid API error fetching accounts: %s", exc)
        raise PlaidIntegrationError(f"Failed to fetch accounts: {exc.body}") from exc


def get_auth(access_token: str):
    """
    Retrieve Auth product data.
    """
    try:
        client = get_plaid_client()
        request = AuthGetRequest(access_token=access_token)
        response = client.auth_get(request)
        return response.to_dict()
    except ApiException as exc:
        logger.error("Plaid API error fetching auth data: %s", exc)
        raise PlaidIntegrationError(f"Failed to fetch auth data: {exc.body}") from exc


def get_identity(access_token: str):
    """
    Retrieve Identity product data.
    """
    try:
        client = get_plaid_client()
        request = IdentityGetRequest(access_token=access_token)
        response = client.identity_get(request)
        return response.to_dict()
    except ApiException as exc:
        logger.error("Plaid API error fetching identity data: %s", exc)
        raise PlaidIntegrationError(
            f"Failed to fetch identity data: {exc.body}"
        ) from exc


def get_investments(access_token: str):
    """
    Retrieve Investments holdings and securities.
    """
    try:
        client = get_plaid_client()
        request = InvestmentsHoldingsGetRequest(access_token=access_token)
        response = client.investments_holdings_get(request)
        return response.to_dict()
    except ApiException as exc:
        logger.error("Plaid API error fetching investments data: %s", exc)
        raise PlaidIntegrationError(
            f"Failed to fetch investments data: {exc.body}"
        ) from exc


def get_item(access_token: str):
    """
    Retrieve Plaid item metadata.
    """
    try:
        client = get_plaid_client()
        request = ItemGetRequest(access_token=access_token)
        response = client.item_get(request)
        return response.to_dict()
    except ApiException as exc:
        logger.error("Plaid API error fetching item: %s", exc)
        raise PlaidIntegrationError(f"Failed to fetch item: {exc.body}") from exc


def remove_item(access_token: str):
    """
    Remove Plaid item (disconnect account).
    """
    try:
        client = get_plaid_client()
        request = ItemRemoveRequest(access_token=access_token)
        client.item_remove(request)
        return True
    except ApiException as exc:
        logger.error("Plaid API error removing item: %s", exc)
        raise PlaidIntegrationError(f"Failed to remove item: {exc.body}") from exc


def update_item_webhook(access_token: str, webhook_url: str):
    """
    Update Plaid item webhook URL.
    """
    try:
        client = get_plaid_client()
        request = ItemWebhookUpdateRequest(
            access_token=access_token,
            webhook=webhook_url,
        )
        client.item_webhook_update(request)
        return True
    except ApiException as exc:
        logger.error("Plaid API error updating webhook: %s", exc)
        raise PlaidIntegrationError(
            f"Failed to update webhook: {exc.body}"
        ) from exc


def create_transfer_authorization(
    user,
    source_account_id: str,
    destination_account_id: str,
    amount: str,
    goal_id: str = None,
) -> dict:
    """
    Create a Plaid Transfer Authorization programmatically (no Link UI).
    
    This creates an authorization for future automatic transfers WITHOUT executing
    a transfer immediately. The authorization can be stored and used later to
    create transfers programmatically.
    
    Based on Plaid's Transfer Authorization API:
    https://plaid.com/docs/api/products/transfer/initiating-transfers/
    
    Args:
        user: User instance
        source_account_id: UUID of source Account model instance
        destination_account_id: UUID of destination Account model instance
        amount: Transfer amount as string (e.g., '10.00')
        goal_id: Optional UUID of the goal for logging
        
    Returns:
        dict: Authorization response with 'authorization_id' and other details
        
    Raises:
        PlaidIntegrationError: If authorization creation fails
    """
    try:
        from apps.accounts.models import Account
        
        # Get source and destination accounts
        source_account = Account.objects.get(account_id=source_account_id, user=user)
        destination_account = Account.objects.get(account_id=destination_account_id, user=user)
        
        # Decrypt access tokens
        source_access_token = decrypt_token(source_account.plaid_access_token)
        
        client = get_plaid_client()
        
        # Create transfer authorization using Plaid's API
        # This does NOT execute a transfer - it only authorizes future transfers
        try:
            from plaid.model.transfer_authorization_create_request import TransferAuthorizationCreateRequest
            from plaid.model.transfer_authorization_user_in_request import TransferAuthorizationUserInRequest
            from plaid.model.transfer_network import TransferNetwork
            from plaid.model.transfer_type import TransferType
            from plaid.model.ach_class import ACHClass
            
            # Create user object for transfer authorization
            transfer_user = TransferAuthorizationUserInRequest(
                legal_name=f"{user.first_name} {user.last_name}".strip() or user.email or "User",
                email_address=user.email
            )
            
            # Create transfer authorization request
            # This authorizes future transfers but does NOT execute them
            auth_request = TransferAuthorizationCreateRequest(
                access_token=source_access_token,
                account_id=source_account.plaid_account_id,
                type=TransferType('debit'),  # Money going out of source account
                network=TransferNetwork('ach'),
                amount=amount,
                ach_class=ACHClass('ppd'),  # Prearranged Payment and Deposit
                user=transfer_user
                # Note: description is not a parameter for TransferAuthorizationCreateRequest
            )
            
            auth_response = client.transfer_authorization_create(auth_request)
            authorization = auth_response['authorization']
            
            logger.info(f"Created transfer authorization {authorization['id']} for goal {goal_id}")
            
            # Convert decision enum to string for JSON serialization
            decision = authorization.get('decision')
            if decision is not None:
                # Extract value from enum if it has one, otherwise convert to string
                decision_str = decision.value if hasattr(decision, 'value') else str(decision)
            else:
                decision_str = None
            
            # Convert decision_rationale to dict if it's an object
            decision_rationale = authorization.get('decision_rationale')
            if decision_rationale is not None:
                # If it's an object, convert to dict or extract relevant fields
                if hasattr(decision_rationale, 'to_dict'):
                    decision_rationale = decision_rationale.to_dict()
                elif hasattr(decision_rationale, '__dict__'):
                    decision_rationale = decision_rationale.__dict__
                else:
                    decision_rationale = str(decision_rationale)
            
            return {
                'authorization_id': authorization['id'],
                'created': authorization['created'],
                'decision': decision_str,
                'decision_rationale': decision_rationale,
            }
            
        except ImportError as import_exc:
            logger.error(f"Transfer Authorization API not available: {import_exc}")
            raise PlaidIntegrationError("Transfer Authorization API not available in this Plaid SDK version")
        except ApiException as exc:
            logger.error("Plaid API error creating transfer authorization: %s", exc)
            raise PlaidIntegrationError(
                f"Failed to create transfer authorization: {exc.body}"
            ) from exc
        
    except Account.DoesNotExist:
        raise PlaidIntegrationError("Source or destination account not found")
    except ApiException as exc:
        logger.error("Plaid API error creating transfer authorization: %s", exc)
        raise PlaidIntegrationError(
            f"Failed to create transfer authorization: {exc.body}"
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error creating transfer authorization: %s", exc)
        raise PlaidIntegrationError("Failed to create transfer authorization") from exc


def create_transfer(
    user,
    source_account_id: str,
    destination_account_id: str,
    amount: str,
    authorization_id: str,
    description: str = "Goal contribution",
) -> dict:
    """
    Create a Plaid transfer using a stored authorization.
    
    This executes an actual transfer between accounts using a previously
    created authorization. The authorization must be valid and approved.
    
    Based on Plaid's Transfer API:
    https://plaid.com/docs/api/products/transfer/creating-transfers/
    
    Args:
        user: User instance
        source_account_id: UUID of source Account model instance
        destination_account_id: UUID of destination Account model instance
        amount: Transfer amount as string (e.g., '10.00')
        authorization_id: Plaid authorization ID from stored TransferAuthorization
        description: Transfer description (max 10 characters - Plaid API limit)
        
    Returns:
        dict: Transfer response with 'transfer_id' and other details
        
    Raises:
        PlaidIntegrationError: If transfer creation fails
    """
    try:
        from apps.accounts.models import Account
        
        # Get source and destination accounts
        source_account = Account.objects.get(account_id=source_account_id, user=user)
        destination_account = Account.objects.get(account_id=destination_account_id, user=user)
        
        # Decrypt access tokens
        source_access_token = decrypt_token(source_account.plaid_access_token)
        
        client = get_plaid_client()
        
        # Create transfer using stored authorization
        try:
            from plaid.model.transfer_create_request import TransferCreateRequest
            from plaid.model.transfer_user_in_request import TransferUserInRequest
            from plaid.model.transfer_network import TransferNetwork
            from plaid.model.transfer_type import TransferType
            from plaid.model.ach_class import ACHClass
            
            # When using authorization_id, Plaid API only accepts these fields:
            # - access_token, account_id, authorization_id, amount, description
            # However, the SDK requires type, network, ach_class, user for object construction
            # We'll use a workaround: construct with all fields, convert to dict, remove unwanted fields,
            # then use the ApiClient's call_api method directly
            
            # Create user object (required by SDK for construction)
            transfer_user = TransferUserInRequest(
                legal_name=f"{user.first_name} {user.last_name}".strip() or user.email or "User",
                email_address=user.email
            )
            
            # Create request with all fields (SDK requires them for construction)
            transfer_request = TransferCreateRequest(
                access_token=source_access_token,
                account_id=source_account.plaid_account_id,
                authorization_id=authorization_id,
                type=TransferType('debit'),
                network=TransferNetwork('ach'),
                amount=amount,
                ach_class=ACHClass('ppd'),
                description=description[:10],  # Max 10 characters (Plaid API limit)
                user=transfer_user,
            )
            
            # Convert to dict and remove fields that API rejects when using authorization_id
            request_dict = transfer_request.to_dict()
            fields_to_remove = ['type', 'network', 'ach_class', 'user']
            for field in fields_to_remove:
                request_dict.pop(field, None)
            
            # Use requests library directly to make a raw HTTP call
            # This bypasses SDK validation issues with authorization_id
            import json
            import requests
            from plaid import Environment as PlaidEnvironment
            
            api_client = client.api_client
            
            # Get the base URL from the ApiClient configuration
            host = api_client.configuration.host
            if isinstance(host, PlaidEnvironment):
                # Plaid Environment enum - map to actual URLs
                env_to_url = {
                    PlaidEnvironment.Sandbox: 'https://sandbox.plaid.com',
                    PlaidEnvironment.Development: 'https://development.plaid.com',
                    PlaidEnvironment.Production: 'https://production.plaid.com',
                }
                base_url = env_to_url.get(host, 'https://sandbox.plaid.com')
            else:
                # Fallback to string value
                base_url = str(host) if not str(host).startswith('http') else str(host)
                if not base_url.startswith('http'):
                    base_url = f"https://{base_url}"
            
            # Prepare headers
            headers = {
                'Content-Type': 'application/json',
                'PLAID-CLIENT-ID': settings.PLAID_CLIENT_ID,
                'PLAID-SECRET': settings.PLAID_SECRET,
                'Plaid-Version': '2020-09-14',
            }
            
            # Make the HTTP request directly
            url = f"{base_url}/transfer/create"
            response = requests.post(
                url,
                headers=headers,
                json=request_dict,
                timeout=getattr(settings, 'PLAID_API_TIMEOUT', 30)
            )
            
            # Check for errors
            if response.status_code != 200:
                # Parse error response
                try:
                    error_body = response.json() if response.text else {}
                except (ValueError, json.JSONDecodeError):
                    # If response is not JSON, use the raw text
                    error_body = {'error_message': response.text or 'Unknown error'}
                
                # Extract error information (Plaid API structure)
                error_message = error_body.get('error_message', 'Unknown error')
                error_type = error_body.get('error_type', 'API_ERROR')
                error_code = error_body.get('error_code', 'UNKNOWN')
                
                # Some Plaid errors have nested error structure
                error_details = error_body.get('error', {})
                if isinstance(error_details, dict):
                    error_message = error_details.get('message', error_details.get('error_message', error_message))
                    error_type = error_details.get('type', error_details.get('error_type', error_type))
                    error_code = error_details.get('code', error_details.get('error_code', error_code))
                
                # Log detailed error
                logger.error(
                    f"Plaid API error ({response.status_code}): {error_type} - {error_message} "
                    f"(Code: {error_code})"
                )
                
                raise PlaidIntegrationError(
                    f"Failed to create transfer: {error_message} (Code: {error_code})"
                )
            
            # Parse successful response
            try:
                response_data = response.json()
            except (ValueError, json.JSONDecodeError) as exc:
                logger.error(f"Failed to parse Plaid transfer response as JSON: {exc}")
                raise PlaidIntegrationError("Failed to parse transfer response from Plaid API")
            
            # Extract transfer from response (response is already a dict from JSON)
            transfer = response_data.get('transfer', response_data)
            
            # Extract transfer fields
            transfer_id = transfer.get('id')
            transfer_amount = transfer.get('amount')
            transfer_status = transfer.get('status')
            transfer_created = transfer.get('created')
            
            if not transfer_id:
                logger.error(f"Transfer response missing 'id' field: {response_data}")
                raise PlaidIntegrationError("Transfer response missing required 'id' field")
            
            logger.info(f"Created transfer {transfer_id} for ${amount} from {source_account_id} to {destination_account_id}")
            
            return {
                'transfer_id': transfer_id,
                'amount': transfer_amount,
                'status': transfer_status,
                'created': transfer_created,
            }
            
        except ImportError as import_exc:
            logger.error(f"Transfer Create API not available: {import_exc}")
            raise PlaidIntegrationError("Transfer Create API not available in this Plaid SDK version")
        except ApiException as exc:
            logger.error("Plaid API error creating transfer: %s", exc)
            raise PlaidIntegrationError(
                f"Failed to create transfer: {exc.body}"
            ) from exc
        
    except Account.DoesNotExist:
        raise PlaidIntegrationError("Source or destination account not found")
    except ApiException as exc:
        logger.error("Plaid API error creating transfer: %s", exc)
        raise PlaidIntegrationError(
            f"Failed to create transfer: {exc.body}"
        ) from exc
    except Exception as exc:
        logger.error("Unexpected error creating transfer: %s", exc)
        raise PlaidIntegrationError("Failed to create transfer") from exc

