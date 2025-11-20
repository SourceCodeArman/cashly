"""
Stripe webhook event handlers.
"""
import logging
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import Subscription, PendingSubscription, StripeWebhookEvent, AccountDowngradeSelection
from .stripe_config import get_price_id
from .stripe_service import create_subscription, get_customer_payment_method, StripeIntegrationError

User = get_user_model()
logger = logging.getLogger(__name__)


@transaction.atomic
def handle_subscription_created(event_data):
    """
    Handle customer.subscription.created webhook event.
    Create subscription record in database.
    """
    try:
        subscription_data = event_data['data']['object']
        subscription_id = subscription_data['id']
        customer_id = subscription_data['customer']
        
        # Check if subscription already exists
        if Subscription.objects.filter(stripe_subscription_id=subscription_id).exists():
            logger.info(f"Subscription {subscription_id} already exists, skipping")
            return
        
        # Get user from customer ID
        try:
            user = User.objects.get(stripe_customer_id=customer_id)
        except User.DoesNotExist:
            logger.error(f"User not found for customer {customer_id}")
            return
        
        # Extract plan and billing cycle from price ID
        items = subscription_data.get('items', {}).get('data', [])
        if not items:
            logger.error(f"No items found in subscription {subscription_id}")
            return
        
        price_id = items[0]['price']['id']
        
        # Determine plan and billing cycle from price ID
        plan = None
        billing_cycle = None
        price_id_monthly = None
        price_id_annual = None
        
        # Try to match price ID
        from .stripe_config import get_all_price_ids
        all_price_ids = get_all_price_ids()
        
        for p in ['premium', 'pro']:
            for bc in ['monthly', 'annual']:
                if all_price_ids[p][bc] == price_id:
                    plan = p
                    billing_cycle = bc
                    price_id_monthly = all_price_ids[p]['monthly']
                    price_id_annual = all_price_ids[p]['annual']
                    break
            if plan:
                break
        
        if not plan or not billing_cycle:
            logger.error(f"Could not determine plan/billing_cycle for price ID {price_id}")
            return
        
        # Create subscription record
        subscription = Subscription.objects.create(
            user=user,
            stripe_subscription_id=subscription_id,
            stripe_customer_id=customer_id,
            status=subscription_data['status'],
            plan=plan,
            billing_cycle=billing_cycle,
            price_id_monthly=price_id_monthly,
            price_id_annual=price_id_annual,
            current_period_start=timezone.make_aware(
                datetime.fromtimestamp(subscription_data['current_period_start'])
            ),
            current_period_end=timezone.make_aware(
                datetime.fromtimestamp(subscription_data['current_period_end'])
            ),
            trial_start=timezone.make_aware(
                datetime.fromtimestamp(subscription_data['trial_start'])
            ) if subscription_data.get('trial_start') else None,
            trial_end=timezone.make_aware(
                datetime.fromtimestamp(subscription_data['trial_end'])
            ) if subscription_data.get('trial_end') else None,
            cancel_at_period_end=subscription_data.get('cancel_at_period_end', False),
        )
        
        # Update user subscription tier
        user.subscription_tier = plan
        user.subscription_status = subscription_data['status']
        user.subscription_end_date = subscription.current_period_end
        user.save(update_fields=['subscription_tier', 'subscription_status', 'subscription_end_date'])
        
        logger.info(f"Created subscription {subscription_id} for user {user.id}")
        
    except Exception as e:
        logger.error(f"Error handling subscription.created event: {e}", exc_info=True)
        raise


