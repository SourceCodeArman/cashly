"""
Views for transaction splits and receipts.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Sum
from decimal import Decimal

from .models import Transaction, TransactionSplit, Receipt
from .serializers import (
    TransactionSplitSerializer,
    ReceiptSerializer,
    TransactionWithSplitsSerializer,
)
from apps.api.permissions import IsOwnerOrReadOnly
import logging

logger = logging.getLogger(__name__)


class TransactionSplitViewSet(viewsets.ModelViewSet):
    """ViewSet for managing transaction splits."""
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    serializer_class = TransactionSplitSerializer
    
    def get_queryset(self):
        """Return splits for transactions owned by the current user."""
        return TransactionSplit.objects.filter(
            transaction__user=self.request.user
        ).select_related('transaction', 'category')
    
    def create(self, request, *args, **kwargs):
        """Create a new transaction split."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Validate transaction ownership
        transaction = serializer.validated_data.get('transaction')
        if transaction.user != request.user:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Transaction does not belong to user'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Validate split sum doesn't exceed transaction amount
        existing_splits = TransactionSplit.objects.filter(transaction=transaction)
        existing_total = existing_splits.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        new_amount = serializer.validated_data.get('amount')
        transaction_amount = abs(transaction.amount)
        
        if existing_total + new_amount > transaction_amount:
            return Response({
                'status': 'error',
                'data': None,
                'message': f'Split sum ({existing_total + new_amount}) would exceed transaction amount ({transaction_amount})'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        self.perform_create(serializer)
        
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Split created successfully'
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """
        Create multiple splits for a transaction at once.
        Request body: {
            "transaction_id": "uuid",
            "splits": [
                {"category": "uuid", "amount": "100.00", "description": "..."},
                ...
            ]
        }
        """
        transaction_id = request.data.get('transaction_id')
        splits_data = request.data.get('splits', [])
        
        if not transaction_id or not splits_data:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'transaction_id and splits are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            transaction = Transaction.objects.get(
                transaction_id=transaction_id,
                user=request.user
            )
        except Transaction.DoesNotExist:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Transaction not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Validate total equals transaction amount
        total = sum(Decimal(str(split.get('amount', 0))) for split in splits_data)
        transaction_amount = abs(transaction.amount)
        
        if total != transaction_amount:
            return Response({
                'status': 'error',
                'data': None,
                'message': f'Sum of splits ({total}) must equal transaction amount ({transaction_amount})'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Delete existing splits
        TransactionSplit.objects.filter(transaction=transaction).delete()
        
        # Create new splits
        splits = []
        for split_data in splits_data:
            split_data['transaction'] = transaction.transaction_id
            serializer = self.get_serializer(data=split_data)
            serializer.is_valid(raise_exception=True)
            splits.append(serializer.save())
        
        return Response({
            'status': 'success',
            'data': [TransactionSplitSerializer(s).data for s in splits],
            'message': f'{len(splits)} splits created successfully'
        }, status=status.HTTP_201_CREATED)


class ReceiptViewSet(viewsets.ModelViewSet):
    """ViewSet for managing receipt uploads."""
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    serializer_class = ReceiptSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_queryset(self):
        """Return receipts for transactions owned by the current user."""
        return Receipt.objects.filter(
            transaction__user=self.request.user
        ).select_related('transaction')
    
    def create(self, request, *args, **kwargs):
        """Upload a receipt for a transaction."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # Validate transaction ownership
        transaction = serializer.validated_data.get('transaction')
        if transaction.user != request.user:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Transaction does not belong to user'
            }, status=status.HTTP_403_FORBIDDEN)
        
        self.perform_create(serializer)
        
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Receipt uploaded successfully'
        }, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a receipt."""
        instance = self.get_object()
        
        # Delete the file from storage
        if instance.file:
            instance.file.delete()
        
        self.perform_destroy(instance)
        
        return Response({
            'status': 'success',
            'data': None,
            'message': 'Receipt deleted successfully'
        }, status=status.HTTP_200_OK)
