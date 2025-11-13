"""
Tests for goals app.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from apps.goals.models import Goal

User = get_user_model()


class GoalModelTestCase(TestCase):
    """Test Goal model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
    
    def test_goal_creation(self):
        """Test goal creation."""
        goal = Goal.objects.create(
            user=self.user,
            name='Emergency Fund',
            target_amount=Decimal('10000.00'),
            current_amount=Decimal('2000.00'),
            goal_type='emergency_fund',
        )
        self.assertEqual(goal.name, 'Emergency Fund')
        self.assertEqual(goal.progress_percentage(), 20.0)
    
    def test_goal_progress_calculation(self):
        """Test goal progress calculation."""
        goal = Goal.objects.create(
            user=self.user,
            name='Vacation',
            target_amount=Decimal('5000.00'),
            current_amount=Decimal('2500.00'),
        )
        self.assertEqual(goal.progress_percentage(), 50.0)