@transaction.atomic
def handle_subscription_updated(event_data):
    """
    Handle customer.subscription.updated webhook event.
    Update subscription and user tier.
    """
    try:
        subscription_data = event_data['data']['object']
        subscription_id = subscription_data['id']
        
        # Get subscription
        try:
            subscription = Subscription.objects.get(stripe_subscription_id=subscription_id)
        except Subscription.DoesNotExist:
            logger.warning(f"Subscription {subscription_id} not found, creating it")
            handle_subscription_created(event_data)
            return
        
        # Update subscription fields
        subscription.status = subscription_data['status']
        subscription.current_period_start = timezone.make_aware(
            datetime.fromtimestamp(subscription_data['current_period_start'])
        )
        subscription.current_period_end = timezone.make_aware(
            datetime.fromtimestamp(subscription_data['current_period_end'])
        )
        subscription.trial_start = timezone.make_aware(
            datetime.fromtimestamp(subscription_data['trial_start'])
        ) if subscription_data.get('trial_start') else None
        subscription.trial_end = timezone.make_aware(
            datetime.fromtimestamp(subscription_data['trial_end'])
        ) if subscription_data.get('trial_end') else None
        
        # Track if cancel_at_period_end just became True (check before updating)
        was_cancelled = subscription.cancel_at_period_end
        subscription.cancel_at_period_end = subscription_data.get('cancel_at_period_end', False)
        is_now_cancelled = subscription.cancel_at_period_end
        
        if subscription_data.get('canceled_at'):
            subscription.canceled_at = timezone.make_aware(
                datetime.fromtimestamp(subscription_data['canceled_at'])
            )
        
        subscription.save()
        
        # Update user
        user = subscription.user
        user.subscription_status = subscription_data['status']
        user.subscription_end_date = subscription.current_period_end
        
        # Update subscription tier based on subscription status and expiration
        # Use get_effective_tier() to determine the correct tier
        if subscription.is_currently_active():
            # Subscription is active, use plan as tier
            user.subscription_tier = subscription.plan  # 'premium' or 'pro'
        else:
            # Subscription expired or canceled, downgrade to free
            user.subscription_tier = 'free'
        
        user.save(update_fields=['subscription_tier', 'subscription_status', 'subscription_end_date'])
        
        # If subscription was just cancelled and user has excess accounts, prompt for selection
        if is_now_cancelled and not was_cancelled:
            try:
                from apps.accounts.models import Account
                from apps.subscriptions.limits import FEATURE_ACCOUNTS, TIER_FREE
                from apps.subscriptions.limit_service import SubscriptionLimitService
                
                # Count active accounts
                active_account_count = Account.objects.for_user(user).active().count()
                
                # Get free tier limit
                free_limit = SubscriptionLimitService.get_limit(user, FEATURE_ACCOUNTS)
                # If user is still on paid tier, temporarily check against free limit
                if user.subscription_tier != TIER_FREE:
                    from apps.subscriptions.limits import get_limit
                    free_limit = get_limit(TIER_FREE, FEATURE_ACCOUNTS)
                
                # Check if user has excess accounts
                if active_account_count > free_limit:
                    excess_count = active_account_count - free_limit
                    
                    # Create account downgrade selection record (without selection yet)
                    AccountDowngradeSelection.objects.get_or_create(
                        subscription=subscription,
                        defaults={
                            'user': user,
                            'accounts_to_keep': [],
                            'deactivation_scheduled_at': subscription.current_period_end,
                        }
                    )
                    
                    # Send notification prompting user to select accounts
                    from apps.notifications.tasks import create_account_selection_required_notification
                    create_account_selection_required_notification(
                        user=user,
                        subscription=subscription,
                        excess_count=excess_count
                    )
                    
                    logger.info(
                        f"Subscription {subscription_id} cancelled. User {user.id} has {excess_count} "
                        f"excess accounts. Notification sent to select accounts."
                    )
            except Exception as e:
                logger.error(
                    f"Error handling account selection prompt for subscription {subscription_id}: {e}",
                    exc_info=True
                )
        
        logger.info(f"Updated subscription {subscription_id} for user {user.id}")
        
    except Exception as e:
        logger.error(f"Error handling subscription.updated event: {e}", exc_info=True)
        raise


