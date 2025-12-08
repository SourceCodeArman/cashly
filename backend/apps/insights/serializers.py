"""
Serializers for the Insights API.
"""
from rest_framework import serializers
from .models import Insight, InsightFeedback


class InsightSerializer(serializers.ModelSerializer):
    """Full serializer for insight details."""
    
    class Meta:
        model = Insight
        fields = [
            'insight_id',
            'insight_type',
            'title',
            'description',
            'priority',
            'is_dismissed',
            'is_read',
            'metadata',
            'created_at',
            'expires_at'
        ]
        read_only_fields = ['insight_id', 'created_at']


class InsightListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing insights."""
    
    class Meta:
        model = Insight
        fields = [
            'insight_id',
            'insight_type',
            'title',
            'description',
            'priority',
            'is_dismissed',
            'is_read',
            'metadata',
            'created_at'
        ]
        read_only_fields = fields


class InsightDismissSerializer(serializers.Serializer):
    """Serializer for dismissing an insight."""
    
    dismissed = serializers.BooleanField(default=True)


class InsightMarkReadSerializer(serializers.Serializer):
    """Serializer for marking an insight as read."""
    
    read = serializers.BooleanField(default=True)


class InsightFeedbackSerializer(serializers.ModelSerializer):
    """Serializer for insight feedback."""
    
    class Meta:
        model = InsightFeedback
        fields = [
            'feedback_id',
            'insight',
            'is_helpful',
            'feedback_text',
            'created_at'
        ]
        read_only_fields = ['feedback_id', 'created_at']


class InsightFeedbackCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating insight feedback."""
    
    class Meta:
        model = InsightFeedback
        fields = ['is_helpful', 'feedback_text']
    
    def validate(self, data):
        # Ensure user hasn't already provided feedback for this insight
        insight = self.context.get('insight')
        user = self.context.get('request').user
        
        if InsightFeedback.objects.filter(insight=insight, user=user).exists():
            raise serializers.ValidationError(
                "You have already provided feedback for this insight."
            )
        
        return data
