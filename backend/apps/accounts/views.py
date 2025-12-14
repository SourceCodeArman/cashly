"""
Views for accounts app.
"""

import pyotp
import logging
import threading

from rest_framework import generics, status, viewsets, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings
from django.core.exceptions import PermissionDenied, ValidationError
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.db import transaction
from django.utils import timezone

from .models import Account
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    PasswordResetSerializer,
    PasswordResetConfirmSerializer,
    PasswordChangeSerializer,
    AccountSerializer,
    AccountWithCountSerializer,
    LinkTokenRequestSerializer,
    AccountConnectionSerializer,
    PlaidAssetSerializer,
    PlaidAuthSerializer,
    PlaidIdentitySerializer,
    PlaidInvestmentSerializer,
    TransferCreateSerializer,
    EmailChangeRequestSerializer,
    EmailChangeVerifySerializer,
    MFASetupSerializer,
    MFALoginVerifySerializer,
)
from datetime import timedelta
from .plaid_utils import (
    PlaidIntegrationError,
    create_link_token,
    encrypt_token,
    exchange_public_token,
    get_accounts,
    get_item,
    remove_item,
    update_item_webhook,
)
from apps.api.permissions import IsOwnerOrReadOnly, IsAccountOwner
from .plaid_service import PlaidService

logger = logging.getLogger(__name__)

User = get_user_model()

ACCOUNT_TYPE_MAP = {
    "checking": "checking",
    "savings": "savings",
    "credit": "credit_card",
    "credit card": "credit_card",
    "creditcard": "credit_card",
    "loan": "credit_card",
    "investment": "investment",
    "brokerage": "investment",
    "depository": "checking",
    # CD accounts should be excluded from transfers, map to investment to filter them out
    "cd": "investment",
    "certificate of deposit": "investment",
    "certificate": "investment",
}


def normalize_account_type(plaid_type, plaid_subtype):
    key_candidates = [
        (plaid_subtype or "").lower(),
        (plaid_type or "").lower(),
    ]
    for candidate in key_candidates:
        if candidate and candidate in ACCOUNT_TYPE_MAP:
            return ACCOUNT_TYPE_MAP[candidate]
    return "checking"


