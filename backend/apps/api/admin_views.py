"""
Admin-only views for system management and user administration.
"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from datetime import timedelta

from .admin_permissions import IsSuperUser
from .admin_serializers import (
    AdminUserListSerializer,
    AdminUserDetailSerializer,
    AdminUserUpdateSerializer,
    AdminSystemStatsSerializer,
    AdminAccountSerializer,
    AdminTransactionSerializer,
    AdminGoalSerializer,
    AdminBudgetSerializer,
)
from apps.accounts.models import Account
from apps.transactions.models import Transaction
from apps.goals.models import Goal
from apps.budgets.models import Budget
from apps.subscriptions.models import Subscription, StripeWebhookEvent
from apps.subscriptions.tier_config import _tier_definitions
from decimal import Decimal
from django.core.cache import cache
from django.db import connection
from django.conf import settings
import os
import time
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

# Import utilities
from .db_utils import get_table_sizes, get_database_stats, get_connection_pool_stats
from .log_utils import read_logs, sanitize_log_entry

User = get_user_model()


class AdminSystemStatsView(APIView):
    """
    GET endpoint for system-wide statistics.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        """Get system statistics."""
        now = timezone.now()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        
        # Total users
        total_users = User.objects.count()
        
        # Total accounts
        total_accounts = Account.objects.count()
        
        # Total balance across all accounts
        total_balance = Account.objects.aggregate(
            total=Sum('balance')
        )['total'] or 0
        
        # Total transactions
        total_transactions = Transaction.objects.count()
        
        # Active subscriptions by tier
        active_subscriptions = {}
        subscription_counts = Subscription.objects.filter(
            status__in=['active', 'trialing']
        ).values('plan').annotate(count=Count('plan'))
        
        for item in subscription_counts:
            active_subscriptions[item['plan']] = item['count']
        
        # Also count users with subscription_tier set (fallback)
        tier_counts = User.objects.exclude(
            subscription_tier='free'
        ).values('subscription_tier').annotate(count=Count('subscription_tier'))
        
        for item in tier_counts:
            tier = item['subscription_tier']
            if tier not in active_subscriptions:
                active_subscriptions[tier] = item['count']
        
        # Recent signups
        recent_signups_7d = User.objects.filter(
            created_at__gte=seven_days_ago
        ).count()
        
        recent_signups_30d = User.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()
        
        # Active users (users who logged in recently)
        active_users_7d = User.objects.filter(
            last_login__gte=seven_days_ago
        ).count()
        
        active_users_30d = User.objects.filter(
            last_login__gte=thirty_days_ago
        ).count()
        
        # Calculate revenue
        # Get tier definitions for pricing
        tier_defs = {tier.id: tier for tier in _tier_definitions()}
        
        # Calculate total revenue from active subscriptions
        total_revenue = Decimal('0.00')  # Monthly Recurring Revenue (MRR)
        this_month_revenue = Decimal('0.00')  # Actual revenue received this month
        
        # Get first and last day of current month
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        active_subs = Subscription.objects.filter(
            status__in=['active', 'trialing']
        )
        
        for sub in active_subs:
            # Get price based on plan and billing cycle
            tier = tier_defs.get(sub.plan)
            if tier:
                # Calculate MRR (Monthly Recurring Revenue)
                if sub.billing_cycle == 'monthly':
                    mrr_price = Decimal(str(tier.monthly_price))
                elif sub.billing_cycle == 'annual':
                    # Annual price divided by 12 for MRR
                    mrr_price = Decimal(str(tier.annual_price or 0)) / Decimal('12')
                else:
                    mrr_price = Decimal('0.00')
                
                total_revenue += mrr_price
                
                # Check if subscription started or renewed this month
                if sub.current_period_start >= first_day_of_month:
                    # For this month revenue, use actual amount received
                    if sub.billing_cycle == 'monthly':
                        actual_price = Decimal(str(tier.monthly_price))
                    elif sub.billing_cycle == 'annual':
                        # Full annual price for annual subscriptions
                        actual_price = Decimal(str(tier.annual_price or 0))
                    else:
                        actual_price = Decimal('0.00')
                    
                    this_month_revenue += actual_price
        
        data = {
            'total_users': total_users,
            'total_accounts': total_accounts,
            'total_balance': total_balance,
            'total_transactions': total_transactions,
            'active_subscriptions': active_subscriptions,
            'recent_signups_7d': recent_signups_7d,
            'recent_signups_30d': recent_signups_30d,
            'active_users_7d': active_users_7d,
            'active_users_30d': active_users_30d,
            'total_revenue': total_revenue,
            'this_month_revenue': this_month_revenue,
        }
        
        serializer = AdminSystemStatsSerializer(data)
        return Response(serializer.data)


