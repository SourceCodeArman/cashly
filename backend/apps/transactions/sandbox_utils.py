"""
Utilities for creating test transactions in Plaid Sandbox with categories.
"""
import csv
import json
import logging
import requests
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from django.conf import settings
from django.utils import timezone
from plaid.exceptions import ApiException

from apps.accounts.plaid_config import get_plaid_configuration
from apps.accounts.plaid_utils import decrypt_token

logger = logging.getLogger(__name__)


# Load category taxonomy from CSV
def _load_category_taxonomy() -> Dict[str, Dict[str, str]]:
    """
    Load Plaid category taxonomy from CSV file.
    
    Returns:
        Dict mapping PRIMARY -> {DETAILED -> DESCRIPTION}
    """
    taxonomy = {}
    csv_path = Path(__file__).parent.parent.parent / 'transactions-personal-finance-category-taxonomy.csv'
    
    if not csv_path.exists():
        logger.warning(f"Category taxonomy CSV not found at {csv_path}")
        return taxonomy
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            primary = row['PRIMARY']
            detailed = row['DETAILED']
            description = row['DESCRIPTION']
            
            if primary not in taxonomy:
                taxonomy[primary] = {}
            taxonomy[primary][detailed] = description
    
    return taxonomy


# Predefined test transactions with realistic merchants and categories
TEST_TRANSACTIONS = [
    # Income transactions
    {
        'merchant_name': 'EMPLOYER PAYROLL',
        'amount': 3500.00,
        'category': ['Income', 'Wages'],
        'primary': 'INCOME',
        'detailed': 'INCOME_WAGES',
        'description': 'Monthly salary payment',
    },
    {
        'merchant_name': 'DIVIDEND PAYMENT',
        'amount': 125.50,
        'category': ['Income', 'Dividends'],
        'primary': 'INCOME',
        'detailed': 'INCOME_DIVIDENDS',
        'description': 'Investment dividend',
    },
    {
        'merchant_name': 'TAX REFUND',
        'amount': 850.00,
        'category': ['Income', 'Tax Refund'],
        'primary': 'INCOME',
        'detailed': 'INCOME_TAX_REFUND',
        'description': 'Federal tax refund',
    },
    
    # Food & Dining
    {
        'merchant_name': "McDonald's",
        'amount': -12.50,
        'category': ['Food and Drink', 'Fast Food'],
        'primary': 'FOOD_AND_DRINK',
        'detailed': 'FOOD_AND_DRINK_FAST_FOOD',
        'description': 'Lunch at McDonald\'s',
    },
    {
        'merchant_name': 'Starbucks',
        'amount': -5.75,
        'category': ['Food and Drink', 'Coffee Shops'],
        'primary': 'FOOD_AND_DRINK',
        'detailed': 'FOOD_AND_DRINK_COFFEE',
        'description': 'Morning coffee',
    },
    {
        'merchant_name': 'Whole Foods Market',
        'amount': -87.32,
        'category': ['Food and Drink', 'Groceries'],
        'primary': 'FOOD_AND_DRINK',
        'detailed': 'FOOD_AND_DRINK_GROCERIES',
        'description': 'Weekly groceries',
    },
    {
        'merchant_name': 'Olive Garden',
        'amount': -45.80,
        'category': ['Food and Drink', 'Restaurants'],
        'primary': 'FOOD_AND_DRINK',
        'detailed': 'FOOD_AND_DRINK_RESTAURANT',
        'description': 'Dinner at restaurant',
    },
    
    # Transportation
    {
        'merchant_name': 'Shell Gas Station',
        'amount': -52.40,
        'category': ['Gas Stations', 'Fuel'],
        'primary': 'TRANSPORTATION',
        'detailed': 'TRANSPORTATION_GAS',
        'description': 'Gas fill-up',
    },
    {
        'merchant_name': 'Uber',
        'amount': -18.50,
        'category': ['Service', 'Ride Share'],
        'primary': 'TRANSPORTATION',
        'detailed': 'TRANSPORTATION_TAXIS_AND_RIDE_SHARES',
        'description': 'Uber ride',
    },
    {
        'merchant_name': 'Metro Transit',
        'amount': -2.75,
        'category': ['Service', 'Public Transportation'],
        'primary': 'TRANSPORTATION',
        'detailed': 'TRANSPORTATION_PUBLIC_TRANSIT',
        'description': 'Bus fare',
    },
    
    # Shopping
    {
        'merchant_name': 'Amazon',
        'amount': -89.99,
        'category': ['General Merchandise', 'Online Marketplaces'],
        'primary': 'GENERAL_MERCHANDISE',
        'detailed': 'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES',
        'description': 'Online purchase',
    },
    {
        'merchant_name': 'Target',
        'amount': -156.23,
        'category': ['General Merchandise', 'Superstores'],
        'primary': 'GENERAL_MERCHANDISE',
        'detailed': 'GENERAL_MERCHANDISE_SUPERSTORES',
        'description': 'Shopping at Target',
    },
    {
        'merchant_name': 'Best Buy',
        'amount': -299.99,
        'category': ['General Merchandise', 'Electronics'],
        'primary': 'GENERAL_MERCHANDISE',
        'detailed': 'GENERAL_MERCHANDISE_ELECTRONICS',
        'description': 'Electronics purchase',
    },
    
    # Bills & Utilities
    {
        'merchant_name': 'Electric Company',
        'amount': -125.50,
        'category': ['Service', 'Utilities'],
        'primary': 'RENT_AND_UTILITIES',
        'detailed': 'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY',
        'description': 'Electric bill',
    },
    {
        'merchant_name': 'Internet Provider',
        'amount': -79.99,
        'category': ['Service', 'Internet'],
        'primary': 'RENT_AND_UTILITIES',
        'detailed': 'RENT_AND_UTILITIES_INTERNET_AND_CABLE',
        'description': 'Internet bill',
    },
    {
        'merchant_name': 'Cell Phone Provider',
        'amount': -95.00,
        'category': ['Service', 'Phone'],
        'primary': 'RENT_AND_UTILITIES',
        'detailed': 'RENT_AND_UTILITIES_TELEPHONE',
        'description': 'Cell phone bill',
    },
    
    # Entertainment
    {
        'merchant_name': 'Netflix',
        'amount': -15.99,
        'category': ['Entertainment', 'Movies'],
        'primary': 'ENTERTAINMENT',
        'detailed': 'ENTERTAINMENT_TV_AND_MOVIES',
        'description': 'Netflix subscription',
    },
    {
        'merchant_name': 'Spotify',
        'amount': -9.99,
        'category': ['Entertainment', 'Music'],
        'primary': 'ENTERTAINMENT',
        'detailed': 'ENTERTAINMENT_MUSIC_AND_AUDIO',
        'description': 'Spotify Premium',
    },
    {
        'merchant_name': 'Movie Theater',
        'amount': -24.50,
        'category': ['Entertainment', 'Movies'],
        'primary': 'ENTERTAINMENT',
        'detailed': 'ENTERTAINMENT_TV_AND_MOVIES',
        'description': 'Movie tickets',
    },
    
    # Healthcare
    {
        'merchant_name': 'CVS Pharmacy',
        'amount': -45.60,
        'category': ['Medical', 'Pharmacies'],
        'primary': 'MEDICAL',
        'detailed': 'MEDICAL_PHARMACIES_AND_SUPPLEMENTS',
        'description': 'Prescription medication',
    },
    {
        'merchant_name': 'Doctor Office',
        'amount': -150.00,
        'category': ['Medical', 'Doctors'],
        'primary': 'MEDICAL',
        'detailed': 'MEDICAL_PRIMARY_CARE',
        'description': 'Doctor visit',
    },
    
    # Personal Care
    {
        'merchant_name': 'Gym Membership',
        'amount': -49.99,
        'category': ['Service', 'Gyms and Fitness Centers'],
        'primary': 'PERSONAL_CARE',
        'detailed': 'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS',
        'description': 'Monthly gym membership',
    },
    {
        'merchant_name': 'Hair Salon',
        'amount': -65.00,
        'category': ['Service', 'Hair Salons'],
        'primary': 'PERSONAL_CARE',
        'detailed': 'PERSONAL_CARE_HAIR_AND_BEAUTY',
        'description': 'Haircut',
    },
    
    # Travel
    {
        'merchant_name': 'United Airlines',
        'amount': -450.00,
        'category': ['Travel', 'Airlines'],
        'primary': 'TRAVEL',
        'detailed': 'TRAVEL_FLIGHTS',
        'description': 'Flight ticket',
    },
    {
        'merchant_name': 'Marriott Hotel',
        'amount': -189.00,
        'category': ['Travel', 'Hotels'],
        'primary': 'TRAVEL',
        'detailed': 'TRAVEL_LODGING',
        'description': 'Hotel stay',
    },
]


