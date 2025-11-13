"""
Production settings for Cashly project.
"""
from .base import *
from decouple import config

DEBUG = False

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=lambda v: [s.strip() for s in v.split(',')])

# Production-specific settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.sendgrid.net')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='apikey')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@cashly.com')

# Security settings are already configured in base.py for non-DEBUG mode

# Static files served by CDN or web server in production
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

# Database connection pooling for production
DATABASES['default']['CONN_MAX_AGE'] = 600

# Plaid production configuration
PLAID_WEBHOOK_URL = config('PLAID_WEBHOOK_URL')
PLAID_API_TIMEOUT = config('PLAID_API_TIMEOUT', default=60, cast=int)
PLAID_WEBHOOK_VERIFICATION_KEY_ID = config('PLAID_WEBHOOK_VERIFICATION_KEY_ID', default='')
PLAID_WEBHOOK_SECRET = config('PLAID_WEBHOOK_SECRET', default='')

