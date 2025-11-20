"""
API utility views.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone



class HealthCheckView(APIView):
    """
    Health check endpoint for monitoring and load balancers.
    """
    permission_classes = []  # Public endpoint
    
    def get(self, request):
        return Response({
            'status': 'success',
            'data': {
                'service': 'Cashly API',
                'status': 'healthy',
                'timestamp': timezone.now().isoformat(),
            },
            'message': 'Service is operational'
        }, status=status.HTTP_200_OK)


class LandingStatsView(APIView):
    """
    Public endpoint for landing page statistics.
    """
    permission_classes = []  # Public endpoint
    
    def get(self, request):
        from django.contrib.auth import get_user_model
        from django.db.models import Sum
        from apps.transactions.models import Transaction
        from apps.goals.models import Goal
        from apps.budgets.models import Budget
        
        User = get_user_model()
        
        # Calculate stats
        # 1. Active Users (Total active users)
        active_users = User.objects.filter(is_active=True).count()
        
        # 2. Transactions Tracked (Total volume of money moved)
        income = Transaction.objects.filter(amount__gt=0).aggregate(total=Sum('amount'))['total'] or 0
        expenses = Transaction.objects.filter(amount__lt=0).aggregate(total=Sum('amount'))['total'] or 0
        transactions_volume = float(income) + abs(float(expenses))
        
        # 3. Total Savings (Sum of all goal current amounts)
        total_savings = Goal.objects.aggregate(total=Sum('current_amount'))['total'] or 0
        
        # 4. Budgets Created
        budgets_created = Budget.objects.count()
        
        return Response({
            'active_users': active_users,
            'transactions_tracked': transactions_volume,
            'total_savings': float(total_savings),
            'budgets_created': budgets_created
        })
