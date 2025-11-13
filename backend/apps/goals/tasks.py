"""
Celery tasks for goals app.
"""
from celery import shared_task
from django.contrib.auth import get_user_model
from .models import Goal, Contribution
from .services import (
    sync_goal_contributions,
    process_transaction_for_goals,
    sync_all_goals_for_user,
    process_contribution_rules,
    sync_destination_account_balance,
)
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


@shared_task
def sync_goal_contributions_task(goal_id: str):
    """
    Celery task to sync contributions for a goal.
    
    Args:
        goal_id: UUID string of the goal to sync
        
    Returns:
        dict: Task result
    """
    try:
        goal = Goal.objects.get(goal_id=goal_id)
        old_amount = goal.current_amount
        
        # Sync contributions
        new_amount = sync_goal_contributions(goal)
        goal.refresh_from_db()
        
        # Check if goal reached target after sync
        if goal.current_amount >= goal.target_amount and not goal.is_completed:
            goal.complete()
        
        return {
            'status': 'success',
            'goal_id': str(goal_id),
            'old_amount': float(old_amount),
            'new_amount': float(new_amount),
            'goal_completed': goal.is_completed,
        }
    except Goal.DoesNotExist:
        return {
            'status': 'error',
            'message': f'Goal {goal_id} not found',
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e),
        }


@shared_task
def process_transaction_for_goals_task(transaction_id: str):
    """
    Celery task to process a transaction for goal contributions.
    
    Args:
        transaction_id: UUID string of the transaction to process
        
    Returns:
        dict: Task result
    """
    try:
        from apps.transactions.models import Transaction
        transaction = Transaction.objects.get(transaction_id=transaction_id)
        
        # Process transaction for goals
        contributions = process_transaction_for_goals(transaction)
        
        return {
            'status': 'success',
            'transaction_id': str(transaction_id),
            'contributions_created': len(contributions),
            'contribution_ids': [str(c.contribution_id) for c in contributions],
        }
    except Transaction.DoesNotExist:
        return {
            'status': 'error',
            'message': f'Transaction {transaction_id} not found',
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e),
        }


