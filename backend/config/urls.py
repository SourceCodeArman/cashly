"""
URL configuration for Cashly project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from rest_framework import permissions

# API Documentation
schema_view = get_schema_view(
    openapi.Info(
        title="Cashly API",
        default_version='v1',
        description="Cashly Personal Finance Management API",
        terms_of_service="https://cashly.com/terms/",
        contact=openapi.Contact(email="contact@cashly.com"),
        license=openapi.License(name="Proprietary"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    path('api/swagger.json', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    
    # API v1
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/accounts/', include('apps.accounts.account_urls')),
    path('api/v1/transactions/', include('apps.transactions.urls')),
    path('api/v1/goals/', include('apps.goals.urls')),
    path('api/v1/budgets/', include('apps.budgets.urls')),
    path('api/v1/dashboard/', include('apps.analytics.urls')),
    path('api/v1/health/', include('apps.api.urls')),
]

# Django Debug Toolbar URLs (only in development)
if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass
