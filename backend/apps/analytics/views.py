from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .utils import (
    get_account_balance_summary,
    get_recent_transactions,
    get_monthly_spending_summary,
    get_goal_progress,
    get_category_spending_chart,
    get_budget_summary,
    get_spending_trends,
    calculate_net_worth,
    get_spending_patterns,
    get_recommendations
)
from .sankey import get_sankey_data
from .serializers import (
    DashboardSerializer, 
    SankeyDataSerializer,
    TrendsSerializer,
    NetWorthSerializer,
    PatternsSerializer,
    RecommendationsSerializer
)

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.now()
        month = today.month
        year = today.year

        data = {
            'total_balance': get_account_balance_summary(user),
            'total_income': 0,  # Placeholder, needs implementation
            'total_spending': 0, # Placeholder, needs implementation
            'recent_transactions': get_recent_transactions(user),
            'monthly_spending': get_monthly_spending_summary(user, month, year),
            'goals_progress': get_goal_progress(user),
            'category_spending': get_category_spending_chart(user, month, year),
            'budget_summary': get_budget_summary(user, month, year)
        }
        
        serializer = DashboardSerializer(data)
        return Response(serializer.data)

class SankeyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Check subscription tier - only Pro and Premium users can access Sankey analytics
        from apps.subscriptions.models import Subscription
        
        active_subscription = Subscription.objects.filter(
            user=user,
            status__in=['active', 'trialing']  # Allow both active and trialing
        ).first()
        
        # Only allow pro and premium users
        if not active_subscription or active_subscription.plan == 'free':
            return Response(
                {
                    'error': 'Subscription required',
                    'message': 'Advanced analytics features are available for Pro and Premium subscribers only.',
                    'required_plans': ['pro', 'premium']
                },
                status=403
            )
        
        # Get date range from query params or default to last 30 days
        end_date_str = request.query_params.get('end_date')
        start_date_str = request.query_params.get('start_date')
        
        if end_date_str:
            end_date = timezone.datetime.strptime(end_date_str, '%Y-%m-%d').date()
        else:
            end_date = timezone.now().date()
            
        if start_date_str:
            start_date = timezone.datetime.strptime(start_date_str, '%Y-%m-%d').date()
        else:
            start_date = end_date - timedelta(days=30)
            
        data = get_sankey_data(user, start_date, end_date)
        serializer = SankeyDataSerializer(data)
        return Response(serializer.data)

class TrendsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        months = int(request.query_params.get('months', 6))
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
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
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
                {'error': 'Failed to generate recommendations', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
