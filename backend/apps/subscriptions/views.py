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
    CreateSubscriptionSerializer,
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


class PaymentMethodView(APIView):
    """
    Retrieve default payment method summary for current user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if not user.email:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Email is required to manage payment methods'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            customer_id = user.stripe_customer_id or create_stripe_customer(user, user.email)
            payment_method = get_customer_payment_method(customer_id)

            return Response({
                'status': 'success',
                'data': payment_method,
                'message': 'Payment method retrieved successfully'
            }, status=status.HTTP_200_OK)

        except StripeIntegrationError as e:
            return Response({
                'status': 'error',
                'data': None,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class UpdatePaymentMethodView(APIView):
    """
    Update default payment method for current user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = UpdatePaymentMethodSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'status': 'error',
                'data': serializer.errors,
                'message': 'Validation failed'
            }, status=status.HTTP_400_BAD_REQUEST)

        payment_method_id = serializer.validated_data['payment_method_id']

        try:
            user = request.user
            if not user.email:
                return Response({
                    'status': 'error',
                    'data': None,
                    'message': 'Email is required to manage payment methods'
                }, status=status.HTTP_400_BAD_REQUEST)

            customer_id = user.stripe_customer_id or create_stripe_customer(user, user.email)
            attach_payment_method_to_customer(customer_id, payment_method_id)
            payment_method = get_customer_payment_method(customer_id)

            return Response({
                'status': 'success',
                'data': payment_method,
                'message': 'Payment method updated successfully'
            }, status=status.HTTP_200_OK)

        except StripeIntegrationError as e:
            return Response({
                'status': 'error',
                'data': None,
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
                
                # If user has an active subscription, schedule change for end of current period
                if existing_subscription:
                    try:
                        price_id_monthly = get_price_id(plan, 'monthly')
                        price_id_annual = get_price_id(plan, 'annual')
                        
                        # Schedule cancellation at period end to allow plan swap
                        if not existing_subscription.cancel_at_period_end:
                            cancel_subscription(existing_subscription.stripe_subscription_id, cancel_at_period_end=True)

                        existing_subscription.pending_plan = plan
                        existing_subscription.pending_billing_cycle = billing_cycle
                        existing_subscription.pending_price_id_monthly = price_id_monthly
                        existing_subscription.pending_price_id_annual = price_id_annual
                        existing_subscription.pending_requested_at = timezone.now()
                        existing_subscription.save(update_fields=[
                            'pending_plan',
                            'pending_billing_cycle',
                            'pending_price_id_monthly',
                            'pending_price_id_annual',
                            'pending_requested_at',
                            'cancel_at_period_end',
                        ])

                        user.subscription_tier = existing_subscription.plan
                        user.subscription_status = existing_subscription.status
                        user.subscription_end_date = existing_subscription.current_period_end
                        user.save(update_fields=['subscription_tier', 'subscription_status', 'subscription_end_date'])
                        
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
                                'pending_plan': plan,
                                'pending_billing_cycle': billing_cycle,
                                'user': {
                                    'id': str(user.id),
                                    'subscription_tier': user.subscription_tier,
                                },
                            },
                            'message': 'Plan change scheduled for the end of the current period'
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
                            'client_secret': subscription_data.get('client_secret'),
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
        """
        Cancel subscription at period end.
        
        If user has more than 3 accounts, account_ids must be provided to select which accounts to keep.
        """
        subscription = self.get_object()
        user = subscription.user
        
        # Check for excess accounts BEFORE cancelling
        active_account_count = None
        free_limit = None
        try:
            from apps.accounts.models import Account
            from apps.subscriptions.limits import FEATURE_ACCOUNTS, TIER_FREE
            from apps.subscriptions.limits import get_limit as get_subscription_limit
            
            active_account_count = Account.objects.for_user(user).active().count()
            free_limit = get_subscription_limit(TIER_FREE, FEATURE_ACCOUNTS)
            
            # If user has excess accounts, require account selection
            if active_account_count > free_limit:
                excess_count = active_account_count - free_limit
                account_ids = request.data.get('account_ids', [])
                
                # If no account IDs provided, return error requiring selection
                if not account_ids:
                    # Get user's accounts for the frontend to display
                    user_accounts = Account.objects.for_user(user).active().values(
                        'account_id', 'institution_name', 'custom_name', 'account_type', 'balance', 'account_number_masked'
                    )
                    
                    return Response({
                        'status': 'error',
                        'data': {
                            'account_selection_required': True,
                            'excess_account_count': excess_count,
                            'free_tier_limit': free_limit,
                            'total_accounts': active_account_count,
                            'accounts': list(user_accounts),
                        },
                        'message': (
                            f'You have {excess_count} account(s) exceeding the free tier limit of {free_limit}. '
                            f'Please select which {free_limit} accounts you want to keep active.'
                        ),
                        'error_code': 'ACCOUNT_SELECTION_REQUIRED'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Validate account selection if provided
                serializer = AccountSelectionSerializer(
                    data={'account_ids': account_ids},
                    context={'request': request}
                )
                if not serializer.is_valid():
                    return Response({
                        'status': 'error',
                        'data': serializer.errors,
                        'message': 'Invalid account selection',
                        'error_code': 'INVALID_ACCOUNT_SELECTION'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                validated_account_ids = serializer.validated_data['account_ids']
                
                # Create/update account downgrade selection BEFORE cancelling
                AccountDowngradeSelection.objects.update_or_create(
                    subscription=subscription,
                    defaults={
                        'user': user,
                        'accounts_to_keep': [str(account_id) for account_id in validated_account_ids],
                        'selection_completed_at': timezone.now(),
                        'deactivation_scheduled_at': subscription.current_period_end,
                    }
                )
                
        except Exception as e:
            logger.error(f"Error checking account limits during cancellation: {e}", exc_info=True)
            # Continue with cancellation even if check fails
        
        try:
            # Cancel in Stripe
            cancel_data = cancel_subscription(
                subscription.stripe_subscription_id,
                cancel_at_period_end=True
            )
            
            # Update subscription
            subscription.cancel_at_period_end = True
            subscription.pending_plan = None
            subscription.pending_billing_cycle = None
            subscription.pending_price_id_monthly = None
            subscription.pending_price_id_annual = None
            subscription.pending_requested_at = None
            subscription.save(update_fields=[
                'cancel_at_period_end',
                'pending_plan',
                'pending_billing_cycle',
                'pending_price_id_monthly',
                'pending_price_id_annual',
                'pending_requested_at',
            ])
            
            # Prepare response
            response_data = {
                'subscription_id': str(subscription.subscription_id),
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'current_period_end': subscription.current_period_end.isoformat(),
            }
            
            # Add account selection info if applicable
            try:
                if active_account_count and free_limit and active_account_count > free_limit:
                    selection = AccountDowngradeSelection.objects.filter(
                        subscription=subscription
                    ).first()
                    if selection:
                        response_data['account_selection'] = {
                            'accounts_to_keep': selection.accounts_to_keep,
                            'selection_completed_at': selection.selection_completed_at.isoformat() if selection.selection_completed_at else None,
                        }
            except Exception:
                pass
            
            return Response({
                'status': 'success',
                'data': response_data,
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

    @action(detail=True, methods=['post'], url_path='keep-current-plan')
    def keep_current_plan(self, request, pk=None):
        """Resume subscription and clear pending plan changes."""
        subscription = self.get_object()

        try:
            resume_subscription(subscription.stripe_subscription_id)
            subscription.cancel_at_period_end = False
            subscription.pending_plan = None
            subscription.pending_billing_cycle = None
            subscription.pending_price_id_monthly = None
            subscription.pending_price_id_annual = None
            subscription.pending_requested_at = None
            subscription.save(update_fields=[
                'cancel_at_period_end',
                'pending_plan',
                'pending_billing_cycle',
                'pending_price_id_monthly',
                'pending_price_id_annual',
                'pending_requested_at',
            ])

            # Cancel any pending account downgrade selection if subscription is resumed
            AccountDowngradeSelection.objects.filter(
                subscription=subscription,
                deactivation_completed_at__isnull=True
            ).delete()

            serializer = self.get_serializer(subscription)
            return Response({
                'status': 'success',
                'data': serializer.data,
                'message': 'Subscription will continue without changes'
            }, status=status.HTTP_200_OK)

        except (stripe.StripeError, StripeIntegrationError) as e:
            logger.error(f"Failed to resume subscription: {e}")
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to keep current plan',
                'errors': {'detail': str(e)}
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'post'], url_path='select-accounts')
    def select_accounts(self, request, pk=None):
        """
        Get or update account selection for downgrade.
        
        GET /api/v1/subscriptions/{subscription_id}/select-accounts/
        Returns current account selection if exists.
        
        POST /api/v1/subscriptions/{subscription_id}/select-accounts/
        Body: {"account_ids": ["uuid1", "uuid2", "uuid3"]}
        """
        subscription = self.get_object()
        user = request.user
        
        # Validate subscription belongs to user
        if subscription.user != user:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Subscription not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate subscription is cancelled
        if not subscription.cancel_at_period_end:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Subscription is not scheduled for cancellation. Account selection is only required when downgrading.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle GET request - return current selection
        if request.method == 'GET':
            try:
                from apps.accounts.models import Account
                from apps.subscriptions.limits import FEATURE_ACCOUNTS, TIER_FREE
                from apps.subscriptions.limits import get_limit as get_subscription_limit
                
                selection = AccountDowngradeSelection.objects.filter(
                    subscription=subscription,
                    deactivation_completed_at__isnull=True
                ).first()
                
                # Get all active accounts for the user
                active_accounts = Account.objects.for_user(user).active().values(
                    'account_id', 'institution_name', 'custom_name', 'account_type', 'balance', 'account_number_masked'
                )
                
                free_limit = get_subscription_limit(TIER_FREE, FEATURE_ACCOUNTS)
                active_account_count = len(active_accounts)
                
                response_data = {
                    'has_selection': selection is not None,
                    'accounts_to_keep': selection.accounts_to_keep if selection else [],
                    'selection_completed_at': selection.selection_completed_at.isoformat() if selection and selection.selection_completed_at else None,
                    'deactivation_scheduled_at': selection.deactivation_scheduled_at.isoformat() if selection else subscription.current_period_end.isoformat(),
                    'current_period_end': subscription.current_period_end.isoformat(),
                    'total_accounts': active_account_count,
                    'free_tier_limit': free_limit,
                    'excess_account_count': max(0, active_account_count - free_limit),
                    'accounts': list(active_accounts),
                }
                
                return Response({
                    'status': 'success',
                    'data': response_data,
                    'message': 'Account selection retrieved successfully' if selection else 'No account selection found'
                }, status=status.HTTP_200_OK)
                
            except Exception as e:
                logger.error(f"Error retrieving account selection: {e}", exc_info=True)
                return Response({
                    'status': 'error',
                    'data': None,
                    'message': 'Failed to retrieve account selection'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Handle POST request - update selection
        # Validate account selection
        serializer = AccountSelectionSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        account_ids = serializer.validated_data['account_ids']
        
        # Create or update account downgrade selection
        selection, created = AccountDowngradeSelection.objects.update_or_create(
            subscription=subscription,
            defaults={
                'user': user,
                'accounts_to_keep': [str(account_id) for account_id in account_ids],
                'selection_completed_at': timezone.now(),
                'deactivation_scheduled_at': subscription.current_period_end,
            }
        )
        
        logger.info(
            f"User {user.id} selected {len(account_ids)} accounts to keep "
            f"for subscription {subscription.subscription_id}"
        )
        
        return Response({
            'status': 'success',
            'data': {
                'selection_id': str(selection.id),
                'accounts_to_keep': account_ids,
                'deactivation_scheduled_at': selection.deactivation_scheduled_at.isoformat(),
                'current_period_end': subscription.current_period_end.isoformat(),
            },
            'message': f'Account selection saved. {len(account_ids)} account(s) will remain active after downgrade.'
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


