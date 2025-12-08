"""
Django signals for goals app.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.transactions.models import Transaction

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Transaction)
def process_savings_rules_on_transaction_save(sender, instance, created, **kwargs):
    """
    Process savings rules when a transaction is created or updated.
    
    Only processes if:
    - Transaction was just created (not updated)
    - Transaction has a user
    - Transaction is not a transfer
    """
    # Only process new transactions
    if not created:
        return
    
    # Skip if transaction is a transfer
    if instance.is_transfer:
        return
    
    # Skip if no user
    if not instance.user:
        return
    
    try:
        from .services import process_savings_rules_for_transaction
        contributions = process_savings_rules_for_transaction(instance)
        
        if contributions:
            logger.info(
                f"Processed {len(contributions)} savings contributions "
                f"for transaction {instance.transaction_id}"
            )
    except Exception as e:
        logger.error(
            f"Error processing savings rules for transaction {instance.transaction_id}: {e}",
            exc_info=True
        )

