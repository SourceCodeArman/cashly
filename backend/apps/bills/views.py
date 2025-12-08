"""
Views for bills app.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta

from .models import Bill, BillPayment
from .serializers import (
    BillSerializer,
    BillCreateSerializer,
    BillPaymentSerializer,
    BillPaymentCreateSerializer
)
from apps.transactions.models import Category, Transaction
from apps.accounts.models import Account
from apps.api.permissions import IsOwnerOrReadOnly

logger = logging.getLogger(__name__)


class BillViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Bill management.
    """
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return BillCreateSerializer
        return BillSerializer
    
    def get_queryset(self):
        """Return bills for the current user."""
        queryset = Bill.objects.filter(user=self.request.user).select_related(
            'category', 'account'
        )
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by frequency
        frequency = self.request.query_params.get('frequency', None)
        if frequency:
            queryset = queryset.filter(frequency=frequency)
        
        # Filter by category
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Filter by overdue status
        is_overdue = self.request.query_params.get('is_overdue', None)
        if is_overdue is not None:
            if is_overdue.lower() == 'true':
                queryset = queryset.filter(
                    is_active=True,
                    next_due_date__lt=timezone.now().date()
                )
            else:
                queryset = queryset.filter(
                    Q(is_active=False) | Q(next_due_date__gte=timezone.now().date())
                )
        
        return queryset.order_by('next_due_date', 'name')
    
    def create(self, request, *args, **kwargs):
        """Create bill with subscription limit checking."""
        # Check subscription limit before creating bill
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import (
                SubscriptionLimitExceeded,
                SubscriptionExpired,
            )
            from apps.subscriptions.limits import FEATURE_BILLS
            
            # Count existing bills
            current_count = Bill.objects.filter(user=request.user, is_active=True).count()
            
            SubscriptionLimitService.enforce_limit(
                user=request.user,
                feature_type=FEATURE_BILLS,
                current_count=current_count
            )
        except SubscriptionLimitExceeded as e:
            logger.info(f"Bill limit exceeded for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except SubscriptionExpired as e:
            logger.info(f"Subscription expired for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(f"Error checking bill limit: {e}", exc_info=True)
            # Don't block bill creation if limit check fails
        
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
        
        # Validate account belongs to user
        account_id = request.data.get('account')
        if account_id:
            try:
                account = Account.objects.get(account_id=account_id)
                if account.user != request.user:
                    return Response({
                        'status': 'error',
                        'data': None,
                        'message': 'Account does not belong to user'
                    }, status=status.HTTP_403_FORBIDDEN)
            except Account.DoesNotExist:
                return Response({
                    'status': 'error',
                    'data': None,
                    'message': 'Account not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Bill created successfully'
        }, status=status.HTTP_201_CREATED)
    
    def perform_create(self, serializer):
        """Set user automatically on create."""
        serializer.save(user=self.request.user)
    
    def list(self, request, *args, **kwargs):
        """List bills."""
        response = super().list(request, *args, **kwargs)
        
        # Add computed fields
        bills_data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        
        if isinstance(bills_data, list):
            for bill_data in bills_data:
                bill_id = bill_data.get('bill_id')
                if bill_id:
                    try:
                        bill = Bill.objects.get(bill_id=bill_id, user=request.user)
                        bill_data['days_until_due'] = bill.days_until_due
                        bill_data['is_overdue'] = bill.is_overdue
                    except Bill.DoesNotExist:
                        pass
        
        return Response({
            'status': 'success',
            'data': bills_data,
            'message': 'Bills retrieved successfully'
        }, status=response.status_code)
    
    def retrieve(self, request, *args, **kwargs):
        """Retrieve bill with computed fields."""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'status': 'success',
            'data': {
                **serializer.data,
                'days_until_due': instance.days_until_due,
                'is_overdue': instance.is_overdue,
            },
            'message': 'Bill retrieved successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='mark-as-paid')
    def mark_as_paid(self, request, pk=None):
        """
        POST /api/v1/bills/{id}/mark-as-paid/
        Mark bill as paid and record payment.
        """
        bill = self.get_object()
        payment_date = request.data.get('payment_date', None)
        amount = request.data.get('amount', str(bill.amount))
        notes = request.data.get('notes', '')
        transaction_id = request.data.get('transaction', None)
        
        # Validate transaction if provided
        transaction = None
        if transaction_id:
            try:
                transaction = Transaction.objects.get(transaction_id=transaction_id, user=request.user)
            except Transaction.DoesNotExist:
                return Response({
                    'status': 'error',
                    'data': None,
                    'message': 'Transaction not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        # Create payment record
        payment = BillPayment.objects.create(
            bill=bill,
            user=request.user,
            amount=amount,
            payment_date=payment_date or timezone.now().date(),
            transaction=transaction,
            notes=notes
        )
        
        # Update bill
        bill.mark_as_paid(payment_date or timezone.now().date())
        
        return Response({
            'status': 'success',
            'data': {
                'bill': BillSerializer(bill).data,
                'payment': BillPaymentSerializer(payment).data,
            },
            'message': 'Bill marked as paid successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='upcoming')
    def upcoming(self, request):
        """
        GET /api/v1/bills/upcoming/?days=7
        Get bills due in the next N days.
        """
        days = int(request.query_params.get('days', 7))
        end_date = timezone.now().date() + timedelta(days=days)
        
        bills = Bill.objects.filter(
            user=request.user,
            is_active=True,
            next_due_date__lte=end_date,
            next_due_date__gte=timezone.now().date()
        ).select_related('category', 'account').order_by('next_due_date')
        
        serializer = BillSerializer(bills, many=True)
        
        # Add computed fields
        bills_data = serializer.data
        for i, bill in enumerate(bills):
            bills_data[i]['days_until_due'] = bill.days_until_due
            bills_data[i]['is_overdue'] = bill.is_overdue
        
        return Response({
            'status': 'success',
            'data': bills_data,
            'message': f'Upcoming bills for next {days} days retrieved successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='overdue')
    def overdue(self, request):
        """
        GET /api/v1/bills/overdue/
        Get all overdue bills.
        """
        bills = Bill.objects.filter(
            user=request.user,
            is_active=True,
            next_due_date__lt=timezone.now().date()
        ).select_related('category', 'account').order_by('next_due_date')
        
        serializer = BillSerializer(bills, many=True)
        
        # Add computed fields
        bills_data = serializer.data
        for i, bill in enumerate(bills):
            bills_data[i]['days_until_due'] = bill.days_until_due
            bills_data[i]['is_overdue'] = bill.is_overdue
        
        return Response({
            'status': 'success',
            'data': bills_data,
            'message': 'Overdue bills retrieved successfully'
        }, status=status.HTTP_200_OK)


class BillPaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for BillPayment management.
    """
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    serializer_class = BillPaymentSerializer
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return BillPaymentCreateSerializer
        return BillPaymentSerializer
    
    def get_queryset(self):
        """Return bill payments for the current user."""
        queryset = BillPayment.objects.filter(user=self.request.user).select_related(
            'bill', 'transaction'
        )
        
        # Filter by bill if specified
        bill_id = self.request.query_params.get('bill', None)
        if bill_id:
            queryset = queryset.filter(bill_id=bill_id)
        
        return queryset.order_by('-payment_date', '-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create bill payment."""
        bill_id = request.data.get('bill')
        if not bill_id:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Bill ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate bill belongs to user
        try:
            bill = Bill.objects.get(bill_id=bill_id, user=request.user)
        except Bill.DoesNotExist:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Bill not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate transaction if provided
        transaction_id = request.data.get('transaction')
        if transaction_id:
            try:
                Transaction.objects.get(transaction_id=transaction_id, user=request.user)
            except Transaction.DoesNotExist:
                return Response({
                    'status': 'error',
                    'data': None,
                    'message': 'Transaction not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(bill=bill, user=request.user)
        
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Payment recorded successfully'
        }, status=status.HTTP_201_CREATED)
    
    def list(self, request, *args, **kwargs):
        """List bill payments."""
        response = super().list(request, *args, **kwargs)
        
        payments_data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        
        return Response({
            'status': 'success',
            'data': payments_data,
            'message': 'Bill payments retrieved successfully'
        }, status=response.status_code)
