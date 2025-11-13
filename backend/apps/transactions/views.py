"""
Views for transactions app.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Sum, Count
from django.utils import timezone
from datetime import datetime

from .models import Transaction, Category
from .serializers import (
    TransactionListSerializer,
    TransactionDetailSerializer,
    TransactionCreateSerializer,
    TransactionCategorizeSerializer,
    CategorySerializer,
    CategoryCreateSerializer,
    CategorySuggestionSerializer,
)
from .categorization import get_category_suggestions, apply_category_to_transaction, auto_categorize_transaction
from .plaid_category_mapper import categorize_transactions_from_plaid
from apps.api.permissions import IsOwnerOrReadOnly
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class TransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Transaction management.
    """
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'account', 'is_recurring', 'is_transfer']
    search_fields = ['merchant_name', 'description']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    
    def get_queryset(self):
        """Return transactions for the current user."""
        queryset = Transaction.objects.for_user(self.request.user)
        
        # Additional filtering by date range
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        
        # Filter by amount range
        amount_min = self.request.query_params.get('amount_min', None)
        amount_max = self.request.query_params.get('amount_max', None)
        
        if amount_min:
            queryset = queryset.filter(amount__gte=amount_min)
        if amount_max:
            queryset = queryset.filter(amount__lte=amount_max)
        
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return TransactionListSerializer
        elif self.action == 'create':
            return TransactionCreateSerializer
        return TransactionDetailSerializer
    
    def perform_create(self, serializer):
        """Set user automatically on create and auto-categorize if enabled."""
        transaction = serializer.save(user=self.request.user)
        
        # Auto-categorize transaction if enabled and no category provided
        if (getattr(settings, 'AI_CATEGORIZATION_ENABLED', True) and
            getattr(settings, 'AI_AUTO_CATEGORIZE_ON_SYNC', True) and
            not transaction.category):
            try:
                suggested_category = auto_categorize_transaction(transaction)
                if suggested_category:
                    apply_category_to_transaction(transaction, suggested_category, user_modified=False)
                    logger.info(
                        f"Auto-categorized transaction {transaction.transaction_id} as {suggested_category.name}"
                    )
            except Exception as e:
                # Don't fail transaction creation if categorization fails
                logger.warning(
                    f"Failed to auto-categorize transaction {transaction.transaction_id}: {str(e)}"
                )
    
    @action(detail=True, methods=['post'])
    def categorize(self, request, pk=None):
        """
        POST /api/v1/transactions/:id/categorize
        Categorize a transaction.
        """
        transaction = self.get_object()
        serializer = TransactionCategorizeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        category = Category.objects.get(category_id=serializer.validated_data['category_id'])
        transaction.category = category
        transaction.user_modified = True
        transaction.save()
        
        return Response({
            'status': 'success',
            'data': {
                'transaction_id': str(transaction.transaction_id),
                'category_id': str(category.category_id),
                'category_name': category.name
            },
            'message': 'Transaction categorized successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        GET /api/v1/transactions/stats
        Get transaction statistics.
        """
        queryset = self.get_queryset()
        
        # Calculate stats
        total_count = queryset.count()
        expenses = queryset.expenses()
        income = queryset.income()
        
        expense_count = expenses.count()
        income_count = income.count()
        
        expense_total = expenses.aggregate(total=Sum('amount'))['total'] or 0
        income_total = income.aggregate(total=Sum('amount'))['total'] or 0
        
        # Convert to positive for expenses (they're stored as negative)
        expense_total = abs(expense_total)
        
        return Response({
            'status': 'success',
            'data': {
                'total_count': total_count,
                'expense_count': expense_count,
                'income_count': income_count,
                'expense_total': float(expense_total),
                'income_total': float(income_total),
                'net': float(income_total - expense_total),
            },
            'message': 'Statistics retrieved successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def suggest_category(self, request, pk=None):
        """
        POST /api/v1/transactions/:id/suggest_category
        Get AI-suggested category for a transaction.
        
        Optional query parameter:
        - apply: If true, automatically apply the suggestion to the transaction
        """
        transaction = self.get_object()
        
        # Get suggestions
        suggestions = get_category_suggestions(transaction, limit=1)
        
        if not suggestions:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'No category suggestions available. AI service may be unavailable or no suitable categories found.'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        suggestion = suggestions[0]
        
        # Optionally apply the suggestion
        apply = request.query_params.get('apply', 'false').lower() == 'true'
        if apply:
            try:
                category = Category.objects.get(category_id=suggestion['category_id'])
                if apply_category_to_transaction(transaction, category, user_modified=True):
                    return Response({
                        'status': 'success',
                        'data': {
                            'suggestion': CategorySuggestionSerializer(suggestion).data,
                            'applied': True,
                            'transaction_id': str(transaction.transaction_id),
                            'category_id': str(category.category_id),
                            'category_name': category.name
                        },
                        'message': 'Category suggestion applied successfully'
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'status': 'error',
                        'data': {'suggestion': CategorySuggestionSerializer(suggestion).data},
                        'message': 'Failed to apply category suggestion'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Category.DoesNotExist:
                return Response({
                    'status': 'error',
                    'data': {'suggestion': CategorySuggestionSerializer(suggestion).data},
                    'message': 'Suggested category not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'status': 'success',
            'data': {
                'suggestion': CategorySuggestionSerializer(suggestion).data,
                'applied': False
            },
            'message': 'Category suggestion retrieved successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def bulk_suggest_categories(self, request):
        """
        POST /api/v1/transactions/bulk_suggest_categories
        Get AI-suggested categories for multiple transactions.
        
        Request body:
        {
            "transaction_ids": ["uuid1", "uuid2", ...]
        }
        """
        transaction_ids = request.data.get('transaction_ids', [])
        
        if not transaction_ids:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'transaction_ids is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get transactions for the user
        transactions = Transaction.objects.filter(
            transaction_id__in=transaction_ids,
            user=request.user
        )
        
        if transactions.count() != len(transaction_ids):
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Some transactions not found or do not belong to user'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get suggestions for each transaction
        results = {}
        for transaction in transactions:
            suggestions = get_category_suggestions(transaction, limit=1)
            if suggestions:
                results[str(transaction.transaction_id)] = CategorySuggestionSerializer(suggestions[0]).data
            else:
                results[str(transaction.transaction_id)] = None
        
        return Response({
            'status': 'success',
            'data': {
                'suggestions': results,
                'total_requested': len(transaction_ids),
                'total_suggestions': sum(1 for v in results.values() if v is not None)
            },
            'message': f'Retrieved suggestions for {sum(1 for v in results.values() if v is not None)} transactions'
        }, status=status.HTTP_200_OK)


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Category management.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['type', 'is_system_category']
    
    def get_queryset(self):
        """Return system categories and user's custom categories."""
        return Category.objects.for_user(self.request.user)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return CategoryCreateSerializer
        return CategorySerializer
    
    def perform_create(self, serializer):
        """Set user for custom categories."""
        serializer.save(user=self.request.user, is_system_category=False)
    
    def perform_destroy(self, instance):
        """Prevent deletion of system categories."""
        if instance.is_system_category:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Cannot delete system categories')
        instance.delete()
    
    @action(detail=False, methods=['post'])
    def bulk_categorize_from_plaid(self, request):
        """
        POST /api/v1/transactions/bulk_categorize_from_plaid
        Bulk categorize transactions using Plaid category data.
        
        Request body:
        {
            "transaction_ids": ["uuid1", "uuid2", ...],  # Optional: if not provided, categorizes all user's transactions
            "overwrite_existing": false  # Optional: default false
        }
        """
        transaction_ids = request.data.get('transaction_ids', [])
        overwrite_existing = request.data.get('overwrite_existing', False)
        
        # Get transactions for the user
        if transaction_ids:
            transactions = Transaction.objects.filter(
                transaction_id__in=transaction_ids,
                user=request.user
            )
            
            if transactions.count() != len(transaction_ids):
                return Response({
                    'status': 'error',
                    'data': None,
                    'message': 'Some transactions not found or do not belong to user'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            # If no transaction IDs provided, categorize all user's transactions
            transactions = Transaction.objects.for_user(request.user)
        
        # Run bulk categorization
        try:
            stats = categorize_transactions_from_plaid(
                transactions=transactions,
                overwrite_existing=overwrite_existing,
                dry_run=False
            )
            
            return Response({
                'status': 'success',
                'data': {
                    'total_processed': stats['total_processed'],
                    'categorized': stats['categorized'],
                    'skipped_no_plaid_category': stats['skipped_no_plaid_category'],
                    'skipped_user_modified': stats['skipped_user_modified'],
                    'skipped_already_categorized': stats['skipped_already_categorized'],
                    'skipped_no_mapping': stats['skipped_no_mapping'],
                    'errors': stats['errors'],
                },
                'message': f'Successfully categorized {stats["categorized"]} transactions'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in bulk_categorize_from_plaid: {str(e)}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': f'Failed to categorize transactions: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def bulk_categorize(self, request):
        """
        POST /api/v1/categories/bulk-categorize
        Bulk categorize multiple transactions.
        """
        transaction_ids = request.data.get('transaction_ids', [])
        category_id = request.data.get('category_id')
        
        if not transaction_ids or not category_id:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'transaction_ids and category_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            category = Category.objects.get(category_id=category_id)
            if not category.is_system_category and category.user != request.user:
                return Response({
                    'status': 'error',
                    'data': None,
                    'message': 'Category does not belong to user'
                }, status=status.HTTP_403_FORBIDDEN)
            
            transactions = Transaction.objects.filter(
                transaction_id__in=transaction_ids,
                user=request.user
            )
            
            updated_count = transactions.update(
                category=category,
                user_modified=True
            )
            
            return Response({
                'status': 'success',
                'data': {'updated_count': updated_count},
                'message': f'{updated_count} transactions categorized'
            }, status=status.HTTP_200_OK)
        except Category.DoesNotExist:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Category not found'
            }, status=status.HTTP_404_NOT_FOUND)
