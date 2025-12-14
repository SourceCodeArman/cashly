from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .utils import (
    get_account_balance_summary,
    get_account_data_optimized,
    get_recent_transactions,
    get_monthly_spending_summary,
    get_monthly_category_data_optimized,
    get_goal_progress,
    get_category_spending_chart,
    get_budget_summary,
    get_spending_trends,
    calculate_net_worth,
    get_spending_patterns,
    get_recommendations,
    get_monthly_spending,
    get_weekly_spending,
)
from .sankey import get_sankey_data
from .serializers import (
    DashboardSerializer,
    SankeyDataSerializer,
    TrendsSerializer,
    NetWorthSerializer,
    PatternsSerializer,
    RecommendationsSerializer,
)


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.core.cache import cache

        user = request.user
        cache_key = f"dashboard_data_user_{user.id}"

        # Try to get cached data
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(
                {
                    "status": "success",
                    "data": cached_data,
                    "message": "Dashboard data retrieved successfully",
                    "cached": True,
                }
            )

        today = timezone.now()
        month = today.month
        year = today.year

        # Import Transaction model for income/spending calculations
        from apps.transactions.models import Transaction
        from django.db.models import Sum

        # Calculate total income and spending from transactions
        transactions = Transaction.objects.for_user(user)
        expenses = transactions.expenses()
        income = transactions.income()

        expense_total = expenses.aggregate(total=Sum("amount"))["total"] or 0
        income_total = income.aggregate(total=Sum("amount"))["total"] or 0

        # Convert expenses to positive (they're stored as negative)
        expense_total = abs(expense_total)

        # OPTIMIZATION: Use combined functions to reduce database queries
        # This computes both balance summary and net worth in one pass
        account_data = get_account_data_optimized(user)

        # This computes both monthly spending and category chart in one pass
        monthly_category_data = get_monthly_category_data_optimized(user, month, year)

        data = {
            "total_balance": account_data["balance_summary"],
            "total_income": float(income_total),
            "total_spending": float(expense_total),
            "recent_transactions": get_recent_transactions(user),
            "monthly_spending": monthly_category_data["monthly_spending"],
            "goals_progress": get_goal_progress(user),
            "category_spending": monthly_category_data["category_spending"],
            "budget_summary": get_budget_summary(user, month, year),
            "spending_trends": get_spending_trends(user, months=6),
            "net_worth": account_data["net_worth"],
        }

        serializer = DashboardSerializer(data)

        # Cache for 2 minutes (120 seconds)
        cache.set(cache_key, serializer.data, 120)

        return Response(
            {
                "status": "success",
                "data": serializer.data,
                "message": "Dashboard data retrieved successfully",
                "cached": False,
            }
        )


class SankeyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Check subscription tier - only Pro and Premium users can access Sankey analytics
        from apps.subscriptions.models import Subscription

        active_subscription = Subscription.objects.filter(
            user=user,
            status__in=["active", "trialing"],  # Allow both active and trialing
        ).first()

        # Only allow pro and premium users
        if not active_subscription or active_subscription.plan == "free":
            return Response(
                {
                    "error": "Subscription required",
                    "message": "Advanced analytics features are available for Pro and Premium subscribers only.",
                    "required_plans": ["pro", "premium"],
                },
                status=403,
            )

        # Get date range from query params or default to last 30 days
        end_date_str = request.query_params.get("end_date")
        start_date_str = request.query_params.get("start_date")

        if end_date_str:
            end_date = timezone.datetime.strptime(end_date_str, "%Y-%m-%d").date()
        else:
            end_date = timezone.now().date()

        if start_date_str:
            start_date = timezone.datetime.strptime(start_date_str, "%Y-%m-%d").date()
        else:
            start_date = end_date - timedelta(days=30)

        data = get_sankey_data(user, start_date, end_date)
        serializer = SankeyDataSerializer(data)
        return Response(serializer.data)


class TrendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        months = int(request.query_params.get("months", 4))
        data = get_spending_trends(user, months)
        serializer = TrendsSerializer(data, many=True)
        return Response(serializer.data)


class NetWorthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = calculate_net_worth(user)
        serializer = NetWorthSerializer(data)
        return Response(serializer.data)


class PatternsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now()
        month = request.query_params.get("month")
        year = request.query_params.get("year")

        month = int(month) if month else today.month
        year = int(year) if year else today.year

        data = get_spending_patterns(user, month, year)
        serializer = PatternsSerializer(data, many=True)
        return Response(serializer.data)


class RecommendationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            recommendations = get_recommendations(user)
            serializer = RecommendationsSerializer(recommendations, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": "Failed to generate recommendations", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MonthlySpendingView(APIView):
    """Return monthly spending totals for the past 12 months."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = get_monthly_spending(user)
        return Response(data)


class WeeklySpendingView(APIView):
    """Return daily spending for the past 4 weeks."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = get_weekly_spending(user)
        return Response(data)
