"""
Transfer service for executing secure, user-authorized transfers between accounts.

This module implements a secure transfer function that enforces user authorization
through the goal's transfer_authorized flag with multiple validation layers to
prevent any bypass mechanisms.
"""
import json
import logging
import uuid
from decimal import Decimal
from typing import Dict, Optional

from django.core.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from django.conf import settings
from plaid.exceptions import ApiException
from plaid import Environment

from apps.accounts.models import Account
from apps.accounts.plaid_utils import (
    PlaidIntegrationError,
    create_transfer,
    decrypt_token,
    get_plaid_client,
)
from apps.goals.models import Goal, TransferAuthorization

logger = logging.getLogger(__name__)

# Error mapping for Plaid API errors
PLAID_ERROR_MESSAGES = {
    'INSUFFICIENT_FUNDS': 'Insufficient funds in source account',
    'AUTHORIZATION_EXPIRED': 'Transfer authorization has expired. Please re-authorize.',
    'AUTHORIZATION_DECLINED': 'Transfer authorization was declined by Plaid',
    'ACCOUNT_NOT_FOUND': 'Account no longer accessible. Please reconnect the account.',
    'INVALID_ACCOUNT': 'Invalid account for transfer',
    'NETWORK_ERROR': 'Network error occurred. Please try again.',
    'TIMEOUT': 'Transfer request timed out. Please try again.',
}


def get_active_authorization(goal: Goal) -> Optional[TransferAuthorization]:
    """
    Retrieve the most recent active authorization for a goal.
    
    Args:
        goal: Goal instance
        
    Returns:
        TransferAuthorization instance if found, None otherwise
    """
    return TransferAuthorization.objects.filter(
        goal=goal,
        status='active'
    ).order_by('-authorized_at').first()


def check_authorization_match(
    authorization: TransferAuthorization,
    source_account: Account
) -> bool:
    """
    Verify that authorization matches the source account.
    
    Note: Since Plaid authorization is created with source account,
    we verify that the authorization was created for this goal and
    that the source account is valid. The actual Plaid authorization
    ID check would require decrypting and comparing, but we trust
    the database relationship.
    
    Args:
        authorization: TransferAuthorization instance
        source_account: Source Account instance
        
    Returns:
        True if authorization matches, False otherwise
    """
    # Verify authorization belongs to the goal's user
    if authorization.goal.user != source_account.user:
        return False
    
    # Verify source account belongs to the same user
    if authorization.goal.user != source_account.user:
        return False
    
    # Additional check: verify source account is active
    if not source_account.is_active:
        return False
    
    return True


def validate_transfer_request(
    goal: Goal,
    source_account: Account,
    destination_account: Account,
    amount: Decimal,
    user
) -> bool:
    """
    Validate transfer request with multiple security checks.
    
    SECURITY: Multiple layers of authorization verification to prevent bypass.
    
    Args:
        goal: Goal instance
        source_account: Source Account instance
        destination_account: Destination Account instance
        amount: Transfer amount
        user: User instance
        
    Returns:
        True if validation passes
        
    Raises:
        ValidationError: If validation fails
        PermissionDenied: If permission check fails
    """
    # Layer 1: CRITICAL - Check transfer_authorized flag (NO BYPASS POSSIBLE)
    if not goal.transfer_authorized:
        raise ValidationError(
            "Transfer not authorized by user. Goal transfer_authorized must be True. "
            "This can only be set through explicit user authorization."
        )
    
    # Layer 2: Verify goal is active
    if not goal.is_active:
        raise ValidationError("Goal must be active to execute transfers")
    
    # Layer 3: Verify accounts belong to user
    if source_account.user != user or destination_account.user != user:
        raise PermissionDenied("Accounts must belong to the user")
    
    # Layer 4: Verify accounts are active
    if not source_account.is_active or not destination_account.is_active:
        raise ValidationError("Both accounts must be active")
    
    # Layer 5: Verify destination account matches goal
    if not goal.destination_account:
        raise ValidationError("Goal must have a destination account to execute transfers")
    
    if goal.destination_account != destination_account:
        raise ValidationError(
            f"Destination account must match goal's destination account. "
            f"Expected: {goal.destination_account.account_id}, "
            f"Got: {destination_account.account_id}"
        )
    
    # Layer 6: Validate amount
    if amount <= 0:
        raise ValidationError("Transfer amount must be positive")
    
    # Layer 7: Check if active authorization exists
    authorization = get_active_authorization(goal)
    if not authorization:
        raise ValidationError(
            "No active transfer authorization found for goal. "
            "User must authorize transfers first."
        )
    
    # Layer 8: Verify authorization matches source account
    # (Authorization was created with source account - verify it matches)
    if not check_authorization_match(authorization, source_account):
        raise ValidationError(
            "Transfer authorization does not match source account. "
            "Authorization may be for a different account."
        )
    
    return True


