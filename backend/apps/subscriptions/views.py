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
from .models import Subscription, PendingSubscription, StripeWebhookEvent, AccountDowngradeSelection
from .serializers import (
    CreateCheckoutSessionSerializer,
    CreatePortalSessionSerializer,
    SubscriptionSerializer,
    StripeConfigSerializer,
    PendingSubscriptionSerializer,
    UpdatePaymentMethodSerializer,
    AccountSelectionSerializer,
)
from .stripe_service import (
    create_stripe_customer,
    attach_payment_method_to_customer,
    create_subscription,
    update_subscription_plan,
    cancel_subscription,
    resume_subscription,
    get_subscription,
    get_customer_payment_method,
    create_checkout_session,
    create_portal_session,
    StripeIntegrationError,
)
from .stripe_config import get_price_id
from .webhook_handlers import (
    handle_checkout_session_completed,
    handle_subscription_created,
    handle_subscription_updated,
    handle_subscription_deleted,
    handle_payment_succeeded,
    handle_payment_failed,
    handle_trial_will_end,
    process_pending_subscriptions,
)
from .tier_config import get_subscription_tiers
from apps.api.permissions import IsOwnerOrReadOnly

logger = logging.getLogger(__name__)


class SubscriptionConfigView(APIView):
    """
    Provide public subscription configuration (tiers, pricing, publishable key).
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Return Stripe publishable key plus tier metadata."""
        publishable_key = settings.STRIPE_PUBLISHABLE_KEY or ''
        
        if not publishable_key:
            logger.warning('STRIPE_PUBLISHABLE_KEY not configured in settings')
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Stripe publishable key is not configured. Please set STRIPE_PUBLISHABLE_KEY in your environment.',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        tiers = get_subscription_tiers()
        
        return Response({
            'status': 'success',
            'data': {
                'publishable_key': publishable_key,
                'currency': 'usd',
                'tiers': tiers,
            },
            'message': 'Subscription configuration retrieved successfully'
        }, status=status.HTTP_200_OK)


class CreateCheckoutSessionView(APIView):
    """
    Create a Stripe Checkout Session for a new subscription.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateCheckoutSessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        plan = serializer.validated_data['plan']
        billing_cycle = serializer.validated_data['billing_cycle']
        success_url = serializer.validated_data['success_url']
        cancel_url = serializer.validated_data['cancel_url']

        try:
            user = request.user
            customer_id = user.stripe_customer_id or create_stripe_customer(user, user.email)
            price_id = get_price_id(plan, billing_cycle)

            # Check if user already has an active subscription
            active_sub = Subscription.objects.for_user(user).filter(
                status__in=['active', 'trialing']
            ).first()

            if active_sub:
                return Response({
                    'status': 'error',
                    'message': 'User already has an active subscription. Use the portal to manage it.',
                    'code': 'active_subscription_exists'
                }, status=status.HTTP_400_BAD_REQUEST)

            session = create_checkout_session(
                customer_id=customer_id,
                price_id=price_id,
                success_url=success_url,
                cancel_url=cancel_url,
                client_reference_id=str(user.id),
                # TODO: make trial configurable? for now defaulting to no trial or hardcoded if needed
                # trial_period_days=7 if plan != 'enterprise' else None
            )

            return Response({
                'status': 'success',
                'data': session,
                'message': 'Checkout session created successfully'
            }, status=status.HTTP_200_OK)

        except StripeIntegrationError as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class CreatePortalSessionView(APIView):
    """
    Create a Stripe Billing Portal Session for managing existing subscriptions.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreatePortalSessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

        return_url = serializer.validated_data['return_url']

        try:
            user = request.user
            customer_id = user.stripe_customer_id
            
            if not customer_id:
                 # If no customer ID, try to create one or fail
                 customer_id = create_stripe_customer(user, user.email)

            session = create_portal_session(
                customer_id=customer_id,
                return_url=return_url
            )

            return Response({
                'status': 'success',
                'data': session,
                'message': 'Portal session created successfully'
            }, status=status.HTTP_200_OK)

        except StripeIntegrationError as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


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
            if event_type == 'checkout.session.completed':
                handle_checkout_session_completed(event)
            elif event_type == 'customer.subscription.created':
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


