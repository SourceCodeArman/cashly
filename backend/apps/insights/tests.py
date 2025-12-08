"""
Tests for the insights app.
"""
from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from .models import Insight, InsightFeedback, InsightType, InsightPriority
from .insight_engine import (
    detect_subscription_patterns,
    detect_unusual_spending,
    detect_merchant_patterns,
    generate_insights
)

User = get_user_model()


class InsightModelTests(TestCase):
    """Tests for Insight model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_create_insight(self):
        """Test creating an insight."""
        insight = Insight.objects.create(
            user=self.user,
            insight_type=InsightType.SUBSCRIPTION,
            title='Test Subscription',
            description='You have a recurring subscription.',
            priority=InsightPriority.MEDIUM,
            metadata={'amount': 9.99}
        )
        
        self.assertEqual(str(insight), f'{InsightType.SUBSCRIPTION}: Test Subscription')
        self.assertFalse(insight.is_dismissed)
        self.assertFalse(insight.is_read)
    
    def test_dismiss_insight(self):
        """Test dismissing an insight."""
        insight = Insight.objects.create(
            user=self.user,
            insight_type=InsightType.UNUSUAL_SPENDING,
            title='High Spending',
            description='You spent more than usual.',
            priority=InsightPriority.HIGH
        )
        
        insight.dismiss()
        insight.refresh_from_db()
        
        self.assertTrue(insight.is_dismissed)
    
    def test_mark_as_read(self):
        """Test marking an insight as read."""
        insight = Insight.objects.create(
            user=self.user,
            insight_type=InsightType.SAVINGS_OPPORTUNITY,
            title='Save Money',
            description='You could save money.',
            priority=InsightPriority.LOW
        )
        
        insight.mark_as_read()
        insight.refresh_from_db()
        
        self.assertTrue(insight.is_read)


class InsightFeedbackTests(TestCase):
    """Tests for InsightFeedback model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.insight = Insight.objects.create(
            user=self.user,
            insight_type=InsightType.SUBSCRIPTION,
            title='Test Subscription',
            description='Test description',
            priority=InsightPriority.MEDIUM
        )
    
    def test_create_feedback(self):
        """Test creating feedback."""
        feedback = InsightFeedback.objects.create(
            insight=self.insight,
            user=self.user,
            is_helpful=True,
            feedback_text='This was very helpful!'
        )
        
        self.assertTrue(feedback.is_helpful)
        self.assertEqual(feedback.feedback_text, 'This was very helpful!')


class InsightAPITests(TestCase):
    """Tests for Insight API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create some test insights
        self.insight1 = Insight.objects.create(
            user=self.user,
            insight_type=InsightType.SUBSCRIPTION,
            title='Netflix Subscription',
            description='You have a monthly Netflix subscription.',
            priority=InsightPriority.LOW
        )
        self.insight2 = Insight.objects.create(
            user=self.user,
            insight_type=InsightType.UNUSUAL_SPENDING,
            title='High Restaurant Spending',
            description='Your restaurant spending is up 50%.',
            priority=InsightPriority.HIGH
        )
    
    def test_list_insights(self):
        """Test listing insights."""
        response = self.client.get('/api/v1/insights/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_retrieve_insight(self):
        """Test retrieving a single insight."""
        response = self.client.get(f'/api/v1/insights/{self.insight1.insight_id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Netflix Subscription')
    
    def test_dismiss_insight(self):
        """Test dismissing an insight."""
        response = self.client.post(f'/api/v1/insights/{self.insight1.insight_id}/dismiss/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.insight1.refresh_from_db()
        self.assertTrue(self.insight1.is_dismissed)
    
    def test_dismissed_insights_filtered_by_default(self):
        """Test that dismissed insights are filtered out by default."""
        self.insight1.dismiss()
        
        response = self.client.get('/api/v1/insights/')
        
        self.assertEqual(len(response.data['results']), 1)
    
    def test_include_dismissed_insights(self):
        """Test including dismissed insights with query param."""
        self.insight1.dismiss()
        
        response = self.client.get('/api/v1/insights/?include_dismissed=true')
        
        self.assertEqual(len(response.data['results']), 2)
    
    def test_filter_by_type(self):
        """Test filtering insights by type."""
        response = self.client.get(f'/api/v1/insights/?type={InsightType.SUBSCRIPTION}')
        
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['insight_type'], InsightType.SUBSCRIPTION)
    
    def test_insights_summary(self):
        """Test insights summary endpoint."""
        response = self.client.get('/api/v1/insights/summary/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['unread'], 2)