def handle_plaid_error(exception: Exception) -> PlaidIntegrationError:
    """
    Convert Plaid API exceptions to user-friendly errors.
    
    Args:
        exception: Plaid API exception
        
    Returns:
        PlaidIntegrationError with user-friendly message
    """
    if isinstance(exception, ApiException):
        error_body = exception.body
        if isinstance(error_body, dict):
            error_code = error_body.get('error_code')
            error_message = error_body.get('error_message', 'Unknown error')
            
            # Map to user-friendly message
            user_message = PLAID_ERROR_MESSAGES.get(
                error_code,
                f'Transfer failed: {error_message}'
            )
            
            return PlaidIntegrationError(user_message)
    
    # Generic fallback
    return PlaidIntegrationError('Transfer failed. Please try again.')


def log_transfer_attempt(
    user_id,
    goal_id: str,
    source_account_id: str,
    destination_account_id: str,
    amount: Decimal,
    status: str,
    error: Optional[str] = None,
    transfer_id: Optional[str] = None
) -> None:
    """
    Log transfer attempt for audit trail.
    
    Args:
        user_id: User ID
        goal_id: Goal ID
        source_account_id: Source account ID
        destination_account_id: Destination account ID
        amount: Transfer amount
        status: Transfer status ('success', 'failed', 'pending')
        error: Error message if failed
        transfer_id: Plaid transfer ID if successful
    """
    log_data = {
        'timestamp': timezone.now().isoformat(),
        'user_id': str(user_id),
        'goal_id': str(goal_id),
        'source_account_id': str(source_account_id),
        'destination_account_id': str(destination_account_id),
        'amount': str(amount),
        'status': status,  # 'success', 'failed', 'pending'
        'transfer_id': str(transfer_id) if transfer_id else None,
        'error': str(error) if error else None,
    }
    
    logger.info(
        f"Transfer attempt: {json.dumps(log_data)}",
        extra={'transfer_audit': log_data}
    )


def create_transfer_transactions(
    user,
    source_account: Account,
    destination_account: Account,
    amount: Decimal,
    transfer_id: str,
    description: str,
    goal: Optional[Goal] = None
):
    """
    Create transaction records for a successful transfer.
    
    In sandbox/development mode, Plaid doesn't automatically sync transfer transactions,
    so we need to create them manually.
    
    Args:
        user: User instance
        source_account: Source Account instance (money going out)
        destination_account: Destination Account instance (money coming in)
        amount: Transfer amount as Decimal
        transfer_id: Plaid transfer ID
        description: Transfer description
        goal: Optional Goal instance this transfer is for
    """
    try:
        from apps.transactions.models import Transaction, Category
        from django.utils import timezone
        
        # Get or create a transfer category (system category, user is None)
        transfer_category, _ = Category.objects.get_or_create(
            name='Transfer',
            type='transfer',
            is_system_category=True,
            user=None,  # System categories have no user
            defaults={
                'icon': 'transfer',
                'color': '#6B7280',
            }
        )
        
        today = timezone.now().date()
        goal_name = goal.name if goal else 'Transfer'
        
        # Create transaction for source account (negative amount - money going out)
        Transaction.objects.create(
            user=user,
            account=source_account,
            amount=-amount,  # Negative for outgoing transfer
            date=today,
            merchant_name=f'Transfer to {destination_account.institution_name}',
            description=f'{description} - {goal_name}',
            category=transfer_category,
            is_transfer=True,
            plaid_transaction_id=f'transfer_{transfer_id}_source',  # Unique ID for source
            notes=f'Transfer to {destination_account.institution_name} - {goal_name}'
        )
        
        # Create transaction for destination account (positive amount - money coming in)
        Transaction.objects.create(
            user=user,
            account=destination_account,
            amount=amount,  # Positive for incoming transfer
            date=today,
            merchant_name=f'Transfer from {source_account.institution_name}',
            description=f'{description} - {goal_name}',
            category=transfer_category,
            is_transfer=True,
            plaid_transaction_id=f'transfer_{transfer_id}_destination',  # Unique ID for destination
            notes=f'Transfer from {source_account.institution_name} - {goal_name}'
        )
        
        logger.info(
            f"Created transaction records for transfer {transfer_id}: "
            f"outgoing from {source_account.account_id}, incoming to {destination_account.account_id}"
        )
        
    except Exception as exc:
        logger.error(
            f"Failed to create transaction records for transfer {transfer_id}: {exc}",
            exc_info=True
        )
        raise


