from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification
from .serializers import NotificationSerializer

@receiver(post_save, sender=Notification)
def send_notification_ws(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        group_name = f"user_{instance.user.id}"
        serializer = NotificationSerializer(instance)
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notification.message",
                "data": serializer.data
            }
        )