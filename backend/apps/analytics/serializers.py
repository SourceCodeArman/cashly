"""
Serializers for analytics app.
"""
from rest_framework import serializers


class SpendingTrendPointSerializer(serializers.Serializer):
    """Serializer for individual spending trend points."""
    date = serializers.CharField()
    amount = serializers.CharField()


class GoalSummarySerializer(serializers.Serializer):
    """Serializer for active goal summaries."""
    id = serializers.CharField()
    name = serializers.CharField()
    targetAmount = serializers.CharField()
    currentAmount = serializers.CharField()
    deadline = serializers.CharField(required=False, allow_null=True)
    goalType = serializers.CharField()
    isActive = serializers.BooleanField()
    progress = serializers.FloatField(required=False)


class DashboardSerializer(serializers.Serializer):
    """Serializer for dashboard data returned to the frontend."""
    totalBalance = serializers.CharField()
    totalIncome = serializers.CharField()
    totalSpending = serializers.CharField()
    spendingTrend = SpendingTrendPointSerializer(many=True)
    activeGoals = GoalSummarySerializer(many=True)
    recentTransactions = serializers.ListField()