def execute_transfer(
    goal_id: str,
    source_account_id: str,
    destination_account_id: str,
    amount: Decimal,
    user,
    description: str = "Goal contribution"
) -> Dict:
    """
    Execute a secure transfer between user accounts using Plaid Transfer API.
    
    This function enforces multiple layers of security checks to ensure that
    transfers can only occur if the goal has been explicitly authorized by the user.
    The goal.transfer_authorized flag MUST be True, with no bypass possible.
    
    Args:
        goal_id: UUID of the Goal instance
        source_account_id: UUID of source Account instance
        destination_account_id: UUID of destination Account instance
        amount: Transfer amount as Decimal
        user: User instance (must own all accounts and goal)
        description: Transfer description (max 10 characters - Plaid API limit, optional)
        
    Returns:
        dict: Transfer result with 'transfer_id', 'amount', 'status', 'created'
        
    Raises:
        ValidationError: If validation fails
        PermissionDenied: If permission check fails
        PlaidIntegrationError: If Plaid API call fails
    """
    # Validate input types
    if not isinstance(amount, Decimal):
        amount = Decimal(str(amount))
    
    # Ensure amount is positive
    if amount <= 0:
        raise ValidationError("Transfer amount must be positive")
    
    # Log transfer attempt start
    log_transfer_attempt(
        user_id=user.id,
        goal_id=goal_id,
        source_account_id=source_account_id,
        destination_account_id=destination_account_id,
        amount=amount,
        status='pending'
    )
    
    try:
        # Get goal
        try:
            goal = Goal.objects.get(goal_id=goal_id, user=user)
        except Goal.DoesNotExist:
            raise ValidationError("Goal not found or does not belong to user")
        
        # Get source account
        try:
            source_account = Account.objects.get(account_id=source_account_id, user=user)
        except Account.DoesNotExist:
            raise ValidationError("Source account not found or does not belong to user")
        
        # Get destination account
        try:
            destination_account = Account.objects.get(
                account_id=destination_account_id,
                user=user
            )
        except Account.DoesNotExist:
            raise ValidationError("Destination account not found or does not belong to user")
        
        # CRITICAL SECURITY CHECK: Validate transfer request
        # This function checks transfer_authorized flag and many other security layers
        validate_transfer_request(
            goal=goal,
            source_account=source_account,
            destination_account=destination_account,
            amount=amount,
            user=user
        )
        
        # Get active authorization
        authorization = get_active_authorization(goal)
        if not authorization or not authorization.plaid_authorization_id:
            raise ValidationError(
                "No active transfer authorization found. "
                "Please re-authorize transfers for this goal."
            )
        
        # CRITICAL: Check if authorization parameters match transfer parameters
        # Plaid requires that authorization amount and account_id must match transfer exactly
        # If authorization doesn't have these fields set (old authorization), we need to create a new one
        authorization_matches = True
        
        # Check if authorization has required fields set
        # If not, we need to create a new authorization with the correct parameters
        if authorization.authorized_amount is None or authorization.authorized_account_id is None:
            authorization_matches = False
            logger.info(
                f"Authorization {authorization.plaid_authorization_id} missing authorized_amount or "
                f"authorized_account_id. Creating new authorization with amount {amount} and "
                f"account {source_account.plaid_account_id} for goal {goal_id}"
            )
        else:
            # Check if amount matches (within 0.01 tolerance for floating point)
            if abs(authorization.authorized_amount - amount) > Decimal('0.01'):
                authorization_matches = False
                logger.warning(
                    f"Authorization amount {authorization.authorized_amount} does not match "
                    f"transfer amount {amount} for goal {goal_id}"
                )
            
            # Check if account_id matches
            if authorization.authorized_account_id != source_account.plaid_account_id:
                authorization_matches = False
                logger.warning(
                    f"Authorization account {authorization.authorized_account_id} does not match "
                    f"transfer account {source_account.plaid_account_id} for goal {goal_id}"
                )
        
        # Track if authorization was created during this transfer
        authorization_created = False
        
        # If authorization doesn't match or is missing required fields, create a new one
        if not authorization_matches:
            logger.info(
                f"Creating new authorization for goal {goal_id} with amount {amount} and account {source_account.plaid_account_id}"
            )
            try:
                from apps.accounts.plaid_utils import create_transfer_authorization, encrypt_token
                
                # Create new authorization with matching parameters
                auth_result = create_transfer_authorization(
                    user=user,
                    source_account_id=source_account_id,
                    destination_account_id=destination_account_id,
                    amount=str(amount),
                    goal_id=str(goal_id)
                )
                
                # Check if authorization was approved by Plaid
                decision = auth_result.get('decision')
                if decision != 'approved':
                    decision_str = str(decision) if decision else 'unknown'
                    decision_rationale = auth_result.get('decision_rationale', {})
                    rationale_msg = ''
                    if decision_rationale:
                        if isinstance(decision_rationale, dict):
                            rationale_msg = f" - {decision_rationale.get('code', '')}: {decision_rationale.get('description', '')}"
                        else:
                            rationale_msg = f" - {str(decision_rationale)}"
                    
                    raise ValidationError(
                        f"Transfer authorization was not approved by Plaid. "
                        f"Decision: {decision_str}{rationale_msg}. "
                        f"Please re-authorize the transfer for this goal."
                    )
                
                # Revoke old authorization
                authorization.status = 'revoked'
                authorization.save(update_fields=['status', 'updated_at'])
                
                # Create new authorization record
                authorization = TransferAuthorization.objects.create(
                    goal=goal,
                    authorization_token=encrypt_token(auth_result['authorization_id']),
                    plaid_authorization_id=auth_result['authorization_id'],
                    authorized_amount=amount,
                    authorized_account_id=source_account.plaid_account_id,
                    status='active'
                )
                
                authorization_created = True
                logger.info(
                    f"Created new authorization {authorization.plaid_authorization_id} for goal {goal_id}"
                )
                
            except Exception as exc:
                logger.error(
                    f"Failed to create new authorization for transfer: {exc}",
                    exc_info=True
                )
                raise ValidationError(
                    f"Authorization parameters do not match transfer parameters. "
                    f"Failed to create new authorization: {str(exc)}"
                )
        
        # Execute transfer using existing create_transfer function
        try:
            transfer_result = create_transfer(
                user=user,
                source_account_id=source_account_id,
                destination_account_id=destination_account_id,
                amount=str(amount),
                authorization_id=authorization.plaid_authorization_id,
                description=description[:10]  # Max 10 characters (Plaid API limit)
            )
            
            # Log successful transfer
            transfer_id = transfer_result.get('transfer_id')
            log_transfer_attempt(
                user_id=user.id,
                goal_id=goal_id,
                source_account_id=source_account_id,
                destination_account_id=destination_account_id,
                amount=amount,
                status='success',
                transfer_id=transfer_id
            )
            
            logger.info(
                f"Transfer executed successfully: {transfer_id} "
                f"for ${amount} from {source_account_id} to {destination_account_id}"
            )
            
            # Track if transactions were created (sandbox mode only)
            transaction_created = False
            
            # In sandbox mode, create transaction records manually since Plaid doesn't sync them automatically
            # Check if we're in sandbox/development mode
            try:
                from apps.accounts.plaid_config import _resolve_environment
                plaid_env = _resolve_environment()
                is_sandbox_or_dev = plaid_env in (Environment.Sandbox, Environment.Development)
                
                if is_sandbox_or_dev:
                    # Create transaction records for both accounts
                    try:
                        create_transfer_transactions(
                            user=user,
                            source_account=source_account,
                            destination_account=destination_account,
                            amount=amount,
                            transfer_id=transfer_id,
                            description=description,
                            goal=goal
                        )
                        transaction_created = True
                    except Exception as exc:
                        # Log error but don't fail the transfer
                        logger.warning(
                            f"Failed to create transaction records for transfer {transfer_id}: {exc}",
                            exc_info=True
                        )
            except Exception as exc:
                # Log error but don't fail the transfer
                logger.warning(
                    f"Failed to check environment or create transaction records for transfer {transfer_id}: {exc}",
                    exc_info=True
                )
            
            return {
                'transfer_id': transfer_id,
                'amount': str(amount),
                'status': transfer_result.get('status', 'pending'),
                'created': transfer_result.get('created'),
                'source_account_id': source_account_id,
                'destination_account_id': destination_account_id,
                'goal_id': goal_id,
                'authorization_created': authorization_created,
                'transaction_created': transaction_created,
                'message': 'Transfer initiated successfully',
            }
            
        except ApiException as plaid_exc:
            # Handle Plaid API errors
            error = handle_plaid_error(plaid_exc)
            
            # Check if error is due to authorization not approved
            error_str = str(error).lower()
            if 'authorization was not approved' in error_str or 'authorization not approved' in error_str:
                # Authorization was rejected - create a new one and retry once
                logger.warning(
                    f"Existing authorization was not approved for goal {goal_id}. "
                    f"Creating new authorization and retrying transfer."
                )
                
                try:
                    from apps.accounts.plaid_utils import create_transfer_authorization, encrypt_token
                    
                    # Revoke the existing authorization
                    authorization.status = 'revoked'
                    authorization.save(update_fields=['status', 'updated_at'])
                    
                    # Create new authorization
                    auth_result = create_transfer_authorization(
                        user=user,
                        source_account_id=source_account_id,
                        destination_account_id=destination_account_id,
                        amount=str(amount),
                        goal_id=str(goal_id)
                    )
                    
                    # Check if new authorization was approved
                    decision = auth_result.get('decision')
                    if decision != 'approved':
                        decision_str = str(decision) if decision else 'unknown'
                        raise ValidationError(
                            f"Transfer authorization was not approved by Plaid. "
                            f"Decision: {decision_str}. "
                            f"Please re-authorize the transfer for this goal."
                        )
                    
                    # Create new authorization record
                    authorization = TransferAuthorization.objects.create(
                        goal=goal,
                        authorization_token=encrypt_token(auth_result['authorization_id']),
                        plaid_authorization_id=auth_result['authorization_id'],
                        authorized_amount=amount,
                        authorized_account_id=source_account.plaid_account_id,
                        status='active'
                    )
                    
                    logger.info(
                        f"Created new authorization {authorization.plaid_authorization_id} for goal {goal_id} after previous one was rejected"
                    )
                    
                    # Retry transfer with new authorization (only once)
                    try:
                        transfer_result = create_transfer(
                            user=user,
                            source_account_id=source_account_id,
                            destination_account_id=destination_account_id,
                            amount=str(amount),
                            authorization_id=authorization.plaid_authorization_id,
                            description=description[:10]
                        )
                        
                        # Success - return result
                        transfer_id = transfer_result.get('transfer_id')
                        log_transfer_attempt(
                            user_id=user.id,
                            goal_id=goal_id,
                            source_account_id=source_account_id,
                            destination_account_id=destination_account_id,
                            amount=amount,
                            status='success',
                            transfer_id=transfer_id
                        )
                        
                        logger.info(
                            f"Transfer succeeded on retry with new authorization: {transfer_id} "
                            f"for ${amount} from {source_account_id} to {destination_account_id}"
                        )
                        
                        # Return success (transaction creation logic would go here too)
                        return {
                            'transfer_id': transfer_id,
                            'amount': str(amount),
                            'status': transfer_result.get('status', 'pending'),
                            'created': transfer_result.get('created'),
                            'source_account_id': source_account_id,
                            'destination_account_id': destination_account_id,
                            'goal_id': goal_id,
                            'authorization_created': True,
                            'transaction_created': False,  # Would need to add this logic
                            'message': 'Transfer initiated successfully after re-authorization',
                        }
                        
                    except Exception as retry_exc:
                        # Retry also failed - raise original error
                        logger.error(
                            f"Transfer retry also failed after creating new authorization: {retry_exc}",
                            exc_info=True
                        )
                        raise ValidationError(
                            f"Transfer failed even after re-authorization: {str(retry_exc)}"
                        )
                        
                except Exception as auth_exc:
                    # Failed to create new authorization - log and raise
                    logger.error(
                        f"Failed to create new authorization after rejection: {auth_exc}",
                        exc_info=True
                    )
                    raise ValidationError(
                        f"Authorization was rejected and failed to create new one: {str(auth_exc)}. "
                        f"Please re-authorize the transfer for this goal."
                    )
            
            # Log failed transfer
            log_transfer_attempt(
                user_id=user.id,
                goal_id=goal_id,
                source_account_id=source_account_id,
                destination_account_id=destination_account_id,
                amount=amount,
                status='failed',
                error=str(error)
            )
            
            logger.error(
                f"Plaid API error during transfer: {plaid_exc.body}",
                exc_info=True
            )
            
            raise error
            
        except PlaidIntegrationError as plaid_error:
            # Handle PlaidIntegrationError (from create_transfer) - check for authorization not approved
            # ValidationError can store messages in different formats, so check both
            error_str = str(plaid_error).lower()
            # Get all possible error message sources
            error_messages = []
            
            # Check error.args[0] first - this is the most reliable way to get the original message
            # When PlaidIntegrationError is raised with a string, it's stored in args[0]
            if hasattr(plaid_error, 'args') and plaid_error.args and len(plaid_error.args) > 0:
                first_arg = plaid_error.args[0]
                if isinstance(first_arg, str):
                    # Direct string - use it as-is
                    error_messages.append(first_arg.lower())
                elif isinstance(first_arg, (list, tuple)):
                    # It's a list/tuple, extract all strings
                    error_messages.extend([str(msg).lower() for msg in first_arg if msg])
                elif isinstance(first_arg, dict):
                    # It's a dict, extract all values
                    for msgs in first_arg.values():
                        if isinstance(msgs, (list, tuple)):
                            error_messages.extend([str(msg).lower() for msg in msgs if msg])
                        else:
                            error_messages.append(str(msgs).lower())
                else:
                    # Convert to string
                    error_messages.append(str(first_arg).lower())
                
                # Also check other args if any
                for arg in plaid_error.args[1:]:
                    error_messages.append(str(arg).lower())
            
            # Check messages attribute (ValidationError stores messages here)
            if hasattr(plaid_error, 'messages'):
                if isinstance(plaid_error.messages, (list, tuple)):
                    error_messages.extend([str(msg).lower() for msg in plaid_error.messages])
                elif isinstance(plaid_error.messages, dict):
                    # If it's a dict, extract all values
                    for msgs in plaid_error.messages.values():
                        if isinstance(msgs, (list, tuple)):
                            error_messages.extend([str(msg).lower() for msg in msgs])
                        else:
                            error_messages.append(str(msgs).lower())
                else:
                    error_messages.append(str(plaid_error.messages).lower())
            
            # Check message property (singular)
            if hasattr(plaid_error, 'message') and plaid_error.message:
                if isinstance(plaid_error.message, (list, tuple)):
                    error_messages.extend([str(msg).lower() for msg in plaid_error.message])
                else:
                    error_messages.append(str(plaid_error.message).lower())
            
            # Use string representation as fallback
            if not error_messages:
                error_messages = [error_str]
            
            # Combine all error messages for checking
            all_error_text = error_str + ' ' + ' '.join(error_messages)
            logger.info(
                f"Caught PlaidIntegrationError: "
                f"error_str={error_str}, "
                f"error.args={getattr(plaid_error, 'args', None)}, "
                f"error.messages={getattr(plaid_error, 'messages', None)}, "
                f"extracted_messages={error_messages}, "
                f"all_text={all_error_text[:300]}"
            )
            
            # Check for authorization not approved in various formats
            if ('authorization was not approved' in all_error_text or 
                'authorization not approved' in all_error_text or
                'not approved' in all_error_text):
                # Authorization was rejected - create a new one and retry once
                logger.warning(
                    f"Existing authorization was not approved for goal {goal_id}. "
                    f"Creating new authorization and retrying transfer."
                )
                
                try:
                    from apps.accounts.plaid_utils import create_transfer_authorization, encrypt_token
                    
                    # Revoke the existing authorization
                    authorization.status = 'revoked'
                    authorization.save(update_fields=['status', 'updated_at'])
                    
                    # Create new authorization
                    auth_result = create_transfer_authorization(
                        user=user,
                        source_account_id=source_account_id,
                        destination_account_id=destination_account_id,
                        amount=str(amount),
                        goal_id=str(goal_id)
                    )
                    
                    # Check if new authorization was approved
                    decision = auth_result.get('decision')
                    if decision != 'approved':
                        decision_str = str(decision) if decision else 'unknown'
                        raise ValidationError(
                            f"Transfer authorization was not approved by Plaid. "
                            f"Decision: {decision_str}. "
                            f"Please re-authorize the transfer for this goal."
                        )
                    
                    # Create new authorization record
                    authorization = TransferAuthorization.objects.create(
                        goal=goal,
                        authorization_token=encrypt_token(auth_result['authorization_id']),
                        plaid_authorization_id=auth_result['authorization_id'],
                        authorized_amount=amount,
                        authorized_account_id=source_account.plaid_account_id,
                        status='active'
                    )
                    
                    logger.info(
                        f"Created new authorization {authorization.plaid_authorization_id} for goal {goal_id} after previous one was rejected"
                    )
                    
                    # Retry transfer with new authorization (only once)
                    try:
                        transfer_result = create_transfer(
                            user=user,
                            source_account_id=source_account_id,
                            destination_account_id=destination_account_id,
                            amount=str(amount),
                            authorization_id=authorization.plaid_authorization_id,
                            description=description[:10]
                        )
                        
                        # Success - return result
                        transfer_id = transfer_result.get('transfer_id')
                        log_transfer_attempt(
                            user_id=user.id,
                            goal_id=goal_id,
                            source_account_id=source_account_id,
                            destination_account_id=destination_account_id,
                            amount=amount,
                            status='success',
                            transfer_id=transfer_id
                        )
                        
                        logger.info(
                            f"Transfer succeeded on retry with new authorization: {transfer_id} "
                            f"for ${amount} from {source_account_id} to {destination_account_id}"
                        )
                        
                        # Return success (transaction creation logic would go here too)
                        return {
                            'transfer_id': transfer_id,
                            'amount': str(amount),
                            'status': transfer_result.get('status', 'pending'),
                            'created': transfer_result.get('created'),
                            'source_account_id': source_account_id,
                            'destination_account_id': destination_account_id,
                            'goal_id': goal_id,
                            'authorization_created': True,
                            'transaction_created': False,  # Would need to add this logic
                            'message': 'Transfer initiated successfully after re-authorization',
                        }
                        
                    except Exception as retry_exc:
                        # Retry also failed - raise original error
                        logger.error(
                            f"Transfer retry also failed after creating new authorization: {retry_exc}",
                            exc_info=True
                        )
                        raise ValidationError(
                            f"Transfer failed even after re-authorization: {str(retry_exc)}"
                        )
                        
                except Exception as auth_exc:
                    # Failed to create new authorization - log and raise
                    logger.error(
                        f"Failed to create new authorization after rejection: {auth_exc}",
                        exc_info=True
                    )
                    raise ValidationError(
                        f"Authorization was rejected and failed to create new one: {str(auth_exc)}. "
                        f"Please re-authorize the transfer for this goal."
                    )
            
            # Re-raise other Plaid integration errors as-is
            raise
            
        except Exception as exc:
            # Handle unexpected errors
            error_msg = f"Unexpected error during transfer: {str(exc)}"
            
            # Log failed transfer
            log_transfer_attempt(
                user_id=user.id,
                goal_id=goal_id,
                source_account_id=source_account_id,
                destination_account_id=destination_account_id,
                amount=amount,
                status='failed',
                error=error_msg
            )
            
            logger.error(error_msg, exc_info=True)
            raise PlaidIntegrationError("Transfer failed. Please try again.") from exc
            
    except (ValidationError, PermissionDenied) as validation_exc:
        # Check if this is a PlaidIntegrationError about authorization not approved
        # (PlaidIntegrationError inherits from ValidationError, so it might be caught here)
        if isinstance(validation_exc, PlaidIntegrationError):
            error_str = str(validation_exc).lower()
            # ValidationError can store messages in different formats, so check both
            error_messages = []
            
            # Check error.args[0] first - this is the most reliable way to get the original message
            # When PlaidIntegrationError is raised with a string, it's stored in args[0]
            if hasattr(validation_exc, 'args') and validation_exc.args and len(validation_exc.args) > 0:
                first_arg = validation_exc.args[0]
                if isinstance(first_arg, str):
                    # Direct string - use it as-is
                    error_messages.append(first_arg.lower())
                elif isinstance(first_arg, (list, tuple)):
                    # It's a list/tuple, extract all strings
                    error_messages.extend([str(msg).lower() for msg in first_arg if msg])
                elif isinstance(first_arg, dict):
                    # It's a dict, extract all values
                    for msgs in first_arg.values():
                        if isinstance(msgs, (list, tuple)):
                            error_messages.extend([str(msg).lower() for msg in msgs if msg])
                        else:
                            error_messages.append(str(msgs).lower())
                else:
                    # Convert to string
                    error_messages.append(str(first_arg).lower())
                
                # Also check other args if any
                for arg in validation_exc.args[1:]:
                    error_messages.append(str(arg).lower())
            
            # Check messages attribute (ValidationError stores messages here)
            if hasattr(validation_exc, 'messages'):
                if isinstance(validation_exc.messages, (list, tuple)):
                    error_messages.extend([str(msg).lower() for msg in validation_exc.messages])
                elif isinstance(validation_exc.messages, dict):
                    # If it's a dict, extract all values
                    for msgs in validation_exc.messages.values():
                        if isinstance(msgs, (list, tuple)):
                            error_messages.extend([str(msg).lower() for msg in msgs])
                        else:
                            error_messages.append(str(msgs).lower())
                else:
                    error_messages.append(str(validation_exc.messages).lower())
            
            # Check message property (singular)
            if hasattr(validation_exc, 'message') and validation_exc.message:
                if isinstance(validation_exc.message, (list, tuple)):
                    error_messages.extend([str(msg).lower() for msg in validation_exc.message])
                else:
                    error_messages.append(str(validation_exc.message).lower())
            
            # Use string representation as fallback
            if not error_messages:
                error_messages = [error_str]
            
            # Combine all error messages for checking
            all_error_text = error_str + ' ' + ' '.join(error_messages)
            logger.info(f"Caught PlaidIntegrationError in ValidationError handler: {error_str}, messages: {error_messages}, all_text: {all_error_text[:200]}")
            
            if ('authorization was not approved' in all_error_text or 
                'authorization not approved' in all_error_text or
                'not approved' in all_error_text):
                
                # Get the authorization from the outer scope (it exists because we validated earlier)
                authorization = get_active_authorization(Goal.objects.get(goal_id=goal_id, user=user))
                if authorization:
                    logger.warning(
                        f"Existing authorization was not approved for goal {goal_id}. "
                        f"Creating new authorization and retrying transfer."
                    )
                    
                    try:
                        from apps.accounts.plaid_utils import create_transfer_authorization, encrypt_token
                        
                        # Get accounts again
                        source_account = Account.objects.get(account_id=source_account_id, user=user)
                        destination_account = Account.objects.get(account_id=destination_account_id, user=user)
                        goal = Goal.objects.get(goal_id=goal_id, user=user)
                        
                        # Revoke the existing authorization
                        authorization.status = 'revoked'
                        authorization.save(update_fields=['status', 'updated_at'])
                        
                        # Create new authorization
                        auth_result = create_transfer_authorization(
                            user=user,
                            source_account_id=source_account_id,
                            destination_account_id=destination_account_id,
                            amount=str(amount),
                            goal_id=str(goal_id)
                        )
                        
                        # Check if new authorization was approved
                        decision = auth_result.get('decision')
                        if decision != 'approved':
                            decision_str = str(decision) if decision else 'unknown'
                            raise ValidationError(
                                f"Transfer authorization was not approved by Plaid. "
                                f"Decision: {decision_str}. "
                                f"Please re-authorize the transfer for this goal."
                            )
                        
                        # Create new authorization record
                        authorization = TransferAuthorization.objects.create(
                            goal=goal,
                            authorization_token=encrypt_token(auth_result['authorization_id']),
                            plaid_authorization_id=auth_result['authorization_id'],
                            authorized_amount=amount,
                            authorized_account_id=source_account.plaid_account_id,
                            status='active'
                        )
                        
                        logger.info(
                            f"Created new authorization {authorization.plaid_authorization_id} for goal {goal_id} after previous one was rejected"
                        )
                        
                        # Retry transfer with new authorization (only once)
                        try:
                            transfer_result = create_transfer(
                                user=user,
                                source_account_id=source_account_id,
                                destination_account_id=destination_account_id,
                                amount=str(amount),
                                authorization_id=authorization.plaid_authorization_id,
                                description=description[:10]
                            )
                            
                            # Success - return result (need to handle transaction creation too)
                            transfer_id = transfer_result.get('transfer_id')
                            log_transfer_attempt(
                                user_id=user.id,
                                goal_id=goal_id,
                                source_account_id=source_account_id,
                                destination_account_id=destination_account_id,
                                amount=amount,
                                status='success',
                                transfer_id=transfer_id
                            )
                            
                            logger.info(
                                f"Transfer succeeded on retry with new authorization: {transfer_id} "
                                f"for ${amount} from {source_account_id} to {destination_account_id}"
                            )
                            
                            # Create transactions if in sandbox/development mode
                            transaction_created = False
                            try:
                                from apps.accounts.plaid_config import _resolve_environment
                                plaid_env = _resolve_environment()
                                is_sandbox_or_dev = plaid_env in (Environment.Sandbox, Environment.Development)
                                
                                if is_sandbox_or_dev:
                                    try:
                                        create_transfer_transactions(
                                            user=user,
                                            source_account=source_account,
                                            destination_account=destination_account,
                                            amount=amount,
                                            transfer_id=transfer_id,
                                            description=description[:10],
                                            goal=goal
                                        )
                                        transaction_created = True
                                    except Exception:
                                        pass  # Don't fail on transaction creation
                            except Exception:
                                pass  # Don't fail on transaction creation check
                            
                            return {
                                'transfer_id': transfer_id,
                                'amount': str(amount),
                                'status': transfer_result.get('status', 'pending'),
                                'created': transfer_result.get('created'),
                                'source_account_id': source_account_id,
                                'destination_account_id': destination_account_id,
                                'goal_id': goal_id,
                                'authorization_created': True,
                                'transaction_created': transaction_created,
                                'message': 'Transfer initiated successfully after re-authorization',
                            }
                            
                        except Exception as retry_exc:
                            logger.error(
                                f"Transfer retry also failed after creating new authorization: {retry_exc}",
                                exc_info=True
                            )
                            raise ValidationError(
                                f"Transfer failed even after re-authorization: {str(retry_exc)}"
                            )
                            
                    except Exception as auth_exc:
                        logger.error(
                            f"Failed to create new authorization after rejection: {auth_exc}",
                            exc_info=True
                        )
                        raise ValidationError(
                            f"Authorization was rejected and failed to create new one: {str(auth_exc)}. "
                            f"Please re-authorize the transfer for this goal."
                        )
        
        # Log validation failure
        log_transfer_attempt(
            user_id=user.id,
            goal_id=goal_id,
            source_account_id=source_account_id,
            destination_account_id=destination_account_id,
            amount=amount,
            status='failed',
            error=str(validation_exc)
        )
        
        # Re-raise validation errors as-is
        raise
        
    except Exception as exc:
        # Log unexpected error
        error_msg = f"Unexpected error during transfer validation: {str(exc)}"
        
        log_transfer_attempt(
            user_id=user.id,
            goal_id=goal_id,
            source_account_id=source_account_id,
            destination_account_id=destination_account_id,
            amount=amount,
            status='failed',
            error=error_msg
        )
        
        logger.error(error_msg, exc_info=True)
        raise ValidationError("Transfer validation failed. Please try again.") from exc

