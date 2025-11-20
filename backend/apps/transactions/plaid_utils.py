"""
Plaid utility functions for transaction fetching and normalization.
"""
import json
from datetime import date, datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from django.conf import settings
from plaid.exceptions import ApiException
from pathlib import Path

from apps.accounts.plaid_config import get_plaid_client
from apps.accounts.plaid_utils import PlaidIntegrationError, decrypt_token
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
import logging

logger = logging.getLogger(__name__)


def _save_plaid_response_to_file(response_dict, account, start_date, end_date):
    """
    Save Plaid response to a JSON file for debugging.
    
    Args:
        response_dict: Dictionary representation of the Plaid response
        account: Account instance
        start_date: Start date used in the request
        end_date: End date used in the request
    """
    try:
        # Create logs/plaid_responses directory if it doesn't exist
        logs_dir = Path(__file__).parent.parent.parent / 'logs' / 'plaid_responses'
        logs_dir.mkdir(parents=True, exist_ok=True)
        
        # Create filename with account ID and timestamp
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        account_id_str = str(account.account_id).replace('-', '_')
        filename = f"plaid_response_{account_id_str}_{timestamp}.json"
        filepath = logs_dir / filename
        
        # Prepare data to save
        data_to_save = {
            'account_id': str(account.account_id),
            'plaid_account_id': account.plaid_account_id,
            'institution_name': account.institution_name,
            'request_date_range': {
                'start_date': str(start_date),
                'end_date': str(end_date),
            },
            'timestamp': timezone.now().isoformat(),
            'response': response_dict,
        }
        
        # Save to file with pretty formatting
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data_to_save, f, indent=2, default=str, ensure_ascii=False)
        
        logger.info(f"Saved Plaid response to {filepath}")
        print(f"Saved Plaid response to {filepath}")
    except Exception as e:
        logger.error(f"Failed to save Plaid response to file: {str(e)}", exc_info=True)


def fetch_transactions(account, start_date=None, end_date=None):
    """
    Fetch transactions from Plaid for a given account.
    
    Args:
        account: Account instance
        start_date: Start date for transaction fetch (default: 90 days ago)
        end_date: End date for transaction fetch (default: today)
        
    Returns:
        list: List of transaction dictionaries
    """
    try:
        client = get_plaid_client()
        access_token = decrypt_token(account.plaid_access_token)
        
        # Default to last 90 days if not specified
        if not start_date:
            start_date = (timezone.now() - timedelta(days=90)).date()
        if not end_date:
            end_date = timezone.now().date()
        
        # Ensure dates are Python date objects (not strings or datetime objects)
        if isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        elif isinstance(start_date, datetime):
            start_date = start_date.date()
        elif not isinstance(start_date, date):
            raise ValueError(f"Invalid start_date type: {type(start_date)}")
        
        if isinstance(end_date, str):
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        elif isinstance(end_date, datetime):
            end_date = end_date.date()
        elif not isinstance(end_date, date):
            raise ValueError(f"Invalid end_date type: {type(end_date)}")
        
        # Plaid SDK expects Python date objects, not strings
        request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,  # Pass date object directly
            end_date=end_date,       # Pass date object directly
            options=TransactionsGetRequestOptions(
                account_ids=[account.plaid_account_id] if account.plaid_account_id and account.plaid_account_id != 'temp' else None
            )
        )
        
        # Always save response for debugging (can be disabled via settings)
        save_responses = getattr(settings, 'PLAID_SAVE_RESPONSES', True)
        is_initial_connection = account.last_synced_at is None
        
        if is_initial_connection:
            print(f"[PLAID DEBUG] Request: {request}")
        
        response = client.transactions_get(request)
        response_dict = response.to_dict()
        
        # Save response to file for debugging (always on initial, configurable for subsequent syncs)
        if save_responses or is_initial_connection:
            _save_plaid_response_to_file(response_dict, account, start_date, end_date)
            if is_initial_connection:
                print(f"[PLAID DEBUG] Response: {response}")
                print(f"[PLAID DEBUG] Response dict: {response_dict}")
        
        transactions = response_dict.get('transactions', [])
        
        # Log sample transaction with category data for debugging
        if transactions and len(transactions) > 0:
            sample_txn = transactions[0]
            personal_finance_category = sample_txn.get('personal_finance_category')
            logger.info(
                f"[PLAID DEBUG] Sample transaction from Plaid:\n"
                f"  Merchant: {sample_txn.get('merchant_name') or sample_txn.get('name', 'Unknown')}\n"
                f"  Amount: {sample_txn.get('amount')}\n"
                f"  Personal Finance Category: {personal_finance_category}\n"
                f"  Category (legacy): {sample_txn.get('category')}\n"
                f"  Transaction Code: {sample_txn.get('transaction_code')}\n"
                f"  Transaction Type: {sample_txn.get('transaction_type')}"
            )
            print(
                f"\n[PLAID DEBUG] Sample transaction:\n"
                f"  Merchant: {sample_txn.get('merchant_name') or sample_txn.get('name', 'Unknown')}\n"
                f"  Amount: {sample_txn.get('amount')}\n"
                f"  Personal Finance Category: {json.dumps(personal_finance_category, default=str, indent=2) if personal_finance_category else 'None'}\n"
            )
        
        # Handle pagination if needed
        total_transactions = response_dict.get('total_transactions', len(transactions))
        # logger.info(f"Fetched {len(transactions)} of {total_transactions} transactions for account {account.account_id}")
        
        # Debug: Log first transaction structure if available
        if transactions and len(transactions) > 0:
            logger.debug(f"Sample transaction structure: {list(transactions[0].keys())}")
            logger.debug(f"Sample transaction_id: {transactions[0].get('transaction_id', 'MISSING')}")
        
        while len(transactions) < total_transactions:
            request = TransactionsGetRequest(
                access_token=access_token,
                start_date=start_date,  # Pass date object directly
                end_date=end_date,       # Pass date object directly
                options=TransactionsGetRequestOptions(
                    account_ids=[account.plaid_account_id] if account.plaid_account_id and account.plaid_account_id != 'temp' else None,
                    offset=len(transactions)
                )
            )
            paginated_response = client.transactions_get(request)
            paginated_dict = paginated_response.to_dict()
            transactions.extend(paginated_dict.get('transactions', []))
            logger.debug(f"Fetched {len(transactions)} of {total_transactions} transactions (paginated)")
        
        # logger.info(f"Total transactions fetched: {len(transactions)} for account {account.account_id}")
        return transactions
    except ApiException as exc:
        logger.error(f"Plaid API error fetching transactions for account {account.account_id}: {exc}")
        # Parse Plaid error response to extract error code and type
        error_code = None
        error_type = None
        error_message = str(exc.body) if exc.body else "Unknown Plaid error"
        
        try:
            import json
            if exc.body:
                error_body = json.loads(exc.body) if isinstance(exc.body, str) else exc.body
                error_code = error_body.get('error_code')
                error_type = error_body.get('error_type')
                error_message = error_body.get('error_message', error_message)
        except (json.JSONDecodeError, AttributeError, TypeError):
            pass
        
        raise PlaidIntegrationError(
            f"Failed to fetch transactions: {error_message}",
            error_code=error_code,
            error_type=error_type
        ) from exc
    except Exception as e:
        logger.error(f"Error fetching transactions for account {account.account_id}: {str(e)}", exc_info=True)
        raise PlaidIntegrationError("Failed to fetch transactions") from e


