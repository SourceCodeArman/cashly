"""
Admin-specific serializers for user management and system statistics.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count
from apps.accounts.models import Account
from apps.transactions.models import Transaction
from apps.goals.models import Goal
from apps.budgets.models import Budget
from apps.subscriptions.models import Subscription

User = get_user_model()


class AdminAccountSerializer(serializers.ModelSerializer):
    """Serializer for accounts in admin view."""
    accountId = serializers.CharField(source='account_id', read_only=True)
    institutionName = serializers.CharField(source='institution_name', read_only=True)
    customName = serializers.CharField(source='custom_name', read_only=True)
    accountType = serializers.CharField(source='account_type', read_only=True)
    accountNumberMasked = serializers.CharField(source='account_number_masked', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    lastSyncedAt = serializers.DateTimeField(source='last_synced_at', read_only=True)
    errorCode = serializers.CharField(source='error_code', read_only=True)
    errorMessage = serializers.CharField(source='error_message', read_only=True)
    
    class Meta:
        model = Account
        fields = (
            'accountId',
            'institutionName',
            'customName',
            'accountType',
            'accountNumberMasked',
            'balance',
            'currency',
            'isActive',
            'createdAt',
            'lastSyncedAt',
            'errorCode',
            'errorMessage',
        )


class AdminTransactionSerializer(serializers.ModelSerializer):
    """Serializer for transactions in admin view."""
    transactionId = serializers.CharField(source='transaction_id', read_only=True)
    accountName = serializers.CharField(source='account.institution_name', read_only=True)
    merchantName = serializers.CharField(source='merchant_name', read_only=True)
    categoryName = serializers.CharField(source='category.name', read_only=True)
    transactionType = serializers.CharField(source='transaction_type', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = Transaction
        fields = (
            'transactionId',
            'account',
            'accountName',
            'amount',
            'date',
            'merchantName',
            'description',
            'category',
            'categoryName',
            'transactionType',
            'createdAt',
        )


class AdminGoalSerializer(serializers.ModelSerializer):
    """Serializer for goals in admin view."""
    goalId = serializers.CharField(source='goal_id', read_only=True)
    targetAmount = serializers.DecimalField(source='target_amount', max_digits=12, decimal_places=2, read_only=True)
    currentAmount = serializers.DecimalField(source='current_amount', max_digits=12, decimal_places=2, read_only=True)
    goalType = serializers.CharField(source='goal_type', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)
    destinationAccount = serializers.PrimaryKeyRelatedField(source='destination_account', read_only=True)
    destinationAccountName = serializers.CharField(
        source='destination_account.institution_name', 
        read_only=True,
        allow_null=True
    )
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = Goal
        fields = (
            'goalId',
            'name',
            'targetAmount',
            'currentAmount',
            'deadline',
            'goalType',
            'isActive',
            'destinationAccount',
            'destinationAccountName',
            'createdAt',
        )


class AdminBudgetSerializer(serializers.ModelSerializer):
    """Serializer for budgets in admin view."""
    budgetId = serializers.CharField(source='budget_id', read_only=True)
    categoryName = serializers.CharField(source='category.name', read_only=True)
    periodType = serializers.CharField(source='period_type', read_only=True)
    periodStart = serializers.DateField(source='period_start', read_only=True)
    periodEnd = serializers.DateField(source='period_end', read_only=True)
    alertsEnabled = serializers.BooleanField(source='alerts_enabled', read_only=True)
    alertThreshold = serializers.DecimalField(source='alert_threshold', max_digits=12, decimal_places=2, read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = Budget
        fields = (
            'budgetId',
            'category',
            'categoryName',
            'periodType',
            'amount',
            'periodStart',
            'periodEnd',
            'alertsEnabled',
            'alertThreshold',
            'createdAt',
        )


class AdminUserListSerializer(serializers.ModelSerializer):
    """Serializer for user list in admin dashboard."""
    firstName = serializers.CharField(source='first_name', read_only=True)
    lastName = serializers.CharField(source='last_name', read_only=True)
    phoneNumber = serializers.CharField(source='phone_number', read_only=True)
    subscriptionTier = serializers.CharField(source='subscription_tier', read_only=True)
    subscriptionPlan = serializers.SerializerMethodField()
    subscriptionStatus = serializers.CharField(source='subscription_status', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)
    isSuperuser = serializers.BooleanField(source='is_superuser', read_only=True)
    accountCount = serializers.IntegerField(source='account_count', read_only=True)
    transactionCount = serializers.IntegerField(source='transaction_count', read_only=True)
    totalBalance = serializers.DecimalField(
        source='total_balance',
        max_digits=12, 
        decimal_places=2, 
        read_only=True
    )
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    lastLogin = serializers.DateTimeField(source='last_login', read_only=True)
    
    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'username',
            'firstName',
            'lastName',
            'phoneNumber',
            'subscriptionTier',
            'subscriptionPlan',
            'subscriptionStatus',
            'isActive',
            'isSuperuser',
            'accountCount',
            'transactionCount',
            'totalBalance',
            'createdAt',
            'lastLogin',
        )
    
    def get_subscriptionPlan(self, obj):
        """Get subscription plan from Subscription model if exists."""
        try:
            subscription = Subscription.objects.filter(user=obj).first()
            if subscription:
                return subscription.plan
        except Exception:
            pass
        return obj.subscription_tier


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Comprehensive serializer for user details in admin view."""
    firstName = serializers.CharField(source='first_name', read_only=True)
    lastName = serializers.CharField(source='last_name', read_only=True)
    phoneNumber = serializers.CharField(source='phone_number', read_only=True)
    subscriptionTier = serializers.CharField(source='subscription_tier', read_only=True)
    subscriptionPlan = serializers.SerializerMethodField()
    subscriptionStatus = serializers.CharField(source='subscription_status', read_only=True)
    subscriptionEndDate = serializers.DateTimeField(source='subscription_end_date', read_only=True)
    stripeCustomerId = serializers.CharField(source='stripe_customer_id', read_only=True)
    mfaEnabled = serializers.BooleanField(source='mfa_enabled', read_only=True)
    tourDone = serializers.BooleanField(source='tour_done', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)
    isSuperuser = serializers.BooleanField(source='is_superuser', read_only=True)
    isStaff = serializers.BooleanField(source='is_staff', read_only=True)
    accountCount = serializers.IntegerField(source='account_count', read_only=True)
    transactionCount = serializers.IntegerField(source='transaction_count', read_only=True)
    goalCount = serializers.IntegerField(source='goal_count', read_only=True)
    budgetCount = serializers.IntegerField(source='budget_count', read_only=True)
    totalBalance = serializers.DecimalField(
        source='total_balance',
        max_digits=12, 
        decimal_places=2, 
        read_only=True
    )
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    lastLogin = serializers.DateTimeField(source='last_login', read_only=True)
    
    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'username',
            'firstName',
            'lastName',
            'phoneNumber',
            'subscriptionTier',
            'subscriptionPlan',
            'subscriptionStatus',
            'subscriptionEndDate',
            'stripeCustomerId',
            'mfaEnabled',
            'tourDone',
            'preferences',
            'isActive',
            'isSuperuser',
            'isStaff',
            'accountCount',
            'transactionCount',
            'goalCount',
            'budgetCount',
            'totalBalance',
            'createdAt',
            'updatedAt',
            'lastLogin',
        )
        read_only_fields = ('id', 'createdAt', 'updatedAt', 'stripeCustomerId')
    
    def get_subscriptionPlan(self, obj):
        """Get subscription plan from Subscription model if exists."""
        try:
            subscription = Subscription.objects.filter(user=obj).first()
            if subscription:
                return subscription.plan
        except Exception:
            pass
        return obj.subscription_tier


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user details in admin panel."""
    subscriptionTier = serializers.CharField(source='subscription_tier', required=False)
    subscriptionStatus = serializers.CharField(source='subscription_status', required=False)
    subscriptionEndDate = serializers.DateTimeField(source='subscription_end_date', required=False)
    isActive = serializers.BooleanField(source='is_active', required=False)
    phoneNumber = serializers.CharField(source='phone_number', required=False)
    
    class Meta:
        model = User
        fields = (
            'subscriptionTier',
            'subscriptionStatus',
            'subscriptionEndDate',
            'isActive',
            'phoneNumber',
            'email',
        )
    
    def validate_email(self, value):
        """Validate email is unique if changed."""
        user = self.instance
        if user and user.email != value:
            if User.objects.filter(email=value).exists():
                raise serializers.ValidationError("A user with this email already exists.")
        return value


class AdminSystemStatsSerializer(serializers.Serializer):
    """Serializer for system-wide statistics."""
    totalUsers = serializers.IntegerField(source='total_users')
    totalAccounts = serializers.IntegerField(source='total_accounts')
    totalBalance = serializers.DecimalField(source='total_balance', max_digits=15, decimal_places=2)
    totalTransactions = serializers.IntegerField(source='total_transactions')
    activeSubscriptions = serializers.DictField(source='active_subscriptions')
    recentSignups7d = serializers.IntegerField(source='recent_signups_7d')
    recentSignups30d = serializers.IntegerField(source='recent_signups_30d')
    activeUsers7d = serializers.IntegerField(source='active_users_7d')
    activeUsers30d = serializers.IntegerField(source='active_users_30d')
    totalRevenue = serializers.DecimalField(source='total_revenue', max_digits=15, decimal_places=2)
    thisMonthRevenue = serializers.DecimalField(source='this_month_revenue', max_digits=15, decimal_places=2)


class AdminSystemHealthSerializer(serializers.Serializer):
    """Serializer for system health data."""
    database = serializers.DictField()
    cache = serializers.DictField()
    celery = serializers.DictField()
    system = serializers.DictField()
    overallStatus = serializers.CharField(source='overall_status')
    timestamp = serializers.DateTimeField()


class AdminLogEntrySerializer(serializers.Serializer):
    """Serializer for log entries."""
    timestamp = serializers.DateTimeField()
    level = serializers.CharField()
    logger = serializers.CharField()
    message = serializers.CharField()
    type = serializers.CharField()
    raw = serializers.CharField()


class AdminLogsResponseSerializer(serializers.Serializer):
    """Serializer for logs response."""
    entries = AdminLogEntrySerializer(many=True)
    total = serializers.IntegerField()
    limit = serializers.IntegerField()
    offset = serializers.IntegerField()


class AdminAPIAnalyticsSerializer(serializers.Serializer):
    """Serializer for API analytics."""
    summary = serializers.DictField()
    endpoints = serializers.DictField()
    topEndpoints = serializers.ListField(source='top_endpoints', child=serializers.DictField())


class AdminIntegrationStatusSerializer(serializers.Serializer):
    """Serializer for integration status."""
    plaid = serializers.DictField()
    stripe = serializers.DictField()


class AdminTableInfoSerializer(serializers.Serializer):
    """Serializer for table information."""
    name = serializers.CharField()
    modelName = serializers.CharField(source='model_name')
    appLabel = serializers.CharField(source='app_label')
    rowCount = serializers.IntegerField(source='row_count')
    size = serializers.CharField()


class AdminDatabaseStatsSerializer(serializers.Serializer):
    """Serializer for database statistics."""
    database = serializers.DictField()
    connectionPool = serializers.DictField(source='connection_pool')
    tables = AdminTableInfoSerializer(many=True)
    totalTables = serializers.IntegerField(source='total_tables')
    totalRows = serializers.IntegerField(source='total_rows')


class AdminDebugResponseSerializer(serializers.Serializer):
    """Serializer for debug action responses."""
    accountId = serializers.CharField(source='account_id', required=False)
    message = serializers.CharField(required=False)


class AdminPlaidTestSerializer(serializers.Serializer):
    """Serializer for Plaid test endpoint response."""
    status = serializers.CharField()
    clientIdConfigured = serializers.BooleanField(source='client_id_configured', required=False)
    secretConfigured = serializers.BooleanField(source='secret_configured', required=False)
    environment = serializers.CharField(required=False)
    error = serializers.CharField(required=False)


class AdminStripeTestSerializer(serializers.Serializer):
    """Serializer for Stripe test endpoint response."""
    status = serializers.CharField()
    secretKeyConfigured = serializers.BooleanField(source='secret_key_configured', required=False)
    publishableKeyConfigured = serializers.BooleanField(source='publishable_key_configured', required=False)
    error = serializers.CharField(required=False)


class AdminTestEndpointsSerializer(serializers.Serializer):
    """Serializer for test endpoints response."""
    plaid = AdminPlaidTestSerializer()
    stripe = AdminStripeTestSerializer()

