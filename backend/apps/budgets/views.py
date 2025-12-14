"""
Views for budgets app.
"""

import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Sum, Q, OuterRef, Subquery, DecimalField, Value
from django.db.models.functions import Coalesce, Greatest
from datetime import datetime, timedelta

from .models import Budget
from .serializers import BudgetSerializer, BudgetCreateSerializer
from .utils import calculate_budget_usage
from apps.transactions.models import Transaction, Category
from apps.api.permissions import IsOwnerOrReadOnly

logger = logging.getLogger(__name__)


class BudgetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Budget management.
    """

    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return BudgetCreateSerializer
        return BudgetSerializer

    def get_queryset(self):
        """Return budgets for the current user."""
        queryset = Budget.objects.filter(user=self.request.user)

        # Filter by period if specified
        period_start = self.request.query_params.get("period_start", None)
        period_end = self.request.query_params.get("period_end", None)

        if period_start:
            try:
                period_start_obj = datetime.strptime(period_start, "%Y-%m-%d").date()
                queryset = queryset.filter(period_start__gte=period_start_obj)
            except ValueError:
                pass

        if period_end:
            try:
                period_end_obj = datetime.strptime(period_end, "%Y-%m-%d").date()
                queryset = queryset.filter(period_end__lte=period_end_obj)
            except ValueError:
                pass

        # Filter by category if specified
        category_id = self.request.query_params.get("category", None)
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        return queryset.order_by("-created_at", "category__name")

    def create(self, request, *args, **kwargs):
        """Create budget with subscription limit checking."""
        # Check subscription limit before creating budget
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import (
                SubscriptionLimitExceeded,
                SubscriptionExpired,
            )
            from apps.subscriptions.limits import FEATURE_BUDGETS

            # Count existing budgets
            current_count = Budget.objects.filter(user=request.user).count()

            SubscriptionLimitService.enforce_limit(
                user=request.user,
                feature_type=FEATURE_BUDGETS,
                current_count=current_count,
            )
        except SubscriptionLimitExceeded as e:
            logger.info(f"Budget limit exceeded for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except SubscriptionExpired as e:
            logger.info(f"Subscription expired for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(f"Error checking budget limit: {e}", exc_info=True)
            # Don't block budget creation if limit check fails

        # Validate category belongs to user
        category_id = request.data.get("category")
        if category_id:
            try:
                category = Category.objects.get(category_id=category_id)
                if not category.is_system_category and category.user != request.user:
                    return Response(
                        {
                            "status": "error",
                            "data": None,
                            "message": "Category does not belong to user",
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
            except Category.DoesNotExist:
                return Response(
                    {"status": "error", "data": None, "message": "Category not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(
            {
                "status": "success",
                "data": serializer.data,
                "message": "Budget created successfully",
            },
            status=status.HTTP_201_CREATED,
        )

    def _invalidate_cache(self, user):
        """Invalidate budget list and summary caches."""
        from django.core.cache import cache

        cache_key = f"budgets_list_user_{user.id}"
        cache.delete(cache_key)

        summary_key = f"budget_usage_summary_user_{user.id}"
        cache.delete(summary_key)

    def perform_create(self, serializer):
        """Set user automatically on create and invalidate cache."""
        serializer.save(user=self.request.user)
        self._invalidate_cache(self.request.user)

    def perform_update(self, serializer):
        """Invalidate cache on update."""
        super().perform_update(serializer)
        self._invalidate_cache(self.request.user)

    def perform_destroy(self, instance):
        """Invalidate cache on delete."""
        super().perform_destroy(instance)
        self._invalidate_cache(self.request.user)

    def list(self, request, *args, **kwargs):
        """List budgets with usage information."""
        user = request.user
        cache_key = f"budgets_list_user_{user.id}"

        # Try to get cached budgets
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return Response(
                {
                    "status": "success",
                    "data": cached_data,
                    "message": "Budgets retrieved successfully",
                },
                status=status.HTTP_200_OK,
            )

        # Pre-fetch transaction history limit once
        history_limit = None
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import SubscriptionExpired

            history_limit = SubscriptionLimitService.get_transaction_history_limit(
                request.user
            )
        except SubscriptionExpired:
            # Fallback to 30 days if expired
            history_limit = timedelta(days=30)
        except Exception as e:
            logger.warning(f"Error fetching usage limit for list: {e}")

        # Construct optimize queryset with Subquery
        queryset = self.filter_queryset(self.get_queryset())

        # Determine min_date filter based on history limit
        min_date_val = None
        if history_limit:
            min_date_val = timezone.now().date() - history_limit

        # Build Subquery for spent amount
        date_filter = Q(date__lte=OuterRef("period_end"))
        if min_date_val:
            date_filter &= Q(
                date__gte=Greatest(OuterRef("period_start"), Value(min_date_val))
            )
        else:
            date_filter &= Q(date__gte=OuterRef("period_start"))

        expenses_qs = (
            Transaction.objects.filter(
                user=OuterRef("user"), category=OuterRef("category"), amount__lt=0
            )
            .filter(date_filter)
            .values("category")
            .annotate(total=Sum("amount"))
            .values("total")
        )

        annotated_queryset = queryset.annotate(
            spent_raw=Coalesce(
                Subquery(expenses_qs, output_field=DecimalField()),
                Value(0),
                output_field=DecimalField(),
            )
        )

        # To maintain API compatibility with iOS app which expects a list in 'data' field,
        # we will skip pagination for this endpoint or unwrap it.
        # The previous implementation seemed to return a list directly in data.

        # We manually serialize to ensure we get the list
        serializer = self.get_serializer(annotated_queryset, many=True)
        budgets_data = serializer.data
        self._add_usage_to_data(budgets_data, annotated_queryset)

        final_data = budgets_data

        # Cache for 60 seconds
        cache.set(cache_key, final_data, 60)

        return Response(
            {
                "status": "success",
                "data": final_data,
                "message": "Budgets retrieved successfully",
            },
            status=status.HTTP_200_OK,
        )

    def _add_usage_to_data(self, data_list, models_list):
        """Helper to compute usage from annotated models and add to data."""
        for data, budget in zip(data_list, models_list):
            spent = abs(budget.spent_raw)
            remaining = max(0, float(budget.amount) - float(spent))
            percentage_used = (
                (float(spent) / float(budget.amount) * 100) if budget.amount > 0 else 0
            )

            data["usage"] = {
                "spent": f"{spent:.2f}",
                "remaining": f"{remaining:.2f}",
                "percentage_used": round(percentage_used, 2),
                "is_over_budget": float(spent) > float(budget.amount),
                "alert_threshold_reached": percentage_used
                >= float(budget.alert_threshold),
            }

    def retrieve(self, request, *args, **kwargs):
        """Retrieve budget with usage information."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        usage = calculate_budget_usage(instance)

        return Response(
            {
                "status": "success",
                "data": {**serializer.data, "usage": usage},
                "message": "Budget retrieved successfully",
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="usage-summary")
    def usage_summary(self, request):
        """
        GET /api/v1/budgets/usage-summary/
        Get summary of all budgets with usage information.
        """
        from django.core.cache import cache

        user = request.user
        cache_key = f"budget_usage_summary_user_{user.id}"

        # Try to get cached summary
        cached_summary = cache.get(cache_key)
        if cached_summary is not None:
            return Response(
                {
                    "status": "success",
                    "data": cached_summary,
                    "message": "Budget usage summary retrieved successfully",
                },
                status=status.HTTP_200_OK,
            )

        budgets = self.get_queryset()

        # Pre-fetch transaction history limit once
        history_limit = None
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import SubscriptionExpired

            history_limit = SubscriptionLimitService.get_transaction_history_limit(
                request.user
            )
        except SubscriptionExpired:
            history_limit = timedelta(days=30)
        except Exception:
            pass

        summary = []
        for budget in budgets:
            usage = calculate_budget_usage(budget, history_limit=history_limit)
            summary.append(
                {
                    "budget_id": str(budget.budget_id),
                    "category_name": budget.category.name,
                    "amount": str(budget.amount),
                    "spent": usage["spent"],
                    "remaining": usage["remaining"],
                    "percentage_used": usage["percentage_used"],
                    "is_over_budget": usage["is_over_budget"],
                    "period_start": budget.period_start.isoformat(),
                    "period_end": budget.period_end.isoformat(),
                }
            )

        # Cache for 60 seconds
        cache.set(cache_key, summary, 60)

        return Response(
            {
                "status": "success",
                "data": summary,
                "message": "Budget usage summary retrieved successfully",
            },
            status=status.HTTP_200_OK,
        )
