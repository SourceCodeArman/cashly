"""
Celery tasks for subscription operations.
"""
import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone

from .models import PendingSubscription, Subscription, AccountDowngradeSelection
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


@shared_task
def send_account_deactivation_reminders():
    """
    Send reminder notifications to users about upcoming account deactivation.
    
    Runs daily to check for subscriptions ending within 3 days that have excess accounts.
    """
    try:
        from apps.accounts.models import Account
        from apps.subscriptions.limits import FEATURE_ACCOUNTS, TIER_FREE
        from apps.subscriptions.limits import get_limit as get_subscription_limit
        from apps.notifications.tasks import (
            create_account_selection_required_notification,
            create_account_deactivation_reminder_notification,
        )
        
        # Find subscriptions ending within 3 days that are cancelled
        three_days_from_now = timezone.now() + timedelta(days=3)
        now = timezone.now()
        
        subscriptions_to_check = Subscription.objects.filter(
            cancel_at_period_end=True,
            current_period_end__gte=now,
            current_period_end__lte=three_days_from_now,
            status__in=['active', 'trialing']
        )
        
        free_limit = get_subscription_limit(TIER_FREE, FEATURE_ACCOUNTS)
        reminders_sent = 0
        
        for subscription in subscriptions_to_check:
            try:
                user = subscription.user
                active_account_count = Account.objects.for_user(user).active().count()
                
                # Only send reminder if user has excess accounts
                if active_account_count > free_limit:
                    excess_count = active_account_count - free_limit
                    
                    # Check if user has already made a selection
                    selection = AccountDowngradeSelection.objects.filter(
                        subscription=subscription,
                        selection_completed_at__isnull=False,
                        deactivation_completed_at__isnull=True
                    ).first()
                    
                    if selection:
                        # User has selected accounts - send reminder about upcoming deactivation
                        accounts_to_deactivate_count = active_account_count - len(selection.accounts_to_keep)
                        if accounts_to_deactivate_count > 0:
                            create_account_deactivation_reminder_notification(
                                user=user,
                                accounts_to_deactivate=accounts_to_deactivate_count,
                                deactivation_date=subscription.current_period_end
                            )
                            reminders_sent += 1
                            logger.info(
                                f"Sent deactivation reminder to user {user.id} for subscription {subscription.subscription_id}"
                            )
                    else:
                        # User hasn't selected yet - send reminder to select accounts
                        create_account_selection_required_notification(
                            user=user,
                            subscription=subscription,
                            excess_count=excess_count
                        )
                        reminders_sent += 1
                        logger.info(
                            f"Sent account selection reminder to user {user.id} for subscription {subscription.subscription_id}"
                        )
                        
            except Exception as e:
                logger.error(
                    f"Error sending reminder for subscription {subscription.subscription_id}: {e}",
                    exc_info=True
                )
                continue
        
        logger.info(f"Account deactivation reminder task completed. Sent {reminders_sent} reminders.")
        return {"status": "success", "reminders_sent": reminders_sent}
        
    except Exception as e:
        logger.error(f"Error in send_account_deactivation_reminders task: {e}", exc_info=True)
        raise


