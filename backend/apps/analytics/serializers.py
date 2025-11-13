"""
Serializers for analytics app.
"""
from rest_framework import serializers


class DashboardSerializer(serializers.Serializer):
    """Serializer for dashboard data."""
    account_balance = serializers.DictField()
    recent_transactions = serializers.ListField()
    monthly_spending = serializers.DictField()
    goals = serializers.ListField()
    category_chart_data = serializers.ListField()

