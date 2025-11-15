"""
Views for subscription operations.
"""
import logging
import stripe
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle
from .models import Subscription, PendingSubscription, StripeWebhookEvent
from .serializers import (
    CreateSubscriptionSerializer,
    SubscriptionSerializer,
    StripeConfigSerializer,
    PendingSubscriptionSerializer,
)
from .stripe_service import (
    create_stripe_customer,
    attach_payment_method_to_customer,
    create_subscription,
    update_subscription_plan,
    cancel_subscription,
    get_subscription,
    StripeIntegrationError,
)
from .stripe_config import get_price_id
from .webhook_handlers import (
    handle_subscription_created,
    handle_subscription_updated,
    handle_subscription_deleted,
    handle_payment_succeeded,
    handle_payment_failed,
    handle_trial_will_end,
    process_pending_subscriptions,
)
from apps.api.permissions import IsOwnerOrReadOnly

logger = logging.getLogger(__name__)


class StripeConfigView(APIView):
    """
    Get Stripe publishable key.
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Return Stripe publishable key."""
        publishable_key = settings.STRIPE_PUBLISHABLE_KEY or ''
        
        if not publishable_key:
            logger.warning('STRIPE_PUBLISHABLE_KEY not configured in settings')
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Stripe publishable key is not configured. Please configure STRIPE_PUBLISHABLE_KEY in your .env file.',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'status': 'success',
            'data': {
                'publishable_key': publishable_key
            },
            'message': 'Stripe configuration retrieved successfully'
        }, status=status.HTTP_200_OK)


class StripeWebhookThrottle(AnonRateThrottle):
    """Throttle for Stripe webhook endpoint."""
    scope = 'stripe_webhook'
    rate = '120/minute'


