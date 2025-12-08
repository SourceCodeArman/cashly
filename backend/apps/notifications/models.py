"""
Notification models for Cashly.
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Notification(models.Model):
    """
    Notification model for user notifications.
    """
    class NotificationType(models.TextChoices):
        TRANSACTION = 'transaction', 'Transaction'
        GOAL = 'goal', 'Goal'
        BUDGET = 'budget', 'Budget'
        ACCOUNT = 'account', 'Account'
        BILL = 'bill', 'Bill'
        SYSTEM = 'system', 'System'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.SYSTEM)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True, help_text='Additional metadata for the notification')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['type']),
        ]
    
    def __str__(self):
        return f"{self.type}: {self.title} - {self.user.username}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class NotificationPreference(models.Model):
    """
    User notification preferences.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Email notifications
    email_transaction = models.BooleanField(default=True, help_text="Receive email for transaction alerts")
    email_goal = models.BooleanField(default=True, help_text="Receive email for goal milestones")
    email_budget = models.BooleanField(default=True, help_text="Receive email for budget alerts")
    email_account = models.BooleanField(default=True, help_text="Receive email for account issues")
    email_system = models.BooleanField(default=True, help_text="Receive email for system announcements")
    
    # In-app notifications
    push_transaction = models.BooleanField(default=True, help_text="Receive in-app notification for transaction alerts")
    push_goal = models.BooleanField(default=True, help_text="Receive in-app notification for goal milestones")
    push_budget = models.BooleanField(default=True, help_text="Receive in-app notification for budget alerts")
    push_account = models.BooleanField(default=True, help_text="Receive in-app notification for account issues")
    push_system = models.BooleanField(default=True, help_text="Receive in-app notification for system announcements")
    
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Notification Preferences - {self.user.username}"
