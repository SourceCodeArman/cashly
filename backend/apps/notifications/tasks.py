"""
Background tasks for notifications app.
"""
from django.contrib.auth import get_user_model
from .models import Notification

User = get_user_model()


def create_notification(user, notification_type, title, message, data=None):
    """
    Create a notification for a user.
    
    Args:
        user: User instance
        notification_type: One of 'transaction', 'goal', 'budget', 'account', 'system'
        title: Notification title
        message: Notification message
        data: Optional dictionary with additional metadata
    
    Returns:
        Notification instance
    """
    return Notification.objects.create(
        user=user,
        type=notification_type,
        title=title,
        message=message,
        data=data or {}
    )


def create_goal_milestone_notification(user, goal_name, milestone_percentage):
    """
    Create a goal milestone notification.
    
    Args:
        user: User instance
        goal_name: Name of the goal
        milestone_percentage: Percentage milestone reached (e.g., 25, 50, 75, 100)
    
    Returns:
        Notification instance
    """
    title = f"Goal Milestone: {goal_name}"
    message = f"Congratulations! You've reached {milestone_percentage}% of your {goal_name} goal!"
    
    return create_notification(
        user=user,
        notification_type='goal',
        title=title,
        message=message,
        data={'milestone_percentage': milestone_percentage}
    )


def create_budget_exceeded_notification(user, budget_name, spent_amount, budget_amount):
    """
    Create a budget exceeded notification.
    
    Args:
        user: User instance
        budget_name: Name of the budget category
        spent_amount: Amount spent
        budget_amount: Budget limit
    
    Returns:
        Notification instance
    """
    title = f"Budget Exceeded: {budget_name}"
    message = f"You've exceeded your {budget_name} budget. Spent: ${spent_amount:.2f} of ${budget_amount:.2f}"
    
    return create_notification(
        user=user,
        notification_type='budget',
        title=title,
        message=message,
        data={
            'budget_name': budget_name,
            'spent_amount': float(spent_amount),
            'budget_amount': float(budget_amount)
        }
    )


def create_bill_reminder_notification(user, bill):
    """
    Create a bill reminder notification.
    
    Args:
        user: User instance
        bill: Bill instance
    
    Returns:
        Notification instance
    """
    title = f"Bill Reminder: {bill.name}"
    message = f"Your {bill.name} bill of ${bill.amount} is due on {bill.next_due_date.strftime('%B %d, %Y')}"
    
    return create_notification(
        user=user,
        notification_type='bill',
        title=title,
        message=message,
        data={
            'bill_id': str(bill.bill_id),
            'bill_name': bill.name,
            'amount': float(bill.amount),
            'due_date': bill.next_due_date.isoformat(),
            'days_until_due': bill.days_until_due
        }
    )


def create_bill_overdue_notification(user, bill):
    """
    Create a bill overdue notification.
    
    Args:
        user: User instance
        bill: Bill instance
    
    Returns:
        Notification instance
    """
    title = f"Bill Overdue: {bill.name}"
    days_overdue = abs(bill.days_until_due)
    message = f"Your {bill.name} bill of ${bill.amount} was due on {bill.next_due_date.strftime('%B %d, %Y')} ({days_overdue} day{'s' if days_overdue != 1 else ''} ago)"
    
    return create_notification(
        user=user,
        notification_type='bill',
        title=title,
        message=message,
        data={
            'bill_id': str(bill.bill_id),
            'bill_name': bill.name,
            'amount': float(bill.amount),
            'due_date': bill.next_due_date.isoformat(),
            'days_overdue': days_overdue
        }
    )


