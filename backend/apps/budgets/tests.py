from decimal import Decimal
from datetime import date, timedelta
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.transactions.models import Category, Transaction
from apps.budgets.models import Budget
from apps.budgets.utils import (
    calculate_budget_usage,
    get_budget_status,
    get_budgets_needing_alerts,
    get_active_budgets_for_period
)
from apps.accounts.models import Account

User = get_user_model()

class BudgetTests(APITestCase):
    def setUp(self):
        # Create user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpassword'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create category
        self.category = Category.objects.create(
            user=self.user,
            name='Groceries',
            type='expense',
            icon='shopping-cart',
            color='#FF0000'
        )
        
        # Create account
        self.account = Account.objects.create(
            user=self.user,
            institution_name='Test Bank',
            account_type='checking',
            account_number_masked='1234',
            plaid_account_id='test_plaid_id',
            plaid_access_token='test_token'
        )
        
        # Create budget
        self.budget_amount = Decimal('1000.00')
        self.budget = Budget.objects.create(
            user=self.user,
            category=self.category,
            amount=self.budget_amount,
            period_start=date.today().replace(day=1),
            period_end=date.today().replace(day=28),
            alert_threshold=Decimal('80.00')
        )
        
        self.list_url = reverse('budgets:budget-list')
        self.detail_url = reverse('budgets:budget-detail', kwargs={'pk': self.budget.pk})

    def test_create_budget(self):
        """Test creating a new budget."""
        data = {
            'category': self.category.category_id,
            'amount': '500.00',
            'period_type': 'monthly',
            'period_start': date.today(),
            'period_end': date.today() + timedelta(days=30),
            'alert_threshold': '90.00'
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Budget.objects.count(), 2)
        created_budget = Budget.objects.get(amount=Decimal('500.00'))
        self.assertEqual(created_budget.category.category_id, self.category.category_id)

    def test_list_budgets(self):
        """Test listing budgets."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertIn('usage', response.data['data'][0])

    def test_retrieve_budget(self):
        """Test retrieving a specific budget."""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['amount'], str(self.budget_amount))
        self.assertIn('usage', response.data['data'])

    def test_update_budget(self):
        """Test updating a budget."""
        data = {
            'amount': '1500.00',
            'alert_threshold': '85.00'
        }
        response = self.client.patch(self.detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.budget.refresh_from_db()
        self.assertEqual(self.budget.amount, Decimal('1500.00'))
        self.assertEqual(self.budget.alert_threshold, Decimal('85.00'))

    def test_delete_budget(self):
        """Test deleting a budget."""
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Budget.objects.count(), 0)

    def test_budget_permissions(self):
        """Test that users can only access their own budgets."""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpassword'
        )
        self.client.force_authenticate(user=other_user)
        
        # Try to retrieve first user's budget
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_calculate_budget_usage(self):
        """Test budget usage calculation logic."""
        # Create transaction
        Transaction.objects.create(
            user=self.user,
            account=self.account,
            category=self.category,
            amount=Decimal('-200.00'),
            date=date.today(),
            description='Grocery shopping'
        )
        
        usage = calculate_budget_usage(self.budget)
        
        self.assertEqual(usage['spent'], '200.00')
        self.assertEqual(usage['remaining'], '800.00')
        self.assertEqual(usage['percentage_used'], 20.0)
        self.assertFalse(usage['is_over_budget'])
        self.assertFalse(usage['alert_threshold_reached'])

    def test_budget_status_warning(self):
        """Test budget status when warning threshold is reached."""
        # Spend 85% of budget (threshold is 80%)
        Transaction.objects.create(
            user=self.user,
            account=self.account,
            category=self.category,
            amount=Decimal('-850.00'),
            date=date.today(),
            description='Big shopping'
        )
        
        status_str = get_budget_status(self.budget)
        self.assertEqual(status_str, 'warning')
        
        needing_alerts = get_budgets_needing_alerts(self.user)
        self.assertIn(self.budget, needing_alerts)

    def test_budget_status_exceeded(self):
        """Test budget status when budget is exceeded."""
        # Spend 110% of budget
        Transaction.objects.create(
            user=self.user,
            account=self.account,
            category=self.category,
            amount=Decimal('-1100.00'),
            date=date.today(),
            description='Over budget'
        )
        
        status_str = get_budget_status(self.budget)
        self.assertEqual(status_str, 'exceeded')
        
        needing_alerts = get_budgets_needing_alerts(self.user)
        self.assertIn(self.budget, needing_alerts)

    def test_get_active_budgets_for_period(self):
        """Test retrieving active budgets for a period."""
        today = date.today()
        budgets = get_active_budgets_for_period(self.user, today.month, today.year)
        self.assertIn(self.budget, budgets)
        
        # Test future date
        future_date = today + timedelta(days=60)
        budgets = get_active_budgets_for_period(self.user, future_date.month, future_date.year)
        self.assertNotIn(self.budget, budgets)
