"""
Celery tasks for transaction processing.
"""
import json
from collections import defaultdict
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from django.db import transaction as db_transaction
from apps.accounts.models import Account
from apps.accounts.plaid_service import PlaidService
from apps.accounts.plaid_utils import PlaidIntegrationError
from apps.transactions.models import Transaction, Category
from apps.transactions.plaid_utils import fetch_transactions, normalize_plaid_transaction
from apps.transactions.categorization import auto_categorize_transaction, apply_category_to_transaction
from apps.transactions.plaid_category_mapper import (
    PLAID_DETAILED_CATEGORY_MAPPING,
    PLAID_PRIMARY_CATEGORY_MAPPING,
)
import logging

logger = logging.getLogger(__name__)


def _sync_account_transactions_impl(account_id):
    """
    Optimized implementation of account transaction sync using batch operations.
    Groups transactions by category and uses bulk_create/bulk_update for performance.
    
    Args:
        account_id: UUID of the Account to sync
        
    Returns:
        dict: Sync result with counts
    """
    account = Account.objects.get(account_id=account_id)
    
    # Determine date range for incremental sync (fallback to 90 days)
    start_date = None
    if account.last_synced_at:
        start_date = (account.last_synced_at - timezone.timedelta(days=2)).date()
    else:
        # For initial sync, fetch last 90 days
        start_date = (timezone.now() - timezone.timedelta(days=90)).date()
    end_date = timezone.now().date()
    
    # logger.info(f"Starting transaction sync for account {account_id} from {start_date} to {end_date}")
    
    # Fetch all transactions from Plaid
    plaid_transactions = fetch_transactions(account, start_date=start_date, end_date=end_date)
    # print(f"Plaid transactions: {plaid_transactions}")
    # logger.info(f"Fetched {len(plaid_transactions)} transactions from Plaid")
    
    # Update account sync timestamp even if no transactions
    # This ensures the frontend knows the sync completed
    account.last_synced_at = timezone.now()
    account.error_code = None
    account.error_message = None
    account.last_error_at = None
    account.save(update_fields=['last_synced_at', 'error_code', 'error_message', 'last_error_at'])
    
    if not plaid_transactions:
        logger.info(f"No transactions to sync for account {account_id}")
        return {
            'account_id': str(account_id),
            'created': 0,
            'updated': 0,
            'errors': 0,
            'total_processed': 0,
        }
    
    # Get all Plaid transaction IDs
    plaid_transaction_ids = [
        txn.get('transaction_id') 
        for txn in plaid_transactions 
        if txn.get('transaction_id')
    ]
    
    # Fetch existing transactions in one query
    existing_transactions = {
        t.plaid_transaction_id: t
        for t in Transaction.objects.filter(
            plaid_transaction_id__in=plaid_transaction_ids
        ).select_related('category')
    }
    
    # Prefetch all categories for the user (one query instead of many)
    categories_by_name_type = {}
    for cat in Category.objects.for_user(account.user):
        key = (cat.name, cat.type)
        if key not in categories_by_name_type:
            categories_by_name_type[key] = cat
    
    # Get default "Other" categories
    other_expense = categories_by_name_type.get(('Other Expenses', 'expense'))
    other_income = categories_by_name_type.get(('Other Income', 'income'))
    
    # Group transactions by category for bulk operations
    transactions_by_category = defaultdict(lambda: {'create': [], 'update': []})
    uncategorized_transactions = {'create': [], 'update': []}
    
    created_count = 0
    updated_count = 0
    error_count = 0
    overwrite_existing = getattr(settings, 'PLAID_CATEGORIZATION_OVERWRITE_EXISTING', False)
    plaid_auto_categorize = getattr(settings, 'PLAID_AUTO_CATEGORIZE_ON_SYNC', True)
    
    # Process all transactions in memory
    for plaid_txn in plaid_transactions:
        try:
            # Normalize transaction data
            normalized_data = normalize_plaid_transaction(
                plaid_txn,
                account,
                account.user
            )
            # print(f"Normalized data: {normalized_data}")
            
            plaid_transaction_id = normalized_data.pop('plaid_transaction_id')
            if not plaid_transaction_id:
                logger.warning(f"Skipping transaction without Plaid ID: {plaid_txn.get('name', 'Unknown')}")
                error_count += 1
                continue
            
            # Check if transaction already exists
            existing_txn = existing_transactions.get(plaid_transaction_id)
            is_create = existing_txn is None
            
            # Skip user-modified transactions if overwrite is disabled
            if existing_txn and existing_txn.user_modified and not overwrite_existing:
                logger.debug(f"Skipping user-modified transaction {plaid_transaction_id}")
                continue
            
            # Map Plaid category to system category (in memory, no DB queries)
            plaid_category = normalized_data.get('plaid_category')
            system_category = None

            # Determine transaction type first (needed for fallback)
            transaction_type = 'expense' if normalized_data['amount'] < 0 else 'income'

            # DEBUG: Log raw Plaid transaction data for first few transactions
            merchant_name = normalized_data.get('merchant_name', 'Unknown')
            if created_count + updated_count < 5:  # Log first 5 transactions
                logger.info(
                    f"[PLAID RAW DATA] Transaction #{created_count + updated_count + 1}:\n"
                    f"  Merchant: {merchant_name}\n"
                    f"  Amount: {normalized_data['amount']}\n"
                    f"  Transaction Type (from amount): {transaction_type}\n"
                    f"  Plaid Category (normalized): {plaid_category}\n"
                    f"  Raw Plaid Transaction: {json.dumps(plaid_txn, default=str, indent=2) if created_count + updated_count < 2 else '...'}"
                )

            # Check if Plaid category exists and has data
            has_plaid_category = (
                plaid_category and 
                isinstance(plaid_category, dict) and 
                (plaid_category.get('primary') or plaid_category.get('detailed'))
            )

            if plaid_auto_categorize and has_plaid_category:
                # Map category using cached mapping dictionaries
                primary = plaid_category.get('primary')
                detailed = plaid_category.get('detailed')
                
                category_name = None
                mapped_type = None
                
                # Try detailed category first (more specific)
                if detailed and detailed in PLAID_DETAILED_CATEGORY_MAPPING:
                    category_name, mapped_type = PLAID_DETAILED_CATEGORY_MAPPING[detailed]
                    logger.info(
                        f"[CATEGORIZATION] Found detailed mapping: {detailed} -> {category_name} ({mapped_type}) "
                        f"for transaction: {normalized_data.get('merchant_name', 'Unknown')}, "
                        f"amount: {normalized_data['amount']}, transaction_type: {transaction_type}"
                    )
                # Fall back to primary category
                elif primary and primary in PLAID_PRIMARY_CATEGORY_MAPPING:
                    category_name, mapped_type = PLAID_PRIMARY_CATEGORY_MAPPING[primary]
                    logger.info(
                        f"[CATEGORIZATION] Found primary mapping: {primary} -> {category_name} ({mapped_type}) "
                        f"for transaction: {normalized_data.get('merchant_name', 'Unknown')}, "
                        f"amount: {normalized_data['amount']}, transaction_type: {transaction_type}"
                    )
                else:
                    logger.warning(
                        f"[CATEGORIZATION] No mapping found for Plaid category: primary={primary}, detailed={detailed} "
                        f"for transaction: {normalized_data.get('merchant_name', 'Unknown')}"
                    )
                
                # Use mapped_type from Plaid category mapping
                if category_name and mapped_type:
                    category_type = mapped_type
                    
                    # Get category from cache using the mapped type
                    system_category = categories_by_name_type.get((category_name, category_type))
                    
                    if system_category:
                        logger.info(
                            f"[CATEGORIZATION] ✓ Successfully mapped '{normalized_data.get('merchant_name', 'Unknown')}' "
                            f"to category: {category_name} ({category_type})"
                        )
                    else:
                        logger.error(
                            f"[CATEGORIZATION] ✗ Category '{category_name}' ({category_type}) NOT FOUND in cache! "
                            f"Transaction: {normalized_data.get('merchant_name', 'Unknown')}, "
                            f"Plaid: primary={primary}, detailed={detailed}. "
                            f"Available categories: {sorted(list(categories_by_name_type.keys()))}"
                        )
                elif category_name:
                    # Category name found but no mapped_type (shouldn't happen, but handle it)
                    category_type = transaction_type
                    system_category = categories_by_name_type.get((category_name, category_type))
                    if not system_category:
                        logger.warning(
                            f"[CATEGORIZATION] Category '{category_name}' ({category_type}) not found in cache "
                            f"(no mapped_type available)"
                        )
            elif plaid_auto_categorize:
                # Plaid auto-categorize is enabled but no Plaid category data
                logger.warning(
                    f"[CATEGORIZATION] No Plaid category data for transaction: {normalized_data.get('merchant_name', 'Unknown')}, "
                    f"plaid_category: {plaid_category}"
                        )

            # ALWAYS assign a default category if none was found
            if not system_category:
                logger.warning(
                    f"[CATEGORIZATION] Using DEFAULT category '{'Other Expenses' if transaction_type == 'expense' else 'Other Income'}' "
                    f"for transaction: {normalized_data.get('merchant_name', 'Unknown')}, "
                    f"type: {transaction_type}, Plaid category: {plaid_category}"
                )
                system_category = other_expense if transaction_type == 'expense' else other_income
                if not system_category:
                    # Log error if default categories don't exist
                    logger.error(
                        f"[CATEGORIZATION] ✗ Default 'Other Expenses'/'Other Income' category not found for {transaction_type}. "
                        f"Please run 'python manage.py create_system_categories'"
                    )

            # Assign category to normalized data
            if system_category:
                normalized_data['category'] = system_category
            else:
                logger.warning(
                    f"Could not assign category to transaction {plaid_transaction_id}. "
                    f"Transaction type: {transaction_type}, Plaid category: {plaid_category}"
                )
            
            # Prepare transaction for bulk operation
            if is_create:
                # Create new Transaction object
                transaction = Transaction(**normalized_data)
                if system_category:
                    transactions_by_category[system_category]['create'].append(transaction)
                else:
                    uncategorized_transactions['create'].append(transaction)
            else:
                # Update existing transaction
                # Only update if overwrite is enabled or transaction has no category
                if overwrite_existing or not existing_txn.category:
                    for field, value in normalized_data.items():
                        setattr(existing_txn, field, value)
                    
                    if system_category:
                        transactions_by_category[system_category]['update'].append(existing_txn)
                    else:
                        uncategorized_transactions['update'].append(existing_txn)
                    
        except Exception as e:
            logger.error(f"Error processing transaction: {str(e)}", exc_info=True)
            error_count += 1
            continue
    
    # Bulk save transactions grouped by category
    with db_transaction.atomic():
        # Bulk create new transactions by category
        for category, groups in transactions_by_category.items():
            # print(f"Processing category: {category.name} ({groups['create'][0]})")
            # print(f"Number of transactions to create: {len(groups['create'])}")
            # print(f"Number of transactions to update: {len(groups['update'])}")
            # print(f"Number of uncategorized transactions to create: {len(uncategorized_transactions['create'])}")
            # print(f"Number of uncategorized transactions to update: {len(uncategorized_transactions['update'])}")
            # print(f"Number of errors: {error_count}")
            # print(f"Number of created transactions: {created_count}")
            # print(f"Number of updated transactions: {updated_count}")
            if groups['create']:
                # Log Plaid category information for this batch
                sample_plaid_categories = []
                for txn in groups['create'][:3]:  # Sample first 3 transactions
                    plaid_cat = getattr(txn, 'plaid_category', None) or {}
                    if plaid_cat:
                        primary = plaid_cat.get('primary', 'N/A')
                        detailed = plaid_cat.get('detailed', 'N/A')
                        sample_plaid_categories.append(f"{primary}/{detailed}")
                
                plaid_info = f" | Plaid categories: {', '.join(sample_plaid_categories) if sample_plaid_categories else 'None'}"
                Transaction.objects.bulk_create(
                    groups['create'],
                    batch_size=100,
                    ignore_conflicts=False
                )
                created_count += len(groups['create'])
                logger.info(
                    f"Bulk created {len(groups['create'])} transactions for category '{category.name}' ({category.type})"
                    f"{plaid_info}"
                )
            
            if groups['update']:
                # Log Plaid category information for this batch
                sample_plaid_categories = []
                for txn in groups['update'][:3]:  # Sample first 3 transactions
                    plaid_cat = getattr(txn, 'plaid_category', None) or {}
                    if plaid_cat:
                        primary = plaid_cat.get('primary', 'N/A')
                        detailed = plaid_cat.get('detailed', 'N/A')
                        sample_plaid_categories.append(f"{primary}/{detailed}")
                
                plaid_info = f" | Plaid categories: {', '.join(sample_plaid_categories) if sample_plaid_categories else 'None'}"
                Transaction.objects.bulk_update(
                    groups['update'],
                    ['amount', 'date', 'merchant_name', 'description', 'plaid_category', 'category', 'location', 'is_transfer', 'is_recurring'],
                    batch_size=100
                )
                updated_count += len(groups['update'])
                logger.info(
                    f"Bulk updated {len(groups['update'])} transactions for category '{category.name}' ({category.type})"
                    f"{plaid_info}"
                )
        
        # Handle uncategorized transactions
        if uncategorized_transactions['create']:
            # Log Plaid category information for uncategorized batch
            sample_plaid_categories = []
            for txn in uncategorized_transactions['create'][:3]:  # Sample first 3 transactions
                plaid_cat = getattr(txn, 'plaid_category', None) or {}
                if plaid_cat:
                    primary = plaid_cat.get('primary', 'N/A')
                    detailed = plaid_cat.get('detailed', 'N/A')
                    sample_plaid_categories.append(f"{primary}/{detailed}")
                else:
                    sample_plaid_categories.append("No Plaid category")
            
            plaid_info = f" | Plaid categories: {', '.join(sample_plaid_categories) if sample_plaid_categories else 'None'}"
            Transaction.objects.bulk_create(
                uncategorized_transactions['create'],
                batch_size=100
            )
            created_count += len(uncategorized_transactions['create'])
            logger.warning(
                f"Bulk created {len(uncategorized_transactions['create'])} uncategorized transactions"
                f"{plaid_info}"
            )
        
        if uncategorized_transactions['update']:
            # Log Plaid category information for uncategorized batch
            sample_plaid_categories = []
            for txn in uncategorized_transactions['update'][:3]:  # Sample first 3 transactions
                plaid_cat = getattr(txn, 'plaid_category', None) or {}
                if plaid_cat:
                    primary = plaid_cat.get('primary', 'N/A')
                    detailed = plaid_cat.get('detailed', 'N/A')
                    sample_plaid_categories.append(f"{primary}/{detailed}")
                else:
                    sample_plaid_categories.append("No Plaid category")
            
            plaid_info = f" | Plaid categories: {', '.join(sample_plaid_categories) if sample_plaid_categories else 'None'}"
            Transaction.objects.bulk_update(
                uncategorized_transactions['update'],
                ['amount', 'date', 'merchant_name', 'description', 'plaid_category', 'location', 'is_transfer', 'is_recurring'],
                batch_size=100
            )
            updated_count += len(uncategorized_transactions['update'])
            logger.warning(
                f"Bulk updated {len(uncategorized_transactions['update'])} uncategorized transactions"
                f"{plaid_info}"
            )
    
    # Queue AI categorization for uncategorized transactions if enabled
    # This runs asynchronously to avoid blocking the sync
    if (getattr(settings, 'AI_AUTO_CATEGORIZE_ON_SYNC', True) and 
        getattr(settings, 'AI_CATEGORIZATION_ENABLED', True)):
        # Count uncategorized transactions that need AI categorization
        uncategorized_count = (
            len(uncategorized_transactions['create']) + 
            len(uncategorized_transactions['update'])
        )
        
        if uncategorized_count > 0:
            # Query for uncategorized transactions after bulk operations
            # This ensures we get the actual database records with IDs
            uncategorized_txns = Transaction.objects.filter(
                account=account,
                category__isnull=True,
                plaid_category__isnull=False
            ).exclude(plaid_category={}).exclude(user_modified=True)
            
            # Note: AI categorization can be handled as a separate async task
            # For now, we'll just log that they need categorization
            logger.debug(f"{uncategorized_count} transactions may need AI categorization")
    
    # Process transactions for goals (after bulk operations)
    # Fetch transactions that were created/updated and might contribute to goals
    try:
        from apps.goals.tasks import process_transaction_for_goals_task
        
        # Get transaction IDs that were created or updated
        # Query for transactions in the date range that were just synced
        transactions_for_goals = Transaction.objects.filter(
            account=account,
            date__gte=start_date,
            date__lte=end_date,
            amount__gt=0,  # Only income transactions contribute to goals
            category__isnull=False  # Only transactions with categories can contribute
        )
        
        # Process each transaction asynchronously for goals
        goal_processing_count = 0
        for transaction in transactions_for_goals:
            try:
                process_transaction_for_goals_task.delay(str(transaction.transaction_id))
                goal_processing_count += 1
            except Exception as e:
                logger.error(f"Error queueing transaction {transaction.transaction_id} for goal processing: {str(e)}")
        
        if goal_processing_count > 0:
            logger.info(f"Queued {goal_processing_count} transactions for goal processing")
    except Exception as e:
        logger.error(f"Error processing transactions for goals: {str(e)}", exc_info=True)
    
    # Update account sync timestamp
    account.last_synced_at = timezone.now()
    account.error_code = None
    account.error_message = None
    account.last_error_at = None
    account.save(update_fields=['last_synced_at', 'error_code', 'error_message', 'last_error_at'])

    # Refresh balances from Plaid Accounts endpoint
    try:
        service = PlaidService(account)
        balances = service.fetch_balances()
        for balance in balances.get('accounts', []):
            if balance.get('account_id') == account.plaid_account_id:
                account.balance = balance.get('balances', {}).get('current') or account.balance
                account.currency = balance.get('balances', {}).get('iso_currency_code') or account.currency
                account.save(update_fields=['balance', 'currency'])
                break
    except PlaidIntegrationError as exc:
        logger.warning(f"Unable to refresh balances for account {account_id}: {str(exc)}")
    
    result = {
        'account_id': str(account_id),
        'created': created_count,
        'updated': updated_count,
        'errors': error_count,
        'total_processed': len(plaid_transactions),
    }
    
    logger.info(f"Sync completed for account {account_id}: {result}")
    return result


