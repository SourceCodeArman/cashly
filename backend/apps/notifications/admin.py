"""
Admin interface for notifications app.
"""
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin interface for Notification model."""
    list_display = ('id', 'user', 'type', 'title', 'is_read', 'created_at', 'read_at')
    list_filter = ('type', 'is_read', 'created_at')
    search_fields = ('title', 'message', 'user__username', 'user__email')
    readonly_fields = ('id', 'created_at', 'read_at')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'user', 'type', 'title', 'message')
        }),
        ('Status', {
            'fields': ('is_read', 'created_at', 'read_at')
        }),
        ('Metadata', {
            'fields': ('data',),
            'classes': ('collapse',)
        }),
    )

