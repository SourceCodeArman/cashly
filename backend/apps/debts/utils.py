"""
Utility functions for debt calculations and strategies.
"""
from decimal import Decimal
from datetime import date
from dateutil.relativedelta import relativedelta
from typing import List, Dict, Tuple, Optional
from django.db.models import QuerySet, Sum


def calculate_monthly_interest(balance: Decimal, apr: Decimal) -> Decimal:
    """
    Calculate monthly interest accrued on a balance.
    
    Args:
        balance: Current balance
        apr: Annual Percentage Rate  
    
    Returns:
        Monthly interest amount
    """
    if apr == 0 or balance == 0:
        return Decimal('0.00')
    
    monthly_rate = apr / Decimal('100') / Decimal('12')
    interest = balance * monthly_rate
    return interest.quantize(Decimal('0.01'))


def calculate_payoff_months(balance: Decimal, apr: Decimal, payment: Decimal) -> Optional[int]:
    """
    Calculate number of months to pay off debt at given payment amount.
    
    Args:
        balance: Current balance
        apr: Annual Percentage Rate
        payment: Monthly payment amount
    
    Returns:
        Number of months, or None if will never pay off
    """
    if payment <= calculate_monthly_interest(balance, apr):
        return None  # Payment doesn't cover interest
    
    months = 0
    current_balance = balance
    
    while current_balance > Decimal('0.00') and months < 600:  # Cap at 50 years
        interest = calculate_monthly_interest(current_balance, apr)
        principal = payment - interest
        
        if principal <= 0:
            return None
        
        current_balance -= principal
        months += 1
    
    return months if current_balance <= Decimal('0.00') else None


def calculate_total_interest_paid(balance: Decimal, apr: Decimal, payment: Decimal) -> Optional[Decimal]:
    """
    Calculate total interest paid over the lifetime of the debt.
    
    Args:
        balance: Current balance
        apr: Annual Percentage Rate
        payment: Monthly payment amount
    
    Returns:
        Total interest paid, or None if will never pay off
    """
    if payment <= calculate_monthly_interest(balance, apr):
        return None
    
    total_interest = Decimal('0.00')
    current_balance = balance
    months = 0
    
    while current_balance > Decimal('0.00') and months < 600:
        interest = calculate_monthly_interest(current_balance, apr)
        principal = payment - interest
        
        if principal <= 0:
            return None
        
        total_interest += interest
        current_balance -= principal
        months += 1
    
    return total_interest.quantize(Decimal('0.01'))


def generate_payoff_projection(debt, monthly_payment: Decimal, max_months: int = 600) -> List[Dict]:
    """
    Generate month-by-month projection of debt payoff.
    
    Args:
        debt: DebtAccount instance
        monthly_payment: Monthly payment amount
        max_months: Maximum months to project
    
    Returns:
        List of dicts with month, balance, interest, principal, total_paid
    """
    projection = []
    balance = debt.current_balance
    total_paid = Decimal('0.00')
    month = 0
    current_date = date.today()
    
    while balance > Decimal('0.00') and month < max_months:
        interest = calculate_monthly_interest(balance, debt.interest_rate)
        
        # Calculate principal (ensure we don't overpay)
        principal = min(monthly_payment - interest, balance)
        actual_payment = interest + principal
        
        balance -= principal
        total_paid += actual_payment
        month += 1
        
        projection.append({
            'month': month,
            'date': (current_date + relativedelta(months=month)).isoformat(),
            'balance': str(balance.quantize(Decimal('0.01'))),
            'interest': str(interest.quantize(Decimal('0.01'))),
            'principal': str(principal.quantize(Decimal('0.01'))),
            'payment': str(actual_payment.quantize(Decimal('0.01'))),
            'total_paid': str(total_paid.quantize(Decimal('0.01'))),
        })
        
        if balance <= Decimal('0.00'):
            break
    
    return projection


def generate_snowball_order(debts: QuerySet) -> List[str]:
    """
    Generate snowball strategy debt order (smallest balance first).
    
    Args:
        debts: QuerySet of DebtAccount instances
    
    Returns:
        List of debt_ids in priority order
    """
    ordered_debts = debts.filter(status='active', is_active=True).order_by('current_balance')
    return [str(debt.debt_id) for debt in ordered_debts]


def generate_avalanche_order(debts: QuerySet) -> List[str]:
    """
    Generate avalanche strategy debt order (highest interest rate first).
    
    Args:
        debts: QuerySet of DebtAccount instances
    
    Returns:
        List of debt_ids in priority order
    """
    ordered_debts = debts.filter(status='active', is_active=True).order_by('-interest_rate', 'current_balance')
    return [str(debt.debt_id) for debt in ordered_debts]


