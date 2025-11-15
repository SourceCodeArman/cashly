"""
Service layer for Stripe API interactions.
"""
import logging
from typing import Dict, Optional
from datetime import datetime
import stripe
from django.conf import settings
from django.utils import timezone

from .stripe_config import get_price_id, validate_price_ids

logger = logging.getLogger(__name__)

# Initialize Stripe client
stripe.api_key = settings.STRIPE_SECRET_KEY
if hasattr(settings, 'STRIPE_API_VERSION'):
    stripe.api_version = settings.STRIPE_API_VERSION


class StripeIntegrationError(Exception):
    """Custom exception for Stripe integration errors."""
    pass


def get_stripe_client():
    """
    Get configured Stripe client.
    
    Returns:
        stripe module (already configured with API key)
    """
    if not settings.STRIPE_SECRET_KEY:
        raise StripeIntegrationError("STRIPE_SECRET_KEY not configured")
    
    return stripe


def create_stripe_customer(user, email: str) -> str:
    """
    Create a Stripe customer for a user.
    
    Args:
        user: Django User instance
        email: Customer email address
    
    Returns:
        Stripe customer ID
    
    Raises:
        StripeIntegrationError: If customer creation fails
    """
    try:
        client = get_stripe_client()
        
        # Check if customer already exists
        if user.stripe_customer_id:
            try:
                customer = client.Customer.retrieve(user.stripe_customer_id)
                return customer.id
            except stripe.StripeError:
                # Customer doesn't exist, create new one
                pass
        
        # Create new customer
        customer = client.Customer.create(
            email=email,
            metadata={
                'user_id': str(user.id),
                'username': user.username,
            }
        )
        
        # Update user with customer ID
        user.stripe_customer_id = customer.id
        user.save(update_fields=['stripe_customer_id'])
        
        logger.info(f"Created Stripe customer {customer.id} for user {user.id}")
        return customer.id
        
    except stripe.StripeError as e:
        logger.error(f"Failed to create Stripe customer for user {user.id}: {e}")
        raise StripeIntegrationError(f"Failed to create customer: {str(e)}")


def attach_payment_method_to_customer(customer_id: str, payment_method_id: str) -> None:
    """
    Attach a payment method to a Stripe customer and set as default.
    
    Args:
        customer_id: Stripe customer ID
        payment_method_id: Stripe payment method ID
    
    Raises:
        StripeIntegrationError: If attachment fails
    """
    try:
        client = get_stripe_client()
        
        # Attach payment method to customer
        client.PaymentMethod.attach(
            payment_method_id,
            customer=customer_id,
        )
        
        # Set as default payment method
        client.Customer.modify(
            customer_id,
            invoice_settings={
                'default_payment_method': payment_method_id,
            }
        )
        
        logger.info(f"Attached payment method {payment_method_id} to customer {customer_id}")
        
    except stripe.StripeError as e:
        logger.error(f"Failed to attach payment method {payment_method_id} to customer {customer_id}: {e}")
        raise StripeIntegrationError(f"Failed to attach payment method: {str(e)}")


