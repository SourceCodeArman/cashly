"""
Service functions for goal contributions.
"""
from django.utils import timezone
from django.db.models import Sum
from datetime import timedelta
from decimal import Decimal
from typing import Optional, Tuple
import logging

from .models import Goal, Contribution
from .savings_models import SavingsRule, SavingsContribution
from apps.transactions.models import Transaction
from apps.accounts.models import Account
from apps.accounts.plaid_service import PlaidService
from apps.accounts.plaid_utils import PlaidIntegrationError

logger = logging.getLogger(__name__)


def calculate_automatic_contributions(goal: Goal, date_range: Optional[Tuple] = None) -> Decimal:
    """
    Calculate automatic contributions for a goal from transactions.
    
    Args:
        goal: Goal instance with inferred_category set
        date_range: Optional tuple of (start_date, end_date) for date filtering
        
    Returns:
        Decimal: Total amount of automatic contributions
    """
    if not goal.inferred_category:
        return Decimal('0.00')
    
    # Get transactions for the goal's category
    transactions = Transaction.objects.filter(
        user=goal.user,
        category=goal.inferred_category
    )
    
    # Filter by date range if provided
    if date_range:
        start_date, end_date = date_range
        transactions = transactions.filter(date__gte=start_date, date__lte=end_date)
    
    # Only count positive amounts (income) as contributions
    # Negative amounts (expenses) don't contribute to goals
    transactions = transactions.filter(amount__gt=0)
    
    # Calculate total contribution amount
    total = transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    return total


def sync_goal_contributions(goal: Goal) -> Decimal:
    """
    Sync goal current_amount from contributions.
    
    Args:
        goal: Goal instance to sync
        
    Returns:
        Decimal: Updated current_amount
    """
    return goal.sync_contributions()


def sync_destination_account_balance(goal: Goal) -> Decimal:
    """
    Sync destination account balance from Plaid and update goal current_amount.
    
    Args:
        goal: Goal instance with destination_account set
        
    Returns:
        Decimal: Updated balance from destination account
        
    Raises:
        PlaidIntegrationError: If Plaid API call fails
        ValueError: If goal has no destination account
    """
    if not goal.destination_account:
        raise ValueError('Goal must have a destination account to sync balance')
    
    try:
        plaid_service = PlaidService(goal.destination_account)
        balances_response = plaid_service.fetch_balances()
        
        # Find the account balance in the response
        accounts = balances_response.get('accounts', [])
        plaid_account_id = goal.destination_account.plaid_account_id
        
        for account_data in accounts:
            if account_data.get('account_id') == plaid_account_id:
                # Get available balance (preferred) or current balance
                balance = account_data.get('balances', {}).get('available')
                if balance is None:
                    balance = account_data.get('balances', {}).get('current', Decimal('0.00'))
                
                # Convert to Decimal
                balance = Decimal(str(balance))
                
                # Update goal current_amount
                goal.current_amount = balance
                goal.initial_balance_synced = True
                
                # Log before completion check
                logger.info(
                    f"Syncing balance for goal {goal.goal_id}: balance={balance}, "
                    f"current_amount={goal.current_amount}, target_amount={goal.target_amount}, "
                    f"is_completed={goal.is_completed}"
                )
                
                # Check if goal should be auto-completed (only if not already completed)
                # Only complete if target_amount is valid (> 0) and current_amount >= target_amount
                if (goal.target_amount > 0 and 
                    goal.current_amount >= goal.target_amount and 
                    not goal.is_completed):
                    logger.info(
                        f"Auto-completing goal {goal.goal_id}: {goal.current_amount} >= {goal.target_amount}"
                    )
                    goal.complete()
                else:
                    # Defensive check: If goal is marked completed but shouldn't be, uncomplete it
                    if goal.is_completed and (goal.target_amount <= 0 or goal.current_amount < goal.target_amount):
                        logger.warning(
                            f"Goal {goal.goal_id} was incorrectly marked as completed. "
                            f"Uncompleting: current_amount={goal.current_amount}, target_amount={goal.target_amount}"
                        )
                        goal.is_completed = False
                        goal.completed_at = None
                        goal.save(update_fields=['current_amount', 'initial_balance_synced', 'is_completed', 'completed_at'])
                    else:
                        goal.save(update_fields=['current_amount', 'initial_balance_synced'])
                
                logger.info(f"Synced balance {balance} for goal {goal.goal_id} from account {plaid_account_id}")
                return balance
        
        # Account not found in Plaid response
        raise PlaidIntegrationError(f'Account {plaid_account_id} not found in Plaid response')
        
    except PlaidIntegrationError:
        raise
    except Exception as e:
        logger.error(f"Error syncing balance for goal {goal.goal_id}: {e}")
        raise PlaidIntegrationError(f'Failed to sync account balance: {str(e)}') from e