def normalize_plaid_transaction(plaid_transaction, account, user):
    """
    Normalize Plaid transaction format to our Transaction model format.
    
    Args:
        plaid_transaction: Transaction dict from Plaid API
        account: Account instance
        user: User instance
        
    Returns:
        dict: Normalized transaction data
    """
    try:
        # Extract amount from Plaid
        # Plaid amounts are always positive, we determine income/expense from transaction_code
        # or transaction_type field
        plaid_amount = Decimal(str(plaid_transaction.get('amount', 0)))
        transaction_code = (plaid_transaction.get('transaction_code') or '').lower()
        transaction_type = (plaid_transaction.get('transaction_type') or '').lower()
        
        # Extract merchant name first (used in fallback logic)
        merchant_name = plaid_transaction.get('merchant_name') or plaid_transaction.get('name', 'Unknown')
        merchant_name_lower = merchant_name.lower()
        
        # Determine if this is income (credit) or expense (debit)
        # Credits are income (positive), debits are expenses (negative)
        # Check transaction_code first (most reliable)
        if transaction_code == 'credit':
            # Income: money coming in
            amount = abs(plaid_amount)
        elif transaction_code == 'debit':
            # Expense: money going out
            amount = -abs(plaid_amount)
        # Check transaction_type as secondary indicator
        elif 'credit' in transaction_type or transaction_type in ['depository_credit', 'special_credit']:
            amount = abs(plaid_amount)  # Income
        elif 'debit' in transaction_type or transaction_type in ['depository_debit', 'special_debit']:
            amount = -abs(plaid_amount)  # Expense
        else:
            # Fallback: use merchant name patterns and account context
            # Common income patterns in merchant names/descriptions
            income_keywords = ['deposit', 'payroll', 'salary', 'payment received', 
                             'transfer in', 'direct deposit', 'refund', 'credit', 
                             'deposited', 'ach credit', 'wire transfer']
            
            # Common expense patterns
            expense_keywords = ['purchase', 'payment', 'withdrawal', 'debit', 
                              'charge', 'fee', 'transfer out']
            
            has_income_keyword = any(keyword in merchant_name_lower for keyword in income_keywords)
            has_expense_keyword = any(keyword in merchant_name_lower for keyword in expense_keywords)
            
            if has_income_keyword and not has_expense_keyword:
                amount = abs(plaid_amount)  # Income
            elif has_expense_keyword and not has_income_keyword:
                amount = -abs(plaid_amount)  # Expense
            else:
                # Last resort: default to expense if unclear
                # This is safer as most transactions are expenses
                # But log a warning so we can improve the logic
                logger.warning(
                    f"Could not determine transaction type for {merchant_name} "
                    f"(code: {transaction_code}, type: {transaction_type}), defaulting to expense"
                )
                amount = -abs(plaid_amount)  # Expense (default)
        
        # Extract date - Plaid may return date objects or strings
        date_value = plaid_transaction.get('date')
        if date_value:
            if isinstance(date_value, date):
                # Already a date object
                transaction_date = date_value
            elif isinstance(date_value, datetime):
                # Convert datetime to date
                transaction_date = date_value.date()
            elif isinstance(date_value, str):
                # Parse string to date
                transaction_date = datetime.strptime(date_value, '%Y-%m-%d').date()
            else:
                # Unknown type, use current date
                logger.warning(f"Unexpected date type {type(date_value)} for transaction {plaid_transaction.get('transaction_id')}, using current date")
                transaction_date = timezone.now().date()
        else:
            transaction_date = timezone.now().date()
        
        # Extract location if available
        location = {}
        if plaid_transaction.get('location'):
            loc = plaid_transaction['location']
            location = {
                'latitude': loc.get('lat'),
                'longitude': loc.get('lon'),
                'address': loc.get('address'),
                'city': loc.get('city'),
                'region': loc.get('region'),
                'postal_code': loc.get('postal_code'),
                'country': loc.get('country'),
            }
        
        # Check if it's a transfer
        is_transfer = plaid_transaction.get('transaction_type') == 'special' or \
                     plaid_transaction.get('category', []) == ['Transfer']
        
        # Extract Plaid personal finance category
        plaid_category = {}
        personal_finance_category = plaid_transaction.get('personal_finance_category')
        if personal_finance_category:
            # Handle both dict format and object format from Plaid SDK
            if isinstance(personal_finance_category, dict):
                plaid_category = {
                    'primary': personal_finance_category.get('primary'),
                    'detailed': personal_finance_category.get('detailed'),
                }
            else:
                # Plaid SDK object format (has attributes)
                try:
                    plaid_category = {
                        'primary': getattr(personal_finance_category, 'primary', None),
                        'detailed': getattr(personal_finance_category, 'detailed', None),
                    }
                except AttributeError:
                    # Fallback: try to convert to dict
                    try:
                        plaid_category_dict = personal_finance_category.to_dict() if hasattr(personal_finance_category, 'to_dict') else {}
                        plaid_category = {
                            'primary': plaid_category_dict.get('primary'),
                            'detailed': plaid_category_dict.get('detailed'),
                        }
                    except Exception:
                        logger.debug(f"Could not extract Plaid category from transaction {plaid_transaction.get('transaction_id')}")
                        plaid_category = {}
        
        # Remove None values
        plaid_category = {k: v for k, v in plaid_category.items() if v is not None}
        
        normalized = {
            'account': account,
            'user': user,
            'amount': amount,
            'date': transaction_date,
            'merchant_name': merchant_name[:200],  # Ensure it fits in CharField
            'description': plaid_transaction.get('name', ''),
            'plaid_transaction_id': plaid_transaction.get('transaction_id'),
            'is_transfer': is_transfer,
            'is_recurring': False,  # Will be determined later
            'location': location,
            'plaid_category': plaid_category if plaid_category else None,
            'category': None,  # Will be assigned later
        }
        
        return normalized
    except Exception as e:
        logger.error(f"Error normalizing transaction: {str(e)}")
        raise PlaidIntegrationError("Failed to normalize transaction") from e

