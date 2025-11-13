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
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])

# Application definition
INSTALLED_APPS = [
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
    
    # Local apps
    'apps.accounts',
    'apps.transactions',
    'apps.goals',
    'apps.budgets',
    'apps.analytics',
    'apps.api',
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
# Support both connection string (Supabase) and individual parameters
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
        # If URL parsing fails, fall back to individual parameters
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f'Failed to parse DATABASE_URL: {e}. Falling back to individual parameters.')
        DATABASE_URL = None
        # If connection fails due to DNS issues, provide helpful error message
        if 'nodename' in str(e).lower() or 'servname' in str(e).lower():
            import sys
            print("\n" + "="*70, file=sys.stderr)
            print("⚠️  DATABASE CONNECTION ERROR", file=sys.stderr)
            print("="*70, file=sys.stderr)
            print("The Supabase hostname cannot be resolved.", file=sys.stderr)
            print("\nThis usually means:", file=sys.stderr)
            print("  1. Your Supabase project is PAUSED (most common)", file=sys.stderr)
            print("  2. The hostname is incorrect", file=sys.stderr)
            print("  3. DNS/IPv6 routing issues", file=sys.stderr)
            print("\n🔧 Next steps:", file=sys.stderr)
            print("  1. Go to: https://supabase.com/dashboard/project/yeohuydyvpfhhaukltqz", file=sys.stderr)
            print("  2. Check if project is paused - if so, click 'Restore Project'", file=sys.stderr)
            print("  3. Wait 2-5 minutes for project to resume", file=sys.stderr)
            print("  4. Get the connection string from Project Settings → Database", file=sys.stderr)
            print("  5. Try using the connection pooler (port 6543) instead", file=sys.stderr)
            print("\n📖 See: backend/FIX_SUPABASE_CONNECTION.md for detailed instructions", file=sys.stderr)
            print("="*70 + "\n", file=sys.stderr)

if not DATABASE_URL:
    # Fallback to individual parameters
    db_host = config('DB_HOST', default='localhost')
    # Determine SSL mode based on host
    # Supabase and remote hosts require SSL, localhost doesn't
    if db_host in ('localhost', '127.0.0.1', 'db'):
        default_sslmode = 'prefer'  # Prefer SSL but don't require for local dev
    else:
        default_sslmode = 'require'  # Require SSL for remote hosts (Supabase)
    
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='postgres'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': db_host,
            'PORT': config('DB_PORT', default='5432'),
            'OPTIONS': {
                'sslmode': config('DB_SSLMODE', default=default_sslmode),
            },
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
TIME_ZONE = 'UTC'
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

