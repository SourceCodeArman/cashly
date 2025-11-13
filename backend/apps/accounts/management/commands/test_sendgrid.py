"""
Management command to test SendGrid email integration.

Usage:
    python manage.py test_sendgrid --to=test@example.com
    python manage.py test_sendgrid --to=test@example.com --subject="Test Email"
"""
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
import sys


class Command(BaseCommand):
    help = 'Test SendGrid email integration by sending a test email'

    def add_arguments(self, parser):
        parser.add_argument(
            '--to',
            type=str,
            required=True,
            help='Recipient email address'
        )
        parser.add_argument(
            '--subject',
            type=str,
            default='SendGrid Test Email',
            help='Email subject (default: "SendGrid Test Email")'
        )
        parser.add_argument(
            '--message',
            type=str,
            default='This is a test email from Cashly to verify SendGrid integration.',
            help='Email message body'
        )

    def handle(self, *args, **options):
        recipient = options['to']
        subject = options['subject']
        message = options['message']

        # Display configuration
        self.stdout.write(self.style.WARNING('SendGrid Configuration:'))
        self.stdout.write(f'  EMAIL_BACKEND: {settings.EMAIL_BACKEND}')
        self.stdout.write(f'  EMAIL_HOST: {getattr(settings, "EMAIL_HOST", "Not set")}')
        self.stdout.write(f'  EMAIL_PORT: {getattr(settings, "EMAIL_PORT", "Not set")}')
        self.stdout.write(f'  EMAIL_USE_TLS: {getattr(settings, "EMAIL_USE_TLS", "Not set")}')
        self.stdout.write(f'  EMAIL_HOST_USER: {getattr(settings, "EMAIL_HOST_USER", "Not set")}')
        self.stdout.write(f'  DEFAULT_FROM_EMAIL: {getattr(settings, "DEFAULT_FROM_EMAIL", "Not set")}')
        self.stdout.write(f'  EMAIL_HOST_PASSWORD: {"***" if getattr(settings, "EMAIL_HOST_PASSWORD", None) else "Not set"}')
        self.stdout.write('')

        # Check if SendGrid is configured
        if settings.EMAIL_BACKEND != 'django.core.mail.backends.smtp.EmailBackend':
            self.stdout.write(
                self.style.WARNING(
                    f'Warning: EMAIL_BACKEND is set to "{settings.EMAIL_BACKEND}", '
                    'not SMTP. SendGrid requires SMTP backend.'
                )
            )
            self.stdout.write('')

        if not getattr(settings, 'EMAIL_HOST_PASSWORD', None):
            self.stdout.write(
                self.style.ERROR(
                    'ERROR: EMAIL_HOST_PASSWORD is not set. '
                    'Please set it to your SendGrid API key in your .env file.'
                )
            )
            sys.exit(1)

        # Send test email
        self.stdout.write(f'Sending test email to: {recipient}')
        self.stdout.write(f'Subject: {subject}')
        self.stdout.write('')

        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS('✓ Email sent successfully!'))
            self.stdout.write('')
            self.stdout.write('Check the recipient inbox (and spam folder) for the test email.')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Failed to send email: {str(e)}'))
            self.stdout.write('')
            self.stdout.write('Common issues:')
            self.stdout.write('  1. Check that EMAIL_HOST_PASSWORD is set to your SendGrid API key')
            self.stdout.write('  2. Verify EMAIL_HOST is set to "smtp.sendgrid.net"')
            self.stdout.write('  3. Ensure EMAIL_PORT is set to 587 (or 465 for SSL)')
            self.stdout.write('  4. Check that EMAIL_USE_TLS is True')
            self.stdout.write('  5. Verify your SendGrid API key has "Mail Send" permissions')
            self.stdout.write('  6. Check that the sender email is verified in SendGrid')
            sys.exit(1)