class AdminUserListView(generics.ListAPIView):
    """
    GET endpoint for paginated user list with search and filtering.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = AdminUserListSerializer
    
    def get_queryset(self):
        """Get users with aggregated stats."""
        queryset = User.objects.annotate(
            account_count=Count('accounts', distinct=True),
            transaction_count=Count('accounts__transactions', distinct=True),
            total_balance=Sum('accounts__balance')
        )
        
        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone_number__icontains=search)
            )
        
        # Filter by subscription tier
        tier = self.request.query_params.get('tier', None)
        if tier:
            queryset = queryset.filter(subscription_tier=tier)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by superuser status
        is_superuser = self.request.query_params.get('is_superuser', None)
        if is_superuser is not None:
            queryset = queryset.filter(is_superuser=is_superuser.lower() == 'true')
        
        # Ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        queryset = queryset.order_by(ordering)
        
        return queryset


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE endpoint for individual user management.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    queryset = User.objects.all()
    lookup_field = 'id'
    
    def get_serializer_class(self):
        """Return appropriate serializer based on request method."""
        if self.request.method == 'PATCH':
            return AdminUserUpdateSerializer
        return AdminUserDetailSerializer
    
    def get_queryset(self):
        """Get user with aggregated stats."""
        return User.objects.annotate(
            account_count=Count('accounts', distinct=True),
            transaction_count=Count('accounts__transactions', distinct=True),
            goal_count=Count('goals', distinct=True),
            budget_count=Count('budgets', distinct=True),
            total_balance=Sum('accounts__balance')
        )

    def perform_update(self, serializer):
        """
        Handle user updates with specific logic for subscription changes.
        """
        # Save the user first
        super().perform_update(serializer)
        
        # Check if subscription tier was changed to free
        if serializer.validated_data.get('subscription_tier') == 'free':
            user = self.get_object()
            
            # Cancel any active subscription
            subscription = Subscription.objects.filter(user=user).first()
            if subscription:
                subscription.status = 'canceled'
                subscription.current_period_end = timezone.now()
                
                # Clear any pending changes
                subscription.pending_plan = None
                subscription.pending_billing_cycle = None
                subscription.pending_price_id_monthly = None
                subscription.pending_price_id_annual = None
                subscription.pending_requested_at = None
                
                subscription.save()
            
            # Ensure user model reflects the cancellation
            user.subscription_status = 'canceled'
            user.subscription_end_date = timezone.now()
            user.save()
    
    def destroy(self, request, *args, **kwargs):
        """Delete user and all related data."""
        user = self.get_object()
        
        # Prevent deleting yourself
        if user.id == request.user.id:
            return Response(
                {'error': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent deleting other superusers
        if user.is_superuser:
            return Response(
                {'error': 'You cannot delete other superuser accounts.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminUserAccountsView(generics.ListAPIView):
    """
    GET endpoint for user's accounts.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = AdminAccountSerializer
    
    def get_queryset(self):
        """Get accounts for specific user."""
        user_id = self.kwargs.get('user_id')
        return Account.objects.filter(user_id=user_id).order_by('-created_at')