def calculate_strategy_comparison(user, monthly_budget: Decimal) -> Dict:
    """
    Compare snowball vs avalanche strategies.
    
    Args:
        user: User instance
        monthly_budget: Total monthly budget for debt payments
    
    Returns:
        Dict with comparison data for both strategies
    """
    from apps.debts.models import DebtAccount
    
    debts = DebtAccount.objects.filter(user=user, status='active', is_active=True)
    
    if not debts.exists():
        return {
            'snowball': None,
            'avalanche': None,
            'savings': Decimal('0.00'),
        }
    
    # Calculate total minimum payments
    total_minimum = sum(debt.minimum_payment for debt in debts)
    
    if monthly_budget < total_minimum:
        return {
            'error': 'Monthly budget is less than total minimum payments',
            'total_minimum': str(total_minimum),
        }
    
    extra_payment = monthly_budget - total_minimum
    
    # Snowball calculation
    snowball_order = generate_snowball_order(debts)
    snowball_result = _simulate_strategy(debts, snowball_order, extra_payment)
    
    # Avalanche calculation
    avalanche_order = generate_avalanche_order(debts)
    avalanche_result = _simulate_strategy(debts, avalanche_order, extra_payment)
    
    # Calculate savings
    savings = snowball_result['total_interest'] - avalanche_result['total_interest']
    
    return {
        'snowball': {
            'order': snowball_order,
            'months': snowball_result['months'],
            'total_interest': str(snowball_result['total_interest']),
            'total_paid': str(snowball_result['total_paid']),
        },
        'avalanche': {
            'order': avalanche_order,
            'months': avalanche_result['months'],
            'total_interest': str(avalanche_result['total_interest']),
            'total_paid': str(avalanche_result['total_paid']),
        },
        'savings': str(savings.quantize(Decimal('0.01'))),
        'monthly_budget': str(monthly_budget),
    }


def _simulate_strategy(debts: QuerySet, order: List[str], extra_payment: Decimal) -> Dict:
    """
    Simulate a debt payoff strategy.
    
    Args:
        debts: QuerySet of DebtAccount instances
        order: List of debt_ids in priority order
        extra_payment: Extra payment amount beyond minimums
    
    Returns:
        Dict with months, total_interest, total_paid
    """
    # Create working copies of debt data
    debt_data = {
        str(debt.debt_id): {
            'balance': debt.current_balance,
            'apr': debt.interest_rate,
            'minimum': debt.minimum_payment,
        }
        for debt in debts
    }
    
    months = 0
    total_interest = Decimal('0.00')
    total_paid = Decimal('0.00')
    
    while any(d['balance'] > Decimal('0.00') for d in debt_data.values()) and months < 600:
        # Apply minimum payments to all debts
        for debt_id, data in debt_data.items():
            if data['balance'] > Decimal('0.00'):
                interest = calculate_monthly_interest(data['balance'], data['apr'])
                principal = min(data['minimum'] - interest, data['balance'])
                
                data['balance'] -= principal
                total_interest += interest
                total_paid += (interest + principal)
        
        # Apply extra payment to priority debt
        remaining_extra = extra_payment
        for debt_id in order:
            if debt_id in debt_data and debt_data[debt_id]['balance'] > Decimal('0.00'):
                # Apply all extra to this debt
                data = debt_data[debt_id]
                interest = calculate_monthly_interest(data['balance'], data['apr'])
                principal = min(remaining_extra, data['balance'])
                
                data['balance'] -= principal
                total_interest += interest
                total_paid += (interest + principal)
                remaining_extra -= principal
                
                if data['balance'] <= Decimal('0.00'):
                    # Debt paid off, extra goes to next debt
                    continue
                else:
                    # This debt absorbed all extra, done for this month
                    break
        
        months += 1
    
    return {
        'months': months,
        'total_interest': total_interest.quantize(Decimal('0.01')),
        'total_paid': total_paid.quantize(Decimal('0.01')),
    }


def get_debt_summary(user) -> Dict:
    """
    Get aggregated debt summary for a user.
    
    Args:
        user: User instance
    
    Returns:
        Dict with total balance, total minimum payments, avg interest rate, etc.
    """
    from apps.debts.models import DebtAccount
    
    debts = DebtAccount.objects.filter(user=user, status='active', is_active=True)
    
    if not debts.exists():
        return {
            'total_balance': '0.00',
            'total_minimum_payments': '0.00',
            'average_interest_rate': '0.00',
            'debt_count': 0,
            'total_original_balance': '0.00',
            'total_paid_off': '0.00',
        }
    
    total_balance = sum(debt.current_balance for debt in debts)
    total_minimum = sum(debt.minimum_payment for debt in debts)
    total_original = sum(debt.original_balance for debt in debts)
    
    # Weight average interest rate by balance
    weighted_rate_sum = sum(debt.current_balance * debt.interest_rate for debt in debts)
    avg_rate = weighted_rate_sum / total_balance if total_balance > 0 else Decimal('0.00')
    
    # Calculate total paid off
    total_paid_off = total_original - total_balance
    
    return {
        'total_balance': str(total_balance.quantize(Decimal('0.01'))),
        'total_minimum_payments': str(total_minimum.quantize(Decimal('0.01'))),
        'average_interest_rate': str(avg_rate.quantize(Decimal('0.01'))),
        'debt_count': debts.count(),
        'total_original_balance': str(total_original.quantize(Decimal('0.01'))),
        'total_paid_off': str(total_paid_off.quantize(Decimal('0.01'))),
    }


def apply_payment_split(debt, amount: Decimal) -> Tuple[Decimal, Decimal]:
    """
    Split a payment amount between interest and principal.
    
    Args:
        debt: DebtAccount instance
        amount: Payment amount
    
    Returns:
        Tuple of (interest, principal)
    """
    interest = calculate_monthly_interest(debt.current_balance, debt.interest_rate)
    principal = min(amount - interest, debt.current_balance)
    
    # Ensure principal is not negative
    if principal < Decimal('0.00'):
        principal = Decimal('0.00')
        interest = amount  # All payment goes to interest (unusual case)
    
    return (interest.quantize(Decimal('0.01')), principal.quantize(Decimal('0.01')))
