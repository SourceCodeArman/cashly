"""
Celery tasks for insights generation.
"""
import logging
from celery import shared_task
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_user_insights(self, user_id):
    """
    Generate insights for a single user.
    
    Args:
        user_id: ID of the user to generate insights for
        
    Returns:
        str: Success message with count of insights generated
    """
    try:
        from .insight_engine import generate_insights
        
        user = User.objects.get(id=user_id)
        insights = generate_insights(user)
        
        logger.info(f"Generated {len(insights)} insights for user {user_id}")
        return f"Generated {len(insights)} insights for user {user_id}"
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return f"User {user_id} not found"
    except Exception as exc:
        logger.error(f"Error generating insights for user {user_id}: {exc}")
        self.retry(exc=exc)


@shared_task
def generate_all_users_insights():
    """
    Periodic task to generate insights for all active users.
    
    This task should be scheduled to run daily (e.g., at 6 AM).
    
    Returns:
        str: Summary of insights generated
    """
    from .insight_engine import generate_insights
    
    # Get all active users with verified emails
    users = User.objects.filter(
        is_active=True
    ).only('id')
    
    total_insights = 0
    processed_users = 0
    errors = 0
    
    for user in users:
        try:
            insights = generate_insights(user)
            total_insights += len(insights)
            processed_users += 1
        except Exception as exc:
            logger.error(f"Error generating insights for user {user.id}: {exc}")
            errors += 1
    
    summary = f"Generated {total_insights} insights for {processed_users} users ({errors} errors)"
    logger.info(summary)
    return summary


@shared_task
def cleanup_expired_insights():
    """
    Clean up expired and old dismissed insights.
    
    - Deletes insights that have expired
    - Deletes dismissed insights older than 30 days
    
    Returns:
        str: Summary of deleted insights
    """
    from django.utils import timezone
    from datetime import timedelta
    from .models import Insight
    
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    
    # Delete expired insights
    expired_count = Insight.objects.filter(
        expires_at__lt=now
    ).delete()[0]
    
    # Delete old dismissed insights
    dismissed_count = Insight.objects.filter(
        is_dismissed=True,
        updated_at__lt=thirty_days_ago
    ).delete()[0]
    
    summary = f"Cleaned up {expired_count} expired and {dismissed_count} old dismissed insights"
    logger.info(summary)
    return summary
