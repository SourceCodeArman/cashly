"""
Celery tasks for transactions app.
"""
from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone
from .recurring_detection import detect_recurring_transactions
from .transfer_detection import detect_transfers
from .plaid_utils import fetch_transactions, normalize_plaid_transaction
from apps.accounts.models import Account
from .models import Transaction
from .categorization import auto_categorize_transaction, apply_category_to_transaction
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def detect_all_users_recurring_transactions():
    """
    Periodic task to detect recurring transactions for all users.
    Run this daily or weekly.
    """
    logger.info("Starting recurring transaction detection for all users")
    
    users = User.objects.filter(is_active=True)
    total_detected = 0
    total_updated = 0
    
    for user in users:
        try:
            result = detect_recurring_transactions(
                user=user,
                min_occurrences=3,
                lookback_days=180
            )
            total_detected += len(result['detected'])
            total_updated += result['updated_count']
            logger.info(
                f"User {user.id}: Detected {len(result['detected'])} recurring groups, "
                f"marked {result['updated_count']} transactions"
            )
        except Exception as e:
            logger.error(f"Error detecting recurring for user {user.id}: {e}", exc_info=True)
    
    logger.info(
        f"Completed recurring detection: {total_detected} groups detected, "
        f"{total_updated} transactions marked across {users.count()} users"
    )
    
    return {
        'total_users': users.count(),
        'total_detected': total_detected,
        'total_updated': total_updated
    }


@shared_task
def detect_all_users_transfers():
    """
    Periodic task to detect transfers for all users.
    Run this daily.
    """
    logger.info("Starting transfer detection for all users")
    
    users = User.objects.filter(is_active=True)
    total_pairs = 0
    total_updated = 0
    
    for user in users:
        try:
            result = detect_transfers(
                user=user,
                lookback_days=30
            )
            total_pairs += len(result['matched_pairs'])
            total_updated += result['updated_count']
            logger.info(
                f"User {user.id}: Detected {len(result['matched_pairs'])} transfer pairs, "
                f"marked {result['updated_count']} transactions"
            )
        except Exception as e:
            logger.error(f"Error detecting transfers for user {user.id}: {e}", exc_info=True)
    
    logger.info(
        f"Completed transfer detection: {total_pairs} pairs detected, "
        f"{total_updated} transactions marked across {users.count()} users"
    )
    
    return {
        'total_users': users.count(),
        'total_pairs': total_pairs,
        'total_updated': total_updated
    }


@shared_task
def detect_user_recurring_transactions(user_id):
    """
    Detect recurring transactions for a specific user.
    Can be triggered on-demand or after new transactions are synced.
    """
    try:
        user = User.objects.get(id=user_id)
        result = detect_recurring_transactions(
            user=user,
            min_occurrences=3,
            lookback_days=180
        )
        logger.info(
            f"User {user_id}: Detected {len(result['detected'])} recurring groups, "
            f"marked {result['updated_count']} transactions"
        )
        return result
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error detecting recurring for user {user_id}: {e}", exc_info=True)
        return None


@shared_task
def detect_user_transfers(user_id):
    """
    Detect transfers for a specific user.
    Can be triggered on-demand or after new transactions are synced.
    """
    try:
        user = User.objects.get(id=user_id)
        result = detect_transfers(
            user=user,
            lookback_days=30
        )
        logger.info(
            f"User {user_id}: Detected {len(result['matched_pairs'])} transfer pairs, "
            f"marked {result['updated_count']} transactions"
        )
        return result
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return None
    except Exception as e:
        logger.error(f"Error detecting transfers for user {user_id}: {e}", exc_info=True)
        return None

@shared_task
def sync_account_transactions(account_id):
    """
    Sync transactions for a specific account.
    """
    try:
        account = Account.objects.get(account_id=account_id)
        user = account.user
        
        # 1. Fetch transactions from Plaid
        plaid_transactions = fetch_transactions(account)
        
        # 2. Normalize and save
        created_count = 0
        updated_count = 0
        
        for p_txn in plaid_transactions:
            normalized = normalize_plaid_transaction(p_txn, account, user)
            
            # Use get_or_create/update_or_create logic
            txn, created = Transaction.objects.update_or_create(
                plaid_transaction_id=normalized['plaid_transaction_id'],
                defaults=normalized
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        # 3. Categorize new/updated transactions
        # We iterate over uncategorized transactions for this account
        uncategorized = Transaction.objects.filter(
            account=account, 
            category__isnull=True
        )
        for txn in uncategorized:
            category = auto_categorize_transaction(txn)
            if category:
                apply_category_to_transaction(txn, category)
        
        # 4. Trigger post-sync detection
        detect_user_recurring_transactions.delay(user.id)
        detect_user_transfers.delay(user.id)
        
        # Update account last_synced_at
        account.last_synced_at = timezone.now()
        account.save(update_fields=['last_synced_at'])
        
        logger.info(
            f"Synced account {account_id}: {created_count} created, {updated_count} updated."
        )
        
        return {
            'account_id': account_id,
            'created': created_count,
            'updated': updated_count
        }

    except Account.DoesNotExist:
        logger.error(f"Account {account_id} not found for sync.")
    except Exception as e:
        logger.error(f"Error syncing account {account_id}: {e}", exc_info=True)