def create_subscription(
    customer_id: str,
    payment_method_id: str,
    plan: str,
    billing_cycle: str,
    trial_enabled: bool = True
) -> Dict:
    """
    Create a Stripe subscription with optional 7-day trial.
    
    Args:
        customer_id: Stripe customer ID
        payment_method_id: Stripe payment method ID
        plan: 'premium' or 'pro'
        billing_cycle: 'monthly' or 'annual'
        trial_enabled: Whether to enable 7-day trial (default: True)
    
    Returns:
        Dictionary with subscription data
    
    Raises:
        StripeIntegrationError: If subscription creation fails
    """
    try:
        if not validate_price_ids():
            raise StripeIntegrationError("Stripe Price IDs not configured. Run create_stripe_products command.")
        
        client = get_stripe_client()
        
        # Get price ID
        price_id = get_price_id(plan, billing_cycle)
        
        # Calculate trial period (7 days)
        trial_period_days = 7 if trial_enabled else None
        
        # Always use default_incomplete to properly handle payment intents
        # We'll confirm the payment immediately when trial is disabled
        subscription_params = {
            'customer': customer_id,
            'items': [{'price': price_id}],
            'payment_behavior': 'default_incomplete',
            'payment_settings': {
                'save_default_payment_method': 'on_subscription',
                'payment_method_types': ['card'],
            },
            'default_payment_method': payment_method_id,  # Set default payment method
            'expand': ['latest_invoice.payment_intent'],
        }
        
        if trial_period_days:
            subscription_params['trial_period_days'] = trial_period_days
        
        subscription = client.Subscription.create(**subscription_params)
        
        # When trial is disabled, we need to confirm the payment immediately
        # When trial is enabled, payment is deferred until trial ends
        if not trial_enabled:
            # Confirm payment immediately for non-trial subscriptions
            if (
                subscription.latest_invoice 
                and hasattr(subscription.latest_invoice, 'payment_intent')
                and subscription.latest_invoice.payment_intent
            ):
                payment_intent = subscription.latest_invoice.payment_intent
                try:
                    # Confirm the payment intent to charge immediately
                    if payment_intent.status == 'requires_confirmation':
                        confirmed_intent = client.PaymentIntent.confirm(payment_intent.id)
                        logger.info(f"Confirmed payment intent {payment_intent.id} for subscription {subscription.id}")
                    elif payment_intent.status == 'requires_action':
                        # Payment requires 3D Secure - we'll return the client secret for frontend handling
                        logger.info(f"Payment intent {payment_intent.id} requires 3D Secure confirmation")
                    elif payment_intent.status in ['succeeded', 'processing']:
                        # Payment is already processing or succeeded
                        logger.info(f"Payment intent {payment_intent.id} status: {payment_intent.status}")
                    else:
                        logger.warning(f"Unexpected payment intent status: {payment_intent.status}")
                except stripe.StripeError as e:
                    logger.error(f"Failed to confirm payment intent: {e}")
                    raise StripeIntegrationError(f"Failed to process payment: {str(e)}")
                
                # Refresh subscription to get latest state after payment confirmation
                subscription = client.Subscription.retrieve(subscription.id)
        else:
            # Trial enabled - no immediate payment needed, just refresh to get latest state
            subscription = client.Subscription.retrieve(subscription.id)
        
        logger.info(f"Created subscription {subscription.id} for customer {customer_id}")
        
        # Extract payment intent client secret if available
        client_secret = None
        if (
            subscription.latest_invoice 
            and hasattr(subscription.latest_invoice, 'payment_intent')
            and subscription.latest_invoice.payment_intent
        ):
            client_secret = subscription.latest_invoice.payment_intent.client_secret
        
        return {
            'subscription_id': subscription.id,
            'customer_id': subscription.customer,
            'status': subscription.status,
            'current_period_start': timezone.make_aware(
                datetime.fromtimestamp(subscription.current_period_start)
            ),
            'current_period_end': timezone.make_aware(
                datetime.fromtimestamp(subscription.current_period_end)
            ),
            'trial_start': timezone.make_aware(
                datetime.fromtimestamp(subscription.trial_start)
            ) if subscription.trial_start else None,
            'trial_end': timezone.make_aware(
                datetime.fromtimestamp(subscription.trial_end)
            ) if subscription.trial_end else None,
            'client_secret': client_secret,  # For 3D Secure confirmation if needed
        }
        
    except stripe.StripeError as e:
        logger.error(f"Failed to create subscription for customer {customer_id}: {e}")
        raise StripeIntegrationError(f"Failed to create subscription: {str(e)}")


