"""
Plaid category mapping to system categories.

Maps Plaid's personal_finance_category to our system categories.
This file is auto-generated from transactions-personal-finance-category-taxonomy.csv
Run: python manage.py generate_plaid_category_mappings --update-mapper
"""
from typing import Optional, Dict, Any, List, Union
from django.db.models import Q, QuerySet
from django.db import transaction as db_transaction
import logging

from .models import Category, Transaction

logger = logging.getLogger(__name__)


# Mapping of Plaid detailed categories to system category names
# Generated from transactions-personal-finance-category-taxonomy.csv
# Format: "PLAID_DETAILED_CATEGORY": ("system_category_name", "category_type")
PLAID_DETAILED_CATEGORY_MAPPING = {
    # Bank Fees
    "BANK_FEES_ATM_FEES": ("Other Expenses", "expense"),
    "BANK_FEES_FOREIGN_TRANSACTION_FEES": ("Other Expenses", "expense"),
    "BANK_FEES_INSUFFICIENT_FUNDS": ("Other Expenses", "expense"),
    "BANK_FEES_INTEREST_CHARGE": ("Other Expenses", "expense"),
    "BANK_FEES_OVERDRAFT_FEES": ("Other Expenses", "expense"),
    "BANK_FEES_OTHER_BANK_FEES": ("Other Expenses", "expense"),

    # Entertainment
    "ENTERTAINMENT_CASINOS_AND_GAMBLING": ("Entertainment", "expense"),
    "ENTERTAINMENT_MUSIC_AND_AUDIO": ("Entertainment", "expense"),
    "ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS": ("Entertainment", "expense"),
    "ENTERTAINMENT_TV_AND_MOVIES": ("Entertainment", "expense"),
    "ENTERTAINMENT_VIDEO_GAMES": ("Entertainment", "expense"),
    "ENTERTAINMENT_OTHER_ENTERTAINMENT": ("Entertainment", "expense"),

    # Food And Drink
    "FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR": ("Food & Dining", "expense"),
    "FOOD_AND_DRINK_COFFEE": ("Food & Dining", "expense"),
    "FOOD_AND_DRINK_FAST_FOOD": ("Food & Dining", "expense"),
    "FOOD_AND_DRINK_GROCERIES": ("Groceries", "expense"),
    "FOOD_AND_DRINK_RESTAURANT": ("Food & Dining", "expense"),
    "FOOD_AND_DRINK_VENDING_MACHINES": ("Food & Dining", "expense"),
    "FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK": ("Food & Dining", "expense"),

    # General Merchandise
    "GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_CONVENIENCE_STORES": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_DEPARTMENT_STORES": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_DISCOUNT_STORES": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_ELECTRONICS": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_OFFICE_SUPPLIES": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_ONLINE_MARKETPLACES": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_PET_SUPPLIES": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_SPORTING_GOODS": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_SUPERSTORES": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_TOBACCO_AND_VAPE": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE": ("Shopping", "expense"),

    # General Services
    "GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_AUTOMOTIVE": ("Transportation", "expense"),
    "GENERAL_SERVICES_CHILDCARE": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_CONSULTING_AND_LEGAL": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_EDUCATION": ("Education", "expense"),
    "GENERAL_SERVICES_INSURANCE": ("Insurance", "expense"),
    "GENERAL_SERVICES_POSTAGE_AND_SHIPPING": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_STORAGE": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_OTHER_GENERAL_SERVICES": ("Other Expenses", "expense"),

    # Government And Non Profit
    "GOVERNMENT_AND_NON_PROFIT_DONATIONS": ("Other Expenses", "expense"),
    "GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES": ("Other Expenses", "expense"),
    "GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT": ("Taxes", "expense"),
    "GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT": ("Other Expenses", "expense"),

    # Home Improvement
    "HOME_IMPROVEMENT_FURNITURE": ("Home & Garden", "expense"),
    "HOME_IMPROVEMENT_HARDWARE": ("Home & Garden", "expense"),
    "HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE": ("Home & Garden", "expense"),
    "HOME_IMPROVEMENT_SECURITY": ("Home & Garden", "expense"),
    "HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT": ("Home & Garden", "expense"),

    # Income
    "INCOME_DIVIDENDS": ("Investment", "income"),
    "INCOME_INTEREST_EARNED": ("Interest", "income"),
    "INCOME_RETIREMENT_PENSION": ("Salary", "income"),
    "INCOME_TAX_REFUND": ("Refund", "income"),
    "INCOME_UNEMPLOYMENT": ("Other Income", "income"),
    "INCOME_WAGES": ("Salary", "income"),
    "INCOME_OTHER_INCOME": ("Other Income", "income"),

    # Loan Payments
    "LOAN_PAYMENTS_CAR_PAYMENT": ("Other Expenses", "expense"),
    "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT": ("Other Expenses", "expense"),
    "LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT": ("Other Expenses", "expense"),
    "LOAN_PAYMENTS_MORTGAGE_PAYMENT": ("Other Expenses", "expense"),
    "LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT": ("Education", "expense"),
    "LOAN_PAYMENTS_OTHER_PAYMENT": ("Other Expenses", "expense"),

    # Medical
    "MEDICAL_DENTAL_CARE": ("Healthcare", "expense"),
    "MEDICAL_EYE_CARE": ("Healthcare", "expense"),
    "MEDICAL_NURSING_CARE": ("Healthcare", "expense"),
    "MEDICAL_PHARMACIES_AND_SUPPLEMENTS": ("Healthcare", "expense"),
    "MEDICAL_PRIMARY_CARE": ("Healthcare", "expense"),
    "MEDICAL_VETERINARY_SERVICES": ("Other Expenses", "expense"),
    "MEDICAL_OTHER_MEDICAL": ("Healthcare", "expense"),

    # Personal Care
    "PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS": ("Personal Care", "expense"),
    "PERSONAL_CARE_HAIR_AND_BEAUTY": ("Personal Care", "expense"),
    "PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING": ("Personal Care", "expense"),
    "PERSONAL_CARE_OTHER_PERSONAL_CARE": ("Personal Care", "expense"),

    # Rent And Utilities
    "RENT_AND_UTILITIES_GAS_AND_ELECTRICITY": ("Bills & Utilities", "expense"),
    "RENT_AND_UTILITIES_INTERNET_AND_CABLE": ("Bills & Utilities", "expense"),
    "RENT_AND_UTILITIES_RENT": ("Bills & Utilities", "expense"),
    "RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT": ("Bills & Utilities", "expense"),
    "RENT_AND_UTILITIES_TELEPHONE": ("Bills & Utilities", "expense"),
    "RENT_AND_UTILITIES_WATER": ("Bills & Utilities", "expense"),
    "RENT_AND_UTILITIES_OTHER_UTILITIES": ("Bills & Utilities", "expense"),

    # Transportation
    "TRANSPORTATION_BIKES_AND_SCOOTERS": ("Transportation", "expense"),
    "TRANSPORTATION_GAS": ("Gas & Fuel", "expense"),
    "TRANSPORTATION_PARKING": ("Transportation", "expense"),
    "TRANSPORTATION_PUBLIC_TRANSIT": ("Transportation", "expense"),
    "TRANSPORTATION_TAXIS_AND_RIDE_SHARES": ("Transportation", "expense"),
    "TRANSPORTATION_TOLLS": ("Transportation", "expense"),
    "TRANSPORTATION_OTHER_TRANSPORTATION": ("Transportation", "expense"),

    # Transfer In
    "TRANSFER_IN_CASH_ADVANCES_AND_LOANS": ("Other Income", "income"),
    "TRANSFER_IN_DEPOSIT": ("Other Income", "income"),
    "TRANSFER_IN_INVESTMENT_AND_RETIREMENT_FUNDS": ("Other Income", "income"),
    "TRANSFER_IN_SAVINGS": ("Other Income", "income"),
    "TRANSFER_IN_ACCOUNT_TRANSFER": ("Other Income", "income"),
    "TRANSFER_IN_OTHER_TRANSFER_IN": ("Other Income", "income"),

    # Transfer Out
    "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS": ("Other Expenses", "expense"),
    "TRANSFER_OUT_SAVINGS": ("Other Expenses", "expense"),
    "TRANSFER_OUT_WITHDRAWAL": ("Other Expenses", "expense"),
    "TRANSFER_OUT_ACCOUNT_TRANSFER": ("Other Expenses", "expense"),
    "TRANSFER_OUT_OTHER_TRANSFER_OUT": ("Other Expenses", "expense"),

    # Travel
    "TRAVEL_FLIGHTS": ("Travel", "expense"),
    "TRAVEL_LODGING": ("Travel", "expense"),
    "TRAVEL_RENTAL_CARS": ("Travel", "expense"),
    "TRAVEL_OTHER_TRAVEL": ("Travel", "expense"),

    # Legacy/older category names for backward compatibility
    "ENTERTAINMENT_MOVIES_AND_DVD": ("Entertainment", "expense"),
    "ENTERTAINMENT_ARTS": ("Entertainment", "expense"),
    "FOOD_AND_DRINK_RESTAURANTS": ("Food & Dining", "expense"),
    "FOOD_AND_DRINK_COFFEE_SHOPS": ("Food & Dining", "expense"),
    "FOOD_AND_DRINK_BARS": ("Food & Dining", "expense"),
    "FOOD_AND_DRINK_FOOD_DELIVERY": ("Food & Dining", "expense"),
    "GENERAL_MERCHANDISE_BOOK_STORES": ("Shopping", "expense"),
    "GENERAL_MERCHANDISE_HOME_IMPROVEMENT": ("Home & Garden", "expense"),
    "GENERAL_SERVICES_BUSINESS_SERVICES": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_COMPUTER_SERVICES": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_COUNSELING": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_EDUCATIONAL": ("Education", "expense"),
    "GENERAL_SERVICES_LEGAL": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_PET_SERVICES": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_PHOTOGRAPHY": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_PROFESSIONAL_SERVICES": ("Other Expenses", "expense"),
    "GENERAL_SERVICES_UTILITIES": ("Bills & Utilities", "expense"),
    "GENERAL_SERVICES_VETERINARY_SERVICES": ("Other Expenses", "expense"),
    "MEDICAL_DENTAL": ("Healthcare", "expense"),
    "TRANSPORTATION_TAXIS": ("Transportation", "expense"),
    "TRANSPORTATION_PUBLIC_TRANSPORTATION": ("Transportation", "expense"),
    "TRANSPORTATION_GAS_STATIONS": ("Gas & Fuel", "expense"),
    "TRANSPORTATION_AUTOMOTIVE": ("Transportation", "expense"),
    "TRAVEL_HOTELS": ("Travel", "expense"),
    "TRAVEL_TRAINS": ("Travel", "expense"),
    "TRAVEL_CRUISES": ("Entertainment", "expense"),
    "INCOME_RENTAL_INCOME": ("Rental Income", "income"),
    "INCOME_GIG_ECONOMY": ("Freelance", "income"),
}