class CreateSubscriptionView(APIView):
    """
    Create a new subscription.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create subscription from payment method."""
        serializer = CreateSubscriptionSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        payment_method_id = serializer.validated_data['payment_method_id']
        plan = serializer.validated_data['plan']
        billing_cycle = serializer.validated_data['billing_cycle']
        trial_enabled = serializer.validated_data['trial_enabled']
        
        try:
            with transaction.atomic():
                # Get or create Stripe customer
                user = request.user
                customer_id = create_stripe_customer(user, user.email)
                
                # Attach payment method to customer
                attach_payment_method_to_customer(customer_id, payment_method_id)
                
                # Check for existing active subscription
                existing_subscription = Subscription.objects.filter(
                    user=user,
                    status__in=['active', 'trialing']
                ).first()
                
                # If user has an active subscription, update it (upgrade/downgrade)
                if existing_subscription:
                    try:
                        # When upgrading, never add a trial - user already has an active subscription
                        # Update existing subscription to new plan (no trial for upgrades)
                        subscription_data = update_subscription_plan(
                            existing_subscription.stripe_subscription_id,
                            plan,
                            billing_cycle,
                            proration_behavior='always_invoice'
                        )
                        
                        # Update subscription record
                        price_id_monthly = get_price_id(plan, 'monthly')
                        price_id_annual = get_price_id(plan, 'annual')
                        
                        existing_subscription.status = subscription_data['status']
                        existing_subscription.plan = plan
                        existing_subscription.billing_cycle = billing_cycle
                        existing_subscription.price_id_monthly = price_id_monthly
                        existing_subscription.price_id_annual = price_id_annual
                        existing_subscription.current_period_start = subscription_data['current_period_start']
                        existing_subscription.current_period_end = subscription_data['current_period_end']
                        existing_subscription.trial_start = subscription_data.get('trial_start')
                        existing_subscription.trial_end = subscription_data.get('trial_end')
                        existing_subscription.save()
                        
                        # Update user subscription tier
                        user.subscription_tier = plan
                        user.subscription_status = subscription_data['status']
                        user.subscription_end_date = subscription_data['current_period_end']
                        user.save(update_fields=['subscription_tier', 'subscription_status', 'subscription_end_date'])
                        
                        # Serialize subscription - match frontend CreateSubscriptionResponse format
                        return Response({
                            'status': 'success',
                            'data': {
                                'subscription_id': str(existing_subscription.subscription_id),
                                'customer_id': existing_subscription.stripe_customer_id,
                                'status': existing_subscription.status,
                                'current_period_end': existing_subscription.current_period_end.isoformat(),
                                'trial_end': existing_subscription.trial_end.isoformat() if existing_subscription.trial_end else None,
                                'plan': existing_subscription.plan,
                                'billing_cycle': existing_subscription.billing_cycle,
                                'user': {
                                    'id': str(user.id),
                                    'subscription_tier': user.subscription_tier,
                                },
                            },
                            'message': 'Subscription updated successfully'
                        }, status=status.HTTP_200_OK)
                        
                    except (stripe.StripeError, StripeIntegrationError) as e:
                        # Stripe API error during update
                        logger.error(f"Stripe API error updating subscription: {e}")
                        return Response({
                            'status': 'error',
                            'data': None,
                            'message': f'Failed to update subscription: {str(e)}',
                            'errors': {'stripe_error': str(e)}
                        }, status=status.HTTP_400_BAD_REQUEST)
                
                # Try to create new subscription (no existing subscription)
                try:
                    subscription_data = create_subscription(
                        customer_id,
                        payment_method_id,
                        plan,
                        billing_cycle,
                        trial_enabled
                    )
                    
                    # Create subscription record
                    price_id_monthly = get_price_id(plan, 'monthly')
                    price_id_annual = get_price_id(plan, 'annual')
                    
                    subscription = Subscription.objects.create(
                        user=user,
                        stripe_subscription_id=subscription_data['subscription_id'],
                        stripe_customer_id=customer_id,
                        status=subscription_data['status'],
                        plan=plan,
                        billing_cycle=billing_cycle,
                        price_id_monthly=price_id_monthly,
                        price_id_annual=price_id_annual,
                        current_period_start=subscription_data['current_period_start'],
                        current_period_end=subscription_data['current_period_end'],
                        trial_start=subscription_data.get('trial_start'),
                        trial_end=subscription_data.get('trial_end'),
                    )
                    
                    # Update user subscription tier
                    user.subscription_tier = plan
                    user.subscription_status = subscription_data['status']
                    user.subscription_end_date = subscription_data['current_period_end']
                    user.save(update_fields=['subscription_tier', 'subscription_status', 'subscription_end_date'])
                    
                    # Serialize subscription - match frontend CreateSubscriptionResponse format
                    return Response({
                        'status': 'success',
                        'data': {
                            'subscription_id': str(subscription.subscription_id),
                            'customer_id': subscription.stripe_customer_id,
                            'status': subscription.status,
                            'current_period_end': subscription.current_period_end.isoformat(),
                            'trial_end': subscription.trial_end.isoformat() if subscription.trial_end else None,
                            'plan': subscription.plan,
                            'billing_cycle': subscription.billing_cycle,
                            'user': {
                                'id': str(user.id),
                                'subscription_tier': user.subscription_tier,
                            },
                        },
                        'message': 'Subscription created successfully'
                    }, status=status.HTTP_201_CREATED)
                    
                except (stripe.StripeError, StripeIntegrationError) as e:
                    # Stripe API error - create pending subscription
                    logger.error(f"Stripe API error creating subscription: {e}")
                    
                    pending_subscription = PendingSubscription.objects.create(
                        user=user,
                        payment_method_id=payment_method_id,
                        plan=plan,
                        billing_cycle=billing_cycle,
                        trial_enabled=trial_enabled,
                        status='pending',
                        error_message=str(e)
                    )
                    
                    return Response({
                        'status': 'error',
                        'data': {
                            'pending_subscription_id': str(pending_subscription.id),
                        },
                        'message': 'Payment processing temporarily unavailable. Your subscription will be activated automatically when service resumes.',
                        'errors': {'stripe_error': str(e)}
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                    
        except Exception as e:
            logger.error(f"Unexpected error creating subscription: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'An unexpected error occurred',
                'errors': {'detail': str(e)}
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing subscriptions.
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        """Return subscriptions for the current user."""
        return Subscription.objects.for_user(self.request.user)
    
    def list(self, request, *args, **kwargs):
        """List all subscriptions for the current user."""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Subscriptions retrieved successfully',
        }, status=status.HTTP_200_OK)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve a specific subscription."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Subscription retrieved successfully',
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['patch'])
    def cancel(self, request, pk=None):
        """Cancel subscription at period end."""
        subscription = self.get_object()
        
        try:
            # Cancel in Stripe
            cancel_data = cancel_subscription(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )
            
            # Update subscription
            subscription.cancel_at_period_end = True
            subscription.save(update_fields=['cancel_at_period_end'])
            
            return Response({
                'status': 'success',
                'data': {
                    'subscription_id': str(subscription.subscription_id),
                    'cancel_at_period_end': subscription.cancel_at_period_end,
                    'current_period_end': subscription.current_period_end.isoformat(),
                },
                'message': 'Subscription will be canceled at the end of the billing period'
            }, status=status.HTTP_200_OK)
            
        except (stripe.StripeError, StripeIntegrationError) as e:
            logger.error(f"Failed to cancel subscription: {e}")
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to cancel subscription',
                'errors': {'detail': str(e)}
            }, status=status.HTTP_400_BAD_REQUEST)


