"""
Serializers for budgets app.
"""
from rest_framework import serializers
from .models import Budget
from apps.transactions.models import Category


class BudgetSerializer(serializers.ModelSerializer):
    """Serializer for Budget model."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_id = serializers.UUIDField(source='category.category_id', read_only=True)
    
    class Meta:
        model = Budget
        fields = [
            'budget_id',
            'category_id',
            'category_name',
            'period_type',
            'amount',
            'period_start',
            'period_end',
            'alerts_enabled',
            'alert_threshold',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['budget_id', 'created_at', 'updated_at']


class BudgetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating budgets."""
    category = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = Budget
        fields = [
            'category',
            'period_type',
            'amount',
            'period_start',
            'period_end',
            'alerts_enabled',
            'alert_threshold',
        ]
    
    def validate_category(self, value):
        """Validate that category exists and belongs to user."""
        try:
            category = Category.objects.get(category_id=value)
            # Note: Category validation for user ownership is done in the view
            return category
        except Category.DoesNotExist:
            raise serializers.ValidationError('Category not found')
    
    def validate(self, data):
        """Validate budget period dates."""
        period_start = data.get('period_start')
        period_end = data.get('period_end')
        
        if period_start and period_end:
            if period_end < period_start:
                raise serializers.ValidationError({
                    'period_end': 'Period end date must be after period start date'
                })
        
        return data

    def create(self, validated_data):
        """Create budget instance."""
        return Budget.objects.create(**validated_data)

