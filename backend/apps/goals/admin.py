from django.contrib import admin
from .models import Goal, Contribution, TransferAuthorization


class ContributionInline(admin.TabularInline):
    """Inline admin for contributions."""
    model = Contribution
    extra = 0
    readonly_fields = ('contribution_id', 'created_at', 'source', 'transaction')
    fields = ('contribution_id', 'amount', 'date', 'note', 'source', 'transaction', 'created_at')
    ordering = ('-date', '-created_at')
    
    def has_change_permission(self, request, obj=None):
        """Only allow changing manual contributions."""
        if obj and obj.source != 'manual':
            return False
        return super().has_change_permission(request, obj)
    
    def has_delete_permission(self, request, obj=None):
        """Only allow deleting manual contributions."""
        if obj and obj.source != 'manual':
            return False
        return super().has_delete_permission(request, obj)


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    """Admin interface for Goal model."""
    list_display = (
        'name', 'user', 'target_amount', 'current_amount', 'progress_percentage_display',
        'goal_type', 'is_active', 'is_completed', 'destination_account_display',
        'transfer_authorized', 'deadline', 'created_at'
    )
    list_filter = ('goal_type', 'is_active', 'is_completed', 'transfer_authorized', 'created_at', 'archived_at')
    search_fields = ('name', 'user__email', 'user__username')
    readonly_fields = (
        'goal_id', 'created_at', 'updated_at', 'completed_at', 'archived_at',
        'progress_percentage_display', 'contributions_count', 'manual_contributions_display',
        'automatic_contributions_display', 'is_activation_pending_display'
    )
    fieldsets = (
        ('Basic Information', {
            'fields': ('goal_id', 'user', 'name', 'goal_type', 'priority')
        }),
        ('Financial Details', {
            'fields': (
                'target_amount', 'current_amount', 'monthly_contribution',
                'progress_percentage_display', 'manual_contributions_display',
                'automatic_contributions_display', 'contributions_count'
            )
        }),
        ('Account Linking', {
            'fields': (
                'destination_account', 'transfer_authorized', 'initial_balance_synced',
                'is_activation_pending_display', 'contribution_rules', 'reminder_settings'
            )
        }),
        ('Category & Tracking', {
            'fields': ('inferred_category',)
        }),
        ('Status', {
            'fields': ('is_active', 'is_completed', 'deadline', 'completed_at', 'archived_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    inlines = [ContributionInline]
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    def progress_percentage_display(self, obj):
        """Display progress percentage."""
        return f"{obj.progress_percentage():.1f}%"
    progress_percentage_display.short_description = 'Progress'
    
    def contributions_count(self, obj):
        """Display total number of contributions."""
        return obj.contributions.count()
    contributions_count.short_description = 'Contributions'
    
    def manual_contributions_display(self, obj):
        """Display manual contributions total."""
        return f"${obj.get_manual_contributions_total():,.2f}"
    manual_contributions_display.short_description = 'Manual Contributions'
    
    def automatic_contributions_display(self, obj):
        """Display automatic contributions total."""
        return f"${obj.get_automatic_contributions_total():,.2f}"
    automatic_contributions_display.short_description = 'Automatic Contributions'
    
    def destination_account_display(self, obj):
        """Display destination account name or 'Cash'."""
        if obj.destination_account:
            return f"{obj.destination_account.custom_name or obj.destination_account.institution_name} ({obj.destination_account.account_type})"
        return 'Cash'
    destination_account_display.short_description = 'Destination Account'
    
    def is_activation_pending_display(self, obj):
        """Display activation pending status."""
        return obj.is_activation_pending()
    is_activation_pending_display.short_description = 'Activation Pending'
    is_activation_pending_display.boolean = True
    
    actions = ['mark_completed', 'mark_active', 'archive_goals', 'unarchive_goals']
    
    def mark_completed(self, request, queryset):
        """Mark selected goals as completed."""
        count = 0
        for goal in queryset:
            if not goal.is_completed:
                goal.complete()
                count += 1
        self.message_user(request, f'{count} goal(s) marked as completed.')
    mark_completed.short_description = 'Mark selected goals as completed'
    
    def mark_active(self, request, queryset):
        """Mark selected goals as active (uncomplete)."""
        count = queryset.update(is_completed=False, completed_at=None)
        self.message_user(request, f'{count} goal(s) marked as active.')
    mark_active.short_description = 'Mark selected goals as active'
    
    def archive_goals(self, request, queryset):
        """Archive selected completed goals."""
        count = 0
        for goal in queryset.filter(is_completed=True):
            if not goal.archived_at:
                goal.archive()
                count += 1
        self.message_user(request, f'{count} goal(s) archived.')
    archive_goals.short_description = 'Archive selected completed goals'
    
    def unarchive_goals(self, request, queryset):
        """Unarchive selected goals."""
        count = 0
        for goal in queryset.filter(archived_at__isnull=False):
            goal.unarchive()
            count += 1
        self.message_user(request, f'{count} goal(s) unarchived.')
    unarchive_goals.short_description = 'Unarchive selected goals'


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    """Admin interface for Contribution model."""
    list_display = (
        'goal', 'user', 'amount', 'date', 'source', 'transaction', 'created_at'
    )
    list_filter = ('source', 'date', 'created_at')
    search_fields = ('goal__name', 'user__email', 'user__username', 'note')
    readonly_fields = ('contribution_id', 'created_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('contribution_id', 'goal', 'user', 'amount', 'date', 'note')
        }),
        ('Source', {
            'fields': ('source', 'transaction')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
    ordering = ('-date', '-created_at')
    date_hierarchy = 'date'
    
    def has_change_permission(self, request, obj=None):
        """Only allow changing manual contributions."""
        if obj and obj.source != 'manual':
            return False
        return super().has_change_permission(request, obj)
    
    def has_delete_permission(self, request, obj=None):
        """Only allow deleting manual contributions."""
        if obj and obj.source != 'manual':
            return False
        return super().has_delete_permission(request, obj)


@admin.register(TransferAuthorization)
class TransferAuthorizationAdmin(admin.ModelAdmin):
    """Admin interface for TransferAuthorization model."""
    list_display = (
        'goal', 'status', 'authorized_at', 'expires_at', 'plaid_authorization_id', 'created_at'
    )
    list_filter = ('status', 'authorized_at', 'expires_at', 'created_at')
    search_fields = ('goal__name', 'plaid_authorization_id')
    readonly_fields = ('authorization_id', 'created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('authorization_id', 'goal', 'status')
        }),
        ('Authorization Details', {
            'fields': (
                'authorization_token', 'plaid_authorization_id',
                'authorized_at', 'expires_at'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    ordering = ('-authorized_at',)
    date_hierarchy = 'authorized_at'