@transaction.atomic
def handle_subscription_deleted(event_data):
    """
    Handle customer.subscription.deleted webhook event.
    Cancel subscription and downgrade user to free.
    """
    try:
        subscription_data = event_data['data']['object']
        subscription_id = subscription_data['id']
        
        # Get subscription
        try:
            subscription = Subscription.objects.get(stripe_subscription_id=subscription_id)
        except Subscription.DoesNotExist:
            logger.warning(f"Subscription {subscription_id} not found")
            return
        
        # Update subscription
        subscription.status = 'canceled'
        subscription.canceled_at = timezone.now()
        subscription.save()
        
        # Downgrade user to free
        user = subscription.user
        # Use get_effective_tier() to ensure correct tier (will return 'free' for canceled)
        user.subscription_tier = subscription.get_effective_tier()
        user.subscription_status = 'canceled'
        user.subscription_end_date = None
        user.save(update_fields=['subscription_tier', 'subscription_status', 'subscription_end_date'])
        
        # Handle account deactivation for excess accounts
        try:
            from apps.accounts.models import Account
            from apps.subscriptions.limits import FEATURE_ACCOUNTS, TIER_FREE
            from apps.subscriptions.limits import get_limit as get_subscription_limit
            
            # Get free tier account limit
            free_limit = get_subscription_limit(TIER_FREE, FEATURE_ACCOUNTS)
            active_accounts = Account.objects.for_user(user).active()
            active_account_count = active_accounts.count()
            
            # Only deactivate if user has more than free tier limit
            if active_account_count > free_limit:
                # Check if user made a selection
                selection = AccountDowngradeSelection.objects.filter(
                    subscription=subscription,
                    deactivation_completed_at__isnull=True
                ).first()
                
                accounts_to_deactivate = []
                
                if selection and selection.accounts_to_keep:
                    # User made a selection - deactivate accounts NOT in the list
                    accounts_to_keep_ids = set(str(uuid) for uuid in selection.accounts_to_keep)
                    accounts_to_deactivate = [
                        account for account in active_accounts
                        if str(account.account_id) not in accounts_to_keep_ids
                    ]
                    
                    logger.info(
                        f"User {user.id} selected {len(selection.accounts_to_keep)} accounts to keep. "
                        f"Deactivating {len(accounts_to_deactivate)} accounts."
                    )
                else:
                    # No selection made - default behavior: keep 3 most recently synced accounts
                    # Sort by last_synced_at (most recent first), then by created_at
                    accounts_sorted = active_accounts.order_by(
                        '-last_synced_at', '-created_at'
                    )
                    accounts_to_keep_default = accounts_sorted[:free_limit]
                    accounts_to_keep_ids = set(str(acc.account_id) for acc in accounts_to_keep_default)
                    accounts_to_deactivate = [
                        account for account in active_accounts
                        if str(account.account_id) not in accounts_to_keep_ids
                    ]
                    
                    logger.warning(
                        f"User {user.id} did not select accounts. Using default: keeping "
                        f"{len(accounts_to_keep_default)} most recently synced accounts, "
                        f"deactivating {len(accounts_to_deactivate)} accounts."
                    )
                
                # Deactivate excess accounts
                if accounts_to_deactivate:
                    deactivated_account_names = []
                    for account in accounts_to_deactivate:
                        account.is_active = False
                        account.save(update_fields=['is_active'])
                        deactivated_account_names.append(
                            account.custom_name or account.institution_name
                        )
                    
                    # Update selection record if it exists
                    if selection:
                        selection.deactivation_completed_at = timezone.now()
                        selection.save(update_fields=['deactivation_completed_at'])
                    
                    # Send notification
                    from apps.notifications.tasks import create_account_deactivation_complete_notification
                    create_account_deactivation_complete_notification(
                        user=user,
                        deactivated_accounts=deactivated_account_names
                    )
                    
                    logger.info(
                        f"Deactivated {len(accounts_to_deactivate)} accounts for user {user.id} "
                        f"after subscription {subscription_id} ended"
                    )
        except Exception as e:
            logger.error(
                f"Error deactivating excess accounts for subscription {subscription_id}: {e}",
                exc_info=True
            )
        
        logger.info(f"Deleted subscription {subscription_id} for user {user.id}")

        # Automatically create new subscription if a pending plan change was scheduled
        if subscription.pending_plan:
            try:
                payment_method = get_customer_payment_method(subscription.stripe_customer_id)
            except StripeIntegrationError as e:
                payment_method = None
                logger.error(f"Failed to load payment method for customer {subscription.stripe_customer_id}: {e}")

            if payment_method and payment_method.get('id'):
                try:
                    new_billing_cycle = subscription.pending_billing_cycle or subscription.billing_cycle
                    create_subscription(
                        subscription.stripe_customer_id,
                        payment_method['id'],
                        subscription.pending_plan,
                        new_billing_cycle,
                        trial_enabled=False
                    )
                    logger.info(
                        f"Created replacement subscription for user {user.id} with plan {subscription.pending_plan}"
                    )
                except StripeIntegrationError as e:
                    logger.error(
                        f"Failed to create replacement subscription for user {user.id}: {e}",
                        exc_info=True,
                    )
            else:
                logger.warning(
                    f"No default payment method available to create replacement subscription for user {user.id}"
                )

            subscription.pending_plan = None
            subscription.pending_billing_cycle = None
            subscription.pending_price_id_monthly = None
            subscription.pending_price_id_annual = None
            subscription.pending_requested_at = None
            subscription.save(update_fields=[
                'pending_plan',
                'pending_billing_cycle',
                'pending_price_id_monthly',
                'pending_price_id_annual',
                'pending_requested_at',
            ])
        
    except Exception as e:
        logger.error(f"Error handling subscription.deleted event: {e}", exc_info=True)
        raise


