from decimal import Decimal
from datetime import date, timedelta
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.transactions.models import Category
from apps.accounts.models import Account
from apps.bills.models import Bill, BillPayment

User = get_user_model()


class BillTests(APITestCase):
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
            name='Utilities',
            type='expense',
            icon='zap',
            color='#FFA500'
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
        
        # Create bill
        self.bill = Bill.objects.create(
            user=self.user,
            name='Electric Bill',
            category=self.category,
            amount=Decimal('150.00'),
            frequency='monthly',
            due_day=15,
            next_due_date=date.today() + timedelta(days=10),
            payee='Electric Company',
            account=self.account
        )
        
        self.list_url = reverse('bills:bill-list')
        self.detail_url = reverse('bills:bill-detail', kwargs={'pk': self.bill.pk})
    
    def test_create_bill(self):
        """Test creating a new bill."""
        data = {
            'name': 'Internet Bill',
            'category': str(self.category.category_id),
            'amount': '80.00',
            'frequency': 'monthly',
            'due_day': 1,
            'next_due_date': (date.today() + timedelta(days=15)).isoformat(),
            'payee': 'ISP Company',
            'reminder_days': 3,
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Bill.objects.count(), 2)
        created_bill = Bill.objects.get(name='Internet Bill')
        self.assertEqual(created_bill.amount, Decimal('80.00'))
        self.assertEqual(created_bill.frequency, 'monthly')
    
    def test_list_bills(self):
        """Test listing bills."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['name'], 'Electric Bill')
    
    def test_retrieve_bill(self):
        """Test retrieving a specific bill."""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['data']['name'], 'Electric Bill')
        self.assertEqual(response.data['data']['amount'], str(self.bill.amount))
    
    def test_update_bill(self):
        """Test updating a bill."""
        data = {
            'amount': '175.00',
            'reminder_days': 5,
        }
        response = self.client.patch(self.detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.amount, Decimal('175.00'))
        self.assertEqual(self.bill.reminder_days, 5)
    
    def test_delete_bill(self):
        """Test deleting a bill."""
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Bill.objects.count(), 0)
    
    def test_bill_permissions(self):
        """Test that users can only access their own bills."""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpassword'
        )
        self.client.force_authenticate(user=other_user)
        
        # Try to retrieve first user's bill
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_mark_as_paid(self):
        """Test marking bill as paid."""
        url = reverse('bills:bill-mark-as-paid', kwargs={'pk': self.bill.pk})
        original_due_date = self.bill.next_due_date
        
        data = {
            'amount': '150.00',
            'payment_date': date.today().isoformat(),
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh bill and check it was updated
        self.bill.refresh_from_db()
        self.assertEqual(self.bill.last_paid_date, date.today())
        self.assertNotEqual(self.bill.next_due_date, original_due_date)
        
        # Check payment was created
        self.assertEqual(BillPayment.objects.count(), 1)
        payment = BillPayment.objects.first()
        self.assertEqual(payment.amount, Decimal('150.00'))
        self.assertEqual(payment.bill, self.bill)
    
    def test_upcoming_bills(self):
        """Test getting upcoming bills."""
        # Create a bill due in 3 days
        Bill.objects.create(
            user=self.user,
            name='Water Bill',
            amount=Decimal('50.00'),
            frequency='monthly',
            due_day=1,
            next_due_date=date.today() + timedelta(days=3)
        )
        
        url = reverse('bills:bill-upcoming')
        response = self.client.get(url, {'days': 7})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 2)  # Both bills within 7 days
    
    def test_overdue_bills(self):
        """Test getting overdue bills."""
        # Create an overdue bill
        Bill.objects.create(
            user=self.user,
            name='Overdue Bill',
            amount=Decimal('100.00'),
            frequency='monthly',
            due_day=1,
            next_due_date=date.today() - timedelta(days=5)
        )
        
        url = reverse('bills:bill-overdue')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['name'], 'Overdue Bill')
    
    def test_calculate_next_due_date_monthly(self):
        """Test calculating next due date for monthly bills."""
        bill = Bill.objects.create(
            user=self.user,
            name='Test Monthly',
            amount=Decimal('100.00'),
            frequency='monthly',
            due_day=15,
            next_due_date=date(2025, 1, 15),
            last_paid_date=date(2025, 1, 15)
        )
        
        next_date = bill.calculate_next_due_date(date(2025, 1, 15))
        self.assertEqual(next_date, date(2025, 2, 15))
    
    def test_calculate_next_due_date_weekly(self):
        """Test calculating next due date for weekly bills."""
        bill = Bill.objects.create(
            user=self.user,
            name='Test Weekly',
            amount=Decimal('50.00'),
            frequency='weekly',
            due_day=1,
            next_due_date=date(2025, 1, 6),
            last_paid_date=date(2025, 1, 6)
        )
        
        next_date = bill.calculate_next_due_date(date(2025, 1, 6))
        self.assertEqual(next_date, date(2025, 1, 13))
    
    def test_is_overdue_property(self):
        """Test is_overdue property."""
        # Create overdue bill
        overdue_bill = Bill.objects.create(
            user=self.user,
            name='Overdue',
            amount=Decimal('100.00'),
            frequency='monthly',
            due_day=1,
            next_due_date=date.today() - timedelta(days=1)
        )
        self.assertTrue(overdue_bill.is_overdue)
        
        # Test active bill not overdue
        self.assertFalse(self.bill.is_overdue)
    
    def test_days_until_due_property(self):
        """Test days_until_due property."""
        bill = Bill.objects.create(
            user=self.user,
            name='Test Bill',
            amount=Decimal('100.00'),
            frequency='monthly',
            due_day=1,
            next_due_date=date.today() + timedelta(days=5)
        )
        self.assertEqual(bill.days_until_due, 5)
        
        # Test overdue bill (negative days)
        overdue = Bill.objects.create(
            user=self.user,
            name='Overdue',
            amount=Decimal('100.00'),
            frequency='monthly',
            due_day=1,
            next_due_date=date.today() - timedelta(days=3)
        )
        self.assertEqual(overdue.days_until_due, -3)
