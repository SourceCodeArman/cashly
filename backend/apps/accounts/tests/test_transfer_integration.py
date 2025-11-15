"""
Integration tests for transfer functionality.

Tests end-to-end transfer flow with mock Plaid API.
"""
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.accounts.models import Account
from apps.accounts.transfer_service import execute_transfer
from apps.goals.models import Goal, TransferAuthorization
from apps.accounts.plaid_utils import PlaidIntegrationError
from apps.accounts.tests.plaid_test_utils import mock_plaid_client

User = get_user_model()


class TransferIntegrationTestCase(TestCase):
    """Integration tests for transfer functionality."""
    
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
        
        # Create goal with authorization
        self.goal = Goal.objects.create(
            user=self.user,
            name='Test Goal',
            target_amount=Decimal('5000.00'),
            current_amount=Decimal('500.00'),
            destination_account=self.destination_account,
            is_active=True,
            transfer_authorized=True
        )
        
        # Create transfer authorization
        self.authorization = TransferAuthorization.objects.create(
            goal=self.goal,
            authorization_token='encrypted_auth_token',
            plaid_authorization_id='auth_123456',
            status='active'
        )
    
    @patch('apps.accounts.plaid_utils.create_transfer')
    @patch('apps.accounts.plaid_utils.decrypt_token')
    def test_end_to_end_transfer_flow_success(self, mock_decrypt, mock_create_transfer):
        """Test end-to-end transfer flow with successful Plaid API call."""
        # Mock decrypt token
        mock_decrypt.return_value = 'decrypted_token'
        
        # Mock successful transfer
        mock_create_transfer.return_value = {
            'transfer_id': 'transfer_123456',
            'amount': '100.00',
            'status': 'pending',
            'created': '2024-01-01T00:00:00Z'
        }
        
        # Execute transfer
        result = execute_transfer(
            goal_id=str(self.goal.goal_id),
            source_account_id=str(self.source_account.account_id),
            destination_account_id=str(self.destination_account.account_id),
            amount=Decimal('100.00'),
            user=self.user,
            description='Test transfer'
        )
        
        # Verify result
        self.assertIn('transfer_id', result)
        self.assertEqual(result['transfer_id'], 'transfer_123456')
        self.assertEqual(result['amount'], '100.00')
        self.assertEqual(result['status'], 'pending')
        self.assertEqual(result['source_account_id'], str(self.source_account.account_id))
        self.assertEqual(result['destination_account_id'], str(self.destination_account.account_id))
        self.assertEqual(result['goal_id'], str(self.goal.goal_id))
        
        # Verify Plaid API was called
        mock_create_transfer.assert_called_once()
        call_kwargs = mock_create_transfer.call_args[1]
        self.assertEqual(call_kwargs['amount'], '100.00')
        self.assertEqual(call_kwargs['authorization_id'], 'auth_123456')
        self.assertEqual(call_kwargs['description'], 'Test transfer')
    
    @patch('apps.accounts.plaid_utils.create_transfer')
    @patch('apps.accounts.plaid_utils.decrypt_token')
    def test_end_to_end_transfer_with_insufficient_funds(self, mock_decrypt, mock_create_transfer):
        """Test end-to-end transfer flow when Plaid returns insufficient funds error."""
        from plaid.exceptions import ApiException
        
        # Mock decrypt token
        mock_decrypt.return_value = 'decrypted_token'
        
        # Mock Plaid API error
        mock_create_transfer.side_effect = ApiException(
            status=400,
            reason='Bad Request',
            body={'error_code': 'INSUFFICIENT_FUNDS', 'error_message': 'Not enough funds'}
        )
        
        # Execute transfer should raise PlaidIntegrationError
        with self.assertRaises(PlaidIntegrationError) as cm:
            execute_transfer(
                goal_id=str(self.goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('10000.00'),  # More than balance
                user=self.user
            )
        
        self.assertIn('Insufficient funds', str(cm.exception))
    
    @patch('apps.accounts.plaid_utils.create_transfer')
    @patch('apps.accounts.plaid_utils.decrypt_token')
    def test_end_to_end_transfer_with_expired_authorization(self, mock_decrypt, mock_create_transfer):
        """Test end-to-end transfer flow when authorization has expired."""
        from plaid.exceptions import ApiException
        
        # Mock decrypt token
        mock_decrypt.return_value = 'decrypted_token'
        
        # Mock Plaid API error for expired authorization
        mock_create_transfer.side_effect = ApiException(
            status=400,
            reason='Bad Request',
            body={
                'error_code': 'AUTHORIZATION_EXPIRED',
                'error_message': 'Authorization has expired'
            }
        )
        
        # Execute transfer should raise PlaidIntegrationError
        with self.assertRaises(PlaidIntegrationError) as cm:
            execute_transfer(
                goal_id=str(self.goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
        
        self.assertIn('expired', str(cm.exception).lower())
    
    @patch('apps.accounts.plaid_utils.create_transfer')
    @patch('apps.accounts.plaid_utils.decrypt_token')
    def test_transfer_status_tracking(self, mock_decrypt, mock_create_transfer):
        """Test that transfer status is tracked correctly."""
        # Mock decrypt token
        mock_decrypt.return_value = 'decrypted_token'
        
        # Mock transfer with different statuses
        statuses = ['pending', 'posted', 'cancelled', 'failed']
        
        for status in statuses:
            mock_create_transfer.return_value = {
                'transfer_id': f'transfer_{status}',
                'amount': '100.00',
                'status': status,
                'created': '2024-01-01T00:00:00Z'
            }
            
            result = execute_transfer(
                goal_id=str(self.goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
            
            self.assertEqual(result['status'], status)
    
    def test_error_recovery_scenarios(self):
        """Test various error recovery scenarios."""
        # Test with non-existent goal
        with self.assertRaises(ValidationError):
            execute_transfer(
                goal_id='00000000-0000-0000-0000-000000000000',
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
        
        # Test with non-existent source account
        with self.assertRaises(ValidationError):
            execute_transfer(
                goal_id=str(self.goal.goal_id),
                source_account_id='00000000-0000-0000-0000-000000000000',
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
        
        # Test with non-existent destination account
        with self.assertRaises(ValidationError):
            execute_transfer(
                goal_id=str(self.goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id='00000000-0000-0000-0000-000000000000',
                amount=Decimal('100.00'),
                user=self.user
            )
    
    @patch('apps.accounts.plaid_utils.create_transfer')
    @patch('apps.accounts.plaid_utils.decrypt_token')
    def test_transfer_with_description_truncation(self, mock_decrypt, mock_create_transfer):
        """Test that description is truncated to 10 characters (Plaid API limit)."""
        # Mock decrypt token
        mock_decrypt.return_value = 'decrypted_token'
        
        # Mock successful transfer
        mock_create_transfer.return_value = {
            'transfer_id': 'transfer_123',
            'amount': '100.00',
            'status': 'pending',
            'created': '2024-01-01T00:00:00Z'
        }
        
        # Execute transfer with long description
        long_description = 'This is a very long description that exceeds 10 characters'
        execute_transfer(
            goal_id=str(self.goal.goal_id),
            source_account_id=str(self.source_account.account_id),
            destination_account_id=str(self.destination_account.account_id),
            amount=Decimal('100.00'),
            user=self.user,
            description=long_description
        )
        
        # Verify description was truncated to 10 characters (Plaid API limit)
        call_kwargs = mock_create_transfer.call_args[1]
        self.assertEqual(len(call_kwargs['description']), 10)
        self.assertEqual(call_kwargs['description'], long_description[:10])
    
    @patch('apps.accounts.plaid_utils.create_transfer')
    @patch('apps.accounts.plaid_utils.decrypt_token')
    def test_multiple_transfers_same_goal(self, mock_decrypt, mock_create_transfer):
        """Test executing multiple transfers for the same goal."""
        # Mock decrypt token
        mock_decrypt.return_value = 'decrypted_token'
        
        # Execute multiple transfers
        for i, amount in enumerate([Decimal('50.00'), Decimal('75.00'), Decimal('100.00')], 1):
            mock_create_transfer.return_value = {
                'transfer_id': f'transfer_{i}',
                'amount': str(amount),
                'status': 'pending',
                'created': '2024-01-01T00:00:00Z'
            }
            
            result = execute_transfer(
                goal_id=str(self.goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=amount,
                user=self.user
            )
            
            self.assertEqual(result['amount'], str(amount))
            self.assertEqual(result['transfer_id'], f'transfer_{i}')
        
        # Verify create_transfer was called 3 times
        self.assertEqual(mock_create_transfer.call_count, 3)

