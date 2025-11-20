"""
Views for analytics app.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Q
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from .serializers import DashboardSerializer
from .utils import (
    get_account_balance_summary,
    get_recent_transactions,
    get_goal_progress,
)
from apps.transactions.models import Transaction


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
        # Advanced analytics features require subscription check
        # For now, basic dashboard is available to all, but we can add
        # advanced features that require FEATURE_ADVANCED_ANALYTICS
        
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
        
        account_summary = get_account_balance_summary(user)
        recent_transactions = get_recent_transactions(user, limit=15)
        goal_progress = get_goal_progress(user)
        
        totals = Transaction.objects.for_user(user).aggregate(
            total_income=Sum('amount', filter=Q(amount__gt=0)),
            total_spending=Sum('amount', filter=Q(amount__lt=0)),
        )
        total_income = totals['total_income'] or Decimal('0.00')
        total_spending = abs(totals['total_spending'] or Decimal('0.00'))
        
        # Get spending trend days from query params, default to 30 days
        trend_days = request.query_params.get('trend_days', 30)
        try:
            trend_days = int(trend_days)
            # Limit to reasonable range: 7 to 90 days
            trend_days = max(7, min(90, trend_days))
        except (ValueError, TypeError):
            trend_days = 30
        
        spending_trend = self._get_spending_trend(user, days=trend_days)
        active_goals = [
            {
                'id': goal['goal_id'],
                'name': goal['name'],
                'targetAmount': self._decimal_to_str(goal.get('target_amount', 0)),
                'currentAmount': self._decimal_to_str(goal.get('current_amount', 0)),
                'deadline': goal.get('deadline'),
                'goalType': goal.get('goal_type', 'custom'),
                'isActive': True,
                'progress': goal.get('progress_percentage', 0),
            }
            for goal in goal_progress
        ]
        
        dashboard_data = {
            'totalBalance': self._decimal_to_str(account_summary.get('total_balance', 0)),
            'totalIncome': self._decimal_to_str(total_income),
            'totalSpending': self._decimal_to_str(total_spending),
            'spendingTrend': spending_trend,
            'activeGoals': active_goals,
            'recentTransactions': recent_transactions,
        }
        
        serializer = DashboardSerializer(data=dashboard_data)
        serializer.is_valid(raise_exception=True)
        
        return Response({
            'status': 'success',
            'data': serializer.validated_data,
            'message': 'Dashboard data retrieved successfully'
        }, status=status.HTTP_200_OK)

    def _decimal_to_str(self, value):
        """Normalize numeric values to currency strings."""
        if value is None:
            return '0.00'
        if isinstance(value, Decimal):
            quantized = value.quantize(Decimal('0.01'))
            return format(quantized, 'f')
        try:
            quantized = Decimal(str(value)).quantize(Decimal('0.01'))
            return format(quantized, 'f')
        except (InvalidOperation, TypeError, ValueError):
            return '0.00'

    def _get_spending_trend(self, user, days=30):
        """Return simple spending trend data for the last `days` days."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days - 1)
        
        # Apply subscription transaction history limit if applicable
        queryset = Transaction.objects.for_user(user)
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import SubscriptionExpired
            
            history_limit = SubscriptionLimitService.get_transaction_history_limit(user)
            
            if history_limit is not None:
                # Calculate minimum date based on subscription limit
                min_date = timezone.now().date() - history_limit
                # Use the later of the two dates (start_date from days param or min_date from subscription)
                start_date = max(start_date, min_date)
        except SubscriptionExpired:
            # If subscription expired, use free tier limit (30 days)
            min_date = timezone.now().date() - timedelta(days=30)
            start_date = max(start_date, min_date)
        except Exception:
            # Don't block queries if limit check fails
            pass
        
        expenses = (
            queryset
            .filter(date__range=(start_date, end_date), amount__lt=0)
            .values('date')
            .annotate(total=Sum('amount'))
            .order_by('date')
        )
        
        return [
            {
                'date': entry['date'].isoformat(),
                'amount': self._decimal_to_str(abs(entry['total'] or Decimal('0.00'))),
            }
            for entry in expenses
        ]
