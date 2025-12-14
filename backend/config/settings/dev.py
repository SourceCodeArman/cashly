"""
Development settings for Cashly project.
"""
from .base import *
from decouple import config

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'acetometrical-judah-needier.ngrok-free.dev', '192.168.1.42']

# Development-specific settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.sendgrid.net')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='apikey')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@cashly.com')

# Run Celery tasks synchronously in development (no worker needed)
# Set CELERY_TASK_ALWAYS_EAGER=False in .env if you want to use a real Celery worker
CELERY_TASK_ALWAYS_EAGER = config('CELERY_TASK_ALWAYS_EAGER', default=True, cast=bool)

# CORS - allow all origins in development
CORS_ALLOW_ALL_ORIGINS = True

# Add development-specific middleware
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    # INTERNAL_IPS for Django Debug Toolbar
    # Include common Docker and localhost IPs
    INTERNAL_IPS = [
        '127.0.0.1',
        'localhost',
        '0.0.0.0',
    ]
    # For Docker, also add the host's IP if needed
    import socket
    try:
        hostname, _, ips = socket.gethostbyname_ex(socket.gethostname())
        INTERNAL_IPS += [ip[: ip.rfind('.')] + '.1' for ip in ips]
    except Exception:
        pass

# Plaid development defaults
PLAID_WEBHOOK_URL = config(
    'PLAID_WEBHOOK_URL',
    default='http://localhost:8000/api/v1/accounts/webhook/',
)
PLAID_API_TIMEOUT = config('PLAID_API_TIMEOUT', default=60, cast=int)

