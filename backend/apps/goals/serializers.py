"""
Serializers for goals app.
"""
from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal
from .models import Goal, Contribution
from apps.transactions.models import Category
from apps.accounts.models import Account


class ContributionSerializer(serializers.ModelSerializer):
    """Serializer for Contribution model."""
    contribution_id = serializers.UUIDField(read_only=True)
    goal_id = serializers.UUIDField(source='goal.goal_id', read_only=True)
    transaction_id = serializers.UUIDField(source='transaction.transaction_id', read_only=True, allow_null=True)
    formatted_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = Contribution
        fields = (
            'contribution_id', 'goal_id', 'amount', 'formatted_amount',
            'date', 'note', 'source', 'transaction_id', 'created_at'
        )
        read_only_fields = ('contribution_id', 'created_at')
    
    def get_formatted_amount(self, obj):
        """Format amount as currency."""
        return f"${obj.amount:,.2f}"
    
    def validate_amount(self, value):
        """Validate contribution amount."""
        if value <= 0:
            raise serializers.ValidationError('Contribution amount must be greater than zero')
        return value
    
    def validate_date(self, value):
        """Validate contribution date."""
        # Allow future dates for manual contributions
        # This can be useful for planning
        return value


class GoalSerializer(serializers.ModelSerializer):
    """Serializer for Goal model with computed fields."""
    progress_percentage = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    is_on_track = serializers.SerializerMethodField()
    formatted_target_amount = serializers.SerializerMethodField()
    formatted_current_amount = serializers.SerializerMethodField()
    inferred_category_id = serializers.UUIDField(source='inferred_category.category_id', read_only=True, allow_null=True)
    inferred_category_name = serializers.CharField(source='inferred_category.name', read_only=True, allow_null=True)
    manual_contributions_total = serializers.SerializerMethodField()
    contributions_count = serializers.SerializerMethodField()
    destination_account_id = serializers.UUIDField(source='destination_account.account_id', read_only=True, allow_null=True)
    destination_account_name = serializers.SerializerMethodField()
    destination_account_type = serializers.SerializerMethodField()
    is_activation_pending = serializers.SerializerMethodField()
    
    class Meta:
        model = Goal
        fields = (
            'goal_id', 'name', 'target_amount', 'formatted_target_amount',
            'current_amount', 'formatted_current_amount', 'deadline',
            'monthly_contribution', 'goal_type', 'is_active', 'is_completed',
            'inferred_category_id', 'inferred_category_name', 'priority',
            'completed_at', 'archived_at', 'manual_contributions_total',
            'contributions_count', 'progress_percentage', 'days_remaining',
            'is_on_track', 'created_at', 'updated_at',
            'destination_account_id', 'destination_account_name', 'destination_account_type',
            'transfer_authorized', 'initial_balance_synced', 'contribution_rules',
            'reminder_settings', 'is_activation_pending'
        )
        read_only_fields = (
            'goal_id', 'created_at', 'updated_at', 'completed_at',
            'archived_at', 'manual_contributions_total', 'contributions_count',
            'is_activation_pending'
        )
    
    def get_progress_percentage(self, obj):
        """Calculate progress percentage."""
        try:
            return obj.progress_percentage()
        except Exception:
            return 0.0
    
    def get_days_remaining(self, obj):
        """Get days remaining until deadline."""
        try:
            return obj.days_remaining()
        except Exception:
            return None
    
    def get_is_on_track(self, obj):
        """Check if goal is on track."""
        try:
            return obj.is_on_track()
        except Exception:
            return None
    
    def get_formatted_target_amount(self, obj):
        """Format target amount as currency."""
        try:
            return f"${obj.target_amount:,.2f}"
        except Exception:
            return "$0.00"
    
    def get_formatted_current_amount(self, obj):
        """Format current amount as currency."""
        try:
            return f"${obj.current_amount:,.2f}"
        except Exception:
            return "$0.00"
    
    def get_manual_contributions_total(self, obj):
        """Get total of manual contributions."""
        try:
            return float(obj.get_manual_contributions_total())
        except Exception:
            return 0.0
    
    def get_contributions_count(self, obj):
        """Get total number of contributions."""
        try:
            return obj.contributions.count()
        except Exception:
            return 0
    
    def get_destination_account_name(self, obj):
        """Get destination account name or 'Cash'."""
        if obj.destination_account:
            return obj.destination_account.custom_name or obj.destination_account.institution_name
        return 'Cash'
    
    def get_destination_account_type(self, obj):
        """Get destination account type or 'cash'."""
        if obj.destination_account:
            return obj.destination_account.account_type
        return 'cash'
    
    def get_is_activation_pending(self, obj):
        """Check if goal is waiting for transfer authorization."""
        try:
            return obj.is_activation_pending()
        except Exception:
            return False


class GoalCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating goals."""
    inferred_category_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    destination_account_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    contribution_rules = serializers.JSONField(required=False, allow_null=True)
    reminder_settings = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = Goal
        fields = (
            'name', 'target_amount', 'deadline', 'goal_type',
            'monthly_contribution', 'inferred_category_id',
            'destination_account_id', 'contribution_rules', 'reminder_settings'
        )
    
    def validate_target_amount(self, value):
        """Validate target amount is positive."""
        if value <= 0:
            raise serializers.ValidationError('Target amount must be greater than zero')
        return value
    
    def validate_deadline(self, value):
        """Validate deadline is in the future."""
        if value and value < timezone.now().date():
            raise serializers.ValidationError('Deadline must be in the future')
        return value
    
    def validate_inferred_category_id(self, value):
        """Validate inferred category exists and belongs to user."""
        if value:
            request = self.context.get('request')
            if not request or not request.user:
                raise serializers.ValidationError('User context required for category validation')
            
            try:
                category = Category.objects.get(category_id=value)
                # Check if category is system category or belongs to user
                if not category.is_system_category and category.user != request.user:
                    raise serializers.ValidationError('Category does not belong to user')
            except Category.DoesNotExist:
                raise serializers.ValidationError('Category not found')
        return value
    
    def validate_destination_account_id(self, value):
        """Validate destination account exists, belongs to user, and is checking/savings."""
        if value:
            request = self.context.get('request')
            if not request or not request.user:
                raise serializers.ValidationError('User context required for account validation')
            
            try:
                account = Account.objects.get(account_id=value, user=request.user)
                # Only allow checking or savings accounts
                if account.account_type not in ['checking', 'savings']:
                    raise serializers.ValidationError('Destination account must be checking or savings')
            except Account.DoesNotExist:
                raise serializers.ValidationError('Account not found or does not belong to user')
        return value
    
    def validate_contribution_rules(self, value):
        """Validate contribution rules structure."""
        if not value:
            return {}
        
        if not isinstance(value, dict):
            raise serializers.ValidationError('Contribution rules must be a dictionary')
        
        # Validate enabled field
        if 'enabled' in value and not isinstance(value['enabled'], bool):
            raise serializers.ValidationError('contribution_rules.enabled must be a boolean')
        
        # Validate source_accounts if present
        if 'source_accounts' in value:
            if not isinstance(value['source_accounts'], list):
                raise serializers.ValidationError('contribution_rules.source_accounts must be a list')
            
            request = self.context.get('request')
            if request and request.user:
                for source_account in value['source_accounts']:
                    if not isinstance(source_account, dict):
                        raise serializers.ValidationError('Each source account must be a dictionary')
                    if 'account_id' not in source_account:
                        raise serializers.ValidationError('Each source account must have account_id')
                    if 'rule' not in source_account:
                        raise serializers.ValidationError('Each source account must have rule')
                    
                    # Validate account belongs to user
                    try:
                        account = Account.objects.get(account_id=source_account['account_id'], user=request.user)
                        if account.account_type not in ['checking', 'savings']:
                            raise serializers.ValidationError(f'Source account {account.account_id} must be checking or savings')
                    except Account.DoesNotExist:
                        raise serializers.ValidationError(f'Source account {source_account["account_id"]} not found')
        
        # Validate general_rule if present
        if 'general_rule' in value and value['general_rule']:
            if not isinstance(value['general_rule'], dict):
                raise serializers.ValidationError('contribution_rules.general_rule must be a dictionary')
        
        return value
    
    def validate_reminder_settings(self, value):
        """Validate reminder settings structure."""
        if not value:
            return {}
        
        if not isinstance(value, dict):
            raise serializers.ValidationError('Reminder settings must be a dictionary')
        
        # Reminder settings only valid for cash goals (no destination_account_id)
        destination_account_id = self.initial_data.get('destination_account_id')
        if destination_account_id:
            raise serializers.ValidationError('Reminder settings are only valid for cash goals (no destination account)')
        
        # Validate frequency
        if 'frequency' in value:
            valid_frequencies = ['daily', 'weekly', 'monthly', 'biweekly']
            if value['frequency'] not in valid_frequencies:
                raise serializers.ValidationError(f'Frequency must be one of: {", ".join(valid_frequencies)}')
        
        # Validate channels
        if 'channels' in value:
            if not isinstance(value['channels'], list):
                raise serializers.ValidationError('channels must be a list')
            valid_channels = ['email', 'push']
            for channel in value['channels']:
                if channel not in valid_channels:
                    raise serializers.ValidationError(f'Channel must be one of: {", ".join(valid_channels)}')
        
        return value
    
    def validate(self, data):
        """Cross-field validation."""
        # If destination_account_id is null, goal is cash-based
        # If destination_account_id is provided, contribution_rules should have destination_account_id
        destination_account_id = data.get('destination_account_id')
        contribution_rules = data.get('contribution_rules', {})
        
        if destination_account_id and contribution_rules:
            # Ensure contribution_rules has destination_account_id matching
            if 'destination_account_id' in contribution_rules:
                if str(contribution_rules['destination_account_id']) != str(destination_account_id):
                    raise serializers.ValidationError(
                        'contribution_rules.destination_account_id must match destination_account_id'
                    )
            else:
                # Auto-set it
                contribution_rules['destination_account_id'] = str(destination_account_id)
                data['contribution_rules'] = contribution_rules
        
        return data
    
    def create(self, validated_data):
        """Create goal with inferred category and destination account."""
        inferred_category_id = validated_data.pop('inferred_category_id', None)
        destination_account_id = validated_data.pop('destination_account_id', None)
        contribution_rules = validated_data.pop('contribution_rules', {})
        reminder_settings = validated_data.pop('reminder_settings', {})
        
        # Set defaults for new goals
        goal = Goal.objects.create(
            **validated_data,
            contribution_rules=contribution_rules or {},
            reminder_settings=reminder_settings or {},
            is_active=False,  # New goals start inactive
            transfer_authorized=False
        )
        
        # Set inferred category
        if inferred_category_id:
            try:
                category = Category.objects.get(category_id=inferred_category_id)
                goal.inferred_category = category
                goal.save(update_fields=['inferred_category'])
            except Category.DoesNotExist:
                pass  # Category validation should have caught this
        
        # Set destination account
        if destination_account_id:
            try:
                account = Account.objects.get(account_id=destination_account_id, user=goal.user)
                goal.destination_account = account
                goal.save(update_fields=['destination_account'])
            except Account.DoesNotExist:
                pass  # Account validation should have caught this
        else:
            # Cash goal - activate immediately
            goal.is_active = True
            goal.save(update_fields=['is_active'])
        
        return goal


class GoalContributeSerializer(serializers.Serializer):
    """Serializer for manual goal contributions (deprecated - use ContributionSerializer)."""
    amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.01')
    )
    date = serializers.DateField(required=False)
    note = serializers.CharField(required=False, allow_blank=True)
    
    def validate_amount(self, value):
        """Validate contribution amount."""
        if value <= 0:
            raise serializers.ValidationError('Contribution amount must be greater than zero')
        return value


class ContributionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating contributions."""
    date = serializers.DateField(required=False)
    
    class Meta:
        model = Contribution
        fields = ('amount', 'date', 'note')
    
    def validate_amount(self, value):
        """Validate contribution amount."""
        if value <= 0:
            raise serializers.ValidationError('Contribution amount must be greater than zero')
        return value
    
    def validate_date(self, value):
        """Validate contribution date."""
        # Allow future dates for manual contributions
        # If not provided, will default to today in perform_create
        return value
    
    def validate(self, data):
        """Validate contribution data."""
        # Date is optional - will default to today if not provided
        if 'date' not in data or not data['date']:
            data['date'] = timezone.now().date()
        return data

