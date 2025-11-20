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