def get_subscription(subscription_id: str) -> Dict:
    """
    Retrieve a subscription from Stripe.
    
    Args:
        subscription_id: Stripe subscription ID
    
    Returns:
        Dictionary with subscription data
    
    Raises:
        StripeIntegrationError: If subscription retrieval fails
    """
    try:
        client = get_stripe_client()
        subscription = client.Subscription.retrieve(subscription_id)
        
        return {
            'subscription_id': subscription.id,
            'customer_id': subscription.customer,
            'status': subscription.status,
            'current_period_start': timezone.make_aware(
                datetime.fromtimestamp(subscription.current_period_start)
            ),
            'current_period_end': timezone.make_aware(
                datetime.fromtimestamp(subscription.current_period_end)
            ),
            'trial_start': timezone.make_aware(
                datetime.fromtimestamp(subscription.trial_start)
            ) if subscription.trial_start else None,
            'trial_end': timezone.make_aware(
                datetime.fromtimestamp(subscription.trial_end)
            ) if subscription.trial_end else None,
            'cancel_at_period_end': subscription.cancel_at_period_end,
            'canceled_at': timezone.make_aware(
                timezone.datetime.fromtimestamp(subscription.canceled_at)
            ) if subscription.canceled_at else None,
        }
        
    except stripe.StripeError as e:
        logger.error(f"Failed to retrieve subscription {subscription_id}: {e}")
        raise StripeIntegrationError(f"Failed to retrieve subscription: {str(e)}")


def cancel_subscription(subscription_id: str, cancel_at_period_end: bool = True) -> Dict:
    """
    Cancel a Stripe subscription.
    
    Args:
        subscription_id: Stripe subscription ID
        cancel_at_period_end: Whether to cancel at period end (default: True)
    
    Returns:
        Dictionary with updated subscription data
    
    Raises:
        StripeIntegrationError: If cancellation fails
    """
    try:
        client = get_stripe_client()
        
        if cancel_at_period_end:
            # Cancel at period end (user keeps access)
            subscription = client.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True,
            )
        else:
            # Cancel immediately
            subscription = client.Subscription.delete(subscription_id)
        
        logger.info(f"Cancelled subscription {subscription_id} (cancel_at_period_end={cancel_at_period_end})")
        
        return {
            'subscription_id': subscription.id,
            'status': subscription.status,
            'cancel_at_period_end': subscription.cancel_at_period_end,
            'canceled_at': timezone.make_aware(
                datetime.fromtimestamp(subscription.canceled_at)
            ) if hasattr(subscription, 'canceled_at') and subscription.canceled_at else None,
        }
        
    except stripe.StripeError as e:
        logger.error(f"Failed to cancel subscription {subscription_id}: {e}")
        raise StripeIntegrationError(f"Failed to cancel subscription: {str(e)}")