# Mapping of Plaid primary categories to system category names
# Used as fallback when detailed category is not available
PLAID_PRIMARY_CATEGORY_MAPPING = {
    "BANK_FEES": ("Other Expenses", "expense"),
    "ENTERTAINMENT": ("Entertainment", "expense"),
    "FOOD_AND_DRINK": ("Food & Dining", "expense"),  # Default to Food & Dining, but detailed will override for Groceries
    "GENERAL_MERCHANDISE": ("Shopping", "expense"),
    "GENERAL_SERVICES": ("Other Expenses", "expense"),
    "GOVERNMENT_AND_NON_PROFIT": ("Other Expenses", "expense"),
    "HOME_IMPROVEMENT": ("Home & Garden", "expense"),
    "INCOME": ("Salary", "income"),
    "LOAN_PAYMENTS": ("Other Expenses", "expense"),
    "MEDICAL": ("Healthcare", "expense"),
    "PERSONAL_CARE": ("Personal Care", "expense"),
    "RENT_AND_UTILITIES": ("Bills & Utilities", "expense"),
    "TRANSPORTATION": ("Transportation", "expense"),
    "TRANSFER_IN": ("Other Income", "income"),
    "TRANSFER_OUT": ("Other Expenses", "expense"),
    "TRAVEL": ("Travel", "expense"),
    # Legacy/older category names
    "GENERAL_ENTERTAINMENT": ("Entertainment", "expense"),
    "GENERAL_BUSINESS": ("Other Expenses", "expense"),
}


