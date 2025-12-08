import os
import django
import pytest
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from django.test import TransactionTestCase
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from config.asgi import application
from apps.notifications.models import Notification

User = get_user_model()

class NotificationWebSocketTests(TransactionTestCase):
    async def test_notification_consumer(self):
        # Create a user
        user = await database_sync_to_async(User.objects.create_user)(
            username='testuser',  # Provide username
            email='test@example.com',
            password='password123'
        )
        
        # Generate token
        token = await database_sync_to_async(AccessToken.for_user)(user)
        
        # Connect to WebSocket
        # AllowedHostsOriginValidator requires a valid Origin header
        communicator = WebsocketCommunicator(
            application, 
            f"/ws/notifications/?token={token}",
            headers=[(b"origin", b"http://localhost")] 
        )
        connected, subprotocol = await communicator.connect()
        
        if not connected:
            print("WebSocket connection failed. Check middleware logs.")
            
        self.assertTrue(connected)
        
        # Trigger a notification creation
        await database_sync_to_async(Notification.objects.create)(
            user=user,
            type='system',
            title='Test Notification',
            message='This is a test.'
        )
        
        # Receive message
        # Increase timeout for CI/slower environments
        response = await communicator.receive_json_from(timeout=2)
        self.assertEqual(response['title'], 'Test Notification')
        self.assertEqual(response['message'], 'This is a test.')
        
        await communicator.disconnect()

    async def test_notification_consumer_auth_fail(self):
        # Connect without token
        communicator = WebsocketCommunicator(
            application, 
            "/ws/notifications/",
            headers=[(b"origin", b"http://localhost")]
        )
        connected, subprotocol = await communicator.connect()
        self.assertFalse(connected)