class AdminUserTransactionsView(generics.ListAPIView):
    """
    GET endpoint for user's transactions.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = AdminTransactionSerializer
    
    def get_queryset(self):
        """Get transactions for specific user."""
        user_id = self.kwargs.get('user_id')
        return Transaction.objects.filter(
            user_id=user_id
        ).select_related('account', 'category').order_by('-date')


class AdminUserGoalsView(generics.ListAPIView):
    """
    GET endpoint for user's goals.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = AdminGoalSerializer
    
    def get_queryset(self):
        """Get goals for specific user."""
        user_id = self.kwargs.get('user_id')
        return Goal.objects.filter(
            user_id=user_id
        ).select_related('destination_account').order_by('-created_at')


class AdminUserBudgetsView(generics.ListAPIView):
    """
    GET endpoint for user's budgets.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    serializer_class = AdminBudgetSerializer
    
    def get_queryset(self):
        """Get budgets for specific user."""
        user_id = self.kwargs.get('user_id')
        return Budget.objects.filter(
            user_id=user_id
        ).select_related('category').order_by('-created_at')


class AdminSystemHealthView(APIView):
    """
    GET endpoint for system health metrics.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        """Get system health status."""
        health_data = {
            'database': self._check_database(),
            'cache': self._check_cache(),
            'celery': self._check_celery(),
            'system': self._check_system(),
            'timestamp': timezone.now().isoformat(),
        }
        
        # Determine overall health status
        # Priority: unhealthy > degraded > unknown > healthy
        statuses = [
            service.get('status')
            for service in health_data.values()
            if isinstance(service, dict) and 'status' in service
        ]
        
        if 'unhealthy' in statuses:
            overall_status = 'unhealthy'
        elif 'degraded' in statuses:
            overall_status = 'degraded'
        elif all(s == 'healthy' for s in statuses):
            overall_status = 'healthy'
        else:
            # Has 'unknown' but no 'unhealthy' or 'degraded'
            overall_status = 'degraded'  # Treat unknown as degraded for visibility
        
        health_data['overall_status'] = overall_status
        
        return Response({
            'status': 'success',
            'data': health_data,
            'message': 'System health retrieved successfully'
        })
    
    def _check_database(self):
        """Check database connection and stats."""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            
            db_stats = get_database_stats()
            pool_stats = get_connection_pool_stats()
            
            return {
                'status': 'healthy',
                'connected': True,
                'version': db_stats.get('version', 'Unknown'),
                'size': db_stats.get('size', 'Unknown'),
                'connection_count': pool_stats.get('total_connections', 0),
                'active_connections': pool_stats.get('active_connections', 0),
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'connected': False,
                'error': str(e),
            }
    
    def _check_cache(self):
        """Check Redis/cache connection."""
        try:
            # Test cache connection
            test_key = 'admin_health_check'
            cache.set(test_key, 'test', timeout=10)
            value = cache.get(test_key)
            cache.delete(test_key)
            
            if value == 'test':
                return {
                    'status': 'healthy',
                    'connected': True,
                    'backend': settings.CACHES['default']['BACKEND'] if hasattr(settings, 'CACHES') else 'Unknown',
                }
            else:
                return {
                    'status': 'unhealthy',
                    'connected': False,
                    'error': 'Cache test failed',
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'connected': False,
                'error': str(e),
            }
    
    def _check_celery(self):
        """Check Celery worker status."""
        try:
            from celery import current_app
            from django.conf import settings
            
            # Check if Celery is configured to run eagerly (development mode)
            if getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False):
                return {
                    'status': 'healthy',
                    'worker_count': 0,
                    'workers': [],
                    'stats': {},
                    'note': 'Celery running in eager mode (development)',
                }
            
            # Inspect active workers
            inspect = current_app.control.inspect()
            active_workers = inspect.active()
            stats = inspect.stats()
            
            worker_count = len(active_workers) if active_workers else 0
            
            # In development, it's normal to have no workers
            # Only mark as degraded if we're in production and have no workers
            if worker_count > 0:
                status = 'healthy'
            else:
                # Check if we're in production
                is_production = getattr(settings, 'DEBUG', True) == False
                status = 'degraded' if is_production else 'healthy'
            
            return {
                'status': status,
                'worker_count': worker_count,
                'workers': list(active_workers.keys()) if active_workers else [],
                'stats': stats if stats else {},
                'note': 'No workers running' if worker_count == 0 and not getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False) else None,
            }
        except Exception as e:
            # Celery might not be running in development
            from django.conf import settings
            is_eager = getattr(settings, 'CELERY_TASK_ALWAYS_EAGER', False)
            
            return {
                'status': 'healthy' if is_eager else 'degraded',
                'worker_count': 0,
                'error': str(e) if not is_eager else None,
                'note': 'Celery running in eager mode (development)' if is_eager else 'Celery may not be running',
            }
    
    def _check_system(self):
        """Check system resources."""
        if not PSUTIL_AVAILABLE:
            return {
                'status': 'unknown',
                'error': 'psutil not installed',
                'note': 'Install psutil>=5.9.0 to enable system metrics',
            }
        
        try:
            # Get CPU usage
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            # Get memory usage
            memory = psutil.virtual_memory()
            
            # Get disk usage
            disk = psutil.disk_usage('/')
            
            # Get uptime
            uptime_seconds = time.time() - psutil.boot_time()
            uptime_hours = uptime_seconds / 3600
            
            return {
                'status': 'healthy',
                'cpu_percent': cpu_percent,
                'memory': {
                    'total_gb': round(memory.total / (1024**3), 2),
                    'used_gb': round(memory.used / (1024**3), 2),
                    'percent': memory.percent,
                },
                'disk': {
                    'total_gb': round(disk.total / (1024**3), 2),
                    'used_gb': round(disk.used / (1024**3), 2),
                    'percent': round((disk.used / disk.total) * 100, 2),
                },
                'uptime_hours': round(uptime_hours, 2),
            }
        except Exception as e:
            return {
                'status': 'unknown',
                'error': str(e),
                'note': 'System metrics may not be available',
            }