def map_plaid_category_to_system_category(
    plaid_category: Dict[str, Any],
    transaction_type: Optional[str] = None,
    user=None
) -> Optional[Category]:
    """
    Map Plaid category to system category.
    
    Args:
        plaid_category: Dictionary with 'primary' and/or 'detailed' keys
        transaction_type: Optional transaction type ('expense' or 'income')
                        If not provided, will be inferred from category mapping
        user: Optional user instance to filter categories
    
    Returns:
        Category instance or None if no mapping found
    """
    if not plaid_category:
        return None
    
    primary = plaid_category.get('primary')
    detailed = plaid_category.get('detailed')
    
    # Try detailed category first (more specific)
    if detailed and detailed in PLAID_DETAILED_CATEGORY_MAPPING:
        category_name, category_type = PLAID_DETAILED_CATEGORY_MAPPING[detailed]
    # Fall back to primary category
    elif primary and primary in PLAID_PRIMARY_CATEGORY_MAPPING:
        category_name, category_type = PLAID_PRIMARY_CATEGORY_MAPPING[primary]
    else:
        # No mapping found, return None (caller should handle this)
        logger.debug(
            f"No mapping found for Plaid category: primary={primary}, detailed={detailed}"
        )
        return None
    
    # Override category type if transaction_type is provided and doesn't match
    if transaction_type:
        if transaction_type == 'expense' and category_type == 'income':
            logger.warning(
                f"Category type mismatch: transaction is expense but Plaid category suggests income. "
                f"Using 'Other Expenses' category."
            )
            category_name = "Other Expenses"
            category_type = "expense"
        elif transaction_type == 'income' and category_type == 'expense':
            logger.warning(
                f"Category type mismatch: transaction is income but Plaid category suggests expense. "
                f"Using 'Other Income' category."
            )
            category_name = "Other Income"
            category_type = "income"
    
    # Find the system category
    try:
        # Look for system category first
        category = Category.objects.filter(
            name=category_name,
            type=category_type,
            is_system_category=True
        ).first()
        
        # If not found and user provided, check user categories
        if not category and user:
            category = Category.objects.filter(
                name=category_name,
                type=category_type,
                user=user,
                is_system_category=False
            ).first()
        
        if not category:
            # Fallback to "Other Expenses" or "Other Income" category
            fallback_name = "Other Expenses" if category_type == "expense" else "Other Income"
            logger.warning(
                f"System category '{category_name}' ({category_type}) not found. "
                f"Falling back to '{fallback_name}' category."
            )
            category = Category.objects.filter(
                name=fallback_name,
                type=category_type,
                is_system_category=True
            ).first()
        
        return category
        
    except Category.DoesNotExist:
        logger.error(
            f"Category '{category_name}' ({category_type}) not found in database. "
            f"Please ensure system categories are seeded."
        )
        return None
    except Exception as e:
        logger.error(f"Error mapping Plaid category to system category: {str(e)}")
        return None