@shared_task(bind=True, max_retries=3)
def sync_account_transactions(self, account_id):
    """
    Celery task wrapper for syncing account transactions.
    """
    try:
        return _sync_account_transactions_impl(account_id)
    except Account.DoesNotExist:
        logger.error(f"Account {account_id} not found")
        raise
    except PlaidIntegrationError as exc:
        logger.error(f"Plaid error syncing account {account_id}: {str(exc)}")
        account = Account.objects.filter(account_id=account_id).first()
        if account:
            error_code = getattr(exc, 'code', 'PLAID_ERROR')
            account.error_code = error_code
            account.error_message = str(exc)
            account.last_error_at = timezone.now()
            
            # If the Plaid item was not found (removed or access revoked), deactivate the account
            if error_code == 'ITEM_NOT_FOUND':
                logger.warning(
                    f"Plaid item not found for account {account_id}. "
                    "This usually means the item was removed or access was revoked. Deactivating account."
                )
                account.is_active = False
                account.error_message = (
                    "This account connection is no longer valid. "
                    "The bank account was disconnected or access was revoked. "
                    "Please reconnect the account to continue syncing."
                )
                account.save(update_fields=['error_code', 'error_message', 'last_error_at', 'is_active'])
                # Return gracefully instead of raising - the account is handled
                return {
                    'account_id': str(account_id),
                    'created': 0,
                    'updated': 0,
                    'errors': 1,
                    'total_processed': 0,
                    'error': 'ITEM_NOT_FOUND',
                    'message': 'Account deactivated due to invalid Plaid connection'
                }
            
            account.save(update_fields=['error_code', 'error_message', 'last_error_at', 'is_active'])
        # Don't retry Plaid errors - they're usually permanent
        raise
    except Exception as e:
        # Retry with exponential backoff for other errors
        logger.error(f"Retriable error syncing account {account_id}: {str(e)}", exc_info=True)
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))

