"""
Comprehensive database seeding script for Cashly test data.
Creates realistic test data for user armanghev747@gmail.com including:
- Bank accounts
- Transactions
- Bills and bill payments
- Budgets
- Savings goals
- Debt accounts
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random
from dateutil.relativedelta import relativedelta

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.accounts.models import Account
from apps.transactions.models import Transaction, Category
from apps.bills.models import Bill, BillPayment
from apps.budgets.models import Budget
from apps.goals.models import Goal, Contribution
from apps.debts.models import DebtAccount, DebtPayment
from apps.insights.models import Insight

User = get_user_model()

# Constants
USER_EMAIL = 'armanghev747@gmail.com'
MONTHS_OF_DATA = 6
TODAY = timezone.now().date()


def get_or_create_user():
    """Get or create the test user."""
    user, created = User.objects.get_or_create(
        email=USER_EMAIL,
        defaults={
            'username': 'armanghev747',
            'first_name': 'Arman',
            'last_name': 'Ghevondyan',
            'is_active': True,
            'subscription_tier': 'premium',
            'tour_done': True,
        }
    )
    if created:
        user.set_password('testpassword123')
        user.save()
        print(f"✓ Created user: {USER_EMAIL}")
    else:
        print(f"✓ Found existing user: {USER_EMAIL}")
    return user


def create_bank_accounts(user):
    """Create realistic bank accounts."""
    # Delete existing accounts for this user
    Account.objects.filter(user=user).delete()
    
    accounts_data = [
        {
            'institution_name': 'Chase Bank',
            'custom_name': 'Main Checking',
            'account_type': 'checking',
            'account_number_masked': '****1234',
            'balance': Decimal('12547.83'),
            'plaid_account_id': f'plaid_acct_checking_{user.id}',
            'plaid_access_token': 'encrypted_token_checking',
            'plaid_item_id': f'plaid_item_chase_{user.id}',
        },
        {
            'institution_name': 'Ally Bank',
            'custom_name': 'Savings',
            'account_type': 'savings',
            'account_number_masked': '****5678',
            'balance': Decimal('25234.56'),
            'plaid_account_id': f'plaid_acct_savings_{user.id}',
            'plaid_access_token': 'encrypted_token_savings',
            'plaid_item_id': f'plaid_item_ally_{user.id}',
        },
        {
            'institution_name': 'American Express',
            'custom_name': 'Blue Cash Everyday',
            'account_type': 'credit_card',
            'account_number_masked': '****9012',
            'balance': Decimal('-3247.91'),  # Negative for credit card
            'plaid_account_id': f'plaid_acct_credit_{user.id}',
            'plaid_access_token': 'encrypted_token_credit',
            'plaid_item_id': f'plaid_item_amex_{user.id}',
        },
    ]
    
    accounts = []
    for acc_data in accounts_data:
        account = Account.objects.create(user=user, currency='USD', **acc_data)
        accounts.append(account)
        print(f"✓ Created account: {acc_data['institution_name']} - {acc_data['custom_name']}")
    
    return accounts


def get_categories():
    """Get system categories for transactions."""
    # Get or create common categories
    categories = {}
    category_data = [
        ('Groceries', 'expense', '#4CAF50'),
        ('Restaurants', 'expense', '#FF9800'),
        ('Gas', 'expense', '#9C27B0'),
        ('Utilities', 'expense', '#2196F3'),
        ('Entertainment', 'expense', '#E91E63'),
        ('Shopping', 'expense', '#FF5722'),
        ('Healthcare', 'expense', '#00BCD4'),
        ('Transportation', 'expense', '#795548'),
        ('Salary', 'income', '#4CAF50'),
        ('Freelance', 'income', '#8BC34A'),
        ('Transfer', 'transfer', '#607D8B'),
    ]
    
    for name, cat_type, color in category_data:
        category, created = Category.objects.get_or_create(
            name=name,
            type=cat_type,
            is_system_category=True,
            defaults={'color': color}
        )
        categories[name] = category
        if created:
            print(f"✓ Created category: {name}")
    
    return categories


def create_transactions(user, accounts, categories):
    """Create realistic transaction history."""
    # Delete existing transactions for this user
    Transaction.objects.filter(user=user).delete()
    
    checking, savings, credit_card = accounts
    
    transactions = []
    
    # Monthly salary (last 6 months)
    for i in range(MONTHS_OF_DATA):
        date = TODAY - relativedelta(months=i, day=1)
        transactions.append({
            'account': checking,
            'amount': Decimal('5500.00'),
            'date': date,
            'merchant_name': 'Direct Deposit - Employer',
            'description': 'Monthly salary',
            'category': categories['Salary'],
        })
    
    # Freelance income (sporadic)
    for i in range(3):
        days_ago = random.randint(10, 150)
        transactions.append({
            'account': checking,
            'amount': Decimal(random.uniform(800, 2500)),
            'date': TODAY - timedelta(days=days_ago),
            'merchant_name': 'Freelance Client',
            'description': 'Freelance web development project',
            'category': categories['Freelance'],
        })
    
    # Regular expenses - Groceries
    grocery_stores = ['Whole Foods', 'Trader Joes', 'Safeway', 'Target']
    for i in range(25):
        days_ago = random.randint(1, 180)
        transactions.append({
            'account': credit_card,
            'amount': Decimal(-random.uniform(45, 180)),
            'date': TODAY - timedelta(days=days_ago),
            'merchant_name': random.choice(grocery_stores),
            'description': 'Groceries',
            'category': categories['Groceries'],
        })
    
    # Restaurants
    restaurants = ['Chipotle', 'Olive Garden', 'Starbucks', 'Panera Bread', 'Chick-fil-A']
    for i in range(30):
        days_ago = random.randint(1, 180)
        transactions.append({
            'account': credit_card,
            'amount': Decimal(-random.uniform(12, 65)),
            'date': TODAY - timedelta(days=days_ago),
            'merchant_name': random.choice(restaurants),
            'description': 'Dining',
            'category': categories['Restaurants'],
        })
    
    # Gas
    for i in range(15):
        days_ago = random.randint(1, 180)
        transactions.append({
            'account': credit_card,
            'amount': Decimal(-random.uniform(40, 75)),
            'date': TODAY - timedelta(days=days_ago),
            'merchant_name': 'Shell Gas Station',
            'description': 'Fuel',
            'category': categories['Gas'],
        })
    
    # Utilities (monthly)
    utility_companies = [
        ('PG&E Electric', 120, 180),
        ('Comcast Internet', 89.99, 89.99),
        ('Verizon Wireless', 75, 75),
    ]
    for company, min_amt, max_amt in utility_companies:
        for i in range(MONTHS_OF_DATA):
            date = TODAY - relativedelta(months=i, day=15)
            transactions.append({
                'account': checking,
                'amount': Decimal(-random.uniform(min_amt, max_amt)),
                'date': date,
                'merchant_name': company,
                'description': 'Monthly utility bill',
                'category': categories['Utilities'],
            })
    
    # Entertainment
    entertainment = ['Netflix', 'Spotify', 'Movie Theater', 'Amazon Prime']
    for i in range(20):
        days_ago = random.randint(1, 180)
        transactions.append({
            'account': credit_card,
            'amount': Decimal(-random.uniform(9.99, 45)),
            'date': TODAY - timedelta(days=days_ago),
            'merchant_name': random.choice(entertainment),
            'description': 'Entertainment',
            'category': categories['Entertainment'],
        })
    
    # Shopping
    stores = ['Amazon', 'Target', 'Best Buy', 'Macys']
    for i in range(15):
        days_ago = random.randint(1, 180)
        transactions.append({
            'account': credit_card,
            'amount': Decimal(-random.uniform(25, 250)),
            'date': TODAY - timedelta(days=days_ago),
            'merchant_name': random.choice(stores),
            'description': 'Shopping',
            'category': categories['Shopping'],
        })
    
    # Create all transactions
    for txn_data in transactions:
        Transaction.objects.create(user=user, **txn_data)
    
    print(f"✓ Created {len(transactions)} transactions")
    return len(transactions)


def create_bills(user, categories):
    """Create recurring bills."""
    # Delete existing bills for this user
    Bill.objects.filter(user=user).delete()
    
    bills_data = [
        ('Netflix', 15.99, 'monthly', 5, categories['Entertainment']),
        ('Spotify', 10.99, 'monthly', 8, categories['Entertainment']),
        ('PG&E Electric', 145.00, 'monthly', 15, categories['Utilities']),
        ('Comcast Internet', 89.99, 'monthly', 10, categories['Utilities']),
        ('Verizon Wireless', 75.00, 'monthly', 20, categories['Utilities']),
        ('Car Insurance', 125.00, 'monthly', 1, categories['Transportation']),
        ('Amazon Prime', 14.99, 'monthly', 12, categories['Shopping']),
        ('Gym Membership', 39.99, 'monthly', 1, categories['Healthcare']),
    ]
    
    bills = []
    for name, amount, frequency, due_day, category in bills_data:
        # Calculate next due date
        next_due = TODAY.replace(day=due_day)
        if next_due < TODAY:
            next_due = (next_due + relativedelta(months=1))
        
        bill = Bill.objects.create(
            user=user,
            name=name,
            category=category,
            amount=Decimal(amount),
            frequency=frequency,
            due_day=due_day,
            next_due_date=next_due,
            last_paid_date=next_due - relativedelta(months=1),
            payee=name,
            reminder_days=3,
            reminder_enabled=True,
            is_autopay=random.choice([True, False]),
        )
        bills.append(bill)
        
        # Create payment history (last 3 months)
        for i in range(1, 4):
            payment_date = next_due - relativedelta(months=i)
            BillPayment.objects.create(
                bill=bill,
                user=user,
                amount=Decimal(amount),
                payment_date=payment_date,
            )
        
        print(f"✓ Created bill: {name}")
    
    return bills


def create_budgets(user, categories):
    """Create monthly budgets."""
    # Delete existing budgets for this user
    Budget.objects.filter(user=user).delete()
    
    # Current month period
    period_start = TODAY.replace(day=1)
    period_end = (period_start + relativedelta(months=1)) - timedelta(days=1)
    
    budgets_data = [
        (categories['Groceries'], 600),
        (categories['Restaurants'], 400),
        (categories['Entertainment'], 200),
        (categories['Transportation'], 300),
        (categories['Shopping'], 250),
    ]
    
    budgets = []
    for category, amount in budgets_data:
        budget = Budget.objects.create(
            user=user,
            category=category,
            period_type='monthly',
            amount=Decimal(amount),
            period_start=period_start,
            period_end=period_end,
            alerts_enabled=True,
            alert_threshold=Decimal('80.00'),
        )
        budgets.append(budget)
        print(f"✓ Created budget: {category.name} - ${amount}/month")
    
    return budgets


def create_goals(user, accounts):
    """Create savings goals with contributions."""
    # Delete existing goals for this user
    Goal.objects.filter(user=user).delete()
    
    checking, savings, _ = accounts
    
    goals_data = [
        {
            'name': 'Emergency Fund',
            'target_amount': Decimal('10000.00'),
            'current_amount': Decimal('4500.00'),
            'goal_type': 'emergency_fund',
            'monthly_contribution': Decimal('500.00'),
            'deadline': TODAY + timedelta(days=360),
            'is_active': True,
        },
        {
            'name': 'Vacation to Europe',
            'target_amount': Decimal('5000.00'),
            'current_amount': Decimal('2100.00'),
            'goal_type': 'vacation',
            'monthly_contribution': Decimal('300.00'),
            'deadline': TODAY + timedelta(days=270),
            'is_active': True,
        },
        {
            'name': 'New Laptop',
            'target_amount': Decimal('2000.00'),
            'current_amount': Decimal('800.00'),
            'goal_type': 'purchase',
            'monthly_contribution': Decimal('200.00'),
            'deadline': TODAY + timedelta(days=180),
            'is_active': True,
        },
        {
            'name': 'Down Payment Fund',
            'target_amount': Decimal('50000.00'),
            'current_amount': Decimal('12500.00'),
            'goal_type': 'custom',
            'monthly_contribution': Decimal('1000.00'),
            'deadline': TODAY + timedelta(days=900),
            'is_active': True,
        },
    ]
    
    goals = []
    for goal_data in goals_data:
        goal = Goal.objects.create(user=user, destination_account=savings, **goal_data)
        goals.append(goal)
        
        # Create contribution history
        num_contributions = random.randint(5, 12)
        total_contributed = Decimal('0.00')
        
        for i in range(num_contributions):
            days_ago = random.randint(10, 180)
            contribution_amount = Decimal(random.uniform(50, 500))
            total_contributed += contribution_amount
            
            # Ensure we don't exceed current_amount
            if total_contributed > goal_data['current_amount']:
                contribution_amount = goal_data['current_amount'] - (total_contributed - contribution_amount)
                if contribution_amount <= 0:
                    break
            
            Contribution.objects.create(
                goal=goal,
                user=user,
                amount=contribution_amount,
                date=TODAY - timedelta(days=days_ago),
                source='manual',
                note=f'Monthly contribution #{i+1}',
            )
        
        print(f"✓ Created goal: {goal_data['name']} (${goal_data['current_amount']}/${goal_data['target_amount']})")
    
    return goals


def create_debts(user):
    """Create debt accounts with payment history."""
    # Delete existing debts for this user
    DebtAccount.objects.filter(user=user).delete()
    
    debts_data = [
        {
            'name': 'Chase Freedom Credit Card',
            'debt_type': 'credit_card',
            'current_balance': Decimal('5247.83'),
            'original_balance': Decimal('7500.00'),
            'interest_rate': Decimal('18.99'),
            'minimum_payment': Decimal('125.00'),
            'due_day': 25,
            'creditor_name': 'Chase Bank',
            'account_number_masked': '****3456',
            'status': 'active',
            'opened_date': TODAY - timedelta(days=730),
        },
        {
            'name': 'Toyota Camry Auto Loan',
            'debt_type': 'auto_loan',
            'current_balance': Decimal('18543.22'),
            'original_balance': Decimal('28000.00'),
            'interest_rate': Decimal('4.25'),
            'minimum_payment': Decimal('475.00'),
            'due_day': 5,
            'creditor_name': 'Toyota Financial',
            'account_number_masked': '****7890',
            'status': 'active',
            'opened_date': TODAY - timedelta(days=900),
            'target_payoff_date': TODAY + timedelta(days=1200),
        },
        {
            'name': 'Student Loan',
            'debt_type': 'student_loan',
            'current_balance': Decimal('12875.50'),
            'original_balance': Decimal('25000.00'),
            'interest_rate': Decimal('5.50'),
            'minimum_payment': Decimal('285.00'),
            'due_day': 15,
            'creditor_name': 'Nelnet',
            'account_number_masked': '****2345',
            'status': 'active',
            'opened_date': TODAY - timedelta(days=1825),
            'target_payoff_date': TODAY + timedelta(days=1800),
        },
    ]
    
    debts = []
    for debt_data in debts_data:
        debt = DebtAccount.objects.create(user=user, **debt_data)
        debts.append(debt)
        
        # Create payment history (last 6 months)
        for i in range(1, 7):
            payment_date = TODAY - relativedelta(months=i, day=debt_data['due_day'])
            payment_amount = debt_data['minimum_payment']
            
            # Calculate split between principal and interest
            monthly_rate = debt_data['interest_rate'] / Decimal('100') / Decimal('12')
            interest_amount = (debt_data['current_balance'] * monthly_rate).quantize(Decimal('0.01'))
            principal_amount = payment_amount - interest_amount
            
            DebtPayment.objects.create(
                debt=debt,
                user=user,
                amount=payment_amount,
                payment_date=payment_date,
                payment_type='minimum',
                applied_to_principal=principal_amount,
                applied_to_interest=interest_amount,
            )
        
        print(f"✓ Created debt: {debt_data['name']} (${debt_data['current_balance']} @ {debt_data['interest_rate']}%)")
    
    return debts


def create_insights(user):
    """Create sample insights."""
    # Delete existing insights for this user
    Insight.objects.filter(user=user).delete()
    
    insights_data = [
        {
            'insight_type': 'spending_trend',
            'title': 'Dining costs increased by 25% this month',
            'description': 'Your dining expenses have increased significantly compared to last month. Consider meal prep to save money.',
            'priority': 'medium',
            'metadata': {
                'current_month': 450.50,
                'previous_month': 360.25,
                'increase_percent': 25,
            },
        },
        {
            'insight_type': 'savings_opportunity',
            'title': 'On track for Emergency Fund goal',
            'description': 'Great job! At your current contribution rate, you\'ll reach your Emergency Fund goal in 11 months.',
            'priority': 'low',
            'metadata': {
                'goal_name': 'Emergency Fund',
                'months_remaining': 11,
                'progress_percent': 45,
            },
        },
        {
            'insight_type': 'budget_insight',
            'title': '3 bills due this week',
            'description': 'You have 3 bills totaling $250.98 due this week. Make sure you have sufficient funds.',
            'priority': 'high',
            'metadata': {
                'bills_count': 3,
                'total_amount': 250.98,
            },
        },
    ]
    
    for insight_data in insights_data:
        Insight.objects.create(user=user, **insight_data)
        print(f"✓ Created insight: {insight_data['title']}")


def main():
    """Main seeding function."""
    print("\n" + "="*60)
    print("🌱 Starting Cashly Database Seeding")
    print("="*60 + "\n")
    
    # Create user
    user = get_or_create_user()
    
    # Create bank accounts
    print("\n📊 Creating bank accounts...")
    accounts = create_bank_accounts(user)
    
    # Get/create categories
    print("\n📁 Setting up categories...")
    categories = get_categories()
    
    # Create transactions
    print("\n💸 Creating transactions...")
    create_transactions(user, accounts, categories)
    
    # Create bills
    print("\n📄 Creating bills...")
    create_bills(user, categories)
    
    # Create budgets
    print("\n💰 Creating budgets...")
    create_budgets(user, categories)
    
    # Create goals
    print("\n🎯 Creating savings goals...")
    create_goals(user, accounts)
    
    # Create debts
    print("\n💳 Creating debt accounts...")
    create_debts(user)
    
    # Create insights
    print("\n💡 Creating insights...")
    create_insights(user)
    
    print("\n" + "="*60)
    print("✅ Database seeding completed successfully!")
    print("="*60)
    print(f"\n📧 Test user email: {USER_EMAIL}")
    print(f"🔑 Test user password: testpassword123")
    print("\nYou can now log in to the app and test all features!\n")


if __name__ == '__main__':
    main()