def process_contribution_rules(goal: Goal, date_range: Optional[Tuple] = None) -> dict:
    """
    Process contribution rules for a goal and create contributions.
    
    Args:
        goal: Goal instance with contribution_rules configured
        date_range: Optional tuple of (start_date, end_date) for date filtering
        
    Returns:
        dict: Summary of contributions created
    """
    if not goal.is_active or not goal.transfer_authorized:
        return {
            'contributions_created': 0,
            'total_amount': Decimal('0.00'),
            'message': 'Goal is not active or transfers not authorized'
        }
    
    if not goal.contribution_rules or not goal.contribution_rules.get('enabled'):
        return {
            'contributions_created': 0,
            'total_amount': Decimal('0.00'),
            'message': 'Contribution rules not enabled'
        }
    
    rules_config = goal.contribution_rules
    source_accounts = rules_config.get('source_accounts', [])
    general_rule = rules_config.get('general_rule')
    
    if not source_accounts and not general_rule:
        return {
            'contributions_created': 0,
            'total_amount': Decimal('0.00'),
            'message': 'No contribution rules configured'
        }
    
    contributions_created = 0
    total_amount = Decimal('0.00')
    today = timezone.now().date()
    
    # Process each source account
    for source_account_config in source_accounts:
        account_id = source_account_config.get('account_id')
        rule = source_account_config.get('rule') or general_rule
        
        if not account_id or not rule:
            continue
        
        try:
            source_account = Account.objects.get(account_id=account_id, user=goal.user)
            
            # Calculate contribution amount based on rule type
            contribution_amount = _calculate_contribution_amount(goal, source_account, rule, date_range)
            
            if contribution_amount > 0:
                # Execute transfer if destination is account (not cash)
                if goal.destination_account:
                    # Use transfer service to execute transfer
                    # This performs all security checks including transfer_authorized verification
                    try:
                        from apps.accounts.transfer_service import execute_transfer
                        
                        transfer_result = execute_transfer(
                            goal_id=str(goal.goal_id),
                            source_account_id=account_id,
                            destination_account_id=str(goal.destination_account.account_id),
                            amount=contribution_amount,
                            user=goal.user,
                            description=f"Goal: {goal.name[:4]}"  # Max 10 chars total (4 chars from name + "Goal: " = 6 chars prefix)
                        )
                        
                        logger.info(
                            f"Transfer executed successfully: {transfer_result.get('transfer_id')} "
                            f"for goal {goal.goal_id}"
                        )
                        
                    except Exception as e:
                        # Log error but continue to create contribution record
                        # The contribution record tracks the intent even if transfer fails
                        logger.error(
                            f"Failed to execute transfer for goal {goal.goal_id}: {e}",
                            exc_info=True
                        )
                        # Continue to create contribution record (tracks intent)
                        pass
                
                # Create contribution record
                contribution = Contribution.objects.create(
                    goal=goal,
                    user=goal.user,
                    amount=contribution_amount,
                    date=today,
                    source='automatic',
                    note=f'Automatic contribution from {source_account.institution_name} via rule: {rule.get("type", "unknown")}'
                )
                contributions_created += 1
                total_amount += contribution_amount
                
        except Account.DoesNotExist:
            logger.warning(f"Source account {account_id} not found for goal {goal.goal_id}")
            continue
        except Exception as e:
            logger.error(f"Error processing contribution rule for account {account_id}: {e}")
            continue
    
    return {
        'contributions_created': contributions_created,
        'total_amount': float(total_amount),
        'message': f'Created {contributions_created} contribution(s) totaling ${total_amount:,.2f}'
    }


