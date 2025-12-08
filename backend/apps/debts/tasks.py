"""
Celery tasks for debts app.
"""
import logging
from datetime import timedelta
from django.utils import timezone
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='apps.debts.tasks.check_upcoming_debt_payments')
def check_upcoming_debt_payments():
    """
    Check for upcoming debt payments and send reminders.
    Runs daily to notify users about debts due soon.
    """
    from .models import DebtAccount
    from apps.notifications.tasks import create_notification
    
    logger.info("Checking for upcoming debt payments...")
    
    today = timezone.now().date()
    reminder_threshold = today + timedelta(days=3)  # 3 days before due
    
    debts_needing_reminders = []
    
    # Get all active debts
    debts = DebtAccount.objects.filter(
        is_active=True,
        status='active'
    ).select_related('user')
    
    for debt in debts:
        next_due = debt.next_due_date
        
        # If due within 3 days, send reminder
        if today <= next_due <= reminder_threshold:
            try:
                create_notification(
                    user=debt.user,
                    notification_type='debt',
                    title=f'Debt Payment Due Soon: {debt.name}',
                    message=f'Your {debt.name} payment of ${debt.minimum_payment} is due on {next_due}.',
                    data={
                        'debt_id': str(debt.debt_id),
                        'debt_name': debt.name,
                        'amount': str(debt.minimum_payment),
                        'due_date': next_due.isoformat(),
                        'days_until_due': debt.days_until_due,
                    }
                )
                debts_needing_reminders.append(str(debt.debt_id))
                logger.info(f"Sent reminder for debt {debt.debt_id}: {debt.name}")
            except Exception as e:
                logger.error(f"Error sending reminder for debt {debt.debt_id}: {e}", exc_info=True)
    
    logger.info(f"Sent {len(debts_needing_reminders)} debt payment reminders")
    return {
        'reminders_sent': len(debts_needing_reminders),
        'debt_ids': debts_needing_reminders
    }


@shared_task(name='apps.debts.tasks.update_debt_interest')
def update_debt_interest():
    """
    Monthly task to track accrued interest on debts.
    This is informational only - doesn't modify balances.
    """
    from .models import DebtAccount
    
    logger.info("Calculating accrued interest on debts...")
    
    debts = DebtAccount.objects.filter(
        is_active=True,
        status='active'
    )
    
    interest_summary = []
    
    for debt in debts:
        monthly_interest = debt.monthly_interest
        
        interest_summary.append({
            'debt_id': str(debt.debt_id),
            'debt_name': debt.name,
            'balance': str(debt.current_balance),
            'interest_rate': str(debt.interest_rate),
            'monthly_interest': str(monthly_interest),
        })
    
    logger.info(f"Calculated interest for {len(interest_summary)} debts")
    
    return {
        'debts_processed': len(interest_summary),
        'interest_summary': interest_summary
    }
