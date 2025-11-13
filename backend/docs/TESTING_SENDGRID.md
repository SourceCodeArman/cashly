# Testing SendGrid Integration

This guide explains how to test the SendGrid email integration in the Cashly application.

## Overview

The Cashly application uses SendGrid for sending transactional emails, including:
- Password reset emails
- Goal milestone notifications
- Account sync notifications

## Configuration

SendGrid is configured in `config/settings/prod.py` with the following settings:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'  # Always 'apikey' for SendGrid
EMAIL_HOST_PASSWORD = '<your-sendgrid-api-key>'  # Your SendGrid API key
DEFAULT_FROM_EMAIL = 'noreply@cashly.com'
```

## Environment Variables

Add the following to your `.env` file:

```bash
# SendGrid Configuration
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=SG.your_actual_sendgrid_api_key_here
DEFAULT_FROM_EMAIL=noreply@cashly.com
```

**Important Notes:**
- `EMAIL_HOST_USER` should always be `'apikey'` for SendGrid
- `EMAIL_HOST_PASSWORD` should be your actual SendGrid API key (starts with `SG.`)
- The sender email (`DEFAULT_FROM_EMAIL`) must be verified in your SendGrid account

## Testing Methods

### 1. Management Command (Recommended for Quick Testing)

Use the built-in management command to send a test email:

```bash
# Basic usage
python manage.py test_sendgrid --to=your-email@example.com

# With custom subject
python manage.py test_sendgrid --to=your-email@example.com --subject="My Test Email"

# With custom message
python manage.py test_sendgrid --to=your-email@example.com \
    --subject="Test" \
    --message="This is a custom test message"
```

The command will:
- Display your current email configuration
- Validate that SendGrid settings are configured
- Send a test email
- Provide helpful error messages if something goes wrong

### 2. Unit Tests (For Automated Testing)

Run the email-related unit tests:

```bash
# Run all email tests
python manage.py test apps.accounts.tests_email

# Run specific test class
python manage.py test apps.accounts.tests_email.SendGridEmailTestCase

# Run specific test
python manage.py test apps.accounts.tests_email.SendGridEmailTestCase.test_send_simple_email
```

**Note:** By default, tests use `locmem.EmailBackend` which stores emails in memory instead of sending them. This is safe for automated testing.

### 3. Integration Tests (For Real SendGrid Testing)

To test with actual SendGrid (sends real emails):

```bash
# Set environment to use production settings
export DJANGO_SETTINGS_MODULE=config.settings.prod

# Run tests (will send real emails!)
python manage.py test apps.accounts.tests_email
```

**Warning:** This will send actual emails. Use with caution!

### 4. Manual API Testing

Test the password reset endpoint which sends emails:

```bash
# Using curl
curl -X POST http://localhost:8000/api/v1/auth/password-reset/ \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'

# Using httpie
http POST http://localhost:8000/api/v1/auth/password-reset/ \
  email=your-email@example.com
```

### 5. Django Shell Testing

Test email sending directly from Django shell:

```bash
python manage.py shell
```

```python
from django.core.mail import send_mail
from django.conf import settings

# Check configuration
print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

# Send test email
send_mail(
    subject='Test Email from Django Shell',
    message='This is a test email sent from Django shell.',
    from_email=settings.DEFAULT_FROM_EMAIL,
    recipient_list=['your-email@example.com'],
    fail_silently=False,
)
```

## Development vs Production

### Development Settings

In development (`config/settings/dev.py`), emails are sent to the console:

```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

This means emails are printed to the console instead of being sent. This is safe for local development.

### Production Settings

In production (`config/settings/prod.py`), emails are sent via SendGrid:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.sendgrid.net'
# ... other SendGrid settings
```

## Troubleshooting

### Common Issues

1. **"EMAIL_HOST_PASSWORD is not set"**
   - Solution: Add `EMAIL_HOST_PASSWORD` to your `.env` file with your SendGrid API key

2. **"Authentication failed"**
   - Solution: Verify your SendGrid API key is correct
   - Check that the API key has "Mail Send" permissions in SendGrid dashboard

3. **"Sender email not verified"**
   - Solution: Verify the sender email address in SendGrid dashboard
   - Go to Settings > Sender Authentication in SendGrid

4. **"Connection refused"**
   - Solution: Check your network/firewall settings
   - Verify `EMAIL_PORT` is set to `587` (or `465` for SSL)

5. **Emails going to spam**
   - Solution: Set up SPF and DKIM records in SendGrid
   - Verify your domain in SendGrid
   - Use a verified sender email address

### Testing Configuration

To verify your configuration is correct, run:

```bash
python manage.py test_sendgrid --to=your-email@example.com
```

The command will display your current configuration and help identify any issues.

## SendGrid Setup Checklist

Before testing, ensure:

- [ ] SendGrid account is created
- [ ] API key is generated with "Mail Send" permissions
- [ ] Sender email address is verified in SendGrid
- [ ] Domain is verified (for production)
- [ ] SPF and DKIM records are set up (for production)
- [ ] Environment variables are set in `.env` file
- [ ] `EMAIL_HOST_PASSWORD` contains your SendGrid API key
- [ ] `DEFAULT_FROM_EMAIL` matches a verified sender in SendGrid

## Best Practices

1. **Never commit API keys** - Always use environment variables
2. **Use console backend in development** - Prevents accidental email sends
3. **Test with real emails sparingly** - Use unit tests with `locmem` backend for most testing
4. **Monitor SendGrid dashboard** - Check email delivery status and bounce rates
5. **Use SendGrid's test mode** - For initial testing, use SendGrid's sandbox mode if available

## Additional Resources

- [SendGrid API Documentation](https://docs.sendgrid.com/api-reference)
- [Django Email Backend Documentation](https://docs.djangoproject.com/en/stable/topics/email/)
- [SendGrid SMTP Settings](https://docs.sendgrid.com/for-developers/sending-email/getting-started-smtp)

