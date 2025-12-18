"""
Serializers for accounts app.
"""

from decimal import Decimal
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Account

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "phone_number",
        )
        extra_kwargs = {
            "email": {"required": False},
            "phone_number": {"required": False},
        }

    def validate_email(self, value):
        """Validate email is unique."""
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_phone_number(self, value):
        """Validate phone number is unique."""
        if value and User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "A user with this phone number already exists."
            )
        return value

    def validate(self, attrs):
        """Validate password confirmation."""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {
                    "password": "Password fields did not match.",
                    "password_confirm": "Password fields did not match.",
                }
            )

        if not attrs.get("email") and not attrs.get("phone_number"):
            raise serializers.ValidationError(
                "Either email or phone number is required."
            )

        return attrs

    def create(self, validated_data):
        """Create new user."""
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user


class GoogleLoginSerializer(serializers.Serializer):
    access_token = serializers.CharField(required=True)

    def validate_access_token(self, value):
        if not value:
            raise serializers.ValidationError("Access token is required")
        return value


class UserLoginSerializer(serializers.Serializer):
    """
    Serializer for handling user login with email or phone.
    """

    login = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def get_token(self, user):
        return RefreshToken.for_user(user)

    def validate(self, attrs):
        """Validate credentials and return tokens."""
        login = attrs.get("login")
        password = attrs.get("password")

        if login and password:
            # We don't manually fetch the user anymore, we use authenticate
            # But since we need to check is_active etc, we can use our backend manually or
            # duplicate some logic. Let's use the backend logic via authenticate() if we had request context
            # Or creating a helper in backend?
            # Creating a simpler check here:

            from django.db.models import Q

            try:
                user = User.objects.get(Q(email=login) | Q(phone_number=login))
            except User.DoesNotExist:
                raise serializers.ValidationError("Invalid credentials.")

            if not user.check_password(password):
                raise serializers.ValidationError("Invalid email or password.")

            if not user.is_active:
                raise serializers.ValidationError("User account is disabled.")

            if user.mfa_enabled:
                return {"mfa_required": True, "user": user}

            refresh = self.get_token(user)

            return {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "phone_number": user.phone_number,
                    "is_superuser": user.is_superuser,
                },
            }
        else:
            raise serializers.ValidationError('Must include "login" and "password".')


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user profile data."""

    firstName = serializers.CharField(source="first_name", read_only=True)
    lastName = serializers.CharField(source="last_name", read_only=True)
    phoneNumber = serializers.CharField(
        source="phone_number", required=False, allow_blank=True
    )
    subscriptionTier = serializers.CharField(source="subscription_tier", read_only=True)
    subscriptionStatus = serializers.CharField(
        source="subscription_status", read_only=True
    )
    subscriptionEndDate = serializers.DateTimeField(
        source="subscription_end_date", read_only=True
    )
    stripeCustomerId = serializers.CharField(
        source="stripe_customer_id", read_only=True
    )
    mfaEnabled = serializers.BooleanField(source="mfa_enabled", read_only=True)
    tourDone = serializers.BooleanField(source="tour_done", read_only=True)
    isSuperuser = serializers.BooleanField(source="is_superuser", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "firstName",
            "lastName",
            "phoneNumber",
            "subscriptionTier",
            "subscriptionStatus",
            "subscriptionEndDate",
            "stripeCustomerId",
            "mfaEnabled",
            "preferences",
            "tourDone",
            "isSuperuser",
            "createdAt",
            "updatedAt",
        )
        read_only_fields = ("id", "isSuperuser", "createdAt", "updatedAt")


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset request."""

    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""

    token = serializers.CharField(required=True)
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        """Validate password confirmation."""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {
                    "password": "Password fields did not match.",
                    "password_confirm": "Password fields did not match.",
                }
            )
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change."""

    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    new_password_confirm = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        """Validate password confirmation."""
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {
                    "new_password": "Password fields did not match.",
                    "new_password_confirm": "Password fields did not match.",
                }
            )
        return attrs


class AccountSerializer(serializers.ModelSerializer):
    """Serializer for Account model."""

    institution_name = serializers.CharField(read_only=True)
    account_type = serializers.CharField(read_only=True)
    account_number_masked = serializers.CharField(read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    custom_name = serializers.CharField(
        max_length=200, required=False, allow_blank=True, allow_null=True
    )

    class Meta:
        model = Account
        fields = (
            "account_id",
            "institution_name",
            "custom_name",
            "account_type",
            "account_number_masked",
            "balance",
            "currency",
            "is_active",
            "created_at",
            "updated_at",
            "last_synced_at",
            "plaid_item_id",
            "plaid_institution_id",
            "plaid_products",
            "webhook_url",
            "error_code",
            "error_message",
        )
        read_only_fields = (
            "account_id",
            "created_at",
            "updated_at",
            "last_synced_at",
            "plaid_item_id",
            "plaid_institution_id",
            "plaid_products",
            "webhook_url",
            "error_code",
            "error_message",
        )


class AccountWithCountSerializer(AccountSerializer):
    """Serializer for Account model with transaction count."""

    transaction_count = serializers.IntegerField(read_only=True)

    class Meta(AccountSerializer.Meta):
        fields = AccountSerializer.Meta.fields + ("transaction_count",)


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
    account_custom_names = serializers.DictField(
        child=serializers.CharField(max_length=200, allow_blank=True),
        required=False,
        allow_empty=True,
        help_text="Mapping of account_id to custom_name",
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


class TransferCreateSerializer(serializers.Serializer):
    """
    Serializer for creating a transfer between accounts.

    This serializer validates transfer requests before they are executed.
    Additional security checks (including transfer_authorized flag verification)
    are performed in the transfer_service module.
    """

    destination_account_id = serializers.UUIDField(required=True)
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=True, min_value=Decimal("0.01")
    )
    goal_id = serializers.UUIDField(required=True)
    description = serializers.CharField(
        max_length=10,
        required=False,
        default="Goal contr",  # Max 10 chars (Plaid API limit)
    )

    def validate(self, data):
        """
        Validate transfer request.

        Performs initial validation to ensure:
        - Goal exists and belongs to user
        - Destination account exists and belongs to user
        - Goal has a destination account
        - Destination account matches goal's destination account

        Note: Additional security checks (including transfer_authorized flag)
        are performed in transfer_service.validate_transfer_request().
        """
        goal_id = data.get("goal_id")
        destination_account_id = data.get("destination_account_id")
        user = self.context["request"].user

        # Import here to avoid circular dependencies
        from apps.goals.models import Goal

        # Validate goal exists and belongs to user
        try:
            goal = Goal.objects.get(goal_id=goal_id, user=user)
        except Goal.DoesNotExist:
            raise serializers.ValidationError(
                {"goal_id": ["Goal not found or does not belong to user"]}
            )

        # Validate destination account exists and belongs to user
        try:
            destination_account = Account.objects.get(
                account_id=destination_account_id, user=user
            )
        except Account.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "destination_account_id": [
                        "Destination account not found or does not belong to user"
                    ]
                }
            )

        # Validate goal has destination account
        if not goal.destination_account:
            raise serializers.ValidationError(
                {
                    "goal_id": [
                        "Goal must have a destination account to execute transfers"
                    ]
                }
            )

        # Validate destination matches goal's destination
        if goal.destination_account.account_id != destination_account_id:
            raise serializers.ValidationError(
                {
                    "destination_account_id": [
                        "Destination account must match goal's destination account"
                    ]
                }
            )

        # Additional validation will be done in transfer_service
        # (checking transfer_authorized, active authorization, etc.)

        return data


class EmailChangeRequestSerializer(serializers.Serializer):
    new_email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class EmailChangeVerifySerializer(serializers.Serializer):
    token = serializers.CharField()


class MFASetupSerializer(serializers.Serializer):
    """Serializer for MFA setup verification."""

    code = serializers.CharField(required=True, min_length=6, max_length=6)
    secret = serializers.CharField(required=True)


class MFALoginVerifySerializer(serializers.Serializer):
    """Serializer for MFA login verification."""

    code = serializers.CharField(required=True, min_length=6, max_length=6)
    token = serializers.CharField(required=True)


class MFABackupCodeVerifySerializer(serializers.Serializer):
    """Serializer for MFA backup code verification during login."""

    code = serializers.CharField(
        required=True,
        min_length=8,
        max_length=9,  # 8 chars or 9 with hyphen (XXXX-XXXX)
        help_text="Backup code in format XXXX-XXXX or XXXXXXXX",
    )
    token = serializers.CharField(required=True)
