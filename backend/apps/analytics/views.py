"""
Views for analytics app.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .serializers import DashboardSerializer
from .utils import (
    get_account_balance_summary,
    get_recent_transactions,
    get_monthly_spending_summary,
    get_goal_progress,
    get_category_spending_chart,
)


class DashboardView(APIView):
    """
    GET /api/v1/dashboard/
    Get dashboard data including account balances, recent transactions,
    monthly spending summary, goal progress, and category chart data.
    
    Note: Advanced analytics features (if added) should check FEATURE_ADVANCED_ANALYTICS.
    Export features (CSV/PDF) should check FEATURE_EXPORT permission.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get dashboard data."""
        user = request.user
        
        # Note: Basic dashboard is available to all tiers
        # Advanced analytics features (if added) should check subscription:
        # from apps.subscriptions.limit_service import SubscriptionLimitService
        # from apps.subscriptions.exceptions import FeatureNotAvailable
        # from apps.subscriptions.limits import FEATURE_ADVANCED_ANALYTICS
        # SubscriptionLimitService.enforce_limit(user, FEATURE_ADVANCED_ANALYTICS)
        
        # Get current month and year
        now = timezone.now()
        month = request.query_params.get('month', now.month)
        year = request.query_params.get('year', now.year)
        
        try:
            month = int(month)
            year = int(year)
        except (ValueError, TypeError):
            month = now.month
            year = now.year
        
        # Aggregate dashboard data
        dashboard_data = {
            'account_balance': get_account_balance_summary(user),
            'recent_transactions': get_recent_transactions(user, limit=15),
            'monthly_spending': get_monthly_spending_summary(user, month=month, year=year),
            'goals': get_goal_progress(user),
            'category_chart_data': get_category_spending_chart(user, month=month, year=year),
        }
        
        serializer = DashboardSerializer(dashboard_data)
        
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Dashboard data retrieved successfully'
        }, status=status.HTTP_200_OK)
