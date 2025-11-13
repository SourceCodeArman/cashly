"""
Serializers for accounts app.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Account

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'password_confirm', 'first_name', 'last_name')
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': True},
        }
    
    def validate_email(self, value):
        """Validate email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value
    
    def validate(self, attrs):
        """Validate password confirmation."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Password fields did not match.',
                'password_confirm': 'Password fields did not match.'
            })
        return attrs
    
    def create(self, validated_data):
        """Create new user."""
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(TokenObtainPairSerializer):
    """Serializer for user login with JWT tokens."""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    
    def validate(self, attrs):
        """Validate credentials and return tokens."""
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                raise serializers.ValidationError('Invalid email or password.')
            
            if not user.check_password(password):
                raise serializers.ValidationError('Invalid email or password.')
            
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            
            refresh = self.get_token(user)
            
            return {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                }
            }
        else:
            raise serializers.ValidationError('Must include "email" and "password".')


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile data."""
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'phone_number', 
                  'subscription_tier', 'mfa_enabled', 'preferences', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset request."""
    email = serializers.EmailField(required=True)
    
    def validate_email(self, value):
        """Validate email exists."""
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""
    token = serializers.CharField(required=True)
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    def validate(self, attrs):
        """Validate password confirmation."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password': 'Password fields did not match.',
                'password_confirm': 'Password fields did not match.'
            })
        return attrs


class AccountSerializer(serializers.ModelSerializer):
    """Serializer for Account model."""
    institution_name = serializers.CharField(read_only=True)
    account_type = serializers.CharField(read_only=True)
    account_number_masked = serializers.CharField(read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    custom_name = serializers.CharField(max_length=200, required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = Account
        fields = (
            'account_id',
            'institution_name',
            'custom_name',
            'account_type',
            'account_number_masked',
            'balance',
            'currency',
            'is_active',
            'created_at',
            'updated_at',
            'last_synced_at',
            'plaid_item_id',
            'plaid_institution_id',
            'plaid_products',
            'webhook_url',
            'error_code',
            'error_message',
        )
        read_only_fields = (
            'account_id',
            'created_at',
            'updated_at',
            'last_synced_at',
            'plaid_item_id',
            'plaid_institution_id',
            'plaid_products',
            'webhook_url',
            'error_code',
            'error_message',
        )


class LinkTokenRequestSerializer(serializers.Serializer):
    """Serializer for Plaid Link token creation."""

    products = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True
    )
    webhook = serializers.URLField(required=False, allow_blank=True)
    access_token = serializers.CharField(required=False, allow_blank=True)
    account_filters = serializers.JSONField(required=False)


class AccountConnectionSerializer(serializers.Serializer):
    """Serializer for account connection via Plaid."""

    public_token = serializers.CharField(required=True)
    institution_id = serializers.CharField(required=True)
    institution_name = serializers.CharField(required=False, allow_blank=True)
    selected_account_ids = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True
    )
    webhook = serializers.URLField(required=False, allow_blank=True)


class PlaidAuthSerializer(serializers.Serializer):
    """Serializer for Plaid Auth product data."""

    account_id = serializers.CharField()
    routing = serializers.DictField(child=serializers.CharField(), required=False)
    wires = serializers.DictField(child=serializers.CharField(), required=False)
    numbers = serializers.DictField(child=serializers.CharField(), required=False)


class PlaidIdentitySerializer(serializers.Serializer):
    """Serializer for Plaid Identity product data."""

    account_id = serializers.CharField()
    names = serializers.ListField(child=serializers.CharField())
    emails = serializers.ListField(child=serializers.DictField(), required=False)
    phone_numbers = serializers.ListField(child=serializers.DictField(), required=False)
    addresses = serializers.ListField(child=serializers.DictField(), required=False)


class PlaidInvestmentSerializer(serializers.Serializer):
    """Serializer for Plaid Investments product data."""

    account_id = serializers.CharField()
    security = serializers.DictField()
    quantity = serializers.DecimalField(max_digits=20, decimal_places=4)
    price = serializers.DecimalField(max_digits=20, decimal_places=4)
    value = serializers.DecimalField(max_digits=20, decimal_places=4)


class PlaidAssetSerializer(serializers.Serializer):
    """Serializer for Plaid Assets product data."""

    asset_report_token = serializers.CharField()
    status = serializers.CharField()

