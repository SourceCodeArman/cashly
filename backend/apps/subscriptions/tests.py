"""
Tests for subscriptions app.
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from .models import Subscription, PendingSubscription, StripeWebhookEvent

User = get_user_model()


class SubscriptionModelTest(TestCase):
    """Test Subscription model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
    
    def test_subscription_creation(self):
        """Test subscription creation."""
        subscription = Subscription.objects.create(
            user=self.user,
            stripe_subscription_id='sub_test123',
            stripe_customer_id='cus_test123',
            status='trialing',
            plan='premium',
            billing_cycle='monthly',
            price_id_monthly='price_test123',
            price_id_annual='price_test456',
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30),
            trial_end=timezone.now() + timedelta(days=7),
        )
        
        self.assertEqual(subscription.user, self.user)
        self.assertEqual(subscription.status, 'trialing')
        self.assertEqual(subscription.plan, 'premium')
        self.assertTrue(subscription.is_active())
    
    def test_subscription_is_active(self):
        """Test is_active method."""
        subscription = Subscription.objects.create(
            user=self.user,
            stripe_subscription_id='sub_test123',
            stripe_customer_id='cus_test123',
            status='active',
            plan='premium',
            billing_cycle='monthly',
            price_id_monthly='price_test123',
            price_id_annual='price_test456',
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=30),
        )
        
        self.assertTrue(subscription.is_active())
        
        subscription.status = 'canceled'
        subscription.save()
        self.assertFalse(subscription.is_active())


class SubscriptionViewTest(TestCase):
    """Test subscription views."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_stripe_config_endpoint(self):
        """Test Stripe config endpoint."""
        response = self.client.get('/api/v1/subscriptions/stripe-config/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('publishable_key', response.data['data'])

    @override_settings(STRIPE_PUBLISHABLE_KEY='pk_test_123')
    def test_subscription_config_endpoint(self):
        """Test subscription config endpoint returns tier metadata."""
        response = self.client.get('/api/v1/subscriptions/config/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('tiers', response.data['data'])
        self.assertGreaterEqual(len(response.data['data']['tiers']), 3)


class PendingSubscriptionTest(TestCase):
    """Test PendingSubscription model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
    
    def test_pending_subscription_creation(self):
        """Test pending subscription creation."""
        pending = PendingSubscription.objects.create(
            user=self.user,
            payment_method_id='pm_test123',
            plan='premium',
            billing_cycle='monthly',
            trial_enabled=True,
            status='pending',
        )
        
        self.assertEqual(pending.user, self.user)
        self.assertEqual(pending.status, 'pending')
        self.assertEqual(pending.retry_count, 0)


class StripeWebhookEventTest(TestCase):
    """Test StripeWebhookEvent model."""
    
    def test_webhook_event_creation(self):
        """Test webhook event creation."""
        event = StripeWebhookEvent.objects.create(
            stripe_event_id='evt_test123',
            event_type='customer.subscription.created',
            payload={'test': 'data'},
        )
        
        self.assertEqual(event.stripe_event_id, 'evt_test123')
        self.assertEqual(event.event_type, 'customer.subscription.created')
        self.assertFalse(event.processed)


