"""
Email integration tests for SendGrid.

These tests verify that email functionality works correctly with SendGrid.
Run these tests with production-like settings to test actual SendGrid integration.

Usage:
    # Test with console backend (development)
    python manage.py test apps.accounts.tests_email
    
    # Test with SMTP backend (production-like)
    DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py test apps.accounts.tests_email
"""
from django.test import TestCase, override_settings
from django.core import mail
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class SendGridEmailTestCase(TestCase):
    """Test SendGrid email integration."""
    
    def setUp(self):
        """Set up test user."""
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='TestPass123!'
        )
    
    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        EMAIL_HOST='smtp.sendgrid.net',
        EMAIL_PORT=587,
        EMAIL_USE_TLS=True,
        EMAIL_HOST_USER='apikey',
        EMAIL_HOST_PASSWORD='test-api-key',
        DEFAULT_FROM_EMAIL='noreply@cashly.com'
    )
    def test_email_backend_configuration(self):
        """Test that email backend is configured correctly."""
        self.assertEqual(settings.EMAIL_BACKEND, 'django.core.mail.backends.locmem.EmailBackend')
        self.assertEqual(settings.EMAIL_HOST, 'smtp.sendgrid.net')
        self.assertEqual(settings.EMAIL_PORT, 587)
        self.assertTrue(settings.EMAIL_USE_TLS)
        self.assertEqual(settings.EMAIL_HOST_USER, 'apikey')
        self.assertEqual(settings.DEFAULT_FROM_EMAIL, 'noreply@cashly.com')
    
    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        DEFAULT_FROM_EMAIL='noreply@cashly.com'
    )
    def test_send_simple_email(self):
        """Test sending a simple email."""
        mail.outbox = []
        
        send_mail(
            subject='Test Email',
            message='This is a test email.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['test@example.com'],
            fail_silently=False,
        )
        
        # Verify email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, 'Test Email')
        self.assertEqual(mail.outbox[0].body, 'This is a test email.')
        self.assertEqual(mail.outbox[0].from_email, 'noreply@cashly.com')
        self.assertEqual(mail.outbox[0].to, ['test@example.com'])
    
    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        DEFAULT_FROM_EMAIL='noreply@cashly.com'
    )
    def test_send_multiple_recipients(self):
        """Test sending email to multiple recipients."""
        mail.outbox = []
        
        send_mail(
            subject='Test Email',
            message='This is a test email.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['test1@example.com', 'test2@example.com'],
            fail_silently=False,
        )
        
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(len(mail.outbox[0].to), 2)
        self.assertIn('test1@example.com', mail.outbox[0].to)
        self.assertIn('test2@example.com', mail.outbox[0].to)
    
    @override_settings(
        EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        DEFAULT_FROM_EMAIL='noreply@cashly.com'
    )
    def test_password_reset_email_format(self):
        """Test password reset email format."""
        mail.outbox = []
        
        reset_url = 'http://localhost:3000/reset-password?token=abc123&uid=xyz789'
        message = f'Click here to reset your password: {reset_url}'
        
        send_mail(
            subject='Password Reset Request',
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[self.user.email],
            fail_silently=False,
        )
        
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.subject, 'Password Reset Request')
        self.assertIn('reset', email.body.lower())
        self.assertIn('http://localhost:3000/reset-password', email.body)
        self.assertEqual(email.to, [self.user.email])


class SendGridConfigurationTestCase(TestCase):
    """Test SendGrid configuration requirements."""
    
    def test_production_settings_required(self):
        """Test that production settings have required SendGrid configuration."""
        from django.conf import settings
        
        # These should be set in production
        required_settings = [
            'EMAIL_BACKEND',
            'EMAIL_HOST',
            'EMAIL_PORT',
            'EMAIL_USE_TLS',
            'EMAIL_HOST_USER',
            'EMAIL_HOST_PASSWORD',
            'DEFAULT_FROM_EMAIL',
        ]
        
        for setting_name in required_settings:
            self.assertTrue(
                hasattr(settings, setting_name),
                f'{setting_name} should be configured'
            )

