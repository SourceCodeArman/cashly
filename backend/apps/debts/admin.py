"""
Django admin configuration for debts app.
"""
from django.contrib import admin
from .models import DebtAccount, DebtPayment, DebtPayoffStrategy


@admin.register(DebtAccount)
class DebtAccountAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'debt_type', 'current_balance', 'interest_rate', 'status', 'is_active']
    list_filter = ['debt_type', 'status', 'is_active', 'created_at']
    search_fields = ['name', 'user__username', 'user__email', 'creditor_name']
    readonly_fields = ['debt_id', 'created_at', 'updated_at', 'monthly_interest', 'next_due_date', 'days_until_due']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('debt_id', 'user', 'name', 'debt_type', 'creditor_name', 'account_number_masked')
        }),
        ('Financial Details', {
            'fields': ('current_balance', 'original_balance', 'interest_rate', 'minimum_payment', 'monthly_interest')
        }),
        ('Payment Schedule', {
            'fields': ('due_day', 'next_due_date', 'days_until_due', 'last_payment_date', 'last_payment_amount')
        }),
        ('Status & Dates', {
            'fields': ('status', 'is_active', 'opened_date', 'target_payoff_date')
        }),
        ('Additional', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(DebtPayment)
class DebtPaymentAdmin(admin.ModelAdmin):
    list_display = ['debt', 'user', 'amount', 'payment_date', 'payment_type', 'applied_to_principal', 'applied_to_interest']
    list_filter = ['payment_type', 'payment_date', 'created_at']
    search_fields = ['debt__name', 'user__username', 'user__email']
    readonly_fields = ['payment_id', 'created_at']
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('payment_id', 'debt', 'user', 'amount', 'payment_date', 'payment_type')
        }),
        ('Application Breakdown', {
            'fields': ('applied_to_principal', 'applied_to_interest')
        }),
        ('Linked Data', {
            'fields': ('transaction', 'notes')
        }),
        ('Metadata', {
            'fields': ('created_at',)
        }),
    )


@admin.register(DebtPayoffStrategy)
class DebtPayoffStrategyAdmin(admin.ModelAdmin):
    list_display = ['user', 'strategy_type', 'monthly_budget', 'target_payoff_date', 'is_active']
    list_filter = ['strategy_type', 'is_active', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['strategy_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Strategy Details', {
            'fields': ('strategy_id', 'user', 'strategy_type', 'monthly_budget', 'is_active')
        }),
        ('Configuration', {
            'fields': ('priority_order', 'target_payoff_date')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at')
        }),
    )
