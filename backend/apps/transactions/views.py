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
    TransactionDetailSerializer,
    TransactionCreateSerializer,
    TransactionCategorizeSerializer,
    CategorySerializer,
    CategoryCreateSerializer,
    CategorySuggestionSerializer,
    TransactionFrontendSerializer,
    TransactionStatsSerializer,
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

    The `list` and `retrieve` actions return data wrapped in the shared
    `ApiResponse` contract with camelCase payloads so the frontend can
    consume transactions without additional mapping.
    """
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'account', 'is_recurring', 'is_transfer']
    search_fields = ['merchant_name', 'description']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date', '-created_at']
    
    def get_queryset(self):
        """Return transactions for the current user from active accounts only."""
        # Use select_related to optimize database queries (avoid N+1 problem)
        # This fetches account and category in a single query using JOINs
        # Filter to only include transactions from active accounts
        queryset = Transaction.objects.for_user(self.request.user).filter(
            account__is_active=True
        ).select_related(
            'account',  # Fetch account data (account_name, account_number, account_type)
            'category'  # Fetch category data (category_name, category_id)
        )
        
        # Enforce subscription transaction history date range limit
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import SubscriptionExpired
            
            history_limit = SubscriptionLimitService.get_transaction_history_limit(self.request.user)
            
            if history_limit is not None:
                # Calculate minimum date based on subscription limit
                from datetime import timedelta
                min_date = timezone.now().date() - history_limit
                
                # If user provided date_from, use the later of the two dates
                date_from_param = self.request.query_params.get('date_from', None)
                if date_from_param:
                    try:
                        param_date = datetime.strptime(date_from_param, '%Y-%m-%d').date()
                        min_date = max(min_date, param_date)
                    except ValueError:
                        pass  # Invalid date format, use calculated min_date
                
                queryset = queryset.filter(date__gte=min_date)
        except SubscriptionExpired:
            # If subscription expired, use free tier limit (30 days)
            from datetime import timedelta
            min_date = timezone.now().date() - timedelta(days=30)
            queryset = queryset.filter(date__gte=min_date)
        except Exception as e:
            logger.warning(f"Error enforcing transaction history limit: {e}", exc_info=True)
            # Don't block queries if limit check fails, but log it
        
        # Additional filtering by date range (user-specified)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=date_from_obj)
            except ValueError:
                pass  # Invalid date format, skip
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=date_to_obj)
            except ValueError:
                pass  # Invalid date format, skip
        
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
        if self.action in ['list', 'retrieve']:
            return TransactionFrontendSerializer
        if self.action == 'create':
            return TransactionCreateSerializer
        return TransactionDetailSerializer

    def list(self, request, *args, **kwargs):
        """Wrap list response to match ApiResponse contract."""
        response = super().list(request, *args, **kwargs)
        # DRF pagination wraps results in {'results': [...]}.
        # If it's a paginated response, return the whole object (count, next, previous, results)
        # Otherwise, if it's a list or other dict, use it as is.
        data = response.data
        if isinstance(response.data, dict) and 'results' in response.data:
            # It is already a paginated response, keep structure
            pass
        elif isinstance(response.data, dict):
            # Try to get results if it's some other dict structure (fallback)
            data = response.data.get('results', response.data)
        return Response({
            'status': 'success',
            'data': data,
            'message': 'Transactions retrieved successfully'
        }, status=response.status_code)

    def retrieve(self, request, *args, **kwargs):
        """Wrap retrieve response to match ApiResponse contract."""
        response = super().retrieve(request, *args, **kwargs)
        return Response({
            'status': 'success',
            'data': response.data,
            'message': 'Transaction retrieved successfully'
        }, status=response.status_code)
    
    def perform_create(self, serializer):
        """Set user automatically on create and auto-categorize if enabled."""
        transaction = serializer.save(user=self.request.user)
        
        # Auto-categorize transaction if enabled and no category provided
        if (getattr(settings, 'AI_CATEGORIZATION_ENABLED', True) and
            getattr(settings, 'AI_AUTO_CATEGORIZE_ON_SYNC', True) and
            not transaction.category):
            try:
                # Check AI categorization feature access before auto-categorizing
                from apps.subscriptions.limit_service import SubscriptionLimitService
                from apps.subscriptions.limits import FEATURE_AI_CATEGORIZATION
                
                suggested_category = None
                if SubscriptionLimitService.can_access_feature(self.request.user, FEATURE_AI_CATEGORIZATION):
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
        
        expense_total = expenses.aggregate(total=Sum('amount'))['total'] or 0
        income_total = income.aggregate(total=Sum('amount'))['total'] or 0
        
        # Convert to positive for expenses (they're stored as negative)
        expense_total = abs(expense_total)
        net_total = income_total - expense_total

        stats_payload = TransactionStatsSerializer(data={
            'totalSpending': expense_total,
            'totalIncome': income_total,
            'totalTransactions': total_count,
            'net': net_total,
        })
        stats_payload.is_valid(raise_exception=True)
        
        return Response({
            'status': 'success',
            'data': stats_payload.data,
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
        
        # Check AI categorization feature access
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import FeatureNotAvailable
            from apps.subscriptions.limits import FEATURE_AI_CATEGORIZATION
            
            SubscriptionLimitService.enforce_limit(
                user=request.user,
                feature_type=FEATURE_AI_CATEGORIZATION
            )
        except FeatureNotAvailable as e:
            logger.info(f"AI categorization feature not available for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(f"Error checking AI categorization access: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'An error occurred while checking subscription limits',
                'error_code': 'SUBSCRIPTION_CHECK_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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
        # Check AI categorization feature access
        try:
            from apps.subscriptions.limit_service import SubscriptionLimitService
            from apps.subscriptions.exceptions import FeatureNotAvailable
            from apps.subscriptions.limits import FEATURE_AI_CATEGORIZATION
            
            SubscriptionLimitService.enforce_limit(
                user=request.user,
                feature_type=FEATURE_AI_CATEGORIZATION
            )
        except FeatureNotAvailable as e:
            logger.info(f"AI categorization feature not available for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(f"Error checking AI categorization access: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'An error occurred while checking subscription limits',
                'error_code': 'SUBSCRIPTION_CHECK_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
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
    
    @action(detail=False, methods=['post'], url_path='detect-recurring')
    def detect_recurring(self, request):
        """
        POST /api/v1/transactions/detect-recurring
        Run recurring transaction detection algorithm.
        """
        from .recurring_detection import detect_recurring_transactions
        
        min_occurrences = int(request.data.get('min_occurrences', 3))
        lookback_days = int(request.data.get('lookback_days', 180))
        
        try:
            detected_groups, updated_count = detect_recurring_transactions(
                user=request.user,
                min_occurrences=min_occurrences,
                lookback_days=lookback_days
            )
            
            return Response({
                'status': 'success',
                'data': {
                    'detected': detected_groups,
                    'updated_count': updated_count
                },
                'message': f'Detected {len(detected_groups)} recurring transaction groups, marked {updated_count} transactions'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error detecting recurring transactions: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to detect recurring transactions'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='mark-recurring')
    def mark_recurring(self, request, pk=None):
        """
        POST /api/v1/transactions/:id/mark-recurring
        Manually mark a transaction as recurring.
        """
        from .recurring_detection import mark_transaction_recurring
        
        transaction = self.get_object()
        is_recurring = request.data.get('is_recurring', True)
        
        try:
            mark_transaction_recurring(transaction, is_recurring)
            
            return Response({
                'status': 'success',
                'data': {
                    'transaction_id': str(transaction.transaction_id),
                    'is_recurring': transaction.is_recurring
                },
                'message': f'Transaction marked as {"recurring" if is_recurring else "non-recurring"}'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error marking transaction as recurring: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to mark transaction'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='mark-non-recurring')
    def mark_non_recurring(self, request):
        """
        POST /api/v1/transactions/mark-non-recurring
        Mark multiple transactions as non-recurring (bulk operation).
        Body: { "transaction_ids": ["uuid1", "uuid2", ...] }
        """
        transaction_ids = request.data.get('transaction_ids', [])
        
        if not transaction_ids:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'No transaction IDs provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Update only transactions belonging to the requesting user
            updated_count = Transaction.objects.filter(
                transaction_id__in=transaction_ids,
                account__user=request.user
            ).update(
                is_recurring=False,
                is_recurring_dismissed=True  # Permanently ignore these for future detection
            )
            
            return Response({
                'status': 'success',
                'data': {
                    'updated_count': updated_count,
                    'transaction_ids': transaction_ids
                },
                'message': f'Marked {updated_count} transactions as non-recurring'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error marking transactions as non-recurring: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to mark transactions as non-recurring'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'], url_path='similar-recurring')
    def similar_recurring(self, request, pk=None):
        """
        GET /api/v1/transactions/:id/similar-recurring
        Find similar transactions that might be part of the same recurring series.
        """
        from .recurring_detection import find_similar_recurring_transactions
        
        transaction = self.get_object()
        
        try:
            similar = find_similar_recurring_transactions(transaction)
            serializer = self.get_serializer(similar, many=True)
            
            return Response({
                'status': 'success',
                'data': serializer.data,
                'message': f'Found {len(similar)} similar transactions'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error finding similar recurring transactions: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to find similar transactions'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='detect-transfers')
    def detect_transfers(self, request):
        """
        POST /api/v1/transactions/detect-transfers
        Run transfer detection algorithm.
        """
        from .transfer_detection import detect_transfers
        
        lookback_days = int(request.data.get('lookback_days', 30))
        
        try:
            result = detect_transfers(
                user=request.user,
                lookback_days=lookback_days
            )
            
            return Response({
                'status': 'success',
                'data': result,
                'message': f'Detected {len(result["matched_pairs"])} transfer pairs, marked {result["updated_count"]} transactions'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error detecting transfers: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to detect transfers'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'], url_path='potential-transfer-pairs')
    def potential_transfer_pairs(self, request, pk=None):
        """
        GET /api/v1/transactions/:id/potential-transfer-pairs
        Find potential matching transfers for a transaction.
        """
        from .transfer_detection import find_potential_transfer_pairs
        
        transaction = self.get_object()
        
        try:
            potential_pairs = find_potential_transfer_pairs(transaction)
            serializer = self.get_serializer(potential_pairs, many=True)
            
            return Response({
                'status': 'success',
                'data': serializer.data,
                'message': f'Found {len(potential_pairs)} potential transfer pairs'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error finding potential transfer pairs: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to find potential transfer pairs'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='mark-transfer-pair')
    def mark_transfer_pair(self, request, pk=None):
        """
        POST /api/v1/transactions/:id/mark-transfer-pair
        Manually mark two transactions as a transfer pair.
        
        Request body: { "other_transaction_id": "uuid" }
        """
        from .transfer_detection import mark_as_transfer_pair
        
        transaction1 = self.get_object()
        other_id = request.data.get('other_transaction_id')
        
        if not other_id:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'other_transaction_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            transaction2 = Transaction.objects.get(
                transaction_id=other_id,
                user=request.user
            )
            
            mark_as_transfer_pair(transaction1, transaction2)
            
            return Response({
                'status': 'success',
                'data': {
                    'transaction1_id': str(transaction1.transaction_id),
                    'transaction2_id': str(transaction2.transaction_id)
                },
                'message': 'Transactions marked as transfer pair'
            }, status=status.HTTP_200_OK)
        except Transaction.DoesNotExist:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Other transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error marking transfer pair: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to mark transfer pair'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Category management.
    
    The `list` and `retrieve` actions return data wrapped in the shared
    `ApiResponse` contract with camelCase payloads so the frontend can
    consume categories without additional mapping.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['type', 'is_system_category']
    pagination_class = None  # Disable pagination for categories - there are limited system categories
    
    def get_queryset(self):
        """Return system categories and user's custom categories."""
        queryset = Category.objects.for_user(self.request.user)
        
        # Filter for parent categories only (those without a parent_category)
        parent_only = self.request.query_params.get('parent_only', 'false').lower() == 'true'
        if parent_only:
            queryset = queryset.filter(parent_category__isnull=True)
        
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return CategoryCreateSerializer
        return CategorySerializer
    
    def list(self, request, *args, **kwargs):
        """Wrap list response to match ApiResponse contract."""
        response = super().list(request, *args, **kwargs)
        # DRF pagination wraps results in {'results': [...]}, extract if present
        data = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
        return Response({
            'status': 'success',
            'data': data,
            'message': 'Categories retrieved successfully'
        }, status=response.status_code)
    
    def retrieve(self, request, *args, **kwargs):
        """Wrap retrieve response to match ApiResponse contract."""
        response = super().retrieve(request, *args, **kwargs)
        return Response({
            'status': 'success',
            'data': response.data,
            'message': 'Category retrieved successfully'
        }, status=response.status_code)
    
    def create(self, request, *args, **kwargs):
        """Wrap create response to match ApiResponse contract."""
        response = super().create(request, *args, **kwargs)
        return Response({
            'status': 'success',
            'data': response.data,
            'message': 'Category created successfully'
        }, status=response.status_code)
    
    def update(self, request, *args, **kwargs):
        """Wrap update response to match ApiResponse contract."""
        response = super().update(request, *args, **kwargs)
        return Response({
            'status': 'success',
            'data': response.data,
            'message': 'Category updated successfully'
        }, status=response.status_code)
    
    def destroy(self, request, *args, **kwargs):
        """Wrap destroy response to match ApiResponse contract."""
        instance = self.get_object()
        # Check if it's a system category before deletion
        if instance.is_system_category:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Cannot delete system categories')
        self.perform_destroy(instance)
        return Response({
            'status': 'success',
            'data': None,
            'message': 'Category deleted successfully'
        }, status=status.HTTP_200_OK)
    
    def perform_create(self, serializer):
        """Set user for custom categories."""
        serializer.save(user=self.request.user, is_system_category=False)
    
    def perform_destroy(self, instance):
        """Delete the category instance."""
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
    
    @action(detail=False, methods=['get'], url_path='export/csv')
    def export_csv(self, request):
        """
        GET /api/v1/transactions/export/csv/
        Export transactions to CSV format.
        
        Query parameters:
        - date_from: Start date (YYYY-MM-DD)
        - date_to: End date (YYYY-MM-DD)
        """
        try:
            from .export import export_transactions_csv
            from apps.subscriptions.exceptions import FeatureNotAvailable
            from datetime import datetime
            
            date_from = None
            date_to = None
            
            date_from_str = request.query_params.get('date_from', None)
            date_to_str = request.query_params.get('date_to', None)
            
            if date_from_str:
                try:
                    date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        'status': 'error',
                        'data': None,
                        'message': 'Invalid date_from format. Use YYYY-MM-DD'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if date_to_str:
                try:
                    date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        'status': 'error',
                        'data': None,
                        'message': 'Invalid date_to format. Use YYYY-MM-DD'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            return export_transactions_csv(
                user=request.user,
                date_from=date_from,
                date_to=date_to
            )
        except FeatureNotAvailable as e:
            logger.info(f"Export feature not available for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(f"Error exporting transactions to CSV: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to export transactions'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='export/pdf')
    def export_pdf(self, request):
        """
        GET /api/v1/transactions/export/pdf/
        Export transactions to PDF format.
        
        Query parameters:
        - date_from: Start date (YYYY-MM-DD)
        - date_to: End date (YYYY-MM-DD)
        
        Note: PDF export is not yet implemented.
        """
        try:
            from .export import export_transactions_pdf
            from apps.subscriptions.exceptions import FeatureNotAvailable
            from datetime import datetime
            
            date_from = None
            date_to = None
            
            date_from_str = request.query_params.get('date_from', None)
            date_to_str = request.query_params.get('date_to', None)
            
            if date_from_str:
                try:
                    date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        'status': 'error',
                        'data': None,
                        'message': 'Invalid date_from format. Use YYYY-MM-DD'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if date_to_str:
                try:
                    date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        'status': 'error',
                        'data': None,
                        'message': 'Invalid date_to format. Use YYYY-MM-DD'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            return export_transactions_pdf(
                user=request.user,
                date_from=date_from,
                date_to=date_to
            )
        except NotImplementedError:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'PDF export is not yet implemented. Please use CSV export.',
                'error_code': 'NOT_IMPLEMENTED'
            }, status=status.HTTP_501_NOT_IMPLEMENTED)
        except FeatureNotAvailable as e:
            logger.info(f"Export feature not available for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(f"Error exporting transactions to PDF: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to export transactions'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='export/summary')
    def export_summary(self, request):
        """
        GET /api/v1/transactions/export/summary/
        Get summary statistics for export preview.
        
        Query parameters:
        - date_from: Start date (YYYY-MM-DD)
        - date_to: End date (YYYY-MM-DD)
        """
        try:
            from .export import get_export_summary, check_export_permission
            from apps.subscriptions.exceptions import FeatureNotAvailable
            from datetime import datetime
            
            # Check export permission
            check_export_permission(request.user)
            
            date_from = None
            date_to = None
            
            date_from_str = request.query_params.get('date_from', None)
            date_to_str = request.query_params.get('date_to', None)
            
            if date_from_str:
                try:
                    date_from = datetime.strptime(date_from_str, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        'status': 'error',
                        'data': None,
                        'message': 'Invalid date_from format. Use YYYY-MM-DD'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if date_to_str:
                try:
                    date_to = datetime.strptime(date_to_str, '%Y-%m-%d').date()
                except ValueError:
                    return Response({
                        'status': 'error',
                        'data': None,
                        'message': 'Invalid date_to format. Use YYYY-MM-DD'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            summary = get_export_summary(
                user=request.user,
                date_from=date_from,
                date_to=date_to
            )
            
            return Response({
                'status': 'success',
                'data': summary,
                'message': 'Export summary retrieved successfully'
            }, status=status.HTTP_200_OK)
        except FeatureNotAvailable as e:
            logger.info(f"Export feature not available for user {request.user.id}: {e}")
            return Response(e.to_dict(), status=e.status_code)
        except Exception as e:
            logger.error(f"Error getting export summary: {e}", exc_info=True)
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Failed to get export summary'
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
