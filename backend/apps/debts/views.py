"""
Views for debts app.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from decimal import Decimal

from .models import DebtAccount, DebtPayment, DebtPayoffStrategy
from .serializers import (
    DebtAccountSerializer,
    DebtAccountCreateSerializer,
    DebtAccountUpdateSerializer,
    DebtPaymentSerializer,
    DebtPaymentCreateSerializer,
    DebtPayoffStrategySerializer,
    DebtPayoffStrategyCreateSerializer,
    DebtSummarySerializer,
)
from .utils import (
    generate_payoff_projection,
    calculate_strategy_comparison,
    get_debt_summary,
)
from apps.api.permissions import IsOwnerOrReadOnly

logger = logging.getLogger(__name__)


class DebtAccountViewSet(viewsets.ModelViewSet):
    """ViewSet for Debt Account management."""

    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return DebtAccountCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return DebtAccountUpdateSerializer
        return DebtAccountSerializer

    def get_queryset(self):
        """Return debts for the current user."""
        queryset = DebtAccount.objects.filter(user=self.request.user)

        # Filter by status
        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by debt type
        debt_type = self.request.query_params.get("debt_type")
        if debt_type:
            queryset = queryset.filter(debt_type=debt_type)

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        return queryset.select_related("user")

    def create(self, request, *args, **kwargs):
        """Create debt with subscription limit checking."""
        # Check subscription limit before creating debt
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import (
                SubscriptionLimitExceeded,
                SubscriptionExpired,
            )
            from apps.subscriptions.limits import FEATURE_DEBTS

            # Count existing debts
            current_count = DebtAccount.objects.filter(
                user=request.user, is_active=True
            ).count()

            SubscriptionLimitService.enforce_limit(
                user=request.user,
                feature_type=FEATURE_DEBTS,
                current_count=current_count,
            )
        except SubscriptionLimitExceeded as e:
            logger.info(f"Debt limit exceeded for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except SubscriptionExpired as e:
            logger.info(f"Subscription expired for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(f"Error checking debt limit: {e}", exc_info=True)
            # Don't block debt creation if limit check fails

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return full debt data
        debt = serializer.instance
        response_serializer = DebtAccountSerializer(debt)

        return Response(
            {
                "success": True,
                "message": "Debt account created successfully",
                "data": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    def perform_create(self, serializer):
        """Set user automatically on create."""
        serializer.save(user=self.request.user)

    def list(self, request, *args, **kwargs):
        """List all debts: both Plaid-synced accounts and manually tracked debts."""
        from apps.accounts.models import Account
        from apps.accounts.liability_sync import (
            sync_liabilities_for_account,
            get_liabilities_for_display,
        )
        from django.core.cache import cache

        debts = []

        # Cache key for debt list
        cache_key = f"debts_list_user_{request.user.id}"

        # Try to get cached debt list
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(
                {
                    "success": True,
                    "data": cached_data["debts"],
                    "count": cached_data["count"],
                    "plaid_count": cached_data["plaid_count"],
                    "manual_count": cached_data["manual_count"],
                }
            )

        # 1. Get Plaid-synced debt accounts (credit cards, loans, mortgages)
        plaid_accounts = (
            Account.objects.for_user(request.user)
            .active()
            .filter(account_type__in=["credit_card", "loan", "mortgage"])
            .order_by("-balance")
        )

        for account in plaid_accounts:
            # Sync liabilities for this account (uses cache if available)
            sync_liabilities_for_account(account, force_refresh=False)

            # Get formatted liability data
            liability_data = get_liabilities_for_display(account)

            # Build debt entry with real liability data
            debt_entry = {
                "debt_id": str(account.account_id),
                "name": account.custom_name
                or f"{account.institution_name} {account.account_number_masked}",
                "debt_type": account.account_type,
                "current_balance": float(account.balance),
                "creditor_name": account.institution_name,
                "account_number_masked": account.account_number_masked,
                "status": "active",
                "is_synced": True,  # Flag: This is from Plaid
            }

            # Add liability-specific fields based on account type
            if account.account_type == "credit_card":
                debt_entry.update(
                    {
                        "interest_rate": liability_data.get("apr") or 0.0,
                        "minimum_payment": liability_data.get("minimum_payment") or 0.0,
                        "next_due_date": liability_data.get("next_payment_due_date"),
                        "credit_limit": liability_data.get("credit_limit"),
                        "last_payment_date": liability_data.get("last_payment_date"),
                        "last_payment_amount": liability_data.get(
                            "last_payment_amount"
                        ),
                    }
                )
            else:  # loan, mortgage
                debt_entry.update(
                    {
                        "interest_rate": liability_data.get("interest_rate") or 0.0,
                        "minimum_payment": liability_data.get("minimum_payment")
                        or liability_data.get("payment_amount")
                        or 0.0,
                        "next_due_date": liability_data.get("next_payment_due_date"),
                        "loan_type": liability_data.get("loan_type"),
                        "loan_term": liability_data.get("loan_term"),
                        "origination_date": liability_data.get("origination_date"),
                        "maturity_date": liability_data.get("maturity_date"),
                    }
                )

            debts.append(debt_entry)

        # 2. Get manually tracked debts from DebtAccount model
        manual_debts = DebtAccount.objects.filter(
            user=request.user, status="active", is_active=True
        ).order_by("-current_balance")

        for debt in manual_debts:
            debts.append(
                {
                    "debt_id": str(debt.debt_id),
                    "name": debt.name,
                    "debt_type": debt.debt_type,
                    "current_balance": float(debt.current_balance),
                    "interest_rate": float(debt.interest_rate),
                    "minimum_payment": float(debt.minimum_payment)
                    if debt.minimum_payment is not None
                    else 0.0,
                    "next_due_date": debt.next_due_date.isoformat()
                    if debt.next_due_date
                    else None,
                    "creditor_name": debt.creditor_name or None,
                    "account_number_masked": debt.account_number_masked or None,
                    "status": debt.status,
                    "is_synced": False,  # Flag: This is manually tracked
                }
            )

        # Sort combined list by balance (highest first)
        debts.sort(key=lambda x: x["current_balance"], reverse=True)

        # Cache the result for 60 seconds
        cache_data = {
            "debts": debts,
            "count": len(debts),
            "plaid_count": plaid_accounts.count(),
            "manual_count": manual_debts.count(),
        }
        cache.set(cache_key, cache_data, 60)

        return Response(
            {
                "success": True,
                "data": debts,
                "count": len(debts),
                "plaid_count": plaid_accounts.count(),
                "manual_count": manual_debts.count(),
            }
        )

    def retrieve(self, request, *args, **kwargs):
        """Retrieve debt account with computed fields."""
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response({"success": True, "data": serializer.data})
        except Exception:
            # If not found in DebtAccount, check if it's a Plaid Account
            # This allows the details view to work for Plaid-synced liabilities
            from apps.accounts.models import Account
            from apps.accounts.liability_sync import (
                sync_liabilities_for_account,
                get_liabilities_for_display,
            )
            from django.shortcuts import get_object_or_404

            # Get the ID from kwargs
            pk = kwargs.get("pk")

            # Try to get the Plaid account
            account = get_object_or_404(
                Account.objects.for_user(request.user),
                pk=pk,
            )

            # Verify it's a liability type
            if account.account_type not in ["credit_card", "loan", "mortgage"]:
                raise

            # Sync liabilities
            sync_liabilities_for_account(account, force_refresh=False)

            # Get formatted data
            liability_data = get_liabilities_for_display(account)

            # Construct response to match DebtAccountSerializer structure
            debt_data = {
                "debt_id": str(account.account_id),
                "name": account.custom_name
                or f"{account.institution_name} {account.account_number_masked}",
                "debt_type": account.account_type,
                "current_balance": float(account.balance),
                "original_balance": float(account.balance),  # Best guess
                "creditor_name": account.institution_name,
                "account_number_masked": account.account_number_masked,
                "status": "active",
                "is_active": True,
                "is_synced": True,
                "opened_date": None,  # Will be filled if available
                "target_payoff_date": None,
                "notes": "",
                "created_at": account.created_at,
                "updated_at": account.updated_at,
            }

            # Add liability-specific fields
            if account.account_type == "credit_card":
                debt_data.update(
                    {
                        "interest_rate": float(liability_data.get("apr") or 0.0),
                        "minimum_payment": float(
                            liability_data.get("minimum_payment") or 0.0
                        ),
                        "next_due_date": liability_data.get("next_payment_due_date"),
                        "days_until_due": None,  # Could calculate
                        "last_payment_date": liability_data.get("last_payment_date"),
                        "last_payment_amount": float(
                            liability_data.get("last_payment_amount") or 0.0
                        )
                        if liability_data.get("last_payment_amount")
                        else None,
                    }
                )
            else:  # loans
                debt_data.update(
                    {
                        "interest_rate": float(
                            liability_data.get("interest_rate") or 0.0
                        ),
                        "minimum_payment": float(
                            liability_data.get("minimum_payment")
                            or liability_data.get("payment_amount")
                            or 0.0
                        ),
                        "next_due_date": liability_data.get("next_payment_due_date"),
                        "opened_date": liability_data.get("origination_date"),
                        "target_payoff_date": liability_data.get("maturity_date"),
                    }
                )

            # Calculate monthly interest approximation for display
            if debt_data.get("interest_rate") and debt_data.get("current_balance"):
                rate = Decimal(str(debt_data["interest_rate"])) / 100
                balance = Decimal(str(debt_data["current_balance"]))
                debt_data["monthly_interest"] = float((balance * rate) / 12)
            else:
                debt_data["monthly_interest"] = 0.0

            return Response({"success": True, "data": debt_data})

    def update(self, request, *args, **kwargs):
        """Update debt account."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return full debt data
        response_serializer = DebtAccountSerializer(instance)

        return Response(
            {
                "success": True,
                "message": "Debt account updated successfully",
                "data": response_serializer.data,
            }
        )

    def destroy(self, request, *args, **kwargs):
        """Delete debt account."""
        instance = self.get_object()
        instance.delete()

        return Response(
            {"success": True, "message": "Debt account deleted successfully"},
            status=status.HTTP_204_NO_CONTENT,
        )

    @action(detail=True, methods=["post"])
    def mark_paid_off(self, request, pk=None):
        """
        POST /api/v1/debts/debts/{id}/mark-paid-off/
        Mark debt as paid off.
        """
        debt = self.get_object()
        debt.mark_as_paid_off()

        serializer = DebtAccountSerializer(debt)
        return Response(
            {
                "success": True,
                "message": f"{debt.name} marked as paid off! 🎉",
                "data": serializer.data,
            }
        )

    @action(detail=True, methods=["get"])
    def projection(self, request, pk=None):
        """
        GET /api/v1/debts/debts/{id}/projection/?monthly_payment=500
        Get payoff projection for this debt.
        """
        debt = self.get_object()

        # Get monthly payment from query params (default to minimum payment)
        monthly_payment_str = request.query_params.get("monthly_payment")
        if monthly_payment_str:
            try:
                monthly_payment = Decimal(monthly_payment_str)
            except (ValueError, TypeError):
                return Response(
                    {"success": False, "error": "Invalid monthly_payment parameter"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            monthly_payment = debt.minimum_payment or Decimal("0.00")

        # Validate payment covers interest
        if monthly_payment <= debt.monthly_interest:
            return Response(
                {
                    "success": False,
                    "error": "Monthly payment must be greater than monthly interest",
                    "monthly_interest": str(debt.monthly_interest),
                    "minimum_required": str(debt.monthly_interest + Decimal("0.01")),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate projection
        projection = generate_payoff_projection(debt, monthly_payment)

        return Response(
            {
                "success": True,
                "data": {
                    "debt_id": str(debt.debt_id),
                    "debt_name": debt.name,
                    "current_balance": str(debt.current_balance),
                    "monthly_payment": str(monthly_payment),
                    "projection": projection,
                    "months_to_payoff": len(projection),
                    "total_interest": projection[-1]["total_paid"]
                    if projection
                    else "0.00",
                },
            }
        )

    @action(detail=True, methods=["get"])
    def payment_history(self, request, pk=None):
        """
        GET /api/v1/debts/debts/{id}/payment-history/
        Get payment history for this debt.
        """
        debt = self.get_object()
        payments = debt.payments.all()
        serializer = DebtPaymentSerializer(payments, many=True)

        return Response(
            {"success": True, "data": serializer.data, "count": payments.count()}
        )


class DebtPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for Debt Payment management."""

    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    serializer_class = DebtPaymentSerializer

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return DebtPaymentCreateSerializer
        return DebtPaymentSerializer

    def get_queryset(self):
        """Return debt payments for the current user."""
        queryset = DebtPayment.objects.filter(user=self.request.user)

        # Filter by debt
        debt_id = self.request.query_params.get("debt")
        if debt_id:
            queryset = queryset.filter(debt__debt_id=debt_id)

        # Filter by payment type
        payment_type = self.request.query_params.get("payment_type")
        if payment_type:
            queryset = queryset.filter(payment_type=payment_type)

        return queryset.select_related("debt", "user", "transaction")

    def create(self, request, *args, **kwargs):
        """Create debt payment."""
        # Get debt from request data
        debt_id = request.data.get("debt")
        if not debt_id:
            return Response(
                {"success": False, "error": "Debt ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            debt = DebtAccount.objects.get(debt_id=debt_id, user=request.user)
        except DebtAccount.DoesNotExist:
            return Response(
                {"success": False, "error": "Debt account not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Create serializer with context
        serializer = self.get_serializer(
            data=request.data, context={"debt": debt, "user": request.user}
        )
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()

        # Return payment and updated debt
        response_serializer = DebtPaymentSerializer(payment)
        debt_serializer = DebtAccountSerializer(debt)

        return Response(
            {
                "success": True,
                "message": "Payment recorded successfully",
                "data": {
                    "payment": response_serializer.data,
                    "debt": debt_serializer.data,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    def list(self, request, *args, **kwargs):
        """List debt payments."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response(
            {"success": True, "data": serializer.data, "count": queryset.count()}
        )

    def retrieve(self, request, *args, **kwargs):
        """Retrieve debt payment."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        return Response({"success": True, "data": serializer.data})


class DebtStrategyViewSet(viewsets.ModelViewSet):
    """ViewSet for Debt Payoff Strategy management."""

    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    serializer_class = DebtPayoffStrategySerializer

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return DebtPayoffStrategyCreateSerializer
        return DebtPayoffStrategySerializer

    def get_queryset(self):
        """Return debt strategies for the current user."""
        queryset = DebtPayoffStrategy.objects.filter(user=self.request.user)

        # Filter by active status
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        return queryset.select_related("user")

    def create(self, request, *args, **kwargs):
        """Create debt payoff strategy."""
        serializer = self.get_serializer(
            data=request.data, context={"user": request.user}
        )
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return full strategy data
        strategy = serializer.instance
        response_serializer = DebtPayoffStrategySerializer(strategy)

        return Response(
            {
                "success": True,
                "message": "Debt payoff strategy created successfully",
                "data": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    def perform_create(self, serializer):
        """Set user automatically on create."""
        serializer.save(user=self.request.user)

    def list(self, request, *args, **kwargs):
        """List debt strategies."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        return Response(
            {"success": True, "data": serializer.data, "count": queryset.count()}
        )

    @action(detail=False, methods=["get"])
    def compare(self, request):
        """
        GET /api/v1/debts/debt-strategies/compare/?monthly_budget=1500
        Compare snowball vs avalanche strategies.
        """
        monthly_budget_str = request.query_params.get("monthly_budget")
        if not monthly_budget_str:
            return Response(
                {"success": False, "error": "monthly_budget parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            monthly_budget = Decimal(monthly_budget_str)
        except (ValueError, TypeError):
            return Response(
                {"success": False, "error": "Invalid monthly_budget parameter"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get comparison
        comparison = calculate_strategy_comparison(request.user, monthly_budget)

        if "error" in comparison:
            return Response(
                {
                    "success": False,
                    "error": comparison["error"],
                    "total_minimum": comparison.get("total_minimum"),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"success": True, "data": comparison})

    @action(detail=True, methods=["get"])
    def timeline(self, request, pk=None):
        """
        GET /api/v1/debts/debt-strategies/{id}/timeline/
        Get payoff timeline for this strategy.
        """
        strategy = self.get_object()

        # Get debts in priority order
        debts = DebtAccount.objects.filter(
            user=request.user,
            debt_id__in=strategy.priority_order,
            status="active",
            is_active=True,
        )

        # Build timeline data
        timeline = []
        for debt_id in strategy.priority_order:
            debt = debts.filter(debt_id=debt_id).first()
            if debt:
                # Calculate payoff with minimum payment (or 0 if None)
                if debt.minimum_payment:
                    months, total_interest = debt.calculate_payoff_date(
                        debt.minimum_payment
                    )
                else:
                    months, total_interest = None, None

                timeline.append(
                    {
                        "debt_id": str(debt.debt_id),
                        "debt_name": debt.name,
                        "current_balance": str(debt.current_balance),
                        "interest_rate": str(debt.interest_rate),
                        "minimum_payment": str(debt.minimum_payment)
                        if debt.minimum_payment
                        else "0.00",
                        "estimated_months": months,
                        "estimated_interest": str(total_interest)
                        if total_interest
                        else None,
                    }
                )

        return Response(
            {
                "success": True,
                "data": {
                    "strategy": DebtPayoffStrategySerializer(strategy).data,
                    "timeline": timeline,
                },
            }
        )


class DebtSummaryView(APIView):
    """Get aggregated debt summary."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        GET /api/v1/debts/summary/
        Get debt summary for current user.
        """
        summary = get_debt_summary(request.user)
        serializer = DebtSummarySerializer(summary)

        return Response({"success": True, "data": serializer.data})
