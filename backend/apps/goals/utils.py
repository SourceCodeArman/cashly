"""
Utility functions for goal calculations.
"""
from datetime import timedelta
from django.utils import timezone
from decimal import Decimal
from typing import Optional, Tuple
from .models import Goal, Contribution


def calculate_goal_forecast(goal: Goal) -> dict:
    """
    Predict completion date based on current savings rate and contribution history.
    
    Args:
        goal: Goal instance
        
    Returns:
        dict: Forecast data including predicted completion date
    """
    # Check if goal is already completed
    if goal.is_completed or goal.current_amount >= goal.target_amount:
        return {
            'predicted_completion_date': goal.completed_at.date().isoformat() if goal.completed_at else timezone.now().date().isoformat(),
            'months_remaining': 0,
            'message': 'Goal already completed'
        }
    
    # Calculate average monthly contribution from history
    # Get contributions from last 3 months
    three_months_ago = timezone.now().date() - timedelta(days=90)
    recent_contributions = Contribution.objects.filter(
        goal=goal,
        date__gte=three_months_ago
    )
    
    # Calculate average monthly contribution
    if recent_contributions.exists():
        total_contributions = sum(c.amount for c in recent_contributions)
        months_covered = max(1, (timezone.now().date() - three_months_ago).days / 30.0)
        average_monthly = Decimal(str(float(total_contributions) / months_covered))
    else:
        # Fall back to monthly_contribution field
        average_monthly = goal.monthly_contribution
    
    if average_monthly <= 0:
        return {
            'predicted_completion_date': None,
            'months_remaining': None,
            'message': 'No monthly contribution set or no contribution history'
        }
    
    remaining_amount = goal.target_amount - goal.current_amount
    
    if remaining_amount <= 0:
        return {
            'predicted_completion_date': timezone.now().date().isoformat(),
            'months_remaining': 0,
            'message': 'Goal already completed'
        }
    
    # Calculate months needed
    months_needed = remaining_amount / average_monthly
    
    # Predict completion date
    predicted_date = timezone.now().date() + timedelta(days=int(months_needed * 30))
    
    return {
        'predicted_completion_date': predicted_date.isoformat(),
        'months_remaining': float(months_needed),
        'average_monthly_contribution': float(average_monthly),
        'message': f'Goal will be completed in approximately {int(months_needed)} months'
    }


def calculate_monthly_contribution(goal: Goal) -> Optional[Decimal]:
    """
    Recommend monthly amount to reach goal by deadline.
    
    Args:
        goal: Goal instance
        
    Returns:
        Decimal: Recommended monthly contribution, or None if no deadline
    """
    if not goal.deadline:
        return None
    
    today = timezone.now().date()
    if today >= goal.deadline:
        return None
    
    days_remaining = (goal.deadline - today).days
    months_remaining = Decimal(str(days_remaining / 30.0))
    
    if months_remaining <= 0:
        return None
    
    remaining_amount = goal.target_amount - goal.current_amount
    
    if remaining_amount <= 0:
        return Decimal('0.00')
    
    recommended_monthly = remaining_amount / months_remaining
    
    return recommended_monthly




def calculate_goal_completion_date(goal: Goal) -> Optional[str]:
    """
    Predict goal completion date based on contribution history.
    
    Args:
        goal: Goal instance
        
    Returns:
        str: Predicted completion date in ISO format, or None
    """
    forecast = calculate_goal_forecast(goal)
    return forecast.get('predicted_completion_date')

