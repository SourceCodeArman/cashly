"""
Celery tasks for subscription operations.
"""
import logging
from celery import shared_task
from django.utils import timezone

from .models import PendingSubscription, Subscription
from .stripe_service import (
    create_stripe_customer,
    attach_payment_method_to_customer,
    create_subscription,
    get_subscription,
    StripeIntegrationError,
)
from .webhook_handlers import process_pending_subscriptions

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def process_pending_subscriptions_task(self):
    """
    Process pending subscriptions when Stripe is back online.
    Runs every 5 minutes (configured in Celery beat schedule).
    """
    try:
        process_pending_subscriptions()
        return {"status": "success", "processed": True}
    except Exception as exc:
        logger.error(f"Error processing pending subscriptions: {exc}", exc_info=True)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def sync_subscription_from_stripe(self, subscription_id):
    """
    Sync subscription data from Stripe to database.
    
    Args:
        subscription_id: Subscription UUID (not Stripe subscription ID)
    """
    try:
        subscription = Subscription.objects.get(subscription_id=subscription_id)
        
        # Get latest data from Stripe
        stripe_data = get_subscription(subscription.stripe_subscription_id)
        
        # Update subscription
        subscription.status = stripe_data['status']
        subscription.current_period_start = stripe_data['current_period_start']
        subscription.current_period_end = stripe_data['current_period_end']
        subscription.trial_start = stripe_data.get('trial_start')
        subscription.trial_end = stripe_data.get('trial_end')
        subscription.cancel_at_period_end = stripe_data.get('cancel_at_period_end', False)
        subscription.canceled_at = stripe_data.get('canceled_at')
        subscription.save()
        
        # Update user
        user = subscription.user
        user.subscription_status = stripe_data['status']
        user.subscription_end_date = stripe_data['current_period_end']
        
        if stripe_data['status'] == 'canceled':
            user.subscription_tier = 'free'
        
        user.save(update_fields=['subscription_tier', 'subscription_status', 'subscription_end_date'])
        
        logger.info(f"Synced subscription {subscription_id} from Stripe")
        return {"status": "success", "subscription_id": str(subscription_id)}
        
    except Subscription.DoesNotExist:
        logger.error(f"Subscription {subscription_id} not found")
        return {"status": "error", "message": "Subscription not found"}
    except Exception as exc:
        logger.error(f"Error syncing subscription {subscription_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)


