"""
Celery tasks for API analytics processing.
"""
from celery import shared_task
from django.utils import timezone
from django.db.models import Sum, Count, Min, Max, Avg
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def log_api_request(self, request_data):
    """
    Async task to write API request log to database.
    
    Args:
        request_data (dict): Dictionary containing request details:
            - endpoint: str
            - method: str
            - status_code: int
            - response_time_ms: float
            - request_size_bytes: int (optional)
            - response_size_bytes: int (optional)
            - user_id: int (optional)
            - ip_address: str (optional)
            - user_agent: str (optional)
    """
    try:
        from .models import APIRequestLog
        
        APIRequestLog.objects.create(
            endpoint=request_data.get('endpoint'),
            method=request_data.get('method'),
            status_code=request_data.get('status_code'),
            response_time_ms=request_data.get('response_time_ms'),
            request_size_bytes=request_data.get('request_size_bytes'),
            response_size_bytes=request_data.get('response_size_bytes'),
            user_id=request_data.get('user_id'),
            ip_address=request_data.get('ip_address'),
            user_agent=request_data.get('user_agent', '')[:500],  # Truncate user agent
        )
        
        logger.debug(f"Logged API request: {request_data.get('method')} {request_data.get('endpoint')}")
        
    except Exception as exc:
        # Log at appropriate level based on retry count
        # Transient DB connection issues are common with Supabase pooler
        if self.request.retries < self.max_retries:
            logger.debug(
                f"Failed to log API request (retry {self.request.retries + 1}/{self.max_retries}): {exc}"
            )
        else:
            logger.warning(
                f"Failed to log API request after {self.max_retries} retries: {exc}. "
                f"Request data: {request_data.get('method')} {request_data.get('endpoint')}"
            )
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)


@shared_task
def aggregate_hourly_analytics():
    """
    Periodic task to aggregate raw API logs into hourly summaries.
    Runs every hour to process the previous hour's data.
    """
    try:
        from .models import APIRequestLog, APIAnalyticsHourly
        
        # Get the previous hour
        now = timezone.now()
        hour_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
        hour_end = hour_start + timedelta(hours=1)
        
        logger.info(f"Aggregating analytics for hour: {hour_start}")
        
        # Get all logs for the previous hour
        logs = APIRequestLog.objects.filter(
            timestamp__gte=hour_start,
            timestamp__lt=hour_end
        )
        
        # Group by endpoint and method
        aggregates = logs.values('endpoint', 'method').annotate(
            request_count=Count('id'),
            error_count=Count('id', filter=models.Q(status_code__gte=400)),
            total_response_time=Sum('response_time_ms'),
            min_response_time=Min('response_time_ms'),
            max_response_time=Max('response_time_ms'),
            status_2xx=Count('id', filter=models.Q(status_code__gte=200, status_code__lt=300)),
            status_3xx=Count('id', filter=models.Q(status_code__gte=300, status_code__lt=400)),
            status_4xx=Count('id', filter=models.Q(status_code__gte=400, status_code__lt=500)),
            status_5xx=Count('id', filter=models.Q(status_code__gte=500, status_code__lt=600)),
        )
        
        # Create or update hourly aggregates
        created_count = 0
        updated_count = 0
        
        for agg in aggregates:
            hourly, created = APIAnalyticsHourly.objects.update_or_create(
                hour=hour_start,
                endpoint=agg['endpoint'],
                method=agg['method'],
                defaults={
                    'request_count': agg['request_count'],
                    'error_count': agg['error_count'],
                    'total_response_time_ms': agg['total_response_time'] or 0,
                    'min_response_time_ms': agg['min_response_time'] or 0,
                    'max_response_time_ms': agg['max_response_time'] or 0,
                    'status_2xx': agg['status_2xx'],
                    'status_3xx': agg['status_3xx'],
                    'status_4xx': agg['status_4xx'],
                    'status_5xx': agg['status_5xx'],
                }
            )
            
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        logger.info(
            f"Aggregated {logs.count()} logs into {created_count} new and "
            f"{updated_count} updated hourly records for {hour_start}"
        )
        
        return {
            'hour': hour_start.isoformat(),
            'logs_processed': logs.count(),
            'records_created': created_count,
            'records_updated': updated_count,
        }
        
    except Exception as exc:
        logger.error(f"Failed to aggregate hourly analytics: {exc}")
        raise


@shared_task
def cleanup_old_logs():
    """
    Periodic task to delete raw API logs older than 30 days.
    Keeps hourly aggregates indefinitely for historical analysis.
    Runs daily.
    """
    try:
        from .models import APIRequestLog
        
        # Delete logs older than 30 days
        cutoff_date = timezone.now() - timedelta(days=30)
        
        deleted_count, _ = APIRequestLog.objects.filter(
            timestamp__lt=cutoff_date
        ).delete()
        
        logger.info(f"Deleted {deleted_count} API request logs older than {cutoff_date}")
        
        return {
            'cutoff_date': cutoff_date.isoformat(),
            'deleted_count': deleted_count,
        }
        
    except Exception as exc:
        logger.error(f"Failed to cleanup old logs: {exc}")
        raise


# Import models for Q objects
from django.db import models