@shared_task
def sync_all_goals_contributions_task(user_id: int):
    """
    Celery task to sync all goals for a user.
    
    Args:
        user_id: ID of the user to sync goals for
        
    Returns:
        dict: Task result
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Sync all goals for user
        results = sync_all_goals_for_user(user)
        
        return {
            'status': 'success',
            'user_id': user_id,
            'goals_synced': results['goals_synced'],
            'contributions_updated': results['contributions_updated'],
            'goals_completed': results['goals_completed'],
        }
    except User.DoesNotExist:
        return {
            'status': 'error',
            'message': f'User {user_id} not found',
        }
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e),
        }


@shared_task
def process_contribution_rules_task():
    """
    Periodic Celery task to process contribution rules for all active goals.
    Runs daily to check and execute contribution rules.
    
    Returns:
        dict: Summary of processing results
    """
    try:
        # Get all active goals with contribution rules enabled
        # Note: JSONField queries use different syntax - we'll filter in Python for now
        all_goals = Goal.objects.filter(
            is_active=True,
            transfer_authorized=True
        )
        goals = [g for g in all_goals if g.contribution_rules and g.contribution_rules.get('enabled')]
        
        results = {
            'goals_processed': 0,
            'total_contributions_created': 0,
            'total_amount': 0.0,
            'errors': [],
        }
        
        for goal in goals:
            try:
                result = process_contribution_rules(goal)
                results['goals_processed'] += 1
                results['total_contributions_created'] += result.get('contributions_created', 0)
                results['total_amount'] += result.get('total_amount', 0.0)
            except Exception as e:
                error_msg = f"Error processing rules for goal {goal.goal_id}: {str(e)}"
                logger.error(error_msg)
                results['errors'].append(error_msg)
        
        return results
    except Exception as e:
        logger.error(f"Error in process_contribution_rules_task: {e}")
        return {
            'status': 'error',
            'message': str(e),
        }


@shared_task
def sync_destination_balances_task():
    """
    Periodic Celery task to sync destination account balances for all active goals.
    Runs daily to update goal current_amount from destination account balances.
    
    Returns:
        dict: Summary of sync results
    """
    try:
        # Get all active goals with destination accounts
        goals = Goal.objects.filter(
            is_active=True,
            destination_account__isnull=False
        )
        
        results = {
            'goals_synced': 0,
            'balances_updated': 0,
            'errors': [],
        }
        
        for goal in goals:
            try:
                old_amount = goal.current_amount
                sync_destination_account_balance(goal)
                goal.refresh_from_db()
                
                if goal.current_amount != old_amount:
                    results['balances_updated'] += 1
                
                results['goals_synced'] += 1
            except Exception as e:
                error_msg = f"Error syncing balance for goal {goal.goal_id}: {str(e)}"
                logger.error(error_msg)
                results['errors'].append(error_msg)
        
        return results
    except Exception as e:
        logger.error(f"Error in sync_destination_balances_task: {e}")
        return {
            'status': 'error',
            'message': str(e),
        }


@shared_task
def send_cash_goal_reminders_task():
    """
    Periodic Celery task to send reminders for cash goals.
    Checks reminder settings and sends notifications based on schedule.
    
    Returns:
        dict: Summary of reminders sent
    """
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        from datetime import datetime
        
        # Get all active cash goals with reminders enabled
        # Note: JSONField queries use different syntax - we'll filter in Python for now
        all_cash_goals = Goal.objects.filter(
            is_active=True,
            destination_account__isnull=True  # Cash goals
        )
        goals = [g for g in all_cash_goals if g.reminder_settings and g.reminder_settings.get('enabled')]
        
        today = timezone.now().date()
        current_day = today.weekday()  # 0 = Monday, 6 = Sunday
        current_time = timezone.now().time()
        
        results = {
            'reminders_sent': 0,
            'errors': [],
        }
        
        for goal in goals:
            try:
                reminder_settings = goal.reminder_settings or {}
                if not reminder_settings.get('enabled'):
                    continue
                
                frequency = reminder_settings.get('frequency', 'weekly')
                day_of_week = reminder_settings.get('day_of_week')
                reminder_time = reminder_settings.get('time', '09:00')
                
                # Parse reminder time
                try:
                    time_obj = datetime.strptime(reminder_time, '%H:%M').time()
                except:
                    time_obj = None
                
                # Check if reminder should be sent today
                should_send = False
                
                if frequency == 'daily':
                    should_send = True
                elif frequency == 'weekly' and day_of_week is not None:
                    should_send = (current_day == day_of_week)
                elif frequency == 'biweekly' and day_of_week is not None:
                    # Send every other week (simplified: check if day matches)
                    should_send = (current_day == day_of_week)
                elif frequency == 'monthly':
                    # Send on 1st of month
                    should_send = (today.day == 1)
                
                # Check time if specified
                if should_send and time_obj:
                    # Only send if current time is close to reminder time (within 1 hour)
                    time_diff = abs((datetime.combine(today, current_time) - datetime.combine(today, time_obj)).total_seconds())
                    should_send = time_diff < 3600  # 1 hour window
                
                if should_send:
                    # Send email reminder
                    channels = reminder_settings.get('channels', ['email'])
                    if 'email' in channels:
                        try:
                            subject = f'Reminder: Contribute to {goal.name}'
                            message = f"""
                            Hi,
                            
                            This is a reminder to set aside cash for your savings goal: {goal.name}
                            
                            Current progress: ${goal.current_amount:,.2f} / ${goal.target_amount:,.2f}
                            Progress: {goal.progress_percentage() if hasattr(goal, 'progress_percentage') else 0:.1f}%
                            
                            Keep up the great work!
                            
                            - Cashly
                            """
                            
                            send_mail(
                                subject,
                                message,
                                settings.DEFAULT_FROM_EMAIL,
                                [goal.user.email],
                                fail_silently=False,
                            )
                            results['reminders_sent'] += 1
                        except Exception as e:
                            error_msg = f"Error sending email reminder for goal {goal.goal_id}: {str(e)}"
                            logger.error(error_msg)
                            results['errors'].append(error_msg)
                    
                    # TODO: Send push notifications if mobile app integration exists
                
            except Exception as e:
                error_msg = f"Error processing reminder for goal {goal.goal_id}: {str(e)}"
                logger.error(error_msg)
                results['errors'].append(error_msg)
        
        return results
    except Exception as e:
        logger.error(f"Error in send_cash_goal_reminders_task: {e}")
        return {
            'status': 'error',
            'message': str(e),
        }

