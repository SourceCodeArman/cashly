"""
Serializers for notifications app.
"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model."""
    id = serializers.UUIDField(read_only=True)
    formatted_created_at = serializers.SerializerMethodField()
    formatted_read_at = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = (
            'id', 'type', 'title', 'message', 'data',
            'is_read', 'created_at', 'read_at',
            'formatted_created_at', 'formatted_read_at'
        )
        read_only_fields = ('id', 'created_at', 'read_at', 'is_read')
    
    def get_formatted_created_at(self, obj):
        """Format created_at as ISO string."""
        return obj.created_at.isoformat() if obj.created_at else None
    
    def get_formatted_read_at(self, obj):
        """Format read_at as ISO string."""
        return obj.read_at.isoformat() if obj.read_at else None
    
    def validate_type(self, value):
        """Validate notification type."""
        valid_types = [choice[0] for choice in Notification.NOTIFICATION_TYPE_CHOICES]
        if value not in valid_types:
            raise serializers.ValidationError(f'Invalid notification type. Must be one of: {", ".join(valid_types)}')
        return value
    
    def validate_title(self, value):
        """Validate title length."""
        if len(value.strip()) == 0:
            raise serializers.ValidationError('Title cannot be empty')
        if len(value) > 200:
            raise serializers.ValidationError('Title cannot exceed 200 characters')
        return value.strip()
    
    def validate_message(self, value):
        """Validate message."""
        if len(value.strip()) == 0:
            raise serializers.ValidationError('Message cannot be empty')
        return value.strip()
    
    def validate_data(self, value):
        """Validate data field is a dictionary."""
        if not isinstance(value, dict):
            raise serializers.ValidationError('Data must be a dictionary')
        return value


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating notifications (internal use)."""
    
    class Meta:
        model = Notification
        fields = ('type', 'title', 'message', 'data', 'user')
        extra_kwargs = {
            'user': {'write_only': True},
        }
    
    def validate_type(self, value):
        """Validate notification type."""
        valid_types = [choice[0] for choice in Notification.NOTIFICATION_TYPE_CHOICES]
        if value not in valid_types:
            raise serializers.ValidationError(f'Invalid notification type. Must be one of: {", ".join(valid_types)}')
        return value

