"""
Unit tests for transfer service.

Tests all transfer service functions including authorization checks.
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.core.exceptions import PermissionDenied, ValidationError
from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.accounts.models import Account
from apps.accounts.transfer_service import (
    execute_transfer,
    validate_transfer_request,
    get_active_authorization,
    check_authorization_match,
    handle_plaid_error,
)
from apps.goals.models import Goal, TransferAuthorization
from apps.accounts.plaid_utils import PlaidIntegrationError
from plaid.exceptions import ApiException

User = get_user_model()


class TransferServiceTestCase(TestCase):
    """Test transfer service functions."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        # Create source account
        self.source_account = Account.objects.create(
            user=self.user,
            institution_name='Test Bank',
            account_type='checking',
            account_number_masked='****1234',
            balance=Decimal('1000.00'),
            currency='USD',
            plaid_account_id='plaid_source_123',
            plaid_access_token='encrypted_token_source',
            is_active=True
        )
        
        # Create destination account
        self.destination_account = Account.objects.create(
            user=self.user,
            institution_name='Test Bank',
            account_type='savings',
            account_number_masked='****5678',
            balance=Decimal('500.00'),
            currency='USD',
            plaid_account_id='plaid_dest_456',
            plaid_access_token='encrypted_token_dest',
            is_active=True
        )
        
        # Create goal with destination account
        self.goal = Goal.objects.create(
            user=self.user,
            name='Test Goal',
            target_amount=Decimal('5000.00'),
            current_amount=Decimal('500.00'),
            destination_account=self.destination_account,
            is_active=True,
            transfer_authorized=True  # Authorized for transfers
        )
        
        # Create transfer authorization
        self.authorization = TransferAuthorization.objects.create(
            goal=self.goal,
            authorization_token='encrypted_auth_token',
            plaid_authorization_id='auth_123456',
            status='active'
        )
    
    def test_get_active_authorization_success(self):
        """Test getting active authorization for goal."""
        auth = get_active_authorization(self.goal)
        self.assertIsNotNone(auth)
        self.assertEqual(auth.authorization_id, self.authorization.authorization_id)
    
    def test_get_active_authorization_none(self):
        """Test getting active authorization when none exists."""
        # Create goal without authorization
        goal_no_auth = Goal.objects.create(
            user=self.user,
            name='No Auth Goal',
            target_amount=Decimal('1000.00'),
            destination_account=self.destination_account,
            is_active=True,
            transfer_authorized=False
        )
        auth = get_active_authorization(goal_no_auth)
        self.assertIsNone(auth)
    
    def test_check_authorization_match_success(self):
        """Test checking authorization match with valid account."""
        result = check_authorization_match(self.authorization, self.source_account)
        self.assertTrue(result)
    
    def test_check_authorization_match_inactive_account(self):
        """Test checking authorization match with inactive account."""
        self.source_account.is_active = False
        self.source_account.save()
        result = check_authorization_match(self.authorization, self.source_account)
        self.assertFalse(result)
    
    def test_validate_transfer_request_success(self):
        """Test validating transfer request with all valid conditions."""
        result = validate_transfer_request(
            goal=self.goal,
            source_account=self.source_account,
            destination_account=self.destination_account,
            amount=Decimal('100.00'),
            user=self.user
        )
        self.assertTrue(result)
    
    def test_validate_transfer_request_not_authorized(self):
        """Test validating transfer request when transfer_authorized is False."""
        self.goal.transfer_authorized = False
        self.goal.save()
        
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('transfer_authorized', str(cm.exception).lower())
    
    def test_validate_transfer_request_inactive_goal(self):
        """Test validating transfer request when goal is inactive."""
        self.goal.is_active = False
        self.goal.save()
        
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('active', str(cm.exception).lower())
    
    def test_validate_transfer_request_wrong_user(self):
        """Test validating transfer request with account from different user."""
        other_user = User.objects.create_user(
            email='other@example.com',
            username='otheruser',
            password='pass123'
        )
        other_account = Account.objects.create(
            user=other_user,
            institution_name='Other Bank',
            account_type='checking',
            account_number_masked='****9999',
            balance=Decimal('100.00'),
            plaid_account_id='plaid_other',
            plaid_access_token='encrypted_other',
            is_active=True
        )
        
        with self.assertRaises(PermissionDenied):
            validate_transfer_request(
                goal=self.goal,
                source_account=other_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
    
    def test_validate_transfer_request_inactive_accounts(self):
        """Test validating transfer request with inactive accounts."""
        self.source_account.is_active = False
        self.source_account.save()
        
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('active', str(cm.exception).lower())
    
    def test_validate_transfer_request_wrong_destination(self):
        """Test validating transfer request with wrong destination account."""
        other_dest = Account.objects.create(
            user=self.user,
            institution_name='Other Bank',
            account_type='savings',
            account_number_masked='****0000',
            balance=Decimal('100.00'),
            plaid_account_id='plaid_other_dest',
            plaid_access_token='encrypted_other',
            is_active=True
        )
        
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.goal,
                source_account=self.source_account,
                destination_account=other_dest,
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('destination', str(cm.exception).lower())
    
    def test_validate_transfer_request_invalid_amount(self):
        """Test validating transfer request with invalid amount."""
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('0.00'),  # Invalid: zero
                user=self.user
            )
        self.assertIn('positive', str(cm.exception).lower())
        
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('-100.00'),  # Invalid: negative
                user=self.user
            )
        self.assertIn('positive', str(cm.exception).lower())
    
    def test_validate_transfer_request_no_authorization(self):
        """Test validating transfer request when no active authorization exists."""
        # Delete authorization
        self.authorization.delete()
        
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('authorization', str(cm.exception).lower())
    
    @patch('apps.accounts.transfer_service.create_transfer')
    def test_execute_transfer_success(self, mock_create_transfer):
        """Test executing transfer successfully."""
        # Mock successful transfer
        mock_create_transfer.return_value = {
            'transfer_id': 'transfer_123',
            'amount': '100.00',
            'status': 'pending',
            'created': '2024-01-01T00:00:00Z'
        }
        
        result = execute_transfer(
            goal_id=str(self.goal.goal_id),
            source_account_id=str(self.source_account.account_id),
            destination_account_id=str(self.destination_account.account_id),
            amount=Decimal('100.00'),
            user=self.user,
            description='Test transfer'
        )
        
        self.assertIn('transfer_id', result)
        self.assertEqual(result['transfer_id'], 'transfer_123')
        self.assertEqual(result['amount'], '100.00')
        mock_create_transfer.assert_called_once()
    
    def test_execute_transfer_not_authorized(self):
        """Test executing transfer when goal is not authorized."""
        self.goal.transfer_authorized = False
        self.goal.save()
        
        with self.assertRaises(ValidationError) as cm:
            execute_transfer(
                goal_id=str(self.goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('transfer_authorized', str(cm.exception).lower())
    
    def test_execute_transfer_goal_not_found(self):
        """Test executing transfer with non-existent goal."""
        with self.assertRaises(ValidationError):
            execute_transfer(
                goal_id='00000000-0000-0000-0000-000000000000',
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
    
    def test_execute_transfer_account_not_found(self):
        """Test executing transfer with non-existent account."""
        with self.assertRaises(ValidationError):
            execute_transfer(
                goal_id=str(self.goal.goal_id),
                source_account_id='00000000-0000-0000-0000-000000000000',
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
    
    @patch('apps.accounts.transfer_service.create_transfer')
    def test_execute_transfer_plaid_error(self, mock_create_transfer):
        """Test executing transfer when Plaid API returns error."""
        # Mock Plaid API error
        mock_create_transfer.side_effect = ApiException(
            status=400,
            reason='Bad Request',
            body={'error_code': 'INSUFFICIENT_FUNDS', 'error_message': 'Not enough funds'}
        )
        
        with self.assertRaises(PlaidIntegrationError) as cm:
            execute_transfer(
                goal_id=str(self.goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('Insufficient funds', str(cm.exception))
    
    def test_handle_plaid_error_insufficient_funds(self):
        """Test handling Plaid insufficient funds error."""
        error = ApiException(
            status=400,
            reason='Bad Request',
            body={'error_code': 'INSUFFICIENT_FUNDS', 'error_message': 'Not enough funds'}
        )
        result = handle_plaid_error(error)
        self.assertIsInstance(result, PlaidIntegrationError)
        self.assertIn('Insufficient funds', str(result))
    
    def test_handle_plaid_error_authorization_expired(self):
        """Test handling Plaid authorization expired error."""
        error = ApiException(
            status=400,
            reason='Bad Request',
            body={'error_code': 'AUTHORIZATION_EXPIRED', 'error_message': 'Auth expired'}
        )
        result = handle_plaid_error(error)
        self.assertIsInstance(result, PlaidIntegrationError)
        self.assertIn('expired', str(result).lower())
    
    def test_handle_plaid_error_generic(self):
        """Test handling generic Plaid error."""
        error = ApiException(
            status=500,
            reason='Internal Server Error',
            body={'error_code': 'UNKNOWN_ERROR', 'error_message': 'Something went wrong'}
        )
        result = handle_plaid_error(error)
        self.assertIsInstance(result, PlaidIntegrationError)
        self.assertIn('Transfer failed', str(result))
    
    def test_execute_transfer_with_string_amount(self):
        """Test executing transfer with string amount (should convert to Decimal)."""
        with patch('apps.accounts.transfer_service.create_transfer') as mock_create_transfer:
            mock_create_transfer.return_value = {
                'transfer_id': 'transfer_123',
                'amount': '50.00',
                'status': 'pending'
            }
            
            # Pass string amount
            result = execute_transfer(
                goal_id=str(self.goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount='50.00',  # String instead of Decimal
                user=self.user
            )
            
            self.assertIn('transfer_id', result)
            mock_create_transfer.assert_called_once()