@transaction.atomic
def handle_payment_succeeded(event_data):
    """
    Handle invoice.payment_succeeded webhook event.
    Update subscription status to active.
    """
    try:
        invoice_data = event_data['data']['object']
        subscription_id = invoice_data.get('subscription')
        
        if not subscription_id:
            return
        
        # Get subscription
        try:
            subscription = Subscription.objects.get(stripe_subscription_id=subscription_id)
        except Subscription.DoesNotExist:
            logger.warning(f"Subscription {subscription_id} not found for payment_succeeded")
            return
        
        # Update subscription status
        subscription.status = 'active'
        subscription.save()
        
        # Update user
        user = subscription.user
        user.subscription_status = 'active'
        # Sync subscription tier from subscription model
        user.subscription_tier = subscription.get_effective_tier()
        user.subscription_end_date = subscription.current_period_end
        user.save(update_fields=['subscription_status', 'subscription_tier', 'subscription_end_date'])
        
        logger.info(f"Payment succeeded for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error handling payment_succeeded event: {e}", exc_info=True)
        raise


@transaction.atomic
def handle_payment_failed(event_data):
    """
    Handle invoice.payment_failed webhook event.
    Update subscription status to past_due.
    """
    try:
        invoice_data = event_data['data']['object']
        subscription_id = invoice_data.get('subscription')
        
        if not subscription_id:
            return
        
        # Get subscription
        try:
            subscription = Subscription.objects.get(stripe_subscription_id=subscription_id)
        except Subscription.DoesNotExist:
            logger.warning(f"Subscription {subscription_id} not found for payment_failed")
            return
        
        # Update subscription status
        subscription.status = 'past_due'
        subscription.save()
        
        # Update user
        user = subscription.user
        user.subscription_status = 'past_due'
        # Subscription is past due but may still be active, sync tier
        # If subscription is expired, get_effective_tier() will return 'free'
        user.subscription_tier = subscription.get_effective_tier()
        user.save(update_fields=['subscription_status', 'subscription_tier'])
        
        # TODO: Send notification to user (via notifications app)
        logger.warning(f"Payment failed for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error handling payment_failed event: {e}", exc_info=True)
        raise


@transaction.atomic
def handle_trial_will_end(event_data):
    """
    Handle customer.subscription.trial_will_end webhook event.
    Notify user that trial is ending soon.
    """
    try:
        subscription_data = event_data['data']['object']
        subscription_id = subscription_data['id']
        
        # Get subscription
        try:
            subscription = Subscription.objects.get(stripe_subscription_id=subscription_id)
        except Subscription.DoesNotExist:
            logger.warning(f"Subscription {subscription_id} not found for trial_will_end")
            return
        
        # TODO: Send notification to user (via notifications app)
        logger.info(f"Trial will end for subscription {subscription_id}")
        
    except Exception as e:
        logger.error(f"Error handling trial_will_end event: {e}", exc_info=True)
        raise


def process_pending_subscriptions():
    """
    Process pending subscriptions when Stripe is back online.
    This should be called from a Celery task.
    """
    from .stripe_service import (
        create_stripe_customer,
        attach_payment_method_to_customer,
        create_subscription,
        StripeIntegrationError,
    )
    
    pending = PendingSubscription.objects.filter(
        status__in=['pending', 'processing'],
        retry_count__lt=5
    )
    
    for pending_sub in pending:
        try:
            pending_sub.status = 'processing'
            pending_sub.save()
            
            # Get or create customer
            user = pending_sub.user
            customer_id = create_stripe_customer(user, user.email)
            
            # Attach payment method
            attach_payment_method_to_customer(
                customer_id,
                pending_sub.payment_method_id
            )
            
            # Create subscription
            subscription_data = create_subscription(
                customer_id,
                pending_sub.payment_method_id,
                pending_sub.plan,
                pending_sub.billing_cycle,
                pending_sub.trial_enabled
            )
            
            # Mark as completed
            pending_sub.status = 'completed'
            pending_sub.save()
            
            logger.info(f"Processed pending subscription {pending_sub.id}")
            
        except StripeIntegrationError as e:
            pending_sub.retry_count += 1
            pending_sub.error_message = str(e)
            
            if pending_sub.retry_count >= 5:
                pending_sub.status = 'failed'
            else:
                pending_sub.status = 'pending'
            
            pending_sub.save()
            logger.error(f"Failed to process pending subscription {pending_sub.id}: {e}")