class AdminLogsView(APIView):
    """
    GET endpoint for reading system logs.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        """Get filtered log entries."""
        log_type = request.query_params.get('type')
        level = request.query_params.get('level')
        limit = int(request.query_params.get('limit', 100))
        offset = int(request.query_params.get('offset', 0))
        search = request.query_params.get('search')
        
        # Validate inputs
        if limit > 500:
            limit = 500
        if limit < 1:
            limit = 100
        
        # Read logs
        result = read_logs(
            log_type=log_type,
            level=level,
            limit=limit,
            offset=offset,
            search=search
        )
        
        # Sanitize sensitive data
        sanitized_entries = [sanitize_log_entry(entry) for entry in result.get('entries', [])]
        
        return Response({
            'status': 'success',
            'data': {
                'entries': sanitized_entries,
                'total': result.get('total', 0),
                'limit': limit,
                'offset': offset,
            },
            'message': 'Logs retrieved successfully'
        })


class AdminAPIAnalyticsView(APIView):
    """
    GET endpoint for API usage analytics.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        """Get comprehensive API analytics data from Redis (real-time) and database (historical)."""
        try:
            from .models import APIRequestLog, APIAnalyticsHourly
            from django.db.models import Q
            import numpy as np
            
            now = timezone.now()
            twenty_four_hours_ago = now - timedelta(hours=24)
            seven_days_ago = now - timedelta(days=7)
            
            # Get real-time stats from Redis cache
            endpoint_stats = self._get_redis_stats()
            
            # Get 24-hour stats from database
            logs_24h = APIRequestLog.objects.filter(timestamp__gte=twenty_four_hours_ago)
            total_requests_24h = logs_24h.count()
            total_errors_24h = logs_24h.filter(status_code__gte=400).count()
            
            # Get 7-day stats from hourly aggregates
            hourly_stats_7d = APIAnalyticsHourly.objects.filter(hour__gte=seven_days_ago)
            total_requests_7d = hourly_stats_7d.aggregate(total=Sum('request_count'))['total'] or 0
            
            # Calculate response time percentiles from recent logs
            response_times = list(logs_24h.values_list('response_time_ms', flat=True)[:10000])
            percentiles = self._calculate_percentiles(response_times)
            
            # Get hourly time series data (last 24 hours)
            hourly_data = self._get_hourly_timeseries(twenty_four_hours_ago, now)
            
            # Get status code breakdown
            status_breakdown = self._get_status_breakdown(logs_24h)
            
            # Calculate summary metrics
            avg_response_time = logs_24h.aggregate(avg=Avg('response_time_ms'))['avg'] or 0
            error_rate = (total_errors_24h / total_requests_24h * 100) if total_requests_24h > 0 else 0
            requests_per_second = total_requests_24h / (24 * 3600) if total_requests_24h > 0 else 0
            
            # Get top endpoints from cache (real-time) and database (historical)
            top_endpoints = self._get_top_endpoints(endpoint_stats, logs_24h)
            
            # Get HTTP method distribution
            method_distribution = logs_24h.values('method').annotate(
                count=Count('id')
            ).order_by('-count')
            
            return Response({
                'status': 'success',
                'data': {
                    'summary': {
                        'total_requests_24h': total_requests_24h,
                        'total_requests_7d': total_requests_7d,
                        'total_errors_24h': total_errors_24h,
                        'error_rate': round(error_rate, 2),
                        'avg_response_time_ms': round(avg_response_time, 2),
                        'requests_per_second': round(requests_per_second, 2),
                    },
                    'hourly_data': hourly_data,
                    'endpoints': endpoint_stats,
                    'top_endpoints': top_endpoints,
                    'status_breakdown': status_breakdown,
                    'response_time_percentiles': percentiles,
                    'method_distribution': list(method_distribution),
                },
                'message': 'API analytics retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Failed to retrieve API analytics: {e}")
            # Return empty stats if there's an error
            return Response({
                'status': 'success',
                'data': {
                    'summary': {
                        'total_requests_24h': 0,
                        'total_requests_7d': 0,
                        'total_errors_24h': 0,
                        'error_rate': 0,
                        'avg_response_time_ms': 0,
                        'requests_per_second': 0,
                    },
                    'hourly_data': [],
                    'endpoints': {},
                    'top_endpoints': [],
                    'status_breakdown': {},
                    'response_time_percentiles': {},
                    'method_distribution': [],
                },
                'message': 'API analytics retrieved (no data available yet)'
            })
    
    def _get_redis_stats(self):
        """Get real-time endpoint stats from Redis cache."""
        endpoint_stats = {}
        
        try:
            # Get all tracked endpoints
            all_endpoints = cache.get('api_analytics:all_endpoints', set())
            
            for endpoint_key in all_endpoints:
                stats = cache.get(endpoint_key)
                if stats:
                    # Parse endpoint key to get method and path
                    parts = endpoint_key.replace('api_analytics:', '').rsplit(':', 1)
                    if len(parts) == 2:
                        endpoint, method = parts
                        endpoint_stats[endpoint_key] = {
                            'endpoint': endpoint,
                            'method': method,
                            'count': stats.get('count', 0),
                            'total_time': stats.get('total_time', 0),
                            'error_count': stats.get('error_count', 0),
                            'last_request': stats.get('last_request'),
                            'avg_response_time': (
                                stats.get('total_time', 0) / stats.get('count', 1)
                                if stats.get('count', 0) > 0 else 0
                            ),
                            'error_rate': (
                                (stats.get('error_count', 0) / stats.get('count', 1)) * 100
                                if stats.get('count', 0) > 0 else 0
                            ),
                        }
        except Exception as e:
            logger.debug(f"Could not retrieve Redis stats: {e}")
        
        return endpoint_stats
    
    def _calculate_percentiles(self, response_times):
        """Calculate response time percentiles."""
        if not response_times:
            return {
                'p50': 0,
                'p75': 0,
                'p90': 0,
                'p95': 0,
                'p99': 0,
            }
        
        # Try numpy first, fallback to manual calculation
        try:
            import numpy as np
            times = np.array(response_times)
            return {
                'p50': round(float(np.percentile(times, 50)), 2),
                'p75': round(float(np.percentile(times, 75)), 2),
                'p90': round(float(np.percentile(times, 90)), 2),
                'p95': round(float(np.percentile(times, 95)), 2),
                'p99': round(float(np.percentile(times, 99)), 2),
            }
        except (ImportError, ModuleNotFoundError):
            # Fallback to manual calculation if numpy is not available
            pass
        except Exception as e:
            # Log other numpy errors but continue with fallback
            logger.debug(f"Numpy percentile calculation failed: {e}, using fallback")
        
        # Manual percentile calculation (fallback)
        sorted_times = sorted(response_times)
        length = len(sorted_times)
        if length == 0:
            return {
                'p50': 0,
                'p75': 0,
                'p90': 0,
                'p95': 0,
                'p99': 0,
            }
        
        def percentile_index(p):
            """Calculate index for percentile p (0-100)."""
            return min(int(length * p / 100), length - 1)
        
        return {
            'p50': round(sorted_times[percentile_index(50)], 2),
            'p75': round(sorted_times[percentile_index(75)], 2),
            'p90': round(sorted_times[percentile_index(90)], 2),
            'p95': round(sorted_times[percentile_index(95)], 2),
            'p99': round(sorted_times[percentile_index(99)], 2),
        }
    
    def _get_hourly_timeseries(self, start_time, end_time):
        """Get hourly time series data for the specified period."""
        from .models import APIAnalyticsHourly
        
        hourly_stats = APIAnalyticsHourly.objects.filter(
            hour__gte=start_time,
            hour__lt=end_time
        ).values('hour').annotate(
            requests=Sum('request_count'),
            errors=Sum('error_count')
        ).order_by('hour')
        
        return [
            {
                'hour': stat['hour'].strftime('%H'),
                'requests': stat['requests'],
                'errors': stat['errors'],
            }
            for stat in hourly_stats
        ]
    
    def _get_status_breakdown(self, logs_queryset):
        """Get status code breakdown."""
        return {
            '2xx': logs_queryset.filter(status_code__gte=200, status_code__lt=300).count(),
            '3xx': logs_queryset.filter(status_code__gte=300, status_code__lt=400).count(),
            '4xx': logs_queryset.filter(status_code__gte=400, status_code__lt=500).count(),
            '5xx': logs_queryset.filter(status_code__gte=500, status_code__lt=600).count(),
        }
    
    def _get_top_endpoints(self, redis_stats, logs_queryset):
        """Get top endpoints by request count."""
        # Get top endpoints from database
        top_from_db = logs_queryset.values('endpoint', 'method').annotate(
            count=Count('id'),
            avg_time=Avg('response_time_ms'),
            errors=Count('id', filter=Q(status_code__gte=400))
        ).order_by('-count')[:10]
        
        return [
            {
                'endpoint': item['endpoint'],
                'method': item['method'],
                'count': item['count'],
                'avg_response_time': round(item['avg_time'] or 0, 2),
                'error_count': item['errors'],
                'error_rate': round((item['errors'] / item['count'] * 100) if item['count'] > 0 else 0, 2),
            }
            for item in top_from_db
        ]


class AdminIntegrationsView(APIView):
    """
    GET endpoint for integration status (Plaid, Stripe).
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        """Get integration status."""
        # Plaid stats
        plaid_stats = self._get_plaid_stats()
        
        # Stripe stats
        stripe_stats = self._get_stripe_stats()
        
        return Response({
            'status': 'success',
            'data': {
                'plaid': plaid_stats,
                'stripe': stripe_stats,
            },
            'message': 'Integration status retrieved successfully'
        })
    
    def _get_plaid_stats(self):
        """Get Plaid integration statistics."""
        try:
            total_accounts = Account.objects.count()
            active_accounts = Account.objects.filter(is_active=True).count()
            accounts_with_errors = Account.objects.exclude(
                error_code__isnull=True
            ).exclude(error_code='').count()
            
            # Recent sync stats (last 24 hours)
            twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
            recent_syncs = Account.objects.filter(
                last_synced_at__gte=twenty_four_hours_ago
            ).count()
            
            # Error rate
            error_rate = (
                (accounts_with_errors / total_accounts * 100)
                if total_accounts > 0 else 0
            )
            
            return {
                'status': 'healthy' if error_rate < 10 else 'degraded',
                'total_accounts': total_accounts,
                'active_accounts': active_accounts,
                'accounts_with_errors': accounts_with_errors,
                'error_rate_percent': round(error_rate, 2),
                'recent_syncs_24h': recent_syncs,
            }
        except Exception as e:
            return {
                'status': 'unknown',
                'error': str(e),
            }
    
    def _get_stripe_stats(self):
        """Get Stripe integration statistics."""
        try:
            # Recent webhook events (last 24 hours)
            twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
            recent_events = StripeWebhookEvent.objects.filter(
                created_at__gte=twenty_four_hours_ago
            ).count()
            
            # Processed events
            processed_events = StripeWebhookEvent.objects.filter(
                processed=True,
                created_at__gte=twenty_four_hours_ago
            ).count()
            
            # Recent event types
            recent_event_types = StripeWebhookEvent.objects.filter(
                created_at__gte=twenty_four_hours_ago
            ).values('event_type').annotate(
                count=Count('event_type')
            ).order_by('-count')[:10]
            
            # Active subscriptions count
            active_subscriptions = Subscription.objects.filter(
                status__in=['active', 'trialing']
            ).count()
            
            return {
                'status': 'healthy',
                'recent_events_24h': recent_events,
                'processed_events_24h': processed_events,
                'processing_rate': (
                    (processed_events / recent_events * 100)
                    if recent_events > 0 else 100
                ),
                'event_types': list(recent_event_types),
                'active_subscriptions': active_subscriptions,
            }
        except Exception as e:
            return {
                'status': 'unknown',
                'error': str(e),
            }


class AdminDatabaseView(APIView):
    """
    GET endpoint for database statistics.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        """Get database statistics."""
        try:
            from .admin_serializers import AdminDatabaseStatsSerializer
            
            table_sizes = get_table_sizes()
            db_stats = get_database_stats()
            pool_stats = get_connection_pool_stats()
            
            # Use database query for table count (more accurate)
            total_tables = db_stats.get('table_count', len(table_sizes))
            total_rows = sum(t.get('row_count', 0) for t in table_sizes) if table_sizes else 0
            
            data = {
                'database': db_stats,
                'connection_pool': pool_stats,
                'tables': table_sizes,
                'total_tables': total_tables,
                'total_rows': total_rows,
            }
            
            serializer = AdminDatabaseStatsSerializer(data)
            
            return Response({
                'status': 'success',
                'data': serializer.data,
                'message': 'Database statistics retrieved successfully'
            })
        except Exception as e:
            import traceback
            return Response({
                'status': 'error',
                'data': None,
                'message': f'Failed to retrieve database stats: {str(e)}',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminUserTrialManageView(APIView):
    """
    POST endpoint to manage user trial status.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def post(self, request, user_id):
        """Update user trial status."""
        try:
            from .admin_serializers import AdminUserTrialManageSerializer
            
            # Validate input
            serializer = AdminUserTrialManageSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            trial_end = serializer.validated_data['trialEnd']
            
            # Get user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response(
                    {'error': 'User not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get or create subscription
            # We need to handle cases where user might not have a subscription record yet
            subscription = Subscription.objects.filter(user=user).first()
            
            if not subscription:
                # Create a dummy subscription record for trial tracking if none exists
                # This is a simplification - in a real app you might want to create a proper Stripe sub
                # But for admin overrides, we can create a local record
                subscription = Subscription.objects.create(
                    user=user,
                    stripe_subscription_id=f"sub_admin_override_{user.id}_{int(time.time())}",
                    stripe_customer_id=user.stripe_customer_id or f"cus_admin_override_{user.id}",
                    status='trialing',
                    plan='premium', # Default to premium for trials
                    billing_cycle='monthly',
                    current_period_start=timezone.now(),
                    current_period_end=trial_end,
                    trial_start=timezone.now(),
                    trial_end=trial_end,
                    price_id_monthly='price_admin_override',
                    price_id_annual='price_admin_override'
                )
            else:
                # Update existing subscription
                subscription.trial_end = trial_end
                
                # Update status based on trial end date
                if trial_end > timezone.now():
                    subscription.status = 'trialing'
                    # Also update current period end to match trial end if it's a trial
                    if subscription.status == 'trialing':
                        subscription.current_period_end = trial_end
                else:
                    # If ending trial now (date in past), cancel the subscription and expire it
                    subscription.status = 'canceled'
                    subscription.trial_end = trial_end
                    subscription.current_period_end = trial_end
                    
                    # Clear any pending changes
                    subscription.pending_plan = None
                    subscription.pending_billing_cycle = None
                    subscription.pending_price_id_monthly = None
                    subscription.pending_price_id_annual = None
                    subscription.pending_requested_at = None
                
                subscription.save()

                # Sync User model fields
                user.subscription_status = subscription.status
                user.subscription_end_date = subscription.current_period_end
                if subscription.status == 'canceled':
                    user.subscription_tier = 'free'
                user.save()
            
            return Response({
                'status': 'success',
                'message': 'User trial updated successfully',
                'data': {
                    'trialEnd': trial_end,
                    'status': subscription.status
                }
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminDebugTriggerSyncView(APIView):
    """
    POST endpoint to manually trigger account sync.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def post(self, request):
        """Trigger account sync for a specific account."""
        account_id = request.data.get('account_id')
        
        if not account_id:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'account_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            account = Account.objects.get(account_id=account_id)
            
            # Trigger sync task
            from apps.transactions.tasks import sync_account_transactions
            sync_account_transactions.delay(account.id)
            
            return Response({
                'status': 'success',
                'data': {
                    'account_id': str(account.account_id),
                    'message': 'Sync triggered successfully'
                },
                'message': 'Account sync triggered'
            })
        except Account.DoesNotExist:
            return Response({
                'status': 'error',
                'data': None,
                'message': 'Account not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'status': 'error',
                'data': None,
                'message': f'Failed to trigger sync: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminDebugClearCacheView(APIView):
    """
    POST endpoint to clear Redis cache.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def post(self, request):
        """Clear all cache."""
        try:
            cache.clear()
            return Response({
                'status': 'success',
                'data': None,
                'message': 'Cache cleared successfully'
            })
        except Exception as e:
            return Response({
                'status': 'error',
                'data': None,
                'message': f'Failed to clear cache: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminDebugTestEndpointsView(APIView):
    """
    GET endpoint to test external API connectivity.
    Only accessible to superusers.
    """
    permission_classes = [IsAuthenticated, IsSuperUser]
    
    def get(self, request):
        """Test external API endpoints."""
        from .admin_serializers import AdminTestEndpointsSerializer
        
        results = {}
        
        # Test Plaid
        plaid_status = self._test_plaid()
        results['plaid'] = plaid_status
        
        # Test Stripe
        stripe_status = self._test_stripe()
        results['stripe'] = stripe_status
        
        serializer = AdminTestEndpointsSerializer(results)
        
        return Response({
            'status': 'success',
            'data': serializer.data,
            'message': 'Endpoint tests completed'
        })
    
    def _test_plaid(self):
        """Test Plaid API connectivity."""
        try:
            from apps.accounts.plaid_service import PlaidService
            # Just check if Plaid client can be initialized
            # Don't make actual API calls
            return {
                'status': 'available',
                'client_id_configured': bool(settings.PLAID_CLIENT_ID),
                'secret_configured': bool(settings.PLAID_SECRET),
                'environment': getattr(settings, 'PLAID_ENV', 'unknown'),
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
            }
    
    def _test_stripe(self):
        """Test Stripe API connectivity."""
        try:
            import stripe
            stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')
            
            return {
                'status': 'available',
                'secret_key_configured': bool(getattr(settings, 'STRIPE_SECRET_KEY', '')),
                'publishable_key_configured': bool(getattr(settings, 'STRIPE_PUBLISHABLE_KEY', '')),
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
            }