def _calculate_contribution_amount(goal: Goal, source_account: Account, rule: dict, date_range: Optional[Tuple] = None) -> Decimal:
    """
    Calculate contribution amount based on rule type.
    
    Args:
        goal: Goal instance
        source_account: Source account for the contribution
        rule: Rule configuration dict
        date_range: Optional date range for filtering
        
    Returns:
        Decimal: Contribution amount
    """
    rule_type = rule.get('type')
    
    if rule_type in ['fixed_monthly', 'fixed_weekly', 'fixed_daily']:
        return Decimal(str(rule.get('amount', 0)))
    
    elif rule_type == 'percentage_income':
        # Calculate percentage of income transactions
        percentage = Decimal(str(rule.get('percentage', 0))) / 100
        transactions = Transaction.objects.filter(
            user=goal.user,
            account=source_account,
            amount__gt=0  # Only income
        )
        
        if date_range:
            start_date, end_date = date_range
            transactions = transactions.filter(date__gte=start_date, date__lte=end_date)
        
        income_total = transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        amount = income_total * percentage
        
        # Apply min/max if specified
        min_amount = rule.get('min_amount')
        max_amount = rule.get('max_amount')
        if min_amount:
            amount = max(amount, Decimal(str(min_amount)))
        if max_amount:
            amount = min(amount, Decimal(str(max_amount)))
        
        return amount
    
    elif rule_type == 'conditional_balance':
        # Check if account balance exceeds threshold
        threshold = Decimal(str(rule.get('threshold', 0)))
        operator = rule.get('operator', 'gt')
        
        try:
            plaid_service = PlaidService(source_account)
            balances_response = plaid_service.fetch_balances()
            accounts = balances_response.get('accounts', [])
            plaid_account_id = source_account.plaid_account_id
            
            for account_data in accounts:
                if account_data.get('account_id') == plaid_account_id:
                    balance = Decimal(str(account_data.get('balances', {}).get('available', 0)))
                    
                    if (operator == 'gt' and balance > threshold) or (operator == 'gte' and balance >= threshold):
                        return Decimal(str(rule.get('amount', 0)))
                    break
        except Exception as e:
            logger.error(f"Error checking balance for conditional rule: {e}")
        
        return Decimal('0.00')
    
    elif rule_type == 'conditional_transaction':
        # Check if any transaction exceeds threshold
        threshold = Decimal(str(rule.get('threshold', 0)))
        operator = rule.get('operator', 'gt')
        
        transactions = Transaction.objects.filter(
            user=goal.user,
            account=source_account,
            amount__gt=0
        )
        
        if date_range:
            start_date, end_date = date_range
            transactions = transactions.filter(date__gte=start_date, date__lte=end_date)
        
        for transaction in transactions:
            if (operator == 'gt' and transaction.amount > threshold) or (operator == 'gte' and transaction.amount >= threshold):
                if 'percentage' in rule:
                    return transaction.amount * (Decimal(str(rule['percentage'])) / 100)
                elif 'amount' in rule:
                    return Decimal(str(rule['amount']))
        
        return Decimal('0.00')
    
    elif rule_type == 'payday':
        # Check if today matches any payday date
        today = timezone.now().date()
        payday_dates = rule.get('dates', [])
        
        if today.day in payday_dates:
            return Decimal(str(rule.get('amount', 0)))
        
        return Decimal('0.00')
    
    return Decimal('0.00')


def process_transaction_for_goals(transaction: Transaction) -> list:
    """
    Process a transaction to check if it should contribute to any goals.
    
    Args:
        transaction: Transaction instance to process
        
    Returns:
        list: List of Contribution instances created
    """
    if not transaction.category:
        return []
    
    # Only process positive transactions (income) as contributions
    if transaction.amount <= 0:
        return []
    
    # Find goals with matching inferred_category
    goals = Goal.objects.filter(
        user=transaction.user,
        inferred_category=transaction.category,
        is_active=True,
        is_completed=False
    )
    
    contributions = []
    for goal in goals:
        # Check if contribution already exists for this transaction
        existing_contribution = Contribution.objects.filter(
            goal=goal,
            transaction=transaction,
            source='automatic'
        ).first()
        
        if existing_contribution:
            # Update existing contribution if amount changed
            if existing_contribution.amount != transaction.amount:
                existing_contribution.amount = transaction.amount
                existing_contribution.date = transaction.date
                existing_contribution.save(update_fields=['amount', 'date'])
            continue
        
        # Create new automatic contribution
        # Note: Contribution.save() will automatically call goal.sync_contributions(),
        # which will check and complete the goal if target is reached
        contribution = Contribution.objects.create(
            goal=goal,
            user=transaction.user,
            amount=transaction.amount,
            date=transaction.date,
            source='automatic',
            transaction=transaction,
            note=f'Automatic contribution from transaction: {transaction.merchant_name}'
        )
        contributions.append(contribution)
    
    return contributions


