"""
Celery configuration for Cashly.
"""
import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

app = Celery('cashly')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()



from celery.schedules import crontab

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

app.conf.beat_schedule = {
    'check-budget-alerts-every-6-hours': {
        'task': 'apps.notifications.tasks.check_budget_alerts',
        'schedule': crontab(minute=0, hour='*/6'),
    },
    'check-goal-milestones-daily': {
        'task': 'apps.notifications.tasks.check_goal_milestones',
        'schedule': crontab(minute=0, hour=9),  # 9 AM daily
    },
    'send-weekly-summary-monday': {
        'task': 'apps.notifications.tasks.send_weekly_summary',
        'schedule': crontab(hour=8, minute=0, day_of_week=1),  # Monday 8 AM
    },
    'send-monthly-summary-1st': {
        'task': 'apps.notifications.tasks.send_monthly_summary',
        'schedule': crontab(hour=8, minute=0, day_of_month=1),  # 1st of month 8 AM
    },
    # API Analytics tasks
    'aggregate-hourly-analytics': {
        'task': 'apps.api.tasks.aggregate_hourly_analytics',
        'schedule': crontab(minute=5, hour='*'),  # Every hour at :05
    },
    'cleanup-old-api-logs': {
        'task': 'apps.api.tasks.cleanup_old_logs',
        'schedule': crontab(minute=0, hour=3),  # Daily at 3 AM
    },
    # Insights tasks
    'generate-insights-daily': {
        'task': 'apps.insights.tasks.generate_all_users_insights',
        'schedule': crontab(minute=0, hour=6),  # Daily at 6 AM
    },
    'cleanup-expired-insights': {
        'task': 'apps.insights.tasks.cleanup_expired_insights',
        'schedule': crontab(minute=30, hour=3),  # Daily at 3:30 AM
    },
    # Debt management tasks
    'check-upcoming-debt-payments': {
        'task': 'apps.debts.tasks.check_upcoming_debt_payments',
        'schedule': crontab(minute=0, hour=9),  # Daily at 9 AM
    },
    'update-debt-interest': {
        'task': 'apps.debts.tasks.update_debt_interest',
        'schedule': crontab(minute=0, hour=0, day_of_month=1),  # Monthly on 1st at midnight
    },

}