def create_transaction_notification(user, transaction_type, amount, merchant_name):
    """
    Create a transaction notification.
    
    Args:
        user: User instance
        transaction_type: Type of transaction ('large', 'unusual', etc.)
        amount: Transaction amount
        merchant_name: Merchant name
    
    Returns:
        Notification instance
    """
    if transaction_type == 'large':
        title = f"Large Transaction: {merchant_name}"
        message = f"A large transaction of ${amount:.2f} was processed at {merchant_name}"
    elif transaction_type == 'unusual':
        title = f"Unusual Transaction: {merchant_name}"
        message = f"An unusual transaction of ${amount:.2f} was detected at {merchant_name}"
    else:
        title = f"Transaction: {merchant_name}"
        message = f"A transaction of ${amount:.2f} was processed at {merchant_name}"
    
    return create_notification(
        user=user,
        notification_type='transaction',
        title=title,
        message=message,
        data={
            'transaction_type': transaction_type,
            'amount': float(amount),
            'merchant_name': merchant_name
        }
    )


def create_account_sync_notification(user, account_name, status, error_message=None):
    """
    Create an account sync notification.
    
    Args:
        user: User instance
        account_name: Name of the account
        status: Sync status ('success', 'failed', 'pending')
        error_message: Optional error message if sync failed
    
    Returns:
        Notification instance
    """
    if status == 'success':
        title = f"Account Synced: {account_name}"
        message = f"Your {account_name} account has been successfully synced"
    elif status == 'failed':
        title = f"Account Sync Failed: {account_name}"
        message = f"Failed to sync {account_name} account"
        if error_message:
            message += f": {error_message}"
    else:
        title = f"Account Sync: {account_name}"
        message = f"Your {account_name} account sync is in progress"
    
    return create_notification(
        user=user,
        notification_type='account',
        title=title,
        message=message,
        data={
            'account_name': account_name,
            'status': status,
            'error_message': error_message
        }
    )


def create_account_selection_required_notification(user, subscription, excess_count):
    """
    Create notification prompting user to select accounts when subscription is cancelled.
    
    Args:
        user: User instance
        subscription: Subscription instance being cancelled
        excess_count: Number of accounts exceeding free tier limit
    
    Returns:
        Notification instance
    """
    title = "Select Accounts to Keep"
    message = (
        f"Your subscription will end on {subscription.current_period_end.strftime('%B %d, %Y')}. "
        f"You currently have {excess_count} account(s) exceeding the free tier limit of 3. "
        "Please select which accounts you'd like to keep active."
    )
    
    return create_notification(
        user=user,
        notification_type='system',
        title=title,
        message=message,
        data={
            'subscription_id': str(subscription.subscription_id),
            'excess_count': excess_count,
            'current_period_end': subscription.current_period_end.isoformat(),
            'action_required': 'select_accounts',
        }
    )


def create_account_deactivation_reminder_notification(user, accounts_to_deactivate, deactivation_date):
    """
    Create notification reminding user about upcoming account deactivation.
    
    Args:
        user: User instance
        accounts_to_deactivate: List of account names or count
        deactivation_date: Date when accounts will be deactivated
    
    Returns:
        Notification instance
    """
    if isinstance(accounts_to_deactivate, list):
        account_count = len(accounts_to_deactivate)
        account_names = ', '.join(accounts_to_deactivate[:3])
        if account_count > 3:
            account_names += f" and {account_count - 3} more"
    else:
        account_count = accounts_to_deactivate
        account_names = f"{account_count} account(s)"
    
    title = "Account Deactivation Reminder"
    message = (
        f"{account_count} account(s) ({account_names}) will be deactivated on "
        f"{deactivation_date.strftime('%B %d, %Y')} when your subscription ends. "
        "You can still select which accounts to keep active."
    )
    
    return create_notification(
        user=user,
        notification_type='account',
        title=title,
        message=message,
        data={
            'account_count': account_count,
            'deactivation_date': deactivation_date.isoformat(),
            'action_required': 'select_accounts',
        }
    )


