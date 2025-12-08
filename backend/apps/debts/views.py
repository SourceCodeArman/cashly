"""
Views for debts app.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Q
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
        if self.action == 'create':
            return DebtAccountCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return DebtAccountUpdateSerializer
        return DebtAccountSerializer
    
    def get_queryset(self):
        """Return debts for the current user."""
        queryset = DebtAccount.objects.filter(user=self.request.user)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by debt type
        debt_type = self.request.query_params.get('debt_type')
        if debt_type:
            queryset = queryset.filter(debt_type=debt_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.select_related('user')
    
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
            current_count = DebtAccount.objects.filter(user=request.user, is_active=True).count()
            
            SubscriptionLimitService.enforce_limit(
                user=request.user,
                feature_type=FEATURE_DEBTS,
                current_count=current_count
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
                'success': True,
                'message': 'Debt account created successfully',
                'data': response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    def perform_create(self, serializer):
        """Set user automatically on create."""
        serializer.save(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """List debt accounts."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': queryset.count()
        })
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve debt account with computed fields."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def update(self, request, *args, **kwargs):
        """Update debt account."""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Return full debt data
        response_serializer = DebtAccountSerializer(instance)
        
        return Response({
            'success': True,
            'message': 'Debt account updated successfully',
            'data': response_serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        """Delete debt account."""
        instance = self.get_object()
        instance.delete()
        
        return Response(
            {
                'success': True,
                'message': 'Debt account deleted successfully'
            },
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=True, methods=['post'])
    def mark_paid_off(self, request, pk=None):
        """
        POST /api/v1/debts/debts/{id}/mark-paid-off/
        Mark debt as paid off.
        """
        debt = self.get_object()
        debt.mark_as_paid_off()
        
        serializer = DebtAccountSerializer(debt)
        return Response({
            'success': True,
            'message': f'{debt.name} marked as paid off! 🎉',
            'data': serializer.data
        })
    
    @action(detail=True, methods=['get'])
    def projection(self, request, pk=None):
        """
        GET /api/v1/debts/debts/{id}/projection/?monthly_payment=500
        Get payoff projection for this debt.
        """
        debt = self.get_object()
        
        # Get monthly payment from query params (default to minimum payment)
        monthly_payment_str = request.query_params.get('monthly_payment')
        if monthly_payment_str:
            try:
                monthly_payment = Decimal(monthly_payment_str)
            except (ValueError, TypeError):
                return Response(
                    {
                        'success': False,
                        'error': 'Invalid monthly_payment parameter'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            monthly_payment = debt.minimum_payment
        
        # Validate payment covers interest
        if monthly_payment <= debt.monthly_interest:
            return Response({
                'success': False,
                'error': 'Monthly payment must be greater than monthly interest',
                'monthly_interest': str(debt.monthly_interest),
                'minimum_required': str(debt.monthly_interest + Decimal('0.01'))
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate projection
        projection = generate_payoff_projection(debt, monthly_payment)
        
        return Response({
            'success': True,
            'data': {
                'debt_id': str(debt.debt_id),
                'debt_name': debt.name,
                'current_balance': str(debt.current_balance),
                'monthly_payment': str(monthly_payment),
                'projection': projection,
                'months_to_payoff': len(projection),
                'total_interest': projection[-1]['total_paid'] if projection else '0.00',
            }
        })
    
    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        """
        GET /api/v1/debts/debts/{id}/payment-history/
        Get payment history for this debt.
        """
        debt = self.get_object()
        payments = debt.payments.all()
        serializer = DebtPaymentSerializer(payments, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': payments.count()
        })


class DebtPaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for Debt Payment management."""
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    serializer_class = DebtPaymentSerializer
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return DebtPaymentCreateSerializer
        return DebtPaymentSerializer
    
    def get_queryset(self):
        """Return debt payments for the current user."""
        queryset = DebtPayment.objects.filter(user=self.request.user)
        
        # Filter by debt
        debt_id = self.request.query_params.get('debt')
        if debt_id:
            queryset = queryset.filter(debt__debt_id=debt_id)
        
        # Filter by payment type
        payment_type = self.request.query_params.get('payment_type')
        if payment_type:
            queryset = queryset.filter(payment_type=payment_type)
        
        return queryset.select_related('debt', 'user', 'transaction')
    
    def create(self, request, *args, **kwargs):
        """Create debt payment."""
        # Get debt from request data
        debt_id = request.data.get('debt')
        if not debt_id:
            return Response(
                {
                    'success': False,
                    'error': 'Debt ID is required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            debt = DebtAccount.objects.get(debt_id=debt_id, user=request.user)
        except DebtAccount.DoesNotExist:
            return Response(
                {
                    'success': False,
                    'error': 'Debt account not found'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create serializer with context
        serializer = self.get_serializer(
            data=request.data,
            context={'debt': debt, 'user': request.user}
        )
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        
        # Return payment and updated debt
        response_serializer = DebtPaymentSerializer(payment)
        debt_serializer = DebtAccountSerializer(debt)
        
        return Response({
            'success': True,
            'message': 'Payment recorded successfully',
            'data': {
                'payment': response_serializer.data,
                'debt': debt_serializer.data
            }
        }, status=status.HTTP_201_CREATED)
    
    def list(self, request, *args, **kwargs):
        """List debt payments."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': queryset.count()
        })
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve debt payment."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'success': True,
            'data': serializer.data
        })


class DebtStrategyViewSet(viewsets.ModelViewSet):
    """ViewSet for Debt Payoff Strategy management."""
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    serializer_class = DebtPayoffStrategySerializer
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return DebtPayoffStrategyCreateSerializer
        return DebtPayoffStrategySerializer
    
    def get_queryset(self):
        """Return debt strategies for the current user."""
        queryset = DebtPayoffStrategy.objects.filter(user=self.request.user)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.select_related('user')
    
    def create(self, request, *args, **kwargs):
        """Create debt payoff strategy."""
        serializer = self.get_serializer(
            data=request.data,
            context={'user': request.user}
        )
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return full strategy data
        strategy = serializer.instance
        response_serializer = DebtPayoffStrategySerializer(strategy)
        
        return Response({
            'success': True,
            'message': 'Debt payoff strategy created successfully',
            'data': response_serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Set user automatically on create."""
        serializer.save(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """List debt strategies."""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': queryset.count()
        })
    
    @action(detail=False, methods=['get'])
    def compare(self, request):
        """
        GET /api/v1/debts/debt-strategies/compare/?monthly_budget=1500
        Compare snowball vs avalanche strategies.
        """
        monthly_budget_str = request.query_params.get('monthly_budget')
        if not monthly_budget_str:
            return Response(
                {
                    'success': False,
                    'error': 'monthly_budget parameter is required'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            monthly_budget = Decimal(monthly_budget_str)
        except (ValueError, TypeError):
            return Response(
                {
                    'success': False,
                    'error': 'Invalid monthly_budget parameter'
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get comparison
        comparison = calculate_strategy_comparison(request.user, monthly_budget)
        
        if 'error' in comparison:
            return Response({
                'success': False,
                'error': comparison['error'],
                'total_minimum': comparison.get('total_minimum')
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'success': True,
            'data': comparison
        })
    
    @action(detail=True, methods=['get'])
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
            status='active',
            is_active=True
        )
        
        # Build timeline data
        timeline = []
        for debt_id in strategy.priority_order:
            debt = debts.filter(debt_id=debt_id).first()
            if debt:
                # Calculate payoff with minimum payment
                months, total_interest = debt.calculate_payoff_date(debt.minimum_payment)
                
                timeline.append({
                    'debt_id': str(debt.debt_id),
                    'debt_name': debt.name,
                    'current_balance': str(debt.current_balance),
                    'interest_rate': str(debt.interest_rate),
                    'minimum_payment': str(debt.minimum_payment),
                    'estimated_months': months,
                    'estimated_interest': str(total_interest) if total_interest else None,
                })
        
        return Response({
            'success': True,
            'data': {
                'strategy': DebtPayoffStrategySerializer(strategy).data,
                'timeline': timeline
            }
        })


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
        
        return Response({
            'success': True,
            'data': serializer.data
        })
