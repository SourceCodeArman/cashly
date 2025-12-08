"""
Admin configuration for bills app.
"""
from django.contrib import admin
from .models import Bill, BillPayment


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    """Admin interface for Bill model."""
    list_display = [
        'name',
        'user',
        'amount',
        'frequency',
        'next_due_date',
        'is_active',
        'is_autopay',
        'created_at',
    ]
    list_filter = [
        'frequency',
        'is_active',
        'is_autopay',
        'reminder_enabled',
        'created_at',
    ]
    search_fields = [
        'name',
        'payee',
        'user__username',
        'user__email',
    ]
    readonly_fields = [
        'bill_id',
        'created_at',
        'updated_at',
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'bill_id',
                'user',
                'name',
                'payee',
                'category',
                'amount',
            )
        }),
        ('Schedule', {
            'fields': (
                'frequency',
                'due_day',
                'next_due_date',
                'last_paid_date',
            )
        }),
        ('Payment Settings', {
            'fields': (
                'is_autopay',
                'account',
            )
        }),
        ('Reminders', {
            'fields': (
                'reminder_enabled',
                'reminder_days',
            )
        }),
        ('Additional', {
            'fields': (
                'notes',
                'is_active',
                'created_at',
                'updated_at',
            )
        }),
    )
    ordering = ['-created_at']
    date_hierarchy = 'created_at'


@admin.register(BillPayment)
class BillPaymentAdmin(admin.ModelAdmin):
    """Admin interface for BillPayment model."""
    list_display = [
        'bill',
        'user',
        'amount',
        'payment_date',
        'transaction',
        'created_at',
    ]
    list_filter = [
        'payment_date',
        'created_at',
    ]
    search_fields = [
        'bill__name',
        'user__username',
        'user__email',
        'notes',
    ]
    readonly_fields = [
        'payment_id',
        'created_at',
    ]
    fieldsets = (
        ('Payment Information', {
            'fields': (
                'payment_id',
                'bill',
                'user',
                'amount',
                'payment_date',
            )
        }),
        ('Transaction Link', {
            'fields': (
                'transaction',
            )
        }),
        ('Additional', {
            'fields': (
                'notes',
                'created_at',
            )
        }),
    )
    ordering = ['-payment_date', '-created_at']
    date_hierarchy = 'payment_date'
