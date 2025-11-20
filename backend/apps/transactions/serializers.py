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
    account = serializers.UUIDField(source='account.account_id', read_only=True)
    account_name = serializers.CharField(source='account.institution_name', read_only=True)
    account_number = serializers.CharField(source='account.account_number_masked', read_only=True)
    account_type = serializers.CharField(source='account.account_type', read_only=True)
    
    class Meta:
        model = Transaction
        fields = (
            'transaction_id', 'merchant_name', 'amount', 'formatted_amount',
            'date', 'category', 'category_id', 'category_name', 'account', 'account_name', 'account_number', 'account_type', 'created_at'
        )
    
    def get_formatted_amount(self, obj):
        """Format amount as currency string."""
        return f"${abs(obj.amount):,.2f}"


class TransactionFrontendSerializer(serializers.ModelSerializer):
    """Serializer that matches the frontend Transaction type contract."""

    id = serializers.UUIDField(source='transaction_id', read_only=True)
    merchantName = serializers.CharField(source='merchant_name', read_only=True)
    description = serializers.CharField(read_only=True, allow_blank=True)
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=True,
        read_only=True
    )
    formattedAmount = serializers.SerializerMethodField()
    date = serializers.DateField(read_only=True)
    type = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    account = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    isRecurring = serializers.BooleanField(source='is_recurring', read_only=True)
    isTransfer = serializers.BooleanField(source='is_transfer', read_only=True)
    userModified = serializers.BooleanField(source='user_modified', read_only=True)

    class Meta:
        model = Transaction
        fields = (
            'id',
            'merchantName',
            'description',
            'amount',
            'formattedAmount',
            'date',
            'type',
            'category',
            'account',
            'createdAt',
            'updatedAt',
            'isRecurring',
            'isTransfer',
            'userModified',
            'notes',
            'tags',
        )
        read_only_fields = fields

    def get_formattedAmount(self, obj):
        """Return a currency formatted absolute amount."""
        return f"${abs(obj.amount):,.2f}"

    def get_type(self, obj):
        """Derive transaction type from amount if not explicitly set."""
        if obj.amount > 0:
            return 'income'
        if obj.amount < 0:
            return 'expense'
        return 'transfer'

    def get_category(self, obj):
        """Return nested category data when available."""
        if not obj.category:
            return None
        category = obj.category
        return {
            'id': str(category.category_id),
            'name': category.name,
            'type': category.type,
            'icon': category.icon,
            'color': category.color,
            'isSystemCategory': category.is_system_category,
        }

    def get_account(self, obj):
        """Return nested account summary."""
        if not obj.account:
            return None
        account = obj.account
        return {
            'id': str(account.account_id),
            'name': account.custom_name or account.institution_name,
            'institutionName': account.institution_name,
            'accountType': account.account_type,
            'maskedAccountNumber': account.account_number_masked,
            'isActive': account.is_active,
        }


class TransactionDetailSerializer(serializers.ModelSerializer):
    """Serializer for transaction detail view."""
    formatted_amount = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_id = serializers.UUIDField(source='category.category_id', read_only=True, allow_null=True)
    account_name = serializers.CharField(source='account.institution_name', read_only=True)
    account_number = serializers.CharField(source='account.account_number_masked', read_only=True)
    account_type = serializers.CharField(source='account.account_type', read_only=True)
    
    class Meta:
        model = Transaction
        fields = (
            'transaction_id', 'account', 'user', 'amount', 'formatted_amount',
            'date', 'merchant_name', 'description', 'category', 'category_id', 'category_name',
            'subcategory', 'tags', 'notes', 'is_recurring', 'is_transfer',
            'plaid_transaction_id', 'location', 'account_name', 'account_number', 'account_type', 'created_at',
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
    id = serializers.UUIDField(source='category_id', read_only=True)
    parent_category_name = serializers.CharField(source='parent_category.name', read_only=True)
    isSystemCategory = serializers.BooleanField(source='is_system_category', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    subcategories = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = (
            'id', 'category_id', 'name', 'type', 'icon', 'color',
            'isSystemCategory', 'is_system_category', 'parent_category', 'parent_category_name',
            'subcategories', 'createdAt', 'updatedAt', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'category_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at')
    
    def get_subcategories(self, obj):
        """Return subcategories if this is a parent category."""
        if obj.subcategories.exists():
            # Avoid infinite recursion by using a simple serializer for subcategories
            return [{
                'id': str(sub.category_id),
                'name': sub.name,
                'type': sub.type,
                'icon': sub.icon,
                'color': sub.color,
                'isSystemCategory': sub.is_system_category,
            } for sub in obj.subcategories.all()]
        return []


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


class TransactionStatsSerializer(serializers.Serializer):
    """Serializer to align stats response with frontend expectations."""

    totalSpending = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True
    )
    totalIncome = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True
    )
    totalTransactions = serializers.IntegerField()
    net = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=True
    )

