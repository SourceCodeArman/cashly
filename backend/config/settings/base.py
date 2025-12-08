"""
Base settings for Cashly project.
"""
import os
from pathlib import Path
from datetime import timedelta
from decouple import config
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Security
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-in-production')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,acetometrical-judah-needier.ngrok-free.dev', cast=lambda v: [s.strip() for s in v.split(',')])
APPEND_SLASH = config('APPEND_SLASH', default=False, cast=bool)

# Application definition
INSTALLED_APPS = [
    'daphne', # daphne must be listed before django.contrib.staticfiles
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_yasg',
    'storages',
    'channels',
    
    # Local apps
    'apps.accounts',
    'apps.transactions',
    'apps.goals',
    'apps.budgets',
    'apps.analytics',
    'apps.api',
    'apps.notifications',
    'apps.subscriptions',
    'apps.insights',
    'apps.bills',
    'apps.debts',
    'apps.marketing',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.api.middleware.SecurityLoggingMiddleware',
]

ROOT_URLCONF = 'config.urls'
ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(config('REDIS_HOST', default='localhost'), 6379)],
        },
    },
}


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# Prioritize individual parameters over connection string
# This allows for more flexible configuration, especially for Supabase
DB_USER = config('DB_USER', default=None)
DB_PASSWORD = config('DB_PASSWORD', default=None)
DB_HOST = config('DB_HOST', default=None)
DB_PORT = config('DB_PORT', default=None)
DB_NAME = config('DB_NAME', default=None)

# If individual parameters are provided, use them
if DB_USER and DB_PASSWORD and DB_HOST and DB_NAME:
    # Determine SSL mode based on host
    # Supabase and remote hosts require SSL, localhost doesn't
    if DB_HOST in ('localhost', '127.0.0.1', 'db'):
        default_sslmode = 'prefer'  # Prefer SSL but don't require for local dev
    else:
        default_sslmode = 'require'  # Require SSL for remote hosts (Supabase)
    
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT or '5432',
            'OPTIONS': {
                'sslmode': config('DB_SSLMODE', default=default_sslmode),
            },
            'CONN_MAX_AGE': 600,  # Connection pooling
        }
    }
else:
    # Fallback to connection string format
    DATABASE_URL = config('DB_URL', default=None) or config('DATABASE_URL', default=None)
    
    if DATABASE_URL:
        try:
            # Parse connection string (Supabase format: postgresql://user:password@host:port/dbname)
            # dj_database_url automatically handles SSL for Supabase
            db_config = dj_database_url.parse(DATABASE_URL, conn_max_age=600)

            # Determine if this is a Supabase connection (hostname contains .supabase.co)
            db_host = db_config.get('HOST', '')
            is_supabase = '.supabase.co' in db_host or 'pooler.supabase.com' in db_host

            # Configure SSL mode based on host
            if 'OPTIONS' not in db_config:
                db_config['OPTIONS'] = {}

            if db_host in ('localhost', '127.0.0.1', 'db'):
                # For local PostgreSQL, prefer SSL but don't require it
                db_config['OPTIONS']['sslmode'] = 'prefer'
            elif is_supabase:
                # Supabase requires SSL
                db_config['OPTIONS']['sslmode'] = 'require'
                # Ensure SSL context is properly configured
                db_config['OPTIONS']['sslcert'] = None
                db_config['OPTIONS']['sslkey'] = None
                db_config['OPTIONS']['sslrootcert'] = None
            else:
                # For other remote hosts, require SSL
                db_config['OPTIONS']['sslmode'] = 'require'

                DATABASES = {
                    'default': db_config
                }
        except Exception as e:
            # If URL parsing fails, provide helpful error message
            import logging
            import sys
            logger = logging.getLogger(__name__)
            logger.error(f'Failed to parse DATABASE_URL: {e}')
            # If connection fails due to DNS issues, provide helpful error message
            if 'nodename' in str(e).lower() or 'servname' in str(e).lower():
                print("\n" + "="*70, file=sys.stderr)
                print("⚠️  DATABASE CONNECTION ERROR", file=sys.stderr)
                print("="*70, file=sys.stderr)
                print("The Supabase hostname cannot be resolved.", file=sys.stderr)
                print("\nThis usually means:", file=sys.stderr)
                print("  1. Your Supabase project is PAUSED (most common)", file=sys.stderr)
                print("  2. The hostname is incorrect", file=sys.stderr)
                print("  3. DNS/IPv6 routing issues", file=sys.stderr)
                print("\n🔧 Next steps:", file=sys.stderr)
                print("  1. Go to your Supabase dashboard", file=sys.stderr)
                print("  2. Check if project is paused - if so, click 'Restore Project'", file=sys.stderr)
                print("  3. Wait 2-5 minutes for project to resume", file=sys.stderr)
                print("  4. Use individual DB_* environment variables instead", file=sys.stderr)
                print("="*70 + "\n", file=sys.stderr)
            # Fallback to default local database
            DATABASES = {
                'default': {
                    'ENGINE': 'django.db.backends.postgresql',
                    'NAME': 'postgres',
                    'USER': 'postgres',
                    'PASSWORD': '',
                    'HOST': 'localhost',
                    'PORT': '5432',
                }
            }
    else:
        # No DATABASE_URL and no individual parameters provided
        # Use default local database configuration
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.postgresql',
                'NAME': 'postgres',
                'USER': 'postgres',
                'PASSWORD': '',
                'HOST': 'localhost',
                'PORT': '5432',
            }
        }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'America/Los_Angeles'  # PST/PDT
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'EXCEPTION_HANDLER': 'apps.api.exceptions.custom_exception_handler',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    }
}

# JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://localhost:3001',
    cast=lambda v: [s.strip() for s in v.split(',')]
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Celery Configuration
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Plaid Configuration
PLAID_CLIENT_ID = config('PLAID_CLIENT_ID', default='')
PLAID_SECRET = config('PLAID_SECRET', default='')
PLAID_ENV = config('PLAID_ENV', default='sandbox')  # sandbox, development, production
PLAID_PRODUCTS = config(
    'PLAID_PRODUCTS',
    default='transactions,auth,identity,investments,assets,liabilities',
    cast=lambda v: [s.strip() for s in v.split(',') if s.strip()],
)
PLAID_COUNTRY_CODES = config(
    'PLAID_COUNTRY_CODES',
    default='US',
    cast=lambda v: [s.strip().upper() for s in v.split(',') if s.strip()],
)
PLAID_LANGUAGE = config('PLAID_LANGUAGE', default='en')
PLAID_WEBHOOK_URL = config('PLAID_WEBHOOK_URL', default='')
PLAID_API_TIMEOUT = config('PLAID_API_TIMEOUT', default=None, cast=lambda v: int(v) if v else None)
PLAID_ASSET_REPORT_TIMEOUT = config('PLAID_ASSET_REPORT_TIMEOUT', default=30, cast=int)
PLAID_WEBHOOK_ALLOWED_IPS = config(
    'PLAID_WEBHOOK_ALLOWED_IPS',
    default='',
    cast=lambda v: [s.strip() for s in v.split(',') if s.strip()],
)
PLAID_WEBHOOK_RATE = config('PLAID_WEBHOOK_RATE', default='120/minute')
PLAID_WEBHOOK_IDEMPOTENCY_TTL = config('PLAID_WEBHOOK_IDEMPOTENCY_TTL', default=300, cast=int)

# Stripe Configuration
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')
STRIPE_API_VERSION = config('STRIPE_API_VERSION', default='2024-12-18.acacia')
# Stripe Price IDs (set after running create_stripe_products command)
STRIPE_PREMIUM_MONTHLY_PRICE_ID = config(
    'STRIPE_PREMIUM_MONTHLY_PRICE_ID',
    default='price_1SU4th9FH3KQIIeT32lJfeW2',
)
STRIPE_PREMIUM_ANNUAL_PRICE_ID = config(
    'STRIPE_PREMIUM_ANNUAL_PRICE_ID',
    default='price_1SU4th9FH3KQIIeT32lJfeW2',
)
STRIPE_PRO_MONTHLY_PRICE_ID = config(
    'STRIPE_PRO_MONTHLY_PRICE_ID',
    default='price_1SU4sS9FH3KQIIeTUG3QLP7T',
)
STRIPE_PRO_ANNUAL_PRICE_ID = config(
    'STRIPE_PRO_ANNUAL_PRICE_ID',
    default='price_1SU4sS9FH3KQIIeTUG3QLP7T',
)

# Enterprise tier price IDs (optional - custom pricing)
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID = config(
    'STRIPE_ENTERPRISE_MONTHLY_PRICE_ID',
    default='',
)
STRIPE_ENTERPRISE_ANNUAL_PRICE_ID = config(
    'STRIPE_ENTERPRISE_ANNUAL_PRICE_ID',
    default='',
)

# AI Categorization Configuration
# Enable/disable AI-powered transaction categorization
AI_CATEGORIZATION_ENABLED = config('AI_CATEGORIZATION_ENABLED', default=True, cast=bool)
# Automatically categorize transactions when synced from Plaid or created via API
AI_AUTO_CATEGORIZE_ON_SYNC = config('AI_AUTO_CATEGORIZE_ON_SYNC', default=True, cast=bool)
# AI provider to use for categorization: ollama, openai, anthropic
AI_PROVIDER = config('AI_PROVIDER', default='ollama')

# Plaid Category Categorization Configuration
# Enable/disable automatic Plaid-based categorization on sync (faster, free alternative to AI)
PLAID_AUTO_CATEGORIZE_ON_SYNC = config('PLAID_AUTO_CATEGORIZE_ON_SYNC', default=True, cast=bool)
# Allow overwriting existing categories with Plaid categories (default: False, respects user edits)
PLAID_CATEGORIZATION_OVERWRITE_EXISTING = config('PLAID_CATEGORIZATION_OVERWRITE_EXISTING', default=False, cast=bool)

# Ollama Configuration (for local AI)
OLLAMA_BASE_URL = config('OLLAMA_BASE_URL', default='http://localhost:11434')
OLLAMA_MODEL = config('OLLAMA_MODEL', default='llama3.1:8b')

# Frontend URL (for password reset links, etc.)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# Security Settings (for production)
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'plaid': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'security': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}


# Create logs directory if it doesn't exist
os.makedirs(BASE_DIR / 'logs', exist_ok=True)


# Email Configuration
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.sendgrid.net')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='apikey')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@cashly.app')

# Cloudflare R2 Storage Configuration
R2_ACCOUNT_ID = config('R2_ACCOUNT_ID', default='')
R2_ACCESS_KEY_ID = config('R2_ACCESS_KEY_ID', default='')
R2_SECRET_ACCESS_KEY = config('R2_SECRET_ACCESS_KEY', default='')
R2_BUCKET_NAME = config('R2_BUCKET_NAME', default='cashly')
R2_ENDPOINT = config('R2_ENDPOINT', default='')

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']

