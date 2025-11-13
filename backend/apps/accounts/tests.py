"""
Tests for accounts app.
"""
from django.test import TestCase, override_settings
from django.core import mail
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class UserRegistrationTestCase(TestCase):
    """Test user registration."""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/v1/auth/register/'
    
    def test_user_registration_success(self):
        """Test successful user registration."""
        data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'TestPass123!',
            'password_confirm': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'User',
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('data', response.data)
    
    def test_user_registration_password_mismatch(self):
        """Test registration with mismatched passwords."""
        data = {
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'TestPass123!',
            'password_confirm': 'DifferentPass123!',
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserLoginTestCase(TestCase):
    """Test user login."""
    
    def setUp(self):
        self.client = APIClient()
        self.login_url = '/api/v1/auth/login/'
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='TestPass123!'
        )
    
    def test_user_login_success(self):
        """Test successful user login."""
        data = {
            'email': 'test@example.com',
            'password': 'TestPass123!',
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('access', response.data['data'])
        self.assertIn('refresh', response.data['data'])


class PasswordResetEmailTestCase(TestCase):
    """Test password reset email functionality."""
    
    def setUp(self):
        self.client = APIClient()
        self.password_reset_url = '/api/v1/auth/password-reset/'
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='TestPass123!'
        )
    
    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend'
    )
    def test_password_reset_email_sent(self):
        """Test that password reset email is sent."""
        # Clear the outbox
        mail.outbox = []
        
        data = {'email': 'test@example.com'}
        response = self.client.post(self.password_reset_url, data, format='json')
        
        # Check response
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        
        # Check that email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, 'Password Reset Request')
        self.assertEqual(mail.outbox[0].to, ['test@example.com'])
        self.assertIn('reset', mail.outbox[0].body.lower())
    
    def test_password_reset_invalid_email(self):
        """Test password reset with non-existent email."""
        data = {'email': 'nonexistent@example.com'}
        response = self.client.post(self.password_reset_url, data, format='json')
        # Should still return 200 to prevent email enumeration
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        DEFAULT_FROM_EMAIL='noreply@cashly.com'
    )
    def test_password_reset_email_from_address(self):
        """Test that password reset email uses correct from address."""
        mail.outbox = []
        
        data = {'email': 'test@example.com'}
        self.client.post(self.password_reset_url, data, format='json')
        
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].from_email, 'noreply@cashly.com')
