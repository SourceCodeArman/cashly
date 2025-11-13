"""
Serializers for transactions app.
"""
from rest_framework import serializers
from decimal import Decimal
from .models import Transaction, Category


class TransactionListSerializer(serializers.ModelSerializer):
    """Serializer for transaction list view."""
    formatted_amount = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_id = serializers.UUIDField(source='category.category_id', read_only=True, allow_null=True)
    account_name = serializers.CharField(source='account.institution_name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = (
            'transaction_id', 'merchant_name', 'amount', 'formatted_amount',
            'date', 'category', 'category_id', 'category_name', 'account_name', 'created_at'
        )
    
    def get_formatted_amount(self, obj):
        """Format amount as currency string."""
        return f"${abs(obj.amount):,.2f}"


class TransactionDetailSerializer(serializers.ModelSerializer):
    """Serializer for transaction detail view."""
    formatted_amount = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_id = serializers.UUIDField(source='category.category_id', read_only=True, allow_null=True)
    account_name = serializers.CharField(source='account.institution_name', read_only=True)
    
    class Meta:
        model = Transaction
        fields = (
            'transaction_id', 'account', 'user', 'amount', 'formatted_amount',
            'date', 'merchant_name', 'description', 'category', 'category_id', 'category_name',
            'subcategory', 'tags', 'notes', 'is_recurring', 'is_transfer',
            'plaid_transaction_id', 'location', 'account_name', 'created_at',
            'updated_at', 'user_modified'
        )
        read_only_fields = ('transaction_id', 'user', 'created_at', 'updated_at', 'plaid_transaction_id')
    
    def get_formatted_amount(self, obj):
        """Format amount as currency string."""
        return f"${abs(obj.amount):,.2f}"


class TransactionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating transactions."""
    class Meta:
        model = Transaction
        fields = (
            'account', 'amount', 'date', 'merchant_name', 'description',
            'category', 'subcategory', 'tags', 'notes', 'is_recurring', 'is_transfer'
        )
    
    def validate_amount(self, value):
        """Validate amount is not zero."""
        if value == 0:
            raise serializers.ValidationError('Transaction amount cannot be zero')
        return value
    
    def validate_merchant_name(self, value):
        """Validate merchant name length."""
        if len(value) < 2:
            raise serializers.ValidationError('Merchant name must be at least 2 characters long')
        return value
    
    def validate(self, data):
        """Validate account ownership."""
        account = data.get('account')
        if account and account.user != self.context['request'].user:
            raise serializers.ValidationError({
                'account': 'Account does not belong to user'
            })
        return data


class TransactionCategorizeSerializer(serializers.Serializer):
    """Serializer for categorizing a transaction."""
    category_id = serializers.UUIDField(required=True)
    
    def validate_category_id(self, value):
        """Validate category exists and belongs to user."""
        user = self.context['request'].user
        try:
            category = Category.objects.get(category_id=value)
            # Check if it's a system category or user's category
            if not category.is_system_category and category.user != user:
                raise serializers.ValidationError('Category does not belong to user')
        except Category.DoesNotExist:
            raise serializers.ValidationError('Category not found')
        return value


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for Category model."""
    parent_category_name = serializers.CharField(source='parent_category.name', read_only=True)
    
    class Meta:
        model = Category
        fields = (
            'category_id', 'name', 'type', 'icon', 'color',
            'is_system_category', 'parent_category', 'parent_category_name',
            'created_at', 'updated_at'
        )
        read_only_fields = ('category_id', 'created_at', 'updated_at')


class CategoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating custom categories."""
    class Meta:
        model = Category
        fields = ('name', 'type', 'icon', 'color', 'parent_category')
    
    def validate_name(self, value):
        """Validate category name."""
        if len(value) < 2:
            raise serializers.ValidationError('Category name must be at least 2 characters long')
        return value


class CategorySuggestionSerializer(serializers.Serializer):
    """Serializer for AI category suggestions."""
    category_id = serializers.UUIDField()
    category_name = serializers.CharField()
    confidence_score = serializers.FloatField(min_value=0.0, max_value=1.0)
    reasoning = serializers.CharField(required=False, allow_blank=True)

