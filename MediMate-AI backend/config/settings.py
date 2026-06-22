"""
Django settings for MediMateAI project.
"""

import os
from pathlib import Path
from datetime import timedelta

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# ──────────────────────────────────────────────
# BASE DIRECTORY
# ──────────────────────────────────────────────
# This points to the medimateai-backend/ folder
BASE_DIR = Path(__file__).resolve().parent.parent

# ──────────────────────────────────────────────
# SECURITY
# ──────────────────────────────────────────────
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key-change-in-production-min-50-chars-long!!')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() == 'true'
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ──────────────────────────────────────────────
# INSTALLED APPS
# ──────────────────────────────────────────────
# Think of this as "what modules are enabled"
INSTALLED_APPS = [
    # Django built-in apps
    'django.contrib.admin',          # Admin panel (auto-generated UI to manage data)
    'django.contrib.auth',           # Authentication system
    'django.contrib.contenttypes',   # Content type framework
    'django.contrib.sessions',       # Session management
    'django.contrib.messages',       # Flash messages
    'django.contrib.staticfiles',    # Serves CSS/JS files

    # Third-party apps (installed via pip)
    'rest_framework',                # Django REST Framework — builds APIs
    'rest_framework_simplejwt',      # JWT token authentication
    'rest_framework_simplejwt.token_blacklist',  # Token blacklist for secure logout
    'corsheaders',                   # Allows React (different port) to call Django
    'social_django',                 # Google OAuth integration
    'drf_spectacular',               # Auto-generates API documentation
    'django_apscheduler',            # Background task scheduler

    # Our custom apps
    'apps.users',
    'apps.patients',
    'apps.medicines',
    'apps.doses',
    'apps.ai',
    'apps.escalation',
    'apps.whatsapp',
]

# ──────────────────────────────────────────────
# MIDDLEWARE
# ──────────────────────────────────────────────
# Middleware = functions that run on EVERY request/response
# Order matters! CORS must be near the top.
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',          # ← Must be first/near top
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# ──────────────────────────────────────────────
# URL CONFIGURATION
# ──────────────────────────────────────────────
ROOT_URLCONF = 'config.urls'

# ──────────────────────────────────────────────
# TEMPLATES (needed for Django admin panel)
# ──────────────────────────────────────────────
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
                'social_django.context_processors.backends',       # For social auth
                'social_django.context_processors.login_redirect',  # For social auth
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ──────────────────────────────────────────────
# DATABASE — PostgreSQL (if DB_NAME set in env) or SQLite fallback
# ──────────────────────────────────────────────
DB_NAME = os.environ.get('DB_NAME')
DB_USER = os.environ.get('DB_USER')
DB_PASSWORD = os.environ.get('DB_PASSWORD')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')

if DB_NAME:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT,
            'OPTIONS': {
                'connect_timeout': 10,
            }
        }
    }
else:
    # SQLite stores everything in a single file called db.sqlite3
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
            'OPTIONS': {
                'timeout': 30,  # Wait up to 30s if DB is locked by APScheduler
            },
        }
    }

# ──────────────────────────────────────────────
# CUSTOM USER MODEL
# ──────────────────────────────────────────────
# Tells Django: "Don't use the default User table, use OUR custom one"
# MUST be set BEFORE first migration!
AUTH_USER_MODEL = 'users.User'

# ──────────────────────────────────────────────
# PASSWORD VALIDATION
# ──────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ──────────────────────────────────────────────
# AUTHENTICATION BACKENDS
# ──────────────────────────────────────────────
AUTHENTICATION_BACKENDS = (
    'social_core.backends.google.GoogleOAuth2',      # Google login
    'django.contrib.auth.backends.ModelBackend',      # Normal username/password (admin)
)

# ──────────────────────────────────────────────
# GOOGLE OAUTH SETTINGS
# ──────────────────────────────────────────────
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.environ.get('GOOGLE_CLIENT_ID', '')
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
]

# ──────────────────────────────────────────────
# DJANGO REST FRAMEWORK
# ──────────────────────────────────────────────
REST_FRAMEWORK = {
    # Every API endpoint requires a valid JWT token (unless overridden)
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Use drf-spectacular for API docs
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ──────────────────────────────────────────────
# JWT SETTINGS
# ──────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.environ.get('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', 60))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.environ.get('JWT_REFRESH_TOKEN_LIFETIME_DAYS', 7))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ──────────────────────────────────────────────
# CORS — Allow React frontend to call Django
# ──────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',       # Vite dev server
    'http://localhost:3000',       # In case someone uses CRA
]
CORS_ALLOW_CREDENTIALS = True     # Allow cookies/auth headers

# ──────────────────────────────────────────────
# API DOCUMENTATION (Swagger)
# ──────────────────────────────────────────────
SPECTACULAR_SETTINGS = {
    'TITLE': 'MediMateAI API',
    'DESCRIPTION': 'AI-Powered Medication Adherence Platform',
    'VERSION': '1.0.0',
}

# ──────────────────────────────────────────────
# INTERNATIONALIZATION
# ──────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'    # Indian Standard Time
USE_I18N = True
USE_TZ = True

# ──────────────────────────────────────────────
# STATIC FILES
# ──────────────────────────────────────────────
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ──────────────────────────────────────────────
# DEFAULT PRIMARY KEY TYPE
# ──────────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'