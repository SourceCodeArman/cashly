"""
Serializers for bills app.
"""
from rest_framework import serializers
from .models import Bill, BillPayment
from apps.transactions.models import Category, Transaction
from apps.accounts.models import Account


class BillSerializer(serializers.ModelSerializer):
    """Serializer for Bill model."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_id = serializers.UUIDField(source='category.category_id', read_only=True)
    account_name = serializers.CharField(source='account.institution_name', read_only=True)
    account_id = serializers.UUIDField(source='account.account_id', read_only=True)
    days_until_due = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Bill
        fields = [
            'bill_id',
            'name',
            'category_id',
            'category_name',
            'amount',
            'frequency',
            'due_day',
            'next_due_date',
            'last_paid_date',
            'is_autopay',
            'payee',
            'account_id',
            'account_name',
            'notes',
            'reminder_days',
            'reminder_enabled',
            'is_active',
            'days_until_due',
            'is_overdue',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['bill_id', 'created_at', 'updated_at']


class BillCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bills."""
    category = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    account = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = Bill
        fields = [
            'name',
            'category',
            'amount',
            'frequency',
            'due_day',
            'next_due_date',
            'is_autopay',
            'payee',
            'account',
            'notes',
            'reminder_days',
            'reminder_enabled',
            'is_active',
        ]
    
    def validate_category(self, value):
        """Validate that category exists and belongs to user."""
        if value is None:
            return None
        
        try:
            category = Category.objects.get(category_id=value)
            # Category ownership validation happens in the view
            return category
        except Category.DoesNotExist:
            raise serializers.ValidationError('Category not found')
    
    def validate_account(self, value):
        """Validate that account exists and belongs to user."""
        if value is None:
            return None
        
        try:
            account = Account.objects.get(account_id=value)
            # Account ownership validation happens in the view
            return account
        except Account.DoesNotExist:
            raise serializers.ValidationError('Account not found')
    
    def validate_due_day(self, value):
        """Validate due_day is valid."""
        if value < 1 or value > 31:
            raise serializers.ValidationError('Due day must be between 1 and 31')
        return value
    
    def validate(self, data):
        """Validate bill data."""
        # Ensure next_due_date is in the future
        from django.utils import timezone
        if data.get('next_due_date') and data['next_due_date'] < timezone.now().date():
            raise serializers.ValidationError({
                'next_due_date': 'Next due date must be in the future'
            })
        
        return data
    
    def create(self, validated_data):
        """Create bill instance."""
        return Bill.objects.create(**validated_data)


class BillPaymentSerializer(serializers.ModelSerializer):
    """Serializer for BillPayment model."""
    bill_name = serializers.CharField(source='bill.name', read_only=True)
    bill_id = serializers.UUIDField(source='bill.bill_id', read_only=True)
    transaction_id = serializers.UUIDField(source='transaction.transaction_id', read_only=True)
    
    class Meta:
        model = BillPayment
        fields = [
            'payment_id',
            'bill_id',
            'bill_name',
            'amount',
            'payment_date',
            'transaction_id',
            'notes',
            'created_at',
        ]
        read_only_fields = ['payment_id', 'created_at']


class BillPaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating bill payments."""
    transaction = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = BillPayment
        fields = [
            'amount',
            'payment_date',
            'transaction',
            'notes',
        ]
    
    def validate_transaction(self, value):
        """Validate that transaction exists and belongs to user."""
        if value is None:
            return None
        
        try:
            transaction = Transaction.objects.get(transaction_id=value)
            # Transaction ownership validation happens in the view
            return transaction
        except Transaction.DoesNotExist:
            raise serializers.ValidationError('Transaction not found')
    
    def create(self, validated_data):
        """Create bill payment instance."""
        return BillPayment.objects.create(**validated_data)
