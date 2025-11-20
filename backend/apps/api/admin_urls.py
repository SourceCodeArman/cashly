"""
URL routing for admin endpoints.
"""
from django.urls import path
from .admin_views import (
    AdminSystemStatsView,
    AdminUserListView,
    AdminUserDetailView,
    AdminUserAccountsView,
    AdminUserTransactionsView,
    AdminUserGoalsView,
    AdminUserBudgetsView,
    AdminSystemHealthView,
    AdminLogsView,
    AdminAPIAnalyticsView,
    AdminIntegrationsView,
    AdminDatabaseView,
    AdminDebugTriggerSyncView,
    AdminDebugClearCacheView,
    AdminDebugTestEndpointsView,
)

urlpatterns = [
    # System statistics
    path('stats/', AdminSystemStatsView.as_view(), name='admin-stats'),
    
    # System health
    path('system-health/', AdminSystemHealthView.as_view(), name='admin-system-health'),
    
    # Logs
    path('logs/', AdminLogsView.as_view(), name='admin-logs'),
    
    # API Analytics
    path('api-analytics/', AdminAPIAnalyticsView.as_view(), name='admin-api-analytics'),
    
    # Integrations
    path('integrations/', AdminIntegrationsView.as_view(), name='admin-integrations'),
    
    # Database
    path('database/', AdminDatabaseView.as_view(), name='admin-database'),
    
    # Debugging tools
    path('debug/trigger-sync/', AdminDebugTriggerSyncView.as_view(), name='admin-debug-trigger-sync'),
    path('debug/clear-cache/', AdminDebugClearCacheView.as_view(), name='admin-debug-clear-cache'),
    path('debug/test-endpoints/', AdminDebugTestEndpointsView.as_view(), name='admin-debug-test-endpoints'),
    
    # User management
    path('users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('users/<int:id>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    
    # User-specific data
    path('users/<int:user_id>/accounts/', AdminUserAccountsView.as_view(), name='admin-user-accounts'),
    path('users/<int:user_id>/transactions/', AdminUserTransactionsView.as_view(), name='admin-user-transactions'),
    path('users/<int:user_id>/goals/', AdminUserGoalsView.as_view(), name='admin-user-goals'),
    path('users/<int:user_id>/budgets/', AdminUserBudgetsView.as_view(), name='admin-user-budgets'),
]
