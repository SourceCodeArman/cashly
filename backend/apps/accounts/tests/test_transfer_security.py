"""
Security tests for transfer service.

Tests verify that transfer_authorized flag cannot be bypassed.
"""
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.core.exceptions import ValidationError, PermissionDenied
from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.accounts.models import Account
from apps.accounts.transfer_service import execute_transfer, validate_transfer_request
from apps.goals.models import Goal, TransferAuthorization
from apps.accounts.plaid_utils import PlaidIntegrationError

User = get_user_model()


class TransferSecurityTestCase(TestCase):
    """Test transfer security and authorization enforcement."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        self.other_user = User.objects.create_user(
            email='other@example.com',
            username='otheruser',
            password='pass123'
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
        
        # Create goal WITHOUT authorization
        self.unauthorized_goal = Goal.objects.create(
            user=self.user,
            name='Unauthorized Goal',
            target_amount=Decimal('5000.00'),
            current_amount=Decimal('500.00'),
            destination_account=self.destination_account,
            is_active=True,
            transfer_authorized=False  # NOT authorized
        )
        
        # Create goal WITH authorization
        self.authorized_goal = Goal.objects.create(
            user=self.user,
            name='Authorized Goal',
            target_amount=Decimal('5000.00'),
            current_amount=Decimal('500.00'),
            destination_account=self.destination_account,
            is_active=True,
            transfer_authorized=True  # Authorized
        )
        
        # Create authorization for authorized goal
        self.authorization = TransferAuthorization.objects.create(
            goal=self.authorized_goal,
            authorization_token='encrypted_auth_token',
            plaid_authorization_id='auth_123456',
            status='active'
        )
    
    def test_transfer_with_unauthorized_goal_fails(self):
        """CRITICAL: Test that transfer with transfer_authorized=False is rejected."""
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.unauthorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('transfer_authorized', str(cm.exception).lower())
        self.assertIn('must be True', str(cm.exception))
    
    def test_execute_transfer_with_unauthorized_goal_fails(self):
        """CRITICAL: Test that execute_transfer rejects unauthorized goals."""
        with self.assertRaises(ValidationError) as cm:
            execute_transfer(
                goal_id=str(self.unauthorized_goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('transfer_authorized', str(cm.exception).lower())
    
    def test_transfer_with_authorized_goal_succeeds(self):
        """Test that transfer with transfer_authorized=True passes validation."""
        result = validate_transfer_request(
            goal=self.authorized_goal,
            source_account=self.source_account,
            destination_account=self.destination_account,
            amount=Decimal('100.00'),
            user=self.user
        )
        self.assertTrue(result)
    
    def test_cannot_bypass_authorization_check(self):
        """Test that all code paths check transfer_authorized flag."""
        # Try to call validate_transfer_request directly with unauthorized goal
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.unauthorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        # Should fail with authorization error
        self.assertIn('transfer_authorized', str(cm.exception).lower())
        
        # Try to call execute_transfer with unauthorized goal
        with self.assertRaises(ValidationError) as cm:
            execute_transfer(
                goal_id=str(self.unauthorized_goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
        # Should fail with authorization error
        self.assertIn('transfer_authorized', str(cm.exception).lower())
    
    def test_account_ownership_cannot_be_spoofed(self):
        """Test that account ownership cannot be spoofed."""
        # Create account for other user
        other_account = Account.objects.create(
            user=self.other_user,
            institution_name='Other Bank',
            account_type='checking',
            account_number_masked='****9999',
            balance=Decimal('100.00'),
            plaid_account_id='plaid_other',
            plaid_access_token='encrypted_other',
            is_active=True
        )
        
        # Try to use other user's account as source
        with self.assertRaises(PermissionDenied):
            validate_transfer_request(
                goal=self.authorized_goal,
                source_account=other_account,  # Other user's account
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user  # Current user
            )
        
        # Try to use other user's account as destination
        other_dest = Account.objects.create(
            user=self.other_user,
            institution_name='Other Bank',
            account_type='savings',
            account_number_masked='****8888',
            balance=Decimal('100.00'),
            plaid_account_id='plaid_other_dest',
            plaid_access_token='encrypted_other',
            is_active=True
        )
        
        with self.assertRaises(PermissionDenied):
            validate_transfer_request(
                goal=self.authorized_goal,
                source_account=self.source_account,
                destination_account=other_dest,  # Other user's account
                amount=Decimal('100.00'),
                user=self.user  # Current user
            )
    
    def test_goal_ownership_cannot_be_spoofed(self):
        """Test that goal ownership cannot be spoofed."""
        # Create goal for other user
        other_goal = Goal.objects.create(
            user=self.other_user,
            name='Other User Goal',
            target_amount=Decimal('1000.00'),
            destination_account=self.destination_account,
            is_active=True,
            transfer_authorized=True
        )
        
        # Try to execute transfer for other user's goal
        with self.assertRaises(ValidationError) as cm:
            execute_transfer(
                goal_id=str(other_goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user  # Current user trying to use other user's goal
            )
        self.assertIn('not found', str(cm.exception).lower())
    
    def test_authorization_cannot_be_reused_across_users(self):
        """Test that authorization cannot be reused across different users."""
        # Create goal for other user
        other_goal = Goal.objects.create(
            user=self.other_user,
            name='Other User Goal',
            target_amount=Decimal('1000.00'),
            destination_account=self.destination_account,
            is_active=True,
            transfer_authorized=True
        )
        
        # Try to use authorization from one goal for another user's goal
        # This should fail because the goal doesn't belong to the user
        with self.assertRaises(ValidationError):
            execute_transfer(
                goal_id=str(other_goal.goal_id),
                source_account_id=str(self.source_account.account_id),
                destination_account_id=str(self.destination_account.account_id),
                amount=Decimal('100.00'),
                user=self.user
            )
    
    def test_inactive_goal_cannot_execute_transfers(self):
        """Test that inactive goals cannot execute transfers even if authorized."""
        self.authorized_goal.is_active = False
        self.authorized_goal.save()
        
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.authorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('active', str(cm.exception).lower())
    
    def test_inactive_accounts_cannot_be_used(self):
        """Test that inactive accounts cannot be used for transfers."""
        self.source_account.is_active = False
        self.source_account.save()
        
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.authorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('active', str(cm.exception).lower())
    
    def test_destination_must_match_goal_destination(self):
        """Test that destination account must match goal's destination account."""
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
                goal=self.authorized_goal,
                source_account=self.source_account,
                destination_account=other_dest,  # Different destination
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('destination', str(cm.exception).lower())
        self.assertIn('match', str(cm.exception).lower())
    
    def test_negative_amount_rejected(self):
        """Test that negative amounts are rejected."""
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.authorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('-100.00'),  # Negative amount
                user=self.user
            )
        self.assertIn('positive', str(cm.exception).lower())
    
    def test_zero_amount_rejected(self):
        """Test that zero amounts are rejected."""
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.authorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('0.00'),  # Zero amount
                user=self.user
            )
        self.assertIn('positive', str(cm.exception).lower())
    
    def test_no_authorization_rejected(self):
        """Test that transfers without active authorization are rejected."""
        # Delete authorization
        self.authorization.delete()
        
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.authorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('authorization', str(cm.exception).lower())
    
    def test_expired_authorization_rejected(self):
        """Test that expired authorizations are rejected."""
        # Set authorization status to expired
        self.authorization.status = 'expired'
        self.authorization.save()
        
        with self.assertRaises(ValidationError) as cm:
            validate_transfer_request(
                goal=self.authorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        self.assertIn('authorization', str(cm.exception).lower())
    
    def test_all_validation_layers_checked(self):
        """Test that all validation layers are checked independently."""
        # Test each layer independently
        
        # Layer 1: transfer_authorized
        self.unauthorized_goal.is_active = True
        self.unauthorized_goal.save()
        with self.assertRaises(ValidationError):
            validate_transfer_request(
                goal=self.unauthorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        
        # Layer 2: is_active
        self.authorized_goal.is_active = False
        self.authorized_goal.save()
        with self.assertRaises(ValidationError):
            validate_transfer_request(
                goal=self.authorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )
        
        # Reset for next test
        self.authorized_goal.is_active = True
        self.authorized_goal.save()
        
        # Layer 4: account active
        self.source_account.is_active = False
        self.source_account.save()
        with self.assertRaises(ValidationError):
            validate_transfer_request(
                goal=self.authorized_goal,
                source_account=self.source_account,
                destination_account=self.destination_account,
                amount=Decimal('100.00'),
                user=self.user
            )