def _get_plaid_api_url() -> str:
    """Get Plaid API URL based on environment."""
    from apps.accounts.plaid_config import _resolve_environment
    from plaid import Environment
    
    env = _resolve_environment()
    if env == Environment.Sandbox:
        return 'https://sandbox.plaid.com'
    elif env == Environment.Development:
        return 'https://development.plaid.com'
    else:
        return 'https://production.plaid.com'


def create_sandbox_transaction_with_category(
    account,
    amount: float,
    merchant_name: str,
    category: List[str],
    description: Optional[str] = None,
    transaction_date: Optional[date] = None,
    primary: Optional[str] = None,
    detailed: Optional[str] = None,
) -> Dict:
    """
    Create a test transaction in Plaid Sandbox with category information.
    
    Uses Plaid's REST API directly since the Python SDK doesn't include
    sandbox transaction creation methods.
    
    Note: Plaid Sandbox API doesn't support category parameters in the create request.
    Categories are assigned by Plaid automatically based on merchant name and description.
    We use well-known merchant names that Plaid recognizes to get proper categorization.
    
    Args:
        account: Account instance
        amount: Transaction amount (negative for expenses, positive for income)
        merchant_name: Name of merchant (use well-known names for better categorization)
        category: Legacy category array for reference (e.g., ['Food and Drink', 'Restaurants'])
        description: Optional transaction description
        transaction_date: Optional transaction date (defaults to today)
        primary: Optional primary category for reference
        detailed: Optional detailed category for reference
    
    Returns:
        Dict with transaction creation result
    """
    try:
        # Check if we're in sandbox environment
        from apps.accounts.plaid_config import _resolve_environment
        from plaid import Environment
        
        env = _resolve_environment()
        if env != Environment.Sandbox:
            return {
                'success': False,
                'error': 'Sandbox transaction creation only works in Sandbox environment',
            }
        
        access_token = decrypt_token(account.plaid_access_token)
        config = get_plaid_configuration()
        
        if transaction_date is None:
            transaction_date = timezone.now().date()
        
        # Use REST API directly
        # Plaid Sandbox API endpoint: POST /sandbox/transactions/create
        api_url = _get_plaid_api_url()
        url = f"{api_url}/sandbox/transactions/create"
        
        headers = {
            'Content-Type': 'application/json',
        }
        
        # Plaid Sandbox API format - transactions array with transaction objects
        payload = {
            'client_id': settings.PLAID_CLIENT_ID,
            'secret': settings.PLAID_SECRET,
            'access_token': access_token,
            'transactions': [
                {
                    'amount': abs(amount),
                    'date': transaction_date.isoformat(),
                    'name': merchant_name,
                    'description': description or merchant_name,
                    'account_id': account.plaid_account_id,
                }
            ],
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        # Log response for debugging
        if response.status_code != 200:
            logger.error(f"Plaid API error: {response.status_code} - {response.text}")
        
        response.raise_for_status()
        result = response.json()
        
        logger.info(
            f"Created sandbox transaction: {merchant_name}, "
            f"amount: {amount}, expected category: {primary}/{detailed}"
        )
        
        return {
            'success': True,
            'transaction_id': result.get('transaction_id'),
            'request_id': result.get('request_id'),
            'merchant_name': merchant_name,
            'amount': amount,
            'category': category,
            'primary': primary,
            'detailed': detailed,
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"HTTP error creating sandbox transaction: {e}")
        error_message = str(e)
        try:
            if hasattr(e, 'response') and e.response is not None:
                error_body = e.response.json()
                error_message = error_body.get('error_message', str(e))
        except:
            pass
        
        return {
            'success': False,
            'error': error_message,
        }
    except Exception as e:
        logger.error(f"Error creating sandbox transaction: {e}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
        }


def create_test_transactions_with_categories(
    account,
    count: int = 10,
    days_back: int = 30,
    transaction_list: Optional[List[Dict]] = None,
) -> List[Dict]:
    """
    Create multiple test transactions with categories.
    
    Args:
        account: Account instance
        count: Number of transactions to create
        days_back: How many days back to spread transactions
        transaction_list: Optional custom list of transactions to create
    
    Returns:
        List of creation results
    """
    if transaction_list is None:
        # Use predefined test transactions
        transactions_to_create = TEST_TRANSACTIONS[:count]
    else:
        transactions_to_create = transaction_list[:count]
    
    results = []
    base_date = timezone.now().date()
    
    for i, txn_data in enumerate(transactions_to_create):
        # Spread transactions over the past N days
        days_ago = (i % days_back) if days_back > 0 else 0
        transaction_date = base_date - timedelta(days=days_ago)
        
        result = create_sandbox_transaction_with_category(
            account=account,
            amount=txn_data['amount'],
            merchant_name=txn_data['merchant_name'],
            category=txn_data['category'],
            description=txn_data.get('description'),
            transaction_date=transaction_date,
            primary=txn_data.get('primary'),
            detailed=txn_data.get('detailed'),
        )
        
        results.append(result)
        
        # Small delay to avoid rate limiting
        import time
        time.sleep(0.1)
    
    successful = sum(1 for r in results if r.get('success'))
    logger.info(f"Created {successful}/{len(results)} test transactions")
    
    return results