def create_account_deactivation_complete_notification(user, deactivated_accounts):
    """
    Create notification confirming account deactivation after subscription ends.
    
    Args:
        user: User instance
        deactivated_accounts: List of account names that were deactivated
    
    Returns:
        Notification instance
    """
    if isinstance(deactivated_accounts, list):
        account_count = len(deactivated_accounts)
        account_names = ', '.join(deactivated_accounts[:3])
        if account_count > 3:
            account_names += f" and {account_count - 3} more"
    else:
        account_count = deactivated_accounts
        account_names = f"{account_count} account(s)"
    
    title = "Accounts Deactivated"
    message = (
        f"{account_count} account(s) ({account_names}) have been deactivated "
        "as part of your subscription downgrade to the free tier. "
        "You can reactivate them anytime by upgrading your subscription."
    )
    
    return create_notification(
        user=user,
        notification_type='account',
        title=title,
        message=message,
        data={
            'account_count': account_count,
            'deactivated_accounts': deactivated_accounts if isinstance(deactivated_accounts, list) else [],
        }
    )


from celery import shared_task
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import timedelta
from apps.budgets.models import Budget
from apps.goals.models import Goal
from apps.transactions.models import Transaction
from .email_service import EmailService

@shared_task
def check_budget_alerts():
    """
    Check all active budgets and send alerts if threshold exceeded.
    """
    today = timezone.now().date()
    
    # Get active budgets for current period
    active_budgets = Budget.objects.filter(
        alerts_enabled=True,
        period_start__lte=today,
        period_end__gte=today
    ).select_related('user', 'category')
    
    for budget in active_budgets:
        # Calculate spent amount
        transactions = Transaction.objects.filter(
            user=budget.user,
            category=budget.category,
            date__gte=budget.period_start,
            date__lte=budget.period_end,
            amount__lt=0  # Only expenses
        )
        
        spent = abs(transactions.aggregate(total=Sum('amount'))['total'] or 0)
        
        # Check if threshold exceeded
        threshold_amount = budget.amount * (budget.alert_threshold / 100)
        
        if spent >= threshold_amount:
            # Check if we already sent a notification for this budget in this period
            # We check for a notification created within the last 24 hours to avoid spamming
            # OR we could check if one exists for this specific threshold crossing
            # For simplicity, let's avoid sending if one was sent in the last 3 days for this budget
            
            recent_notification = Notification.objects.filter(
                user=budget.user,
                type='budget',
                created_at__gte=timezone.now() - timedelta(days=3),
                data__budget_name=budget.category.name
            ).exists()
            
            if not recent_notification:
                # Create notification
                create_budget_exceeded_notification(
                    user=budget.user,
                    budget_name=budget.category.name,
                    spent_amount=spent,
                    budget_amount=budget.amount
                )
                
                # Send email if enabled
                if hasattr(budget.user, 'notification_preferences'):
                    if budget.user.notification_preferences.email_budget:
                        EmailService.send_budget_alert_email(
                            user=budget.user,
                            budget_name=budget.category.name,
                            spent=spent,
                            limit=budget.amount
                        )

@shared_task
def check_goal_milestones():
    """
    Check all active goals and send alerts for milestones (25%, 50%, 75%, 100%).
    """
    active_goals = Goal.objects.filter(
        is_active=True,
        is_completed=False
    ).select_related('user')
    
    for goal in active_goals:
        percentage = goal.progress_percentage()
        
        # Determine reached milestone
        milestone = None
        if percentage >= 100:
            milestone = 100
        elif percentage >= 75:
            milestone = 75
        elif percentage >= 50:
            milestone = 50
        elif percentage >= 25:
            milestone = 25
            
        if milestone:
            # Check if we already notified for this milestone
            # We can check the data field of past notifications
            already_notified = Notification.objects.filter(
                user=goal.user,
                type='goal',
                data__milestone_percentage=milestone,
                title__contains=goal.name
            ).exists()
            
            if not already_notified:
                create_goal_milestone_notification(
                    user=goal.user,
                    goal_name=goal.name,
                    milestone_percentage=milestone
                )
                
                # Send email if enabled
                if hasattr(goal.user, 'notification_preferences'):
                    if goal.user.notification_preferences.email_goal:
                        EmailService.send_goal_milestone_email(
                            user=goal.user,
                            goal_name=goal.name,
                            milestone=milestone
                        )

