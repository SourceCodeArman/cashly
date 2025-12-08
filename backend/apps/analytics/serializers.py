from rest_framework import serializers
from decimal import Decimal

class DashboardSerializer(serializers.Serializer):
    total_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_spending = serializers.DecimalField(max_digits=12, decimal_places=2)
    recent_transactions = serializers.ListField()
    monthly_spending = serializers.ListField()
    goals_progress = serializers.ListField()
    category_spending = serializers.ListField()
    budget_summary = serializers.ListField(required=False)

class SankeyNodeSerializer(serializers.Serializer):
    name = serializers.CharField()
    color = serializers.CharField(required=False)

class SankeyLinkSerializer(serializers.Serializer):
    source = serializers.IntegerField()
    target = serializers.IntegerField()
    value = serializers.FloatField()

class SankeyDataSerializer(serializers.Serializer):
    nodes = SankeyNodeSerializer(many=True)
    links = SankeyLinkSerializer(many=True)

class TrendsSerializer(serializers.Serializer):
    month = serializers.CharField()
    amount = serializers.FloatField()

class NetWorthSerializer(serializers.Serializer):
    net_worth = serializers.FloatField()
    assets = serializers.FloatField()
    liabilities = serializers.FloatField()

class PatternsSerializer(serializers.Serializer):
    day = serializers.CharField()
    amount = serializers.FloatField()
    count = serializers.IntegerField()

class RecommendationsSerializer(serializers.Serializer):
    id = serializers.CharField()
    type = serializers.ChoiceField(choices=['budget', 'goal', 'spending', 'savings', 'account'])
    icon = serializers.ChoiceField(choices=['trending', 'target', 'alert', 'lightbulb'])
    title = serializers.CharField()
    description = serializers.CharField()
    priority = serializers.ChoiceField(choices=['high', 'medium', 'low'])
    actionable = serializers.BooleanField()
    metadata = serializers.JSONField(required=False, allow_null=True)