def sync_all_goals_for_user(user) -> dict:
    """
    Sync all goals for a user by recalculating contributions.
    
    Args:
        user: User instance
        
    Returns:
        dict: Summary of sync results
    """
    goals = Goal.objects.filter(user=user, is_active=True)
    
    results = {
        'goals_synced': 0,
        'contributions_updated': 0,
        'goals_completed': 0,
    }
    
    for goal in goals:
        # Sync contributions for this goal
        old_amount = goal.current_amount
        goal.sync_contributions()
        goal.refresh_from_db()
        
        if goal.current_amount != old_amount:
            results['contributions_updated'] += 1
        
        # Check if goal should be completed
        if goal.current_amount >= goal.target_amount and not goal.is_completed:
            goal.complete()
            results['goals_completed'] += 1
        
        results['goals_synced'] += 1
    
    return results


def get_goal_contribution_history(goal: Goal, date_range: Optional[Tuple] = None) -> dict:
    """
    Get contribution history for a goal.
    
    Args:
        goal: Goal instance
        date_range: Optional tuple of (start_date, end_date) for date filtering
        
    Returns:
        dict: Contribution history data
    """
    contributions = Contribution.objects.filter(goal=goal)
    
    if date_range:
        start_date, end_date = date_range
        contributions = contributions.filter(date__gte=start_date, date__lte=end_date)
    
    contributions = contributions.order_by('-date', '-created_at')
    
    manual_total = goal.get_manual_contributions_total()
    automatic_total = goal.get_automatic_contributions_total(date_range)
    
    return {
        'contributions': list(contributions.values(
            'contribution_id', 'amount', 'date', 'note', 'source',
            'transaction_id', 'created_at'
        )),
        'manual_total': float(manual_total),
        'automatic_total': float(automatic_total),
        'total': float(goal.current_amount),
        'count': contributions.count(),
    }


