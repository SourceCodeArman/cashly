"""
Serializers for debts app.
"""
from rest_framework import serializers
from .models import DebtAccount, DebtPayment, DebtPayoffStrategy
from apps.transactions.models import Transaction
from decimal import Decimal


class DebtAccountSerializer(serializers.ModelSerializer):
    """Serializer for DebtAccount model (read operations)."""
    monthly_interest = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    days_until_due = serializers.IntegerField(read_only=True)
    next_due_date = serializers.DateField(read_only=True)
    
    class Meta:
        model = DebtAccount
        fields = [
            'debt_id',
            'name',
            'debt_type',
            'current_balance',
            'original_balance',
            'interest_rate',
            'minimum_payment',
            'due_day',
            'creditor_name',
            'account_number_masked',
            'status',
            'opened_date',
            'target_payoff_date',
            'last_payment_date',
            'last_payment_amount',
            'notes',
            'is_active',
            'monthly_interest',
            'days_until_due',
            'next_due_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['debt_id', 'created_at', 'updated_at']


class DebtAccountCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating debt accounts."""
    
    class Meta:
        model = DebtAccount
        fields = [
            'name',
            'debt_type',
            'current_balance',
            'original_balance',
            'interest_rate',
            'minimum_payment',
            'due_day',
            'creditor_name',
            'account_number_masked',
            'opened_date',
            'target_payoff_date',
            'notes',
            'is_active',
        ]
    
    def validate_current_balance(self, value):
        """Validate current balance is non-negative."""
        if value < Decimal('0.00'):
            raise serializers.ValidationError('Current balance cannot be negative')
        return value
    
    def validate_original_balance(self, value):
        """Validate original balance is non-negative."""
        if value < Decimal('0.00'):
            raise serializers.ValidationError('Original balance cannot be negative')
        return value
    
    def validate_interest_rate(self, value):
        """Validate interest rate is reasonable."""
        if value < Decimal('0.00') or value > Decimal('100.00'):
            raise serializers.ValidationError('Interest rate must be between 0 and 100')
        return value
    
    def validate_minimum_payment(self, value):
        """Validate minimum payment is positive."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError('Minimum payment must be greater than 0')
        return value
    
    def validate_due_day(self, value):
        """Validate due day is valid."""
        if value < 1 or value > 31:
            raise serializers.ValidationError('Due day must be between 1 and 31')
        return value
    
    def validate(self, data):
        """Validate debt data."""
        # Current balance should not exceed original balance (unless it's been accruing interest)
        if data.get('current_balance') and data.get('original_balance'):
            # We'll allow current > original for cases where interest has accrued
            pass
        
        return data


class DebtAccountUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating debt accounts."""
    
    class Meta:
        model = DebtAccount
        fields = [
            'name',
            'current_balance',
            'interest_rate',
            'minimum_payment',
            'due_day',
            'creditor_name',
            'account_number_masked',
            'status',
            'target_payoff_date',
            'notes',
            'is_active',
        ]
    
    def validate_current_balance(self, value):
        """Validate current balance is non-negative."""
        if value < Decimal('0.00'):
            raise serializers.ValidationError('Current balance cannot be negative')
        return value
    
    def validate_interest_rate(self, value):
        """Validate interest rate is reasonable."""
        if value < Decimal('0.00') or value > Decimal('100.00'):
            raise serializers.ValidationError('Interest rate must be between 0 and 100')
        return value


class DebtPaymentSerializer(serializers.ModelSerializer):
    """Serializer for DebtPayment model (read operations)."""
    debt_name = serializers.CharField(source='debt.name', read_only=True)
    debt_id = serializers.UUIDField(source='debt.debt_id', read_only=True)
    transaction_id = serializers.UUIDField(source='transaction.transaction_id', read_only=True, allow_null=True)
    
    class Meta:
        model = DebtPayment
        fields = [
            'payment_id',
            'debt_id',
            'debt_name',
            'amount',
            'payment_date',
            'payment_type',
            'applied_to_principal',
            'applied_to_interest',
            'transaction_id',
            'notes',
            'created_at',
        ]
        read_only_fields = ['payment_id', 'created_at']


class DebtPaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating debt payments."""
    transaction = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = DebtPayment
        fields = [
            'amount',
            'payment_date',
            'payment_type',
            'transaction',
            'notes',
        ]
    
    def validate_amount(self, value):
        """Validate payment amount is positive."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError('Payment amount must be greater than 0')
        return value
    
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
        """Create debt payment instance."""
        # Extract debt and user from context (set in view)
        debt = self.context['debt']
        user = self.context['user']
        
        # Calculate principal/interest split
        from .utils import apply_payment_split
        interest, principal = apply_payment_split(debt, validated_data['amount'])
        
        # Create payment
        payment = DebtPayment.objects.create(
            debt=debt,
            user=user,
            amount=validated_data['amount'],
            payment_date=validated_data.get('payment_date'),
            payment_type=validated_data.get('payment_type', 'minimum'),
            applied_to_principal=principal,
            applied_to_interest=interest,
            transaction=validated_data.get('transaction'),
            notes=validated_data.get('notes', ''),
        )
        
        # Update debt balance
        debt.current_balance -= principal
        debt.last_payment_date = payment.payment_date
        debt.last_payment_amount = payment.amount
        
        # Check if paid off
        if debt.current_balance <= Decimal('0.00'):
            debt.mark_as_paid_off()
        else:
            debt.save(update_fields=['current_balance', 'last_payment_date', 'last_payment_amount', 'updated_at'])
        
        return payment


class DebtPayoffStrategySerializer(serializers.ModelSerializer):
    """Serializer for DebtPayoffStrategy model (read operations)."""
    
    class Meta:
        model = DebtPayoffStrategy
        fields = [
            'strategy_id',
            'strategy_type',
            'monthly_budget',
            'priority_order',
            'target_payoff_date',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['strategy_id', 'created_at', 'updated_at']


class DebtPayoffStrategyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating debt payoff strategies."""
    
    class Meta:
        model = DebtPayoffStrategy
        fields = [
            'strategy_type',
            'monthly_budget',
            'priority_order',
            'target_payoff_date',
            'is_active',
        ]
    
    def validate_monthly_budget(self, value):
        """Validate monthly budget is positive."""
        if value <= Decimal('0.00'):
            raise serializers.ValidationError('Monthly budget must be greater than 0')
        return value
    
    def validate(self, data):
        """Validate strategy data."""
        # For custom strategies, priority_order is required
        if data.get('strategy_type') == 'custom' and not data.get('priority_order'):
            raise serializers.ValidationError({
                'priority_order': 'Priority order is required for custom strategies'
            })
        
        # For auto strategies, generate priority order
        if data.get('strategy_type') in ['snowball', 'avalanche']:
            user = self.context['user']
            from .utils import generate_snowball_order, generate_avalanche_order
            from .models import DebtAccount
            
            debts = DebtAccount.objects.filter(user=user, status='active', is_active=True)
            
            if data['strategy_type'] == 'snowball':
                data['priority_order'] = generate_snowball_order(debts)
            else:  # avalanche
                data['priority_order'] = generate_avalanche_order(debts)
        
        return data


class DebtSummarySerializer(serializers.Serializer):
    """Serializer for debt summary data."""
    total_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_minimum_payments = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_interest_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    debt_count = serializers.IntegerField()
    total_original_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid_off = serializers.DecimalField(max_digits=12, decimal_places=2)
