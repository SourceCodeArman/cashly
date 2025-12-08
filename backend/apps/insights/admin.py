from django.contrib import admin
from .models import Insight, InsightFeedback


@admin.register(Insight)
class InsightAdmin(admin.ModelAdmin):
    list_display = ['insight_id', 'user', 'insight_type', 'title', 'priority', 'is_dismissed', 'created_at']
    list_filter = ['insight_type', 'priority', 'is_dismissed', 'is_read', 'created_at']
    search_fields = ['title', 'description', 'user__email']
    readonly_fields = ['insight_id', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(InsightFeedback)
class InsightFeedbackAdmin(admin.ModelAdmin):
    list_display = ['feedback_id', 'insight', 'user', 'is_helpful', 'created_at']
    list_filter = ['is_helpful', 'created_at']
    search_fields = ['insight__title', 'user__email', 'feedback_text']
    readonly_fields = ['feedback_id', 'created_at']
    ordering = ['-created_at']