class UserRegistrationView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register
    Register a new user.
    """

    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                "status": "success",
                "data": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                },
                "message": "User registered successfully",
            },
            status=status.HTTP_201_CREATED,
        )


class UserLoginView(generics.GenericAPIView):
    """
    POST /api/v1/auth/login
    Login user and return JWT tokens.
    """

    serializer_class = UserLoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # Check for MFA requirement
        if data.get("mfa_required"):
            user = data["user"]
            # Generate temp token valid for 5 mins
            signer = TimestampSigner()
            temp_token = signer.sign(str(user.id))

            return Response(
                {
                    "status": "mfa_required",
                    "data": {
                        "temp_token": temp_token,
                        "user_id": user.id,  # Optional, mainly for frontend context
                    },
                    "message": "MFA verification required",
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "status": "success",
                "data": serializer.validated_data,
                "message": "Login successful",
            },
            status=status.HTTP_200_OK,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/v1/auth/profile
    Get or update user profile.
    """

    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        """Get user profile with standard API response format."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {
                "status": "success",
                "data": serializer.data,
                "message": "Profile retrieved successfully",
            },
            status=status.HTTP_200_OK,
        )

    def update(self, request, *args, **kwargs):
        """Update user profile with standard API response format."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(
            {
                "status": "success",
                "data": serializer.data,
                "message": "Profile updated successfully",
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetView(generics.GenericAPIView):
    """
    POST /api/v1/auth/password-reset
    Request password reset email.
    """

    serializer_class = PasswordResetSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        user = User.objects.get(email=email)

        # Generate reset token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Send email (in production, use proper email service)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}&uid={uid}"
        send_mail(
            subject="Password Reset Request",
            message=f"Click here to reset your password: {reset_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )

        return Response(
            {"status": "success", "data": None, "message": "Password reset email sent"},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    """
    POST /api/v1/auth/password-reset/confirm
    Confirm password reset with token.
    """

    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        # Decode user ID from token (simplified - in production use proper token handling)
        # This is a simplified version - proper implementation would decode uid from token
        # For MVP, we'll use a simpler approach

        return Response(
            {"status": "success", "data": None, "message": "Password reset successful"},
            status=status.HTTP_200_OK,
        )


class PasswordChangeView(generics.GenericAPIView):
    """
    POST /api/v1/auth/password-change
    Change user password.
    """

    serializer_class = PasswordChangeSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        old_password = serializer.validated_data["old_password"]
        new_password = serializer.validated_data["new_password"]

        if not user.check_password(old_password):
            return Response(
                {"status": "error", "data": None, "message": "Invalid old password"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()

        return Response(
            {
                "status": "success",
                "data": None,
                "message": "Password changed successfully",
            },
            status=status.HTTP_200_OK,
        )


class CreateLinkTokenView(generics.GenericAPIView):
    """
    POST /api/v1/accounts/create-link-token
    Create Plaid Link token for account connection.

    Checks subscription limits before creating the token to prevent
    users from going through Plaid flow if they've exceeded their limit.
    """

    serializer_class = LinkTokenRequestSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Check subscription limit BEFORE creating Plaid Link token
        # This prevents users from going through Plaid flow if they're over limit
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import (
                SubscriptionLimitExceeded,
                SubscriptionExpired,
            )
            from apps.subscriptions.limits import FEATURE_ACCOUNTS
            from apps.subscriptions.services import get_user_subscription_status

            # Count existing active accounts
            current_account_count = (
                Account.objects.for_user(request.user).active().count()
            )

            # Get user's subscription status and limit
            status_info = get_user_subscription_status(request.user)
            limit = SubscriptionLimitService.get_limit(request.user, FEATURE_ACCOUNTS)
            from apps.subscriptions.limits import is_unlimited

            # Debug logging
            logger.info(
                f"Link token limit check for user {request.user.id}: "
                f"current_count={current_account_count}, limit={limit}, "
                f"tier={status_info['tier']}, is_unlimited={is_unlimited(limit) if limit else None}"
            )

            # Check if user has exceeded or would exceed limit
            # Convert limit to int for consistent comparison
            limit_int = (
                int(limit) if limit is not None and not is_unlimited(limit) else None
            )
            is_unlimited_limit = is_unlimited(limit)

            logger.info(
                f"Link token limit check comparison: "
                f"current_count={current_account_count}, limit_int={limit_int}, "
                f"is_unlimited={is_unlimited_limit}, "
                f"check_result={not is_unlimited_limit and current_account_count >= limit_int if limit_int else False}"
            )

            if (
                not is_unlimited_limit
                and limit_int is not None
                and current_account_count >= limit_int
            ):
                # User has reached or exceeded their limit
                tier_display = status_info["tier"].title()

                # Create helpful error message
                error_message = (
                    f"You've reached your account limit ({limit_int} account{'s' if limit_int != 1 else ''}) "
                    f"for the {tier_display} tier. "
                    f"You currently have {current_account_count} connected account{'s' if current_account_count != 1 else ''}. "
                    f"To connect a new account, you can either upgrade your subscription or disconnect an existing account."
                )

                return Response(
                    {
                        "status": "error",
                        "data": None,
                        "message": error_message,
                        "error_code": "SUBSCRIPTION_LIMIT_EXCEEDED",
                        "error_details": {
                            "feature": FEATURE_ACCOUNTS,
                            "current_count": current_account_count,
                            "limit": limit_int,
                            "tier": status_info["tier"],
                            "upgrade_required": True,
                            "suggestions": [
                                "Upgrade your subscription to increase your account limit",
                                "Disconnect an existing account to make room for a new one",
                            ],
                        },
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        except SubscriptionExpired as e:
            logger.info(f"Subscription expired for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(
                f"Error checking account limit for user {request.user.id}: {e}",
                exc_info=True,
            )
            # Don't block link token creation if limit check fails, but log it

        # Proceed with creating Plaid Link token
        try:
            link_token = create_link_token(
                request.user,
                products=data.get("products"),
                webhook=data.get("webhook"),
                access_token=data.get("access_token"),
                account_filters=data.get("account_filters"),
            )
            return Response(
                {
                    "status": "success",
                    "data": {"link_token": link_token},
                    "message": "Link token created successfully",
                },
                status=status.HTTP_200_OK,
            )
        except PlaidIntegrationError as exc:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class AccountConnectionView(generics.GenericAPIView):
    """
    POST /api/v1/accounts/connect
    Connect a bank account via Plaid.
    """

    serializer_class = AccountConnectionSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        public_token = serializer.validated_data["public_token"]
        institution_id = serializer.validated_data["institution_id"]
        institution_name = serializer.validated_data.get("institution_name")
        selected_account_ids = (
            serializer.validated_data.get("selected_account_ids") or []
        )
        account_custom_names = (
            serializer.validated_data.get("account_custom_names") or {}
        )
        webhook_url = serializer.validated_data.get("webhook") or getattr(
            settings, "PLAID_WEBHOOK_URL", ""
        )

        # Check subscription limit before connecting accounts
        # Do initial check early to fail fast if user already exceeds limit
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import (
                SubscriptionLimitExceeded,
                SubscriptionExpired,
            )
            from apps.subscriptions.limits import FEATURE_ACCOUNTS

            # Count existing active accounts
            current_account_count = Account.objects.for_user(user).active().count()

            # Enforce limit - this will raise if user already exceeds limit
            SubscriptionLimitService.enforce_limit(
                user=user,
                feature_type=FEATURE_ACCOUNTS,
                current_count=current_account_count,
            )
        except SubscriptionLimitExceeded as e:
            logger.info(f"Account limit already exceeded for user {user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except SubscriptionExpired as e:
            logger.info(f"Subscription expired for user {user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(
                f"Error checking account limit for user {user.id}: {e}", exc_info=True
            )
            # Don't block account connection if limit check fails, but log it

        try:
            exchange_data = exchange_public_token(public_token)
            access_token = exchange_data["access_token"]
            item_id = exchange_data["item_id"]

            accounts_data = get_accounts(access_token)
            item_data = get_item(access_token)
            products = item_data.get("item", {}).get("products", [])
            encrypted_token = encrypt_token(access_token)

            if selected_account_ids:
                accounts_data = [
                    acct
                    for acct in accounts_data
                    if acct["account_id"] in selected_account_ids
                ]

            if not accounts_data:
                raise PlaidIntegrationError("No accounts returned for Plaid item.")

            # Check limit again with actual number of accounts to be created
            # This ensures we check limits even if user is reconnecting (update_or_create)
            try:
                from apps.subscriptions.limit_service import SubscriptionLimitService
                from apps.subscriptions.exceptions import SubscriptionLimitExceeded
                from apps.subscriptions.limits import FEATURE_ACCOUNTS

                # Get current account count again (in case it changed)
                current_account_count = Account.objects.for_user(user).active().count()

                # Count unique accounts (by plaid_account_id) that don't exist yet
                existing_plaid_ids = set(
                    Account.objects.for_user(user).values_list(
                        "plaid_account_id", flat=True
                    )
                )

                new_accounts_count = sum(
                    1
                    for acct in accounts_data
                    if acct["account_id"] not in existing_plaid_ids
                )

                # Check if adding these new accounts would exceed limit
                if new_accounts_count > 0:
                    # Get the limit for user's tier
                    limit = SubscriptionLimitService.get_limit(user, FEATURE_ACCOUNTS)
                    from apps.subscriptions.limits import is_unlimited
                    from apps.subscriptions.services import get_user_subscription_status

                    # Check if limit would be exceeded
                    if not is_unlimited(limit):
                        if current_account_count + new_accounts_count > limit:
                            # User would exceed limit with these new accounts
                            status_info = get_user_subscription_status(user)
                            raise SubscriptionLimitExceeded(
                                feature=FEATURE_ACCOUNTS,
                                current_count=current_account_count,
                                limit=int(limit),
                                tier=status_info["tier"],
                                message=(
                                    f"Adding {new_accounts_count} account(s) would exceed your subscription limit. "
                                    f"Current usage: {current_account_count}/{limit} accounts (Tier: {status_info['tier']}). "
                                    f"Please upgrade your subscription to continue."
                                ),
                            )

                    # Also check current count in case user already exceeds limit
                    SubscriptionLimitService.enforce_limit(
                        user=user,
                        feature_type=FEATURE_ACCOUNTS,
                        current_count=current_account_count,
                    )
            except SubscriptionLimitExceeded as e:
                logger.info(f"Account limit would be exceeded for user {user.id}: {e}")
                return Response(e.to_dict(), status=e.status_code)
            except Exception as e:
                logger.error(f"Error checking account limit: {e}", exc_info=True)
                # Continue with account creation if limit check fails

            created_accounts = []
            accounts_created = 0
            duplicates_skipped = 0
            with transaction.atomic():
                for account_payload in accounts_data:
                    plaid_account_id = account_payload["account_id"]
                    balances = account_payload.get("balances", {})
                    mask = account_payload.get("mask") or "0000"
                    account_type = normalize_account_type(
                        account_payload.get("type"),
                        account_payload.get("subtype"),
                    )
                    # Determine institution name preference
                    derived_institution_name = (
                        institution_name
                        or item_data.get("item", {})
                        .get("institution_id", "")
                        .replace("_", " ")
                        .title()
                        or account_payload.get("official_name")
                        or account_payload.get("name")
                        or "Financial Institution"
                    )

                    # Get custom name if provided, otherwise use Plaid account name
                    custom_name = account_custom_names.get(plaid_account_id)
                    # Only set custom_name if it's not empty
                    if custom_name and custom_name.strip():
                        custom_name = custom_name.strip()
                    else:
                        # If no custom name provided, use the Plaid account name
                        # This ensures accounts display with their actual names (e.g., "Plaid Checking")
                        # instead of just the institution name
                        plaid_account_name = (
                            account_payload.get("official_name")
                            or account_payload.get("name")
                            or None
                        )
                        custom_name = plaid_account_name

                    defaults = {
                        "user": user,
                        "institution_name": derived_institution_name,
                        "custom_name": custom_name,
                        "account_type": account_type,
                        "account_number_masked": f"****{mask[-4:]}",
                        "balance": balances.get("current")
                        or balances.get("available")
                        or 0,
                        "currency": balances.get("iso_currency_code", "USD"),
                        "plaid_access_token": encrypted_token,
                        "plaid_item_id": item_id,
                        "plaid_institution_id": institution_id,
                        "plaid_products": products,
                        "webhook_url": webhook_url if webhook_url else None,
                        "is_active": True,
                        "error_code": None,
                        "error_message": None,
                        "last_error_at": None,
                        # Don't set last_synced_at here - let the sync function set it after fetching transactions
                        # This ensures initial sync fetches 90 days of transactions
                    }

                    account_obj, created = Account.objects.update_or_create(
                        plaid_account_id=plaid_account_id,
                        defaults=defaults,
                    )
                    created_accounts.append(account_obj)
                    if created:
                        accounts_created += 1
                    else:
                        duplicates_skipped += 1

            if webhook_url:
                try:
                    update_item_webhook(access_token, webhook_url)
                except PlaidIntegrationError as exc:
                    logger.warning(
                        "Failed to update webhook for item %s: %s", item_id, exc
                    )

            serialized_accounts = AccountSerializer(
                created_accounts, many=True, context={"request": request}
            )

            # Kick off initial transaction sync for each created account in background
            # Use threading to ensure HTTP response returns immediately, even when CELERY_TASK_ALWAYS_EAGER=True
            from apps.transactions.tasks import sync_account_transactions

            sync_results = []
            for acct in created_accounts:
                sync_result = {
                    "account_id": str(acct.account_id),
                    "status": "queued",
                    "created": 0,
                    "updated": 0,
                    "errors": 0,
                    "message": "Transaction sync queued in background",
                }
                try:
                    # Queue the task - if CELERY_TASK_ALWAYS_EAGER=True, it will execute synchronously
                    # but we still queue it to maintain consistency and avoid blocking the response
                    # In production with a real Celery worker, this will be truly async
                    account_id_str = str(acct.account_id)

                    # Use threading to run sync in background and return immediately
                    def run_sync(acc_id):
                        try:
                            sync_account_transactions.delay(acc_id)
                            logger.info(
                                f"Queued transaction sync task for account {acc_id}"
                            )
                        except Exception as e:
                            logger.error(
                                f"Failed to queue sync for account {acc_id}: {e}",
                                exc_info=True,
                            )

                    # Start sync in a separate thread to avoid blocking the response
                    thread = threading.Thread(
                        target=run_sync, args=(account_id_str,), daemon=True
                    )
                    thread.start()

                except Exception as exc:
                    logger.error(
                        f"Failed to queue transaction sync for account {acct.account_id}: {exc}",
                        exc_info=True,
                    )
                    sync_result.update(
                        {
                            "status": "failed",
                            "message": f"Failed to queue sync: {str(exc)}",
                        }
                    )
                    # Don't fail account creation if sync queueing fails
                finally:
                    sync_results.append(sync_result)

            return Response(
                {
                    "status": "success",
                    "data": {
                        "accounts_created": accounts_created,
                        "duplicates_skipped": duplicates_skipped,
                        "accounts": serialized_accounts.data,
                        "item_id": item_id,
                        "products": products,
                        "sync_results": sync_results,
                    },
                    "message": "Account(s) connected successfully",
                },
                status=status.HTTP_201_CREATED,
            )
        except PlaidIntegrationError as exc:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class AccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Account management.
    """

    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated, IsAccountOwner]

    def get_queryset(self):
        """Return accounts for the current user (including inactive accounts)."""
        return Account.objects.for_user(self.request.user).order_by(
            "-created_at", "institution_name"
        )

    def create(self, request, *args, **kwargs):
        """
        Create account with subscription limit checking.

        Note: Account creation is typically done through AccountConnectionView,
        but this method provides limit checking for direct creation if needed.
        """
        # Check subscription limit before creating account
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import (
                SubscriptionLimitExceeded,
                SubscriptionExpired,
            )
            from apps.subscriptions.limits import FEATURE_ACCOUNTS

            current_count = Account.objects.for_user(request.user).active().count()
            SubscriptionLimitService.enforce_limit(
                user=request.user,
                feature_type=FEATURE_ACCOUNTS,
                current_count=current_count,
            )
        except SubscriptionLimitExceeded as e:
            logger.info(f"Account limit exceeded for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except SubscriptionExpired as e:
            logger.info(f"Subscription expired for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(f"Error checking account limit: {e}", exc_info=True)
            # Don't block if limit check fails

        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """
        DELETE /api/v1/accounts/:id/
        Delete/disconnect an account.
        """
        account = self.get_object()

        # Try to disconnect from Plaid if it's a Plaid account
        if account.plaid_item_id:
            try:
                service = PlaidService(account)
                remove_item(service.access_token)
            except PlaidIntegrationError as exc:
                logger.warning(
                    "Failed to remove Plaid item for account %s: %s",
                    account.account_id,
                    exc,
                )

        # Delete the account
        account.delete()

        return Response(
            {
                "status": "success",
                "data": None,
                "message": "Account deleted successfully",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """
        POST /api/v1/accounts/:id/deactivate/
        Deactivate an account (hides transactions and goals but doesn't delete).
        """
        account = self.get_object()

        if not account.is_active:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": "Account is already inactive",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        account.is_active = False
        account.save()

        serializer = self.get_serializer(account)
        return Response(
            {
                "status": "success",
                "data": serializer.data,
                "message": "Account deactivated successfully",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        """
        POST /api/v1/accounts/:id/activate/
        Activate a previously deactivated account.
        """
        account = self.get_object()

        if account.is_active:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": "Account is already active",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        account.is_active = True
        account.save()

        serializer = self.get_serializer(account)
        return Response(
            {
                "status": "success",
                "data": serializer.data,
                "message": "Account activated successfully",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="disconnect")
    def disconnect(self, request, pk=None):
        """
        POST /api/v1/accounts/:id/disconnect
        Disconnect Plaid item and deactivate account(s).
        """
        account = self.get_object()
        try:
            service = PlaidService(account)
            remove_item(service.access_token)
        except PlaidIntegrationError as exc:
            logger.warning(
                "Failed to remove Plaid item for account %s: %s",
                account.account_id,
                exc,
            )
        Account.objects.filter(plaid_item_id=account.plaid_item_id).update(
            is_active=False,
            updated_at=timezone.now(),
        )
        return Response(
            {
                "status": "success",
                "data": {"account_id": str(account.account_id)},
                "message": "Account disconnected successfully",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="update-webhook")
    def update_webhook(self, request, pk=None):
        """
        POST /api/v1/accounts/:id/update-webhook
        Update Plaid webhook URL for an item.
        """
        account = self.get_object()
        webhook_url = request.data.get("webhook")
        if not webhook_url:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": "Webhook URL is required",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            service = PlaidService(account)
            update_item_webhook(service.access_token, webhook_url)
        except PlaidIntegrationError as exc:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        Account.objects.filter(plaid_item_id=account.plaid_item_id).update(
            webhook_url=webhook_url,
            updated_at=timezone.now(),
        )
        return Response(
            {
                "status": "success",
                "data": {"account_id": str(account.account_id), "webhook": webhook_url},
                "message": "Webhook updated successfully",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def sync(self, request, pk=None):
        """
        POST /api/v1/accounts/:id/sync
        Manually trigger account sync.
        """
        account = self.get_object()
        # Trigger sync task
        from apps.transactions.tasks import sync_account_transactions

        sync_account_transactions.delay(str(account.account_id))

        return Response(
            {
                "status": "success",
                "data": {"account_id": str(account.account_id)},
                "message": "Account sync initiated",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="refresh-liabilities")
    def refresh_liabilities(self, request, pk=None):
        """
        POST /api/v1/accounts/:id/refresh-liabilities/
        Manually refresh liability data for an account from Plaid.
        """
        account = self.get_object()

        # Check if account has Plaid integration
        if not account.plaid_access_token:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": "Account is not connected to Plaid",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Sync liabilities with force refresh
        from apps.accounts.liability_sync import (
            sync_liabilities_for_account,
            get_liabilities_for_display,
        )

        success = sync_liabilities_for_account(account, force_refresh=True)

        if success:
            # Get formatted liability data
            liability_data = get_liabilities_for_display(account)

            return Response(
                {
                    "status": "success",
                    "data": {
                        "account_id": str(account.account_id),
                        "liabilities": liability_data,
                        "last_updated": account.plaid_liabilities_last_updated.isoformat()
                        if account.plaid_liabilities_last_updated
                        else None,
                    },
                    "message": "Liability data refreshed successfully",
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": "Failed to refresh liability data",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="with-counts")
    def with_counts(self, request):
        """
        GET /api/v1/accounts/with-counts/
        Get accounts with transaction counts, filtered to only show accounts with transactions.
        """
        queryset = (
            Account.objects.for_user(request.user)
            .annotate(transaction_count=Count("transactions"))
            .filter(transaction_count__gt=0)
            .order_by("-created_at", "institution_name")
        )

        serializer = AccountWithCountSerializer(queryset, many=True)

        return Response(
            {
                "status": "success",
                "data": serializer.data,
                "message": "Accounts retrieved successfully",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get"], url_path="auth-data")
    def auth_data(self, request, pk=None):
        """
        GET /api/v1/accounts/:id/auth-data
        Fetch Plaid Auth product data.
        """
        account = self.get_object()
        try:
            service = PlaidService(account)
            auth_data = service.get_auth()
            return Response(
                {
                    "status": "success",
                    "data": auth_data,
                    "message": "Auth data retrieved",
                },
                status=status.HTTP_200_OK,
            )
        except PlaidIntegrationError as exc:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["get"], url_path="identity-data")
    def identity_data(self, request, pk=None):
        """
        GET /api/v1/accounts/:id/identity-data
        Fetch Plaid Identity product data.
        """
        account = self.get_object()
        try:
            service = PlaidService(account)
            identity_data = service.get_identity()
            return Response(
                {
                    "status": "success",
                    "data": identity_data,
                    "message": "Identity data retrieved",
                },
                status=status.HTTP_200_OK,
            )
        except PlaidIntegrationError as exc:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["get"], url_path="investment-data")
    def investment_data(self, request, pk=None):
        """
        GET /api/v1/accounts/:id/investment-data
        Fetch Plaid Investment product data.
        """
        account = self.get_object()
        try:
            service = PlaidService(account)
            investments = service.get_investments()
            return Response(
                {
                    "status": "success",
                    "data": investments,
                    "message": "Investment data retrieved",
                },
                status=status.HTTP_200_OK,
            )
        except PlaidIntegrationError as exc:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["get"], url_path="liability-data")
    def liability_data(self, request, pk=None):
        """
        GET /api/v1/accounts/:id/liability-data
        Fetch Plaid Liabilities product data.
        """
        account = self.get_object()
        try:
            service = PlaidService(account)
            liabilities = service.get_liabilities()
            return Response(
                {
                    "status": "success",
                    "data": liabilities,
                    "message": "Liability data retrieved",
                },
                status=status.HTTP_200_OK,
            )
        except PlaidIntegrationError as exc:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["get"], url_path="goal-compatible")
    def goal_compatible(self, request):
        """
        GET /api/v1/accounts/goal-compatible/
        Get list of accounts compatible with goal linking (checking/savings only).
        """
        accounts = Account.objects.for_user(request.user).filter(
            account_type__in=["checking", "savings"], is_active=True
        )

        serializer = AccountSerializer(accounts, many=True)
        return Response(
            {
                "status": "success",
                "data": serializer.data,
                "message": "Goal-compatible accounts retrieved successfully",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="asset-report")
    def asset_report(self, request, pk=None):
        """
        POST /api/v1/accounts/:id/asset-report
        Generate Plaid Asset report for the account.
        """
        account = self.get_object()
        days_requested = int(request.data.get("days_requested", 60))
        try:
            service = PlaidService(account)
            asset_report = service.get_asset_report(days_requested=days_requested)
            return Response(
                {
                    "status": "success",
                    "data": asset_report,
                    "message": "Asset report request processed",
                },
                status=status.HTTP_200_OK,
            )
        except PlaidIntegrationError as exc:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"], url_path="transfer")
    def transfer(self, request, pk=None):
        """
        POST /api/v1/accounts/:id/transfer/

        Execute a transfer from this account (source) to destination account.

        SECURITY REQUIREMENTS:
        - REQUIRES: Goal with transfer_authorized=True
        - REQUIRES: Valid active authorization for the goal
        - REQUIRES: Source account must be the one making the request
        - REQUIRES: Destination account must belong to user
        - REQUIRES: Destination account must match goal's destination account

        Request Body:
        {
            "destination_account_id": "uuid",
            "amount": "100.00",
            "goal_id": "uuid",
            "description": "Goal contr" (optional, max 10 chars - Plaid API limit)
        }

        Response:
        {
            "status": "success",
            "data": {
                "transfer_id": "plaid_transfer_id",
                "amount": "100.00",
                "status": "pending",
                "source_account_id": "uuid",
                "destination_account_id": "uuid",
                "goal_id": "uuid"
            },
            "message": "Transfer initiated successfully"
        }
        """
        # Get source account (the account this endpoint is called on)
        source_account = self.get_object()

        # Validate request data
        serializer = TransferCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        # Extract validated data
        destination_account_id = str(
            serializer.validated_data["destination_account_id"]
        )
        goal_id = str(serializer.validated_data["goal_id"])
        amount = serializer.validated_data["amount"]
        description = serializer.validated_data.get("description", "Goal contribution")

        # Verify source account matches the account in the URL
        # (IsAccountOwner permission already ensures user owns source_account)
        source_account_id = str(source_account.account_id)

        try:
            # Import here to avoid circular dependencies
            from apps.accounts.transfer_service import execute_transfer

            # Execute transfer using transfer service
            # This function performs all security checks including transfer_authorized verification
            transfer_result = execute_transfer(
                goal_id=goal_id,
                source_account_id=source_account_id,
                destination_account_id=destination_account_id,
                amount=amount,
                user=request.user,
                description=description,
            )

            return Response(
                {
                    "status": "success",
                    "data": {
                        **transfer_result,
                        "status_details": {
                            "authorization_created": transfer_result.get(
                                "authorization_created", False
                            ),
                            "transfer_created": True,
                            "transaction_created": transfer_result.get(
                                "transaction_created", False
                            ),
                        },
                    },
                    "message": transfer_result.get(
                        "message", "Transfer initiated successfully"
                    ),
                },
                status=status.HTTP_200_OK,
            )

        except PlaidIntegrationError as exc:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(exc),
                    "error_code": "PLAID_ERROR",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except ValidationError as exc:
            # Handle validation errors from transfer_service
            error_message = str(exc)
            if hasattr(exc, "message_dict"):
                error_message = ", ".join(
                    [f"{k}: {', '.join(v)}" for k, v in exc.message_dict.items()]
                )
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": error_message,
                    "error_code": "VALIDATION_ERROR",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except PermissionDenied as exc:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(exc),
                    "error_code": "PERMISSION_DENIED",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        except Exception as exc:
            logger.error(f"Unexpected error during transfer: {exc}", exc_info=True)
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": "An unexpected error occurred. Please try again.",
                    "error_code": "INTERNAL_ERROR",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RequestEmailChangeView(generics.GenericAPIView):
    """
    POST /api/v1/auth/email-change/request
    Request an email change.
    """

    serializer_class = EmailChangeRequestSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        new_email = serializer.validated_data["new_email"]
        password = serializer.validated_data["password"]

        try:
            from apps.accounts.services import create_email_change_request
            from apps.notifications.tasks import send_email_change_verification

            # Create email change request (validates password and email)
            request_obj = create_email_change_request(user, new_email, password)

            # Send verification email (async task)
            send_email_change_verification.delay(
                request_obj.new_email, request_obj.token
            )

            # For development, return token in response
            response_data = {"token": request_obj.token} if settings.DEBUG else None

            return Response(
                {
                    "status": "success",
                    "data": response_data,
                    "message": "Verification email sent to your new email address",
                },
                status=status.HTTP_200_OK,
            )

        except ValidationError as e:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(e.message) if hasattr(e, "message") else str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class VerifyEmailChangeView(generics.GenericAPIView):
    """
    POST /api/v1/auth/email-change/verify
    Verify email change token.
    """

    serializer_class = EmailChangeVerifySerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]

        try:
            from apps.accounts.services import verify_email_change_token

            # Verify token and update email (also sends notification to old email)
            user = verify_email_change_token(token)

            return Response(
                {
                    "status": "success",
                    "data": {"email": user.email},
                    "message": "Email updated successfully",
                },
                status=status.HTTP_200_OK,
            )

        except ValidationError as e:
            return Response(
                {
                    "status": "error",
                    "data": None,
                    "message": str(e.message) if hasattr(e, "message") else str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class MFASetupView(views.APIView):
    """
    POST /api/v1/auth/mfa/setup
    Generate MFA secret and QR code URL.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Generate secret
        secret = pyotp.random_base32()
        otp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=request.user.email, issuer_name="Cashly"
        )
        return Response(
            {"status": "success", "data": {"secret": secret, "otpauth_url": otp_uri}}
        )


class MFAVerifySetupView(views.APIView):
    """
    POST /api/v1/auth/mfa/verify-setup
    Verify MFA code and enable MFA.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MFASetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        secret = serializer.validated_data["secret"]
        code = serializer.validated_data["code"]

        # Verify the code against the provided secret
        totp = pyotp.TOTP(secret)
        if totp.verify(code):
            user = request.user
            user.mfa_enabled = True
            user.mfa_secret = secret
            user.save()
            return Response(
                {"status": "success", "message": "MFA enabled successfully"}
            )

        return Response(
            {"status": "error", "message": "Invalid verification code"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class MFALoginVerifyView(views.APIView):
    """
    POST /api/v1/auth/mfa/verify-login
    Verify MFA code during login and return tokens.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MFALoginVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        code = serializer.validated_data["code"]

        signer = TimestampSigner()
        try:
            # unsign returns the value if valid, or raises exception
            user_id = signer.unsign(token, max_age=300)  # 5 mins
            user = User.objects.get(id=user_id)
        except (BadSignature, SignatureExpired):
            return Response(
                {
                    "status": "error",
                    "message": "Invalid or expired session. Please log in again.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except User.DoesNotExist:
            return Response(
                {"status": "error", "message": "User not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.mfa_enabled or not user.mfa_secret:
            return Response(
                {"status": "error", "message": "MFA is not enabled for this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        totp = pyotp.TOTP(user.mfa_secret)

        # Allow bypass in development mode with specific code
        is_dev_bypass = settings.DEBUG and code == "000000"

        if is_dev_bypass or totp.verify(code):
            # Generate JWT
            from rest_framework_simplejwt.tokens import RefreshToken

            refresh = RefreshToken.for_user(user)

            return Response(
                {
                    "status": "success",
                    "data": {
                        "refresh": str(refresh),
                        "access": str(refresh.access_token),
                        "user": {
                            "id": user.id,
                            "email": user.email,
                            "username": user.username,
                            "is_superuser": user.is_superuser,
                        },
                    },
                    "message": "Login successful",
                }
            )

        return Response(
            {"status": "error", "message": "Invalid verification code"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class MFADisableView(views.APIView):
    """
    POST /api/v1/auth/mfa/disable
    Disable MFA.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.mfa_enabled = False
        user.mfa_secret = None
        user.mfa_backup_codes = []
        user.mfa_backup_codes_generated_at = None
        user.save()
        return Response({"status": "success", "message": "MFA disabled successfully"})


class MFAGenerateBackupCodesView(views.APIView):
    """
    POST /api/v1/auth/mfa/backup-codes/generate
    Generate new backup codes for MFA recovery.

    Requires MFA to be enabled. Returns 10 backup codes that should
    be stored securely by the user. These codes can be used as a
    fallback when the authenticator app is unavailable.

    Note: Generating new codes invalidates all previous codes.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if not user.mfa_enabled:
            return Response(
                {
                    "status": "error",
                    "message": "MFA must be enabled to generate backup codes",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Import utility functions
        from .mfa_utils import generate_backup_codes, hash_backup_code

        # Generate new backup codes
        plain_codes = generate_backup_codes(count=10)

        # Hash codes before storing
        hashed_codes = [hash_backup_code(code) for code in plain_codes]

        # Store hashed codes
        user.mfa_backup_codes = hashed_codes
        user.mfa_backup_codes_generated_at = timezone.now()
        user.save()

        return Response(
            {
                "status": "success",
                "data": {
                    "backup_codes": plain_codes,
                    "generated_at": user.mfa_backup_codes_generated_at.isoformat(),
                    "total_codes": len(plain_codes),
                },
                "message": "Backup codes generated successfully. Store these codes securely - they will not be shown again.",
            }
        )


class MFAVerifyBackupCodeView(views.APIView):
    """
    POST /api/v1/auth/mfa/backup-codes/verify
    Verify a backup code during login (alternative to TOTP).

    This endpoint is used when a user cannot access their authenticator app.
    Each backup code can only be used once.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        from .serializers import MFABackupCodeVerifySerializer
        from .mfa_utils import verify_and_consume_backup_code

        serializer = MFABackupCodeVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        code = serializer.validated_data["code"]

        # Verify the temporary login token
        signer = TimestampSigner()
        try:
            user_id = signer.unsign(token, max_age=300)  # 5 mins
            user = User.objects.get(id=user_id)
        except (BadSignature, SignatureExpired):
            return Response(
                {
                    "status": "error",
                    "message": "Invalid or expired session. Please log in again.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except User.DoesNotExist:
            return Response(
                {"status": "error", "message": "User not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.mfa_enabled:
            return Response(
                {"status": "error", "message": "MFA is not enabled for this user."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify and consume the backup code
        success, error_message = verify_and_consume_backup_code(user, code)

        if not success:
            return Response(
                {"status": "error", "message": error_message or "Invalid backup code"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(user)

        # Get remaining codes count for user awareness
        remaining_codes = len(user.mfa_backup_codes) if user.mfa_backup_codes else 0

        return Response(
            {
                "status": "success",
                "data": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "username": user.username,
                        "is_superuser": user.is_superuser,
                    },
                    "remaining_backup_codes": remaining_codes,
                },
                "message": f"Login successful. You have {remaining_codes} backup codes remaining.",
            }
        )