def update_subscription_plan(
    subscription_id: str,
    new_plan: str,
    new_billing_cycle: str,
    proration_behavior: str = 'always_invoice',
    trial_period_days: Optional[int] = None
) -> Dict:
    """
    Update subscription plan (upgrade/downgrade).
    
    Args:
        subscription_id: Stripe subscription ID
        new_plan: New plan ('premium' or 'pro')
        new_billing_cycle: New billing cycle ('monthly' or 'annual')
        proration_behavior: How to handle proration ('always_invoice', 'create_prorations', or 'none')
    
    Returns:
        Dictionary with updated subscription data
    
    Raises:
        StripeIntegrationError: If update fails
    """
    try:
        if not validate_price_ids():
            raise StripeIntegrationError("Stripe Price IDs not configured. Run create_stripe_products command.")
        
        client = get_stripe_client()
        
        # Get current subscription
        subscription = client.Subscription.retrieve(subscription_id)
        
        # Get new price ID
        new_price_id = get_price_id(new_plan, new_billing_cycle)
        
        # Update subscription items
        subscription_items = subscription['items']['data']
        if not subscription_items:
            raise StripeIntegrationError("Subscription has no items")
        
        # Update the first subscription item with new price
        subscription_item_id = subscription_items[0].id
        
        # Prepare subscription update parameters
        update_params = {
            'items': [{
                'id': subscription_item_id,
                'price': new_price_id,
            }],
            'proration_behavior': proration_behavior,
            'expand': ['latest_invoice.payment_intent'],
        }
        
        # Only set trial_period_days if explicitly provided (for upgrades, we don't add trials)
        # When upgrading/downgrading, we should not add new trials
        if trial_period_days is not None:
            update_params['trial_period_days'] = trial_period_days
        # Note: We don't modify existing trial_end when upgrading - Stripe preserves it
        # If user wants to end trial early, they would need to do that separately
        
        # Update subscription
        updated_subscription = client.Subscription.modify(
            subscription_id,
            **update_params
        )
        
        # Refresh to get latest state
        updated_subscription = client.Subscription.retrieve(updated_subscription.id)
        
        logger.info(f"Updated subscription {subscription_id} to plan {new_plan} ({new_billing_cycle})")
        
        # Extract payment intent client secret if available
        client_secret = None
        if (
            updated_subscription.latest_invoice 
            and hasattr(updated_subscription.latest_invoice, 'payment_intent')
            and updated_subscription.latest_invoice.payment_intent
        ):
            client_secret = updated_subscription.latest_invoice.payment_intent.client_secret
        
        return {
            'subscription_id': updated_subscription.id,
            'customer_id': updated_subscription.customer,
            'status': updated_subscription.status,
            'current_period_start': timezone.make_aware(
                datetime.fromtimestamp(updated_subscription.current_period_start)
            ),
            'current_period_end': timezone.make_aware(
                datetime.fromtimestamp(updated_subscription.current_period_end)
            ),
            'trial_start': timezone.make_aware(
                datetime.fromtimestamp(updated_subscription.trial_start)
            ) if updated_subscription.trial_start else None,
            'trial_end': timezone.make_aware(
                datetime.fromtimestamp(updated_subscription.trial_end)
            ) if updated_subscription.trial_end else None,
            'client_secret': client_secret,  # For 3D Secure confirmation if needed
        }
        
    except stripe.StripeError as e:
        logger.error(f"Failed to update subscription {subscription_id} to plan {new_plan}: {e}")
        raise StripeIntegrationError(f"Failed to update subscription: {str(e)}")


def update_subscription_billing_cycle(subscription_id: str, new_billing_cycle: str) -> Dict:
    """
    Update subscription billing cycle.
    
    Args:
        subscription_id: Stripe subscription ID
        new_billing_cycle: New billing cycle ('monthly' or 'annual')
    
    Returns:
        Dictionary with updated subscription data
    
    Raises:
        StripeIntegrationError: If update fails
    """
    try:
        # This would require getting current plan, finding new price ID, and updating
        # Implementation depends on Stripe's subscription update API
        raise NotImplementedError("Billing cycle update not yet implemented")
        
    except stripe.StripeError as e:
        logger.error(f"Failed to update subscription {subscription_id}: {e}")
        raise StripeIntegrationError(f"Failed to update subscription: {str(e)}")


def retrieve_customer(customer_id: str) -> Dict:
    """
    Retrieve a Stripe customer.
    
    Args:
        customer_id: Stripe customer ID
    
    Returns:
        Dictionary with customer data
    
    Raises:
        StripeIntegrationError: If retrieval fails
    """
    try:
        client = get_stripe_client()
        customer = client.Customer.retrieve(customer_id)
        
        return {
            'customer_id': customer.id,
            'email': customer.email,
            'created': timezone.make_aware(
                datetime.fromtimestamp(customer.created)
            ),
        }
        
    except stripe.StripeError as e:
        logger.error(f"Failed to retrieve customer {customer_id}: {e}")
        raise StripeIntegrationError(f"Failed to retrieve customer: {str(e)}")

