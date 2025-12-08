"""
Views for budgets app.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Q
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
        if self.action == 'create':
            return BudgetCreateSerializer
        return BudgetSerializer
    
    def get_queryset(self):
        """Return budgets for the current user."""
        queryset = Budget.objects.filter(user=self.request.user)
        
        # Filter by period if specified
        period_start = self.request.query_params.get('period_start', None)
        period_end = self.request.query_params.get('period_end', None)
        
        if period_start:
            try:
                period_start_obj = datetime.strptime(period_start, '%Y-%m-%d').date()
                queryset = queryset.filter(period_start__gte=period_start_obj)
            except ValueError:
                pass
        
        if period_end:
            try:
                period_end_obj = datetime.strptime(period_end, '%Y-%m-%d').date()
                queryset = queryset.filter(period_end__lte=period_end_obj)
            except ValueError:
                pass
        
        # Filter by category if specified
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        return queryset.order_by('-created_at', 'category__name')
    
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
                current_count=current_count
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
        category_id = request.data.get('category')
        if category_id:
            try:
                category = Category.objects.get(category_id=category_id)
                if not category.is_system_category and category.user != request.user:
                    return Response({
                        'status': 'error',
                        'data': None,
                        'message': 'Category does not belong to user'
                    }, status=status.HTTP_403_FORBIDDEN)
            except Category.DoesNotExist:
                return Response({
                    'status': 'error',
                    'data': None,
                    'message': 'Category not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Budget created successfully'
        }, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Set user automatically on create."""
        serializer.save(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """List budgets with usage information."""
        response = super().list(request, *args, **kwargs)
        
        # Add usage information for each budget
        budgets_data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        
        if isinstance(budgets_data, list):
            for budget_data in budgets_data:
                budget_id = budget_data.get('budget_id')
                if budget_id:
                    try:
                        budget = Budget.objects.get(budget_id=budget_id, user=request.user)
                        usage = calculate_budget_usage(budget)
                        budget_data['usage'] = usage
                    except Budget.DoesNotExist:
                        pass
        
        return Response({
            'status': 'success',
            'data': budgets_data,
            'message': 'Budgets retrieved successfully'
        }, status=response.status_code)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve budget with usage information."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        usage = calculate_budget_usage(instance)
        
        return Response({
            'status': 'success',
            'data': {
                **serializer.data,
                'usage': usage
            },
            'message': 'Budget retrieved successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='usage-summary')
    def usage_summary(self, request):
        """
        GET /api/v1/budgets/usage-summary/
        Get summary of all budgets with usage information.
        """
        budgets = self.get_queryset()
        
        summary = []
        for budget in budgets:
            usage = calculate_budget_usage(budget)
            summary.append({
                'budget_id': str(budget.budget_id),
                'category_name': budget.category.name,
                'amount': str(budget.amount),
                'spent': usage['spent'],
                'remaining': usage['remaining'],
                'percentage_used': usage['percentage_used'],
                'is_over_budget': usage['is_over_budget'],
                'period_start': budget.period_start.isoformat(),
                'period_end': budget.period_end.isoformat(),
            })
        
        return Response({
            'status': 'success',
            'data': summary,
            'message': 'Budget usage summary retrieved successfully'
        }, status=status.HTTP_200_OK)
