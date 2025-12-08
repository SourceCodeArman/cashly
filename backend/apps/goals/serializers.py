"""
Serializers for goals app.
"""
from rest_framework import serializers
from decimal import Decimal
from django.utils import timezone
from .models import Goal, Contribution
from .savings_models import SavingsRule, SavingsContribution
from apps.accounts.models import Account
from apps.transactions.models import Category


class GoalSerializer(serializers.ModelSerializer):
    """Serializer for Goal model with computed fields."""
    progress_percentage = serializers.SerializerMethodField()
    is_on_track = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    destination_account_id = serializers.UUIDField(source='destination_account.account_id', read_only=True)
    destination_account_name = serializers.CharField(source='destination_account.custom_name', read_only=True)
    inferred_category_id = serializers.UUIDField(source='inferred_category.category_id', read_only=True, allow_null=True)
    inferred_category_name = serializers.CharField(source='inferred_category.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Goal
        fields = [
            'goal_id',
            'name',
            'target_amount',
            'current_amount',
            'deadline',
            'monthly_contribution',
            'goal_type',
            'is_active',
            'is_completed',
            'destination_account_id',
            'destination_account_name',
            'transfer_authorized',
            'initial_balance_synced',
            'contribution_rules',
            'reminder_settings',
            'inferred_category_id',
            'inferred_category_name',
            'priority',
            'completed_at',
            'archived_at',
            'created_at',
            'updated_at',
            'progress_percentage',
            'is_on_track',
            'days_remaining',
        ]
        read_only_fields = [
            'goal_id',
            'current_amount',
            'is_completed',
            'transfer_authorized',
            'initial_balance_synced',
            'completed_at',
            'archived_at',
            'created_at',
            'updated_at',
            'progress_percentage',
            'is_on_track',
            'days_remaining',
        ]
    
    def get_progress_percentage(self, obj):
        """Calculate progress percentage."""
        return obj.progress_percentage()
    
    def get_is_on_track(self, obj):
        """Check if goal is on track."""
        return obj.is_on_track()
    
    def get_days_remaining(self, obj):
        """Calculate days remaining."""
        return obj.days_remaining()


class GoalCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating goals."""
    destination_account = serializers.UUIDField(required=False, allow_null=True)
    inferred_category = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = Goal
        fields = [
            'name',
            'target_amount',
            'deadline',
            'monthly_contribution',
            'goal_type',
            'is_active',
            'destination_account',
            'contribution_rules',
            'reminder_settings',
            'inferred_category',
            'priority',
        ]
    
    def validate_target_amount(self, value):
        """Validate target amount is positive."""
        if value <= 0:
            raise serializers.ValidationError('Target amount must be greater than zero.')
        return value
    
    def validate_monthly_contribution(self, value):
        """Validate monthly contribution is non-negative."""
        if value < 0:
            raise serializers.ValidationError('Monthly contribution cannot be negative.')
        return value
    
    def validate_destination_account(self, value):
        """Validate destination account exists and belongs to user."""
        if value is None:
            return None
        
        request = self.context.get('request')
        if not request:
            return value
        
        try:
            account = Account.objects.get(account_id=value, user=request.user)
            # Validate account is active
            if not account.is_active:
                raise serializers.ValidationError('Destination account must be active.')
            return value
        except Account.DoesNotExist:
            raise serializers.ValidationError('Destination account not found.')
    
    def validate_inferred_category(self, value):
        """Validate inferred category exists and belongs to user."""
        if value is None:
            return None
        
        request = self.context.get('request')
        if not request:
            return value
        
        try:
            category = Category.objects.get(category_id=value, user=request.user)
            return value
        except Category.DoesNotExist:
            raise serializers.ValidationError('Category not found.')
    
    def create(self, validated_data):
        """Create goal with user from request context."""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('User is required.')
        
        # Handle destination_account UUID conversion
        destination_account_id = validated_data.pop('destination_account', None)
        if destination_account_id:
            validated_data['destination_account'] = Account.objects.get(
                account_id=destination_account_id,
                user=request.user
            )
        else:
            validated_data['destination_account'] = None
        
        # Handle inferred_category UUID conversion
        inferred_category_id = validated_data.pop('inferred_category', None)
        if inferred_category_id:
            validated_data['inferred_category'] = Category.objects.get(
                category_id=inferred_category_id,
                user=request.user
            )
        else:
            validated_data['inferred_category'] = None
        
        validated_data['user'] = request.user
        return super().create(validated_data)


class GoalContributeSerializer(serializers.Serializer):
    """Serializer for contributing to a goal."""
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=True
    )
    date = serializers.DateField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)
    
    def validate_amount(self, value):
        """Validate amount is positive."""
        if value <= 0:
            raise serializers.ValidationError('Contribution amount must be greater than zero.')
        return value
    
    def validate_date(self, value):
        """Validate date is not in the future."""
        if value and value > timezone.now().date():
            raise serializers.ValidationError('Contribution date cannot be in the future.')
        return value


class ContributionSerializer(serializers.ModelSerializer):
    """Serializer for Contribution model."""
    goal_id = serializers.UUIDField(source='goal.goal_id', read_only=True)
    goal_name = serializers.CharField(source='goal.name', read_only=True)
    transaction_id = serializers.UUIDField(source='transaction.transaction_id', read_only=True, allow_null=True)
    
    class Meta:
        model = Contribution
        fields = [
            'contribution_id',
            'goal_id',
            'goal_name',
            'amount',
            'date',
            'note',
            'source',
            'transaction_id',
            'created_at',
        ]
        read_only_fields = [
            'contribution_id',
            'goal_id',
            'goal_name',
            'source',
            'transaction_id',
            'created_at',
        ]


class ContributionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating contributions."""
    date = serializers.DateField(required=False, allow_null=True)
    
    class Meta:
        model = Contribution
        fields = [
            'amount',
            'date',
            'note',
        ]
    
    def validate_amount(self, value):
        """Validate amount is positive."""
        if value <= 0:
            raise serializers.ValidationError('Contribution amount must be greater than zero.')
        return value
    
    def validate_date(self, value):
        """Validate date is not in the future."""
        if value and value > timezone.now().date():
            raise serializers.ValidationError('Contribution date cannot be in the future.')
        return value


class SavingsRuleSerializer(serializers.ModelSerializer):
    """Serializer for SavingsRule model."""
    goal_id = serializers.UUIDField(source='goal.goal_id', read_only=True)
    goal_name = serializers.CharField(source='goal.name', read_only=True)
    category_id = serializers.UUIDField(source='category.category_id', read_only=True, allow_null=True)
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    total_contributions = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = SavingsRule
        fields = [
            'rule_id',
            'goal_id',
            'goal_name',
            'rule_type',
            'trigger',
            'percentage',
            'category_id',
            'category_name',
            'is_active',
            'created_at',
            'updated_at',
            'total_contributions',
            'total_amount',
        ]
        read_only_fields = [
            'rule_id',
            'created_at',
            'updated_at',
            'total_contributions',
            'total_amount',
        ]
    
    def get_total_contributions(self, obj):
        """Get total number of contributions from this rule."""
        return obj.contributions.count()
    
    def get_total_amount(self, obj):
        """Get total amount contributed from this rule."""
        from django.db.models import Sum
        total = obj.contributions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return float(total)


class SavingsRuleCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating savings rules."""
    goal = serializers.UUIDField(required=True)
    category = serializers.UUIDField(required=False, allow_null=True)
    
    class Meta:
        model = SavingsRule
        fields = [
            'goal',
            'rule_type',
            'trigger',
            'percentage',
            'category',
            'is_active',
        ]
    
    def validate_goal(self, value):
        """Validate goal exists and belongs to user."""
        request = self.context.get('request')
        if not request:
            return value
        
        try:
            goal = Goal.objects.get(goal_id=value, user=request.user)
            if not goal.is_active:
                raise serializers.ValidationError('Goal must be active to create savings rules.')
            return value
        except Goal.DoesNotExist:
            raise serializers.ValidationError('Goal not found.')
    
    def validate_category(self, value):
        """Validate category exists and belongs to user."""
        if value is None:
            return None
        
        request = self.context.get('request')
        if not request:
            return value
        
        try:
            category = Category.objects.get(category_id=value, user=request.user)
            return value
        except Category.DoesNotExist:
            raise serializers.ValidationError('Category not found.')
    
    def validate(self, data):
        """Validate rule-specific requirements."""
        rule_type = data.get('rule_type')
        trigger = data.get('trigger')
        percentage = data.get('percentage')
        category = data.get('category')
        
        # Percentage-based rules require percentage field
        if rule_type == 'percentage' and not percentage:
            raise serializers.ValidationError({
                'percentage': 'Percentage is required for percentage-based savings rules.'
            })
        
        # Category-specific rules require category field
        if trigger == 'category' and not category:
            raise serializers.ValidationError({
                'category': 'Category is required when trigger is set to "Specific Category".'
            })
        
        # Round-up rules don't need percentage
        if rule_type == 'roundup' and percentage:
            raise serializers.ValidationError({
                'percentage': 'Percentage is not used for round-up savings rules.'
            })
        
        return data
    
    def create(self, validated_data):
        """Create savings rule with user from request context."""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('User is required.')
        
        # Handle goal UUID conversion
        goal_id = validated_data.pop('goal')
        validated_data['goal'] = Goal.objects.get(goal_id=goal_id, user=request.user)
        
        # Handle category UUID conversion
        category_id = validated_data.pop('category', None)
        if category_id:
            validated_data['category'] = Category.objects.get(
                category_id=category_id,
                user=request.user
            )
        else:
            validated_data['category'] = None
        
        validated_data['user'] = request.user
        return super().create(validated_data)


class SavingsContributionSerializer(serializers.ModelSerializer):
    """Serializer for SavingsContribution model."""
    rule_id = serializers.UUIDField(source='rule.rule_id', read_only=True)
    rule_type = serializers.CharField(source='rule.rule_type', read_only=True)
    goal_id = serializers.UUIDField(source='goal.goal_id', read_only=True)
    goal_name = serializers.CharField(source='goal.name', read_only=True)
    transaction_id = serializers.UUIDField(source='transaction.transaction_id', read_only=True)
    merchant_name = serializers.CharField(source='transaction.merchant_name', read_only=True)
    
    class Meta:
        model = SavingsContribution
        fields = [
            'contribution_id',
            'rule_id',
            'rule_type',
            'goal_id',
            'goal_name',
            'transaction_id',
            'merchant_name',
            'amount',
            'applied_at',
        ]
        read_only_fields = [
            'contribution_id',
            'rule_id',
            'rule_type',
            'goal_id',
            'goal_name',
            'transaction_id',
            'merchant_name',
            'amount',
            'applied_at',
        ]