@shared_task
def send_weekly_summary():
    """
    Send weekly financial summary to all users.
    """
    # In a real app, we would iterate users efficiently (batching)
    # For now, simple iteration
    for user in User.objects.all():
        if hasattr(user, 'notification_preferences') and not user.notification_preferences.email_system:
            continue
            
        # Calculate weekly stats
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        transactions = Transaction.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date
        )
        
        income = transactions.filter(amount__gt=0).aggregate(Sum('amount'))['amount__sum'] or 0
        expenses = abs(transactions.filter(amount__lt=0).aggregate(Sum('amount'))['amount__sum'] or 0)
        
        message = f"Weekly Summary ({start_date} to {end_date}):\nIncome: ${income:.2f}\nExpenses: ${expenses:.2f}"
        
        EmailService.send_notification_email(
            user=user,
            subject="Your Weekly Financial Summary",
            message=message
        )

@shared_task
def send_monthly_summary():
    """
    Send monthly financial summary.
    """
    # Similar to weekly but for last month
    today = timezone.now().date()
    first_day_this_month = today.replace(day=1)
    last_day_prev_month = first_day_this_month - timedelta(days=1)
    first_day_prev_month = last_day_prev_month.replace(day=1)
    
    for user in User.objects.all():
        if hasattr(user, 'notification_preferences') and not user.notification_preferences.email_system:
            continue
            
        transactions = Transaction.objects.filter(
            user=user,
            date__gte=first_day_prev_month,
            date__lte=last_day_prev_month
        )
        
        income = transactions.filter(amount__gt=0).aggregate(Sum('amount'))['amount__sum'] or 0
        expenses = abs(transactions.filter(amount__lt=0).aggregate(Sum('amount'))['amount__sum'] or 0)
        
        message = f"Monthly Summary ({first_day_prev_month.strftime('%B %Y')}):\nIncome: ${income:.2f}\nExpenses: ${expenses:.2f}"
        
        EmailService.send_notification_email(
            user=user,
            subject=f"Your Monthly Financial Summary - {first_day_prev_month.strftime('%B')}",
            message=message
        )


@shared_task
def send_email_change_verification(email, token):
    """
    Send email change verification link to the new email address.
    
    Args:
        email: The new email address
        token: Verification token
    """
    from django.conf import settings
    
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    subject = "Verify Your New Email Address - Cashly"
    message = f"""
Hello,

You've requested to change your email address on Cashly.

To complete this change, please click the link below to verify your new email address:

{verify_url}

This link will expire in 15 minutes.

If you did not initiate this email change, please ignore this message and contact support immediately.

Best regards,
The Cashly Team
""".strip()
    
    try:
        EmailService.send_notification_email(
            user=None,
            subject=subject,
            message=message,
            recipient_email=email
        )
    except Exception as e:
        # Log error but don't fail - this is a background task
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send email change verification to {email}: {e}")


@shared_task
def send_email_change_notification(old_email, new_email):
    """
    Send notification to old email address about email change (security alert).
    
    Args:
        old_email: The old email address
        new_email: The new email address
    """
    subject = "Email Address Changed - Cashly Security Alert"
    message = f"""
Hello,

This is a security notification that your email address for your Cashly account has been changed.

Old email: {old_email}
New email: {new_email}

If you did not make this change, your account may have been compromised. Please contact support immediately at support@cashly.app.

Best regards,
The Cashly Team
""".strip()
    
    try:
        EmailService.send_notification_email(
            user=None,
            subject=subject,
            message=message,
            recipient_email=old_email
        )
    except Exception as e:
        # Log error but don't fail - this is a background task
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send email change notification to {old_email}: {e}")
