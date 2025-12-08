"""
Celery tasks for bills app.
"""
import logging
from datetime import timedelta
from django.utils import timezone
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='apps.bills.tasks.check_bill_reminders')
def check_bill_reminders():
    """
    Check for bills due soon and send reminders.
    Runs daily to notify users about upcoming bills.
    """
    from .models import Bill
    from apps.notifications.tasks import create_bill_reminder_notification
    
    logger.info("Checking for bills needing reminders...")
    
    today = timezone.now().date()
    bills_to_remind = []
    
    # Get all active bills with reminders enabled
    bills = Bill.objects.filter(
        is_active=True,
        reminder_enabled=True
    ).select_related('user')
    
    for bill in bills:
        # Calculate reminder date (reminder_days before due)
        reminder_date = bill.next_due_date - timedelta(days=bill.reminder_days)
        
        # If today is the reminder date, send notification
        if reminder_date == today:
            try:
                create_bill_reminder_notification(bill.user, bill)
                bills_to_remind.append(str(bill.bill_id))
                logger.info(f"Sent reminder for bill {bill.bill_id}: {bill.name}")
            except Exception as e:
                logger.error(f"Error sending reminder for bill {bill.bill_id}: {e}", exc_info=True)
    
    logger.info(f"Sent {len(bills_to_remind)} bill reminders")
    return {
        'reminders_sent': len(bills_to_remind),
        'bill_ids': bills_to_remind
    }


@shared_task(name='apps.bills.tasks.check_overdue_bills')
def check_overdue_bills():
    """
    Check for overdue bills and send notifications.
    Runs daily to notify users about bills that are past due.
    """
    from .models import Bill
    from apps.notifications.tasks import create_bill_overdue_notification
    
    logger.info("Checking for overdue bills...")
    
    today = timezone.now().date()
    overdue_bills_notified = []
    
    # Get all active bills that are overdue
    overdue_bills = Bill.objects.filter(
        is_active=True,
        next_due_date__lt=today
    ).select_related('user')
    
    for bill in overdue_bills:
        try:
            create_bill_overdue_notification(bill.user, bill)
            overdue_bills_notified.append(str(bill.bill_id))
            logger.info(f"Sent overdue notification for bill {bill.bill_id}: {bill.name}")
        except Exception as e:
            logger.error(f"Error sending overdue notification for bill {bill.bill_id}: {e}", exc_info=True)
    
    logger.info(f"Sent {len(overdue_bills_notified)} overdue bill notifications")
    return {
        'notifications_sent': len(overdue_bills_notified),
        'bill_ids': overdue_bills_notified
    }