def process_savings_rules_for_transaction(transaction: Transaction) -> list:
    """
    Process a transaction against all active savings rules and create contributions.
    
    Args:
        transaction: Transaction instance to process
        
    Returns:
        list: List of SavingsContribution instances created
    """
    if not transaction.user:
        return []
    
    # Get all active savings rules for the user
    rules = SavingsRule.objects.filter(
        user=transaction.user,
        is_active=True
    ).select_related('goal', 'category')
    
    contributions = []
    
    for rule in rules:
        # Check if transaction matches rule trigger conditions
        if not _transaction_matches_rule(transaction, rule):
            continue
        
        # Check if contribution already exists for this transaction and rule
        existing_contribution = SavingsContribution.objects.filter(
            rule=rule,
            transaction=transaction
        ).first()
        
        if existing_contribution:
            # Skip if already processed
            continue
        
        # Calculate contribution amount
        contribution_amount = rule.calculate_contribution(transaction)
        
        if contribution_amount <= 0:
            continue
        
        # Ensure goal is active
        if not rule.goal.is_active or rule.goal.is_completed:
            logger.warning(
                f"Skipping savings rule {rule.rule_id} - goal {rule.goal.goal_id} is not active or completed"
            )
            continue
        
        try:
            # Execute actual transfer if goal has destination account and transfers are authorized
            transfer_executed = False
            if rule.goal.destination_account and rule.goal.transfer_authorized and rule.goal.can_execute_transfers():
                try:
                    from apps.accounts.transfer_service import execute_transfer
                    
                    # For round-up savings: transfer from the transaction's account
                    # For percentage-based on income: transfer from the transaction's account
                    source_account = transaction.account
                    
                    # Verify source account is valid and active
                    if source_account and source_account.is_active:
                        transfer_result = execute_transfer(
                            goal_id=str(rule.goal.goal_id),
                            source_account_id=str(source_account.account_id),
                            destination_account_id=str(rule.goal.destination_account.account_id),
                            amount=contribution_amount,
                            user=transaction.user,
                            description=f"Auto: {rule.get_rule_type_display()[:6]}"  # Max 10 chars
                        )
                        
                        transfer_executed = True
                        logger.info(
                            f"Transfer executed successfully: {transfer_result.get('transfer_id')} "
                            f"for savings rule {rule.rule_id} from transaction {transaction.transaction_id}"
                        )
                    else:
                        logger.warning(
                            f"Cannot execute transfer for rule {rule.rule_id} - "
                            f"source account {source_account.account_id if source_account else 'None'} is not active"
                        )
                        
                except Exception as e:
                    # Log error but continue to create contribution record
                    # The contribution record tracks the intent even if transfer fails
                    logger.error(
                        f"Failed to execute transfer for savings rule {rule.rule_id} "
                        f"from transaction {transaction.transaction_id}: {e}",
                        exc_info=True
                    )
                    # Continue to create contribution record (tracks intent)
                    # For cash goals or when transfer fails, we still track the contribution
            
            # Create savings contribution record
            savings_contribution = SavingsContribution.objects.create(
                rule=rule,
                transaction=transaction,
                goal=rule.goal,
                amount=contribution_amount
            )
            
            # Create or update goal contribution
            goal_contribution, created = Contribution.objects.get_or_create(
                goal=rule.goal,
                transaction=transaction,
                source='automatic',
                defaults={
                    'user': transaction.user,
                    'amount': contribution_amount,
                    'date': transaction.date,
                    'note': f'Automated savings: {rule.get_rule_type_display()} ({rule.get_trigger_display()})'
                }
            )
            
            if not created:
                # Update existing contribution if amount changed
                if goal_contribution.amount != contribution_amount:
                    goal_contribution.amount = contribution_amount
                    goal_contribution.date = transaction.date
                    goal_contribution.save(update_fields=['amount', 'date'])
            
            contributions.append(savings_contribution)
            
            action = "Transferred and tracked" if transfer_executed else "Tracked"
            logger.info(
                f"{action} savings contribution: ${contribution_amount} for rule {rule.rule_id} "
                f"from transaction {transaction.transaction_id}"
            )
            
        except Exception as e:
            logger.error(
                f"Error creating savings contribution for rule {rule.rule_id} "
                f"and transaction {transaction.transaction_id}: {e}",
                exc_info=True
            )
            continue
    
    return contributions


def _transaction_matches_rule(transaction: Transaction, rule: SavingsRule) -> bool:
    """
    Check if a transaction matches a savings rule's trigger conditions.
    
    Args:
        transaction: Transaction instance
        rule: SavingsRule instance
        
    Returns:
        bool: True if transaction matches rule conditions
    """
    trigger = rule.trigger
    
    if trigger == 'all_expenses':
        # Match all expense transactions (negative amounts)
        return transaction.amount < 0
    
    elif trigger == 'income':
        # Match only income transactions (positive amounts)
        return transaction.amount > 0
    
    elif trigger == 'category':
        # Match transactions in specific category
        if not rule.category:
            return False
        return transaction.category == rule.category
    
    return False


def process_pending_savings_for_user(user, lookback_days: int = 30) -> dict:
    """
    Process savings rules for all recent transactions for a user.
    Useful for backfilling or reprocessing.
    
    Args:
        user: User instance
        lookback_days: Number of days to look back for transactions
        
    Returns:
        dict: Summary of processing results
    """
    from django.utils import timezone
    from datetime import timedelta
    
    start_date = timezone.now().date() - timedelta(days=lookback_days)
    
    # Get all transactions that haven't been processed for savings
    transactions = Transaction.objects.filter(
        user=user,
        date__gte=start_date
    ).exclude(
        savings_contributions__isnull=False
    )
    
    total_contributions = 0
    total_amount = Decimal('0.00')
    
    for transaction in transactions:
        contributions = process_savings_rules_for_transaction(transaction)
        total_contributions += len(contributions)
        total_amount += sum(c.amount for c in contributions)
    
    return {
        'transactions_processed': transactions.count(),
        'contributions_created': total_contributions,
        'total_amount': float(total_amount)
    }

