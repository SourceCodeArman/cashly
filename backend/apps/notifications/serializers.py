"""
Serializers for notifications app.
"""
from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model.
    """
    class Meta:
        model = Notification
        fields = [
            'id', 'type', 'title', 'message', 'data', 
            'is_read', 'created_at', 'read_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating notifications (internal use).
    """
    class Meta:
        model = Notification
        fields = ['user', 'type', 'title', 'message', 'data']


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for NotificationPreference model.
    """
    class Meta:
        model = NotificationPreference
        fields = [
            'email_transaction', 'email_goal', 'email_budget', 'email_account', 'email_system',
            'push_transaction', 'push_goal', 'push_budget', 'push_account', 'push_system',
            'updated_at'
        ]
        read_only_fields = ['updated_at']