def get_default_category_for_type(category_type: str, user=None) -> Optional[Category]:
    """
    Get the default "Other Expenses" or "Other Income" category for a given type.
    
    Args:
        category_type: 'expense' or 'income'
        user: Optional user instance
    
    Returns:
        Category instance or None
    """
    try:
        category_name = "Other Expenses" if category_type == "expense" else "Other Income"
        category = Category.objects.filter(
            name=category_name,
            type=category_type,
            is_system_category=True
        ).first()
        
        if not category and user:
            category = Category.objects.filter(
                name=category_name,
                type=category_type,
                user=user,
                is_system_category=False
            ).first()
        
        return category
    except Exception as e:
        logger.error(f"Error getting default category for type {category_type}: {str(e)}")
        return None


def categorize_transactions_from_plaid(
    transactions: Union[QuerySet[Transaction], List[Transaction], List[str]],
    overwrite_existing: bool = False,
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Categorize transactions in bulk using Plaid category data.
    
    Args:
        transactions: QuerySet of Transaction objects, list of Transaction objects,
                     or list of transaction IDs (UUIDs as strings)
        overwrite_existing: If True, overwrite existing categories (except user_modified)
        dry_run: If True, don't actually update transactions, just return statistics
    
    Returns:
        Dictionary with statistics:
        {
            'total_processed': int,
            'categorized': int,
            'skipped_no_plaid_category': int,
            'skipped_user_modified': int,
            'skipped_already_categorized': int,
            'skipped_no_mapping': int,
            'errors': int,
            'results': List[Dict]  # Only in dry_run mode
        }
    """
    stats = {
        'total_processed': 0,
        'categorized': 0,
        'skipped_no_plaid_category': 0,
        'skipped_user_modified': 0,
        'skipped_already_categorized': 0,
        'skipped_no_mapping': 0,
        'errors': 0,
    }
    
    if dry_run:
        stats['results'] = []
    
    # Convert input to QuerySet if needed
    if isinstance(transactions, list):
        if transactions and isinstance(transactions[0], str):
            # List of transaction IDs
            transaction_ids = transactions
            transactions_qs = Transaction.objects.filter(transaction_id__in=transaction_ids)
        else:
            # List of Transaction objects
            transaction_ids = [t.transaction_id for t in transactions if hasattr(t, 'transaction_id')]
            transactions_qs = Transaction.objects.filter(transaction_id__in=transaction_ids)
    else:
        # QuerySet
        transactions_qs = transactions
    
    # Count total transactions (for reporting)
    total_transactions = transactions_qs.count()
    
    # Filter transactions that have Plaid category data
    # Plaid category is stored as JSONField, so we check if it's not empty
    transactions_with_plaid = transactions_qs.exclude(
        plaid_category__isnull=True
    ).exclude(
        plaid_category={}
    )
    
    stats['skipped_no_plaid_category'] = total_transactions - transactions_with_plaid.count()
    stats['total_processed'] = transactions_with_plaid.count()
    
    # Exclude user-modified transactions (always respect user edits)
    transactions_to_process = transactions_with_plaid.filter(user_modified=False)
    stats['skipped_user_modified'] = stats['total_processed'] - transactions_to_process.count()
    
    # Optionally exclude transactions that already have a category
    if not overwrite_existing:
        transactions_to_process = transactions_to_process.filter(category__isnull=True)
        stats['skipped_already_categorized'] = (
            transactions_with_plaid.filter(user_modified=False).count() - 
            transactions_to_process.count()
        )
    
    # Process transactions in batches
    batch_size = 100
    transactions_to_update = []
    
    for transaction in transactions_to_process:
        try:
            # Get Plaid category (should exist since we filtered for it)
            plaid_category = transaction.plaid_category
            
            # Determine transaction type
            transaction_type = 'expense' if transaction.amount < 0 else 'income'
            
            # Map Plaid category to system category
            system_category = map_plaid_category_to_system_category(
                plaid_category,
                transaction_type=transaction_type,
                user=transaction.user
            )
            
            if not system_category:
                # Try to get default "Other" category
                system_category = get_default_category_for_type(
                    transaction_type,
                    user=transaction.user
                )
                
                if not system_category:
                    stats['skipped_no_mapping'] += 1
                    logger.warning(
                        f"Could not find category for transaction {transaction.transaction_id}. "
                        f"Plaid category: {plaid_category}, Transaction type: {transaction_type}"
                    )
                    continue
                else:
                    # Use "Other Expenses" or "Other Income" category as fallback (mapping wasn't found, but we have a default)
                    fallback_name = "Other Expenses" if transaction_type == "expense" else "Other Income"
                    logger.debug(
                        f"Using default '{fallback_name}' category for transaction {transaction.transaction_id}. "
                        f"Plaid category: {plaid_category}"
                    )
            
            # Prepare update
            if dry_run:
                stats['results'].append({
                    'transaction_id': str(transaction.transaction_id),
                    'merchant_name': transaction.merchant_name,
                    'plaid_category': plaid_category,
                    'current_category': str(transaction.category.category_id) if transaction.category else None,
                    'suggested_category_id': str(system_category.category_id),
                    'suggested_category_name': system_category.name,
                })
            else:
                transaction.category = system_category
                transactions_to_update.append(transaction)
            
            stats['categorized'] += 1
            
        except Exception as e:
            stats['errors'] += 1
            logger.error(
                f"Error categorizing transaction {transaction.transaction_id}: {str(e)}",
                exc_info=True
            )
            continue
    
    # Batch update transactions
    if not dry_run and transactions_to_update:
        try:
            with db_transaction.atomic():
                # Use bulk_update for efficiency
                Transaction.objects.bulk_update(
                    transactions_to_update,
                    ['category'],
                    batch_size=batch_size
                )
                logger.info(
                    f"Bulk categorized {len(transactions_to_update)} transactions from Plaid categories"
                )
        except Exception as e:
            stats['errors'] += len(transactions_to_update)
            logger.error(f"Error bulk updating transactions: {str(e)}", exc_info=True)
    
    return stats

