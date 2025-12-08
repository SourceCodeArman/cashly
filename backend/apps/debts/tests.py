"""
Tests for debts app.
"""
from decimal import Decimal
from datetime import date, timedelta
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.debts.models import DebtAccount, DebtPayment, DebtPayoffStrategy
from apps.debts.utils import (
    calculate_monthly_interest,
    calculate_payoff_months,
    generate_snowball_order,
    generate_avalanche_order,
)

User = get_user_model()


class DebtAccountTests(APITestCase):
    def setUp(self):
        # Create user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create debt
        self.debt = DebtAccount.objects.create(
            user=self.user,
            name='Credit Card',
            debt_type='credit_card',
            current_balance=Decimal('5000.00'),
            original_balance=Decimal('6000.00'),
            interest_rate=Decimal('18.00'),
            minimum_payment=Decimal('150.00'),
            due_day=15,
            creditor_name='Chase Bank'
        )
        
        self.list_url = reverse('debts:debt-list')
        self.detail_url = reverse('debts:debt-detail', kwargs={'pk': self.debt.pk})
    
    def test_create_debt(self):
        """Test creating a new debt."""
        data = {
            'name': 'Student Loan',
            'debt_type': 'student_loan',
            'current_balance': '25000.00',
            'original_balance': '30000.00',
            'interest_rate': '6.50',
            'minimum_payment': '300.00',
            'due_day': 1,
            'creditor_name': 'Nelnet'
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DebtAccount.objects.count(), 2)
        
        created_debt = DebtAccount.objects.get(name='Student Loan')
        self.assertEqual(created_debt.current_balance, Decimal('25000.00'))
        self.assertEqual(created_debt.debt_type, 'student_loan')
    
    def test_list_debts(self):
        """Test listing debts."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['name'], 'Credit Card')
    
    def test_retrieve_debt(self):
        """Test retrieving a specific debt."""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['name'], 'Credit Card')
        self.assertEqual(response.data['data']['current_balance'], str(self.debt.current_balance))
    
    def test_update_debt(self):
        """Test updating a debt."""
        data = {
            'current_balance': '4500.00',
            'interest_rate': '16.00',
        }
        response = self.client.patch(self.detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.debt.refresh_from_db()
        self.assertEqual(self.debt.current_balance, Decimal('4500.00'))
        self.assertEqual(self.debt.interest_rate, Decimal('16.00'))
    
    def test_delete_debt(self):
        """Test deleting a debt."""
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(DebtAccount.objects.count(), 0)
    
    def test_debt_permissions(self):
        """Test that users can only access their own debts."""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpassword'
        )
        self.client.force_authenticate(user=other_user)
        
        # Try to retrieve first user's debt
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_mark_as_paid_off(self):
        """Test marking debt as paid off."""
        url = reverse('debts:debt-mark-paid-off', kwargs={'pk': self.debt.pk})
        
        response = self.client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.debt.refresh_from_db()
        self.assertEqual(self.debt.status, 'paid_off')
        self.assertEqual(self.debt.current_balance, Decimal('0.00'))
        self.assertFalse(self.debt.is_active)
    
    def test_get_projection(self):
        """Test getting payoff projection."""
        url = reverse('debts:debt-projection', kwargs={'pk': self.debt.pk})
        
        response = self.client.get(url, {'monthly_payment': '200.00'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('projection', response.data['data'])
        self.assertGreater(len(response.data['data']['projection']), 0)
    
    def test_monthly_interest_property(self):
        """Test monthly interest calculation."""
        # 5000 * 0.18 / 12 = 75.00
        expected_interest = Decimal('75.00')
        self.assertEqual(self.debt.monthly_interest, expected_interest)
    
    def test_days_until_due_property(self):
        """Test days until due calculation."""
        days = self.debt.days_until_due
        self.assertIsInstance(days, int)
    
    def test_calculate_payoff_date_method(self):
        """Test payoff date calculation."""
        months, total_interest = self.debt.calculate_payoff_date(Decimal('200.00'))
        
        self.assertIsNotNone(months)
        self.assertIsNotNone(total_interest)
        self.assertGreater(months, 0)
        self.assertGreater(total_interest, Decimal('0.00'))


class DebtPaymentTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        self.client.force_authenticate(user=self.user)
        
        self.debt = DebtAccount.objects.create(
            user=self.user,
            name='Credit Card',
            debt_type='credit_card',
            current_balance=Decimal('5000.00'),
            original_balance=Decimal('6000.00'),
            interest_rate=Decimal('18.00'),
            minimum_payment=Decimal('150.00'),
            due_day=15
        )
        
        self.list_url = reverse('debts:debt-payment-list')
    
    def test_create_payment(self):
        """Test recording a debt payment."""
        original_balance = self.debt.current_balance
        
        data = {
            'debt': str(self.debt.debt_id),
            'amount': '200.00',
            'payment_date': date.today().isoformat(),
            'payment_type': 'extra',
            'notes': 'Extra payment this month'
        }
        
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check payment was created
        self.assertEqual(DebtPayment.objects.count(), 1)
        payment = DebtPayment.objects.first()
        
        # Check principal/interest split
        self.assertEqual(payment.applied_to_interest, Decimal('75.00'))  # 5000 * 0.18 / 12
        self.assertEqual(payment.applied_to_principal, Decimal('125.00'))  # 200 - 75
        
        # Check balance was updated
        self.debt.refresh_from_db()
        self.assertEqual(self.debt.current_balance, original_balance - Decimal('125.00'))
        self.assertEqual(self.debt.last_payment_amount, Decimal('200.00'))
    
    def test_list_payments(self):
        """Test listing payments."""
        DebtPayment.objects.create(
            debt=self.debt,
            user=self.user,
            amount=Decimal('150.00'),
            payment_type='minimum',
            applied_to_principal=Decimal('75.00'),
            applied_to_interest=Decimal('75.00')
        )
        
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
    
    def test_filter_payments_by_debt(self):
        """Test filtering payments by debt."""
        # Create another debt and payment
        other_debt = DebtAccount.objects.create(
            user=self.user,
            name='Car Loan',
            debt_type='auto_loan',
            current_balance=Decimal('10000.00'),
            original_balance=Decimal('15000.00'),
            interest_rate=Decimal('5.00'),
            minimum_payment=Decimal('300.00'),
            due_day=1
        )
        
        DebtPayment.objects.create(
            debt=self.debt,
            user=self.user,
            amount=Decimal('150.00'),
            payment_type='minimum',
            applied_to_principal=Decimal('75.00'),
            applied_to_interest=Decimal('75.00')
        )
        
        DebtPayment.objects.create(
            debt=other_debt,
            user=self.user,
            amount=Decimal('300.00'),
            payment_type='minimum',
            applied_to_principal=Decimal('250.00'),
            applied_to_interest=Decimal('50.00')
        )
        
        url = f"{self.list_url}?debt={self.debt.debt_id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)


class DebtStrategyTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create multiple debts for strategy testing
        self.debt1 = DebtAccount.objects.create(
            user=self.user,
            name='Credit Card',
            debt_type='credit_card',
            current_balance=Decimal('2000.00'),
            original_balance=Decimal('2000.00'),
            interest_rate=Decimal('18.00'),
            minimum_payment=Decimal('50.00'),
            due_day=15
        )
        
        self.debt2 = DebtAccount.objects.create(
            user=self.user,
            name='Car Loan',
            debt_type='auto_loan',
            current_balance=Decimal('5000.00'),
            original_balance=Decimal('10000.00'),
            interest_rate=Decimal('6.00'),
            minimum_payment=Decimal('200.00'),
            due_day=1
        )
        
        self.list_url = reverse('debts:debt-strategy-list')
    
    def test_create_snowball_strategy(self):
        """Test creating a snowball strategy."""
        data = {
            'strategy_type': 'snowball',
            'monthly_budget': '400.00',
            'is_active': True
        }
        
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        strategy = DebtPayoffStrategy.objects.first()
        self.assertEqual(strategy.strategy_type, 'snowball')
        
        # Snowball should prioritize smallest balance first
        self.assertEqual(strategy.priority_order[0], str(self.debt1.debt_id))
    
    def test_create_avalanche_strategy(self):
        """Test creating an avalanche strategy."""
        data = {
            'strategy_type': 'avalanche',
            'monthly_budget': '400.00',
            'is_active': True
        }
        
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        strategy = DebtPayoffStrategy.objects.first()
        self.assertEqual(strategy.strategy_type, 'avalanche')
        
        # Avalanche should prioritize highest interest rate first
        self.assertEqual(strategy.priority_order[0], str(self.debt1.debt_id))
    
    def test_compare_strategies(self):
        """Test comparing snowball vs avalanche."""
        url = reverse('debts:debt-strategy-compare')
        
        response = self.client.get(url, {'monthly_budget': '400.00'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertIn('snowball', response.data['data'])
        self.assertIn('avalanche', response.data['data'])
        self.assertIn('savings', response.data['data'])


class DebtUtilsTests(APITestCase):
    """Test utility functions."""
    
    def test_calculate_monthly_interest(self):
        """Test monthly interest calculation."""
        balance = Decimal('5000.00')
        apr = Decimal('18.00')
        
        interest = calculate_monthly_interest(balance, apr)
        expected = Decimal('75.00')  # 5000 * 0.18 / 12
        
        self.assertEqual(interest, expected)
    
    def test_calculate_payoff_months(self):
        """Test payoff months calculation."""
        balance = Decimal('5000.00')
        apr = Decimal('18.00')
        payment = Decimal('200.00')
        
        months = calculate_payoff_months(balance, apr, payment)
        
        self.assertIsNotNone(months)
        self.assertGreater(months, 0)
    
    def test_snowball_ordering(self):
        """Test snowball debt ordering."""
        user = User.objects.create_user(username='test', email='test@test.com', password='test')
        
        debt1 = DebtAccount.objects.create(
            user=user,
            name='Small Debt',
            debt_type='credit_card',
            current_balance=Decimal('1000.00'),
            original_balance=Decimal('1000.00'),
            interest_rate=Decimal('20.00'),
            minimum_payment=Decimal('50.00'),
            due_day=15
        )
        
        debt2 = DebtAccount.objects.create(
            user=user,
            name='Large Debt',
            debt_type='auto_loan',
            current_balance=Decimal('10000.00'),
            original_balance=Decimal('10000.00'),
            interest_rate=Decimal('5.00'),
            minimum_payment=Decimal('300.00'),
            due_day=1
        )
        
        debts = DebtAccount.objects.filter(user=user)
        order = generate_snowball_order(debts)
        
        # Should prioritize smallest balance first
        self.assertEqual(order[0], str(debt1.debt_id))
        self.assertEqual(order[1], str(debt2.debt_id))
    
    def test_avalanche_ordering(self):
        """Test avalanche debt ordering."""
        user = User.objects.create_user(username='test', email='test@test.com', password='test')
        
        debt1 = DebtAccount.objects.create(
            user=user,
            name='Low Interest',
            debt_type='auto_loan',
            current_balance=Decimal('10000.00'),
            original_balance=Decimal('10000.00'),
            interest_rate=Decimal('5.00'),
            minimum_payment=Decimal('300.00'),
            due_day=1
        )
        
        debt2 = DebtAccount.objects.create(
            user=user,
            name='High Interest',
            debt_type='credit_card',
            current_balance=Decimal('2000.00'),
            original_balance=Decimal('2000.00'),
            interest_rate=Decimal('22.00'),
            minimum_payment=Decimal('50.00'),
            due_day=15
        )
        
        debts = DebtAccount.objects.filter(user=user)
        order = generate_avalanche_order(debts)
        
        # Should prioritize highest interest rate first
        self.assertEqual(order[0], str(debt2.debt_id))
        self.assertEqual(order[1], str(debt1.debt_id))