class WebhookView(APIView):
    """
    Handle Stripe webhook events.
    """
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [StripeWebhookThrottle]
    
    def _verify_signature(self, request):
        """Verify Stripe webhook signature."""
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        if not webhook_secret:
            logger.warning("STRIPE_WEBHOOK_SECRET not configured, skipping signature verification")
            return True
        
        signature = request.headers.get('Stripe-Signature')
        if not signature:
            logger.warning('Missing Stripe-Signature header on webhook request')
            return False
        
        try:
            event = stripe.Webhook.construct_event(
                request.body,
                signature,
                webhook_secret
            )
            return event
        except ValueError as e:
            logger.error(f"Invalid payload in Stripe webhook: {e}")
            return False
        except stripe.SignatureVerificationError as e:
            logger.error(f"Invalid signature in Stripe webhook: {e}")
            return False
    
    def post(self, request):
        """Handle Stripe webhook event."""
        # Verify signature
        event = self._verify_signature(request)
        if not event:
            return Response({
                'status': 'error',
                'message': 'Invalid signature'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        event_id = event['id']
        event_type = event['type']
        
        # Check if event already processed
        webhook_event, created = StripeWebhookEvent.objects.get_or_create(
            stripe_event_id=event_id,
            defaults={
                'event_type': event_type,
                'payload': event,
            }
        )
        
        if not created and webhook_event.processed:
            logger.info(f"Webhook event {event_id} already processed, skipping")
            return Response({
                'status': 'success',
                'message': 'Event already processed'
            }, status=status.HTTP_200_OK)
        
        logger.info(f"Processing Stripe webhook event: {event_type} ({event_id})")
        
        try:
            # Route to appropriate handler
            if event_type == 'customer.subscription.created':
                handle_subscription_created(event)
            elif event_type == 'customer.subscription.updated':
                handle_subscription_updated(event)
            elif event_type == 'customer.subscription.deleted':
                handle_subscription_deleted(event)
            elif event_type == 'invoice.payment_succeeded':
                handle_payment_succeeded(event)
            elif event_type == 'invoice.payment_failed':
                handle_payment_failed(event)
            elif event_type == 'customer.subscription.trial_will_end':
                handle_trial_will_end(event)
            else:
                logger.info(f"Unhandled webhook event type: {event_type}")
            
            # Mark event as processed
            webhook_event.processed = True
            webhook_event.processed_at = timezone.now()
            webhook_event.save()
            
            # Process pending subscriptions (best effort)
            try:
                process_pending_subscriptions()
            except Exception as e:
                logger.error(f"Error processing pending subscriptions: {e}")
            
            return Response({
                'status': 'success',
                'message': 'Webhook processed successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error processing webhook event {event_id}: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'message': 'Error processing webhook'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


