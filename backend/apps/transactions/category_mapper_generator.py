"""
Generate Plaid category mappings from CSV taxonomy file.

This module reads the Plaid personal finance category taxonomy CSV and
generates mappings to system categories.
"""
import csv
import os
from pathlib import Path
from typing import Dict, Tuple, Optional, List
import logging

logger = logging.getLogger(__name__)


# System category mappings based on the categories defined in create_system_categories.py
SYSTEM_CATEGORY_MAPPINGS = {
    # Income categories
    'INCOME': {
        'INCOME_WAGES': ('Salary', 'income'),
        'INCOME_DIVIDENDS': ('Investment', 'income'),
        'INCOME_INTEREST_EARNED': ('Interest', 'income'),
        'INCOME_RETIREMENT_PENSION': ('Salary', 'income'),  # Pension is like salary
        'INCOME_TAX_REFUND': ('Refund', 'income'),
        'INCOME_UNEMPLOYMENT': ('Other Income', 'income'),
        'INCOME_OTHER_INCOME': ('Other Income', 'income'),
        # Also support older naming conventions
        'INCOME_RENTAL_INCOME': ('Rental Income', 'income'),  # Older name - maps to Rental Income
        'INCOME_GIG_ECONOMY': ('Freelance', 'income'),  # Older name
        # Default for INCOME primary
        '_DEFAULT': ('Salary', 'income'),
    },
    
    # Transfer categories
    'TRANSFER_IN': {
        '_DEFAULT': ('Other Income', 'income'),
    },
    'TRANSFER_OUT': {
        '_DEFAULT': ('Other Expenses', 'expense'),
    },
    
    # Loan payments
    'LOAN_PAYMENTS': {
        'LOAN_PAYMENTS_CAR_PAYMENT': ('Other Expenses', 'expense'),
        'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT': ('Other Expenses', 'expense'),
        'LOAN_PAYMENTS_PERSONAL_LOAN_PAYMENT': ('Other Expenses', 'expense'),
        'LOAN_PAYMENTS_MORTGAGE_PAYMENT': ('Other Expenses', 'expense'),
        'LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT': ('Education', 'expense'),
        'LOAN_PAYMENTS_OTHER_PAYMENT': ('Other Expenses', 'expense'),
        '_DEFAULT': ('Other Expenses', 'expense'),
    },
    
    # Bank fees
    'BANK_FEES': {
        '_DEFAULT': ('Other Expenses', 'expense'),
    },
    
    # Food and Drink
    'FOOD_AND_DRINK': {
        'FOOD_AND_DRINK_GROCERIES': ('Groceries', 'expense'),
        'FOOD_AND_DRINK_RESTAURANT': ('Food & Dining', 'expense'),
        'FOOD_AND_DRINK_FAST_FOOD': ('Food & Dining', 'expense'),
        'FOOD_AND_DRINK_COFFEE': ('Food & Dining', 'expense'),
        'FOOD_AND_DRINK_BEER_WINE_AND_LIQUOR': ('Food & Dining', 'expense'),
        'FOOD_AND_DRINK_VENDING_MACHINES': ('Food & Dining', 'expense'),
        'FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK': ('Food & Dining', 'expense'),
        # Also support older naming conventions
        'FOOD_AND_DRINK_RESTAURANTS': ('Food & Dining', 'expense'),  # Plural variant
        'FOOD_AND_DRINK_COFFEE_SHOPS': ('Food & Dining', 'expense'),  # Older name
        'FOOD_AND_DRINK_BARS': ('Food & Dining', 'expense'),  # Older name
        'FOOD_AND_DRINK_FOOD_DELIVERY': ('Food & Dining', 'expense'),  # Older name
        '_DEFAULT': ('Food & Dining', 'expense'),
    },
    
    # General Merchandise
    'GENERAL_MERCHANDISE': {
        'GENERAL_MERCHANDISE_ONLINE_MARKETPLACES': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_SUPERSTORES': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_DEPARTMENT_STORES': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_DISCOUNT_STORES': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_ELECTRONICS': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_SPORTING_GOODS': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_CONVENIENCE_STORES': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_GIFTS_AND_NOVELTIES': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_OFFICE_SUPPLIES': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_PET_SUPPLIES': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_TOBACCO_AND_VAPE': ('Shopping', 'expense'),
        'GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE': ('Shopping', 'expense'),
        # Also support older naming conventions
        'GENERAL_MERCHANDISE_BOOK_STORES': ('Shopping', 'expense'),  # Older name
        'GENERAL_MERCHANDISE_HOME_IMPROVEMENT': ('Home & Garden', 'expense'),  # Older name - note this maps to Home & Garden
        '_DEFAULT': ('Shopping', 'expense'),
    },
    
    # Entertainment
    'ENTERTAINMENT': {
        'ENTERTAINMENT_MUSIC_AND_AUDIO': ('Entertainment', 'expense'),
        'ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS': ('Entertainment', 'expense'),
        'ENTERTAINMENT_TV_AND_MOVIES': ('Entertainment', 'expense'),
        'ENTERTAINMENT_VIDEO_GAMES': ('Entertainment', 'expense'),
        'ENTERTAINMENT_CASINOS_AND_GAMBLING': ('Entertainment', 'expense'),
        'ENTERTAINMENT_OTHER_ENTERTAINMENT': ('Entertainment', 'expense'),
        # Also support older naming conventions
        'ENTERTAINMENT_MOVIES_AND_DVD': ('Entertainment', 'expense'),  # Older name
        'ENTERTAINMENT_ARTS': ('Entertainment', 'expense'),  # Older name
        '_DEFAULT': ('Entertainment', 'expense'),
    },
    
    # General Services
    'GENERAL_SERVICES': {
        'GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING': ('Other Expenses', 'expense'),
        'GENERAL_SERVICES_AUTOMOTIVE': ('Transportation', 'expense'),
        'GENERAL_SERVICES_CHILDCARE': ('Other Expenses', 'expense'),
        'GENERAL_SERVICES_CONSULTING_AND_LEGAL': ('Other Expenses', 'expense'),
        'GENERAL_SERVICES_EDUCATION': ('Education', 'expense'),
        'GENERAL_SERVICES_INSURANCE': ('Insurance', 'expense'),
        'GENERAL_SERVICES_POSTAGE_AND_SHIPPING': ('Other Expenses', 'expense'),
        'GENERAL_SERVICES_STORAGE': ('Other Expenses', 'expense'),
        'GENERAL_SERVICES_OTHER_GENERAL_SERVICES': ('Other Expenses', 'expense'),
        # Also support older naming conventions
        'GENERAL_SERVICES_BUSINESS_SERVICES': ('Other Expenses', 'expense'),  # Older name
        'GENERAL_SERVICES_COMPUTER_SERVICES': ('Other Expenses', 'expense'),  # Older name
        'GENERAL_SERVICES_COUNSELING': ('Other Expenses', 'expense'),  # Older name
        'GENERAL_SERVICES_EDUCATIONAL': ('Education', 'expense'),  # Older name
        'GENERAL_SERVICES_LEGAL': ('Other Expenses', 'expense'),  # Older name
        'GENERAL_SERVICES_PET_SERVICES': ('Other Expenses', 'expense'),  # Older name
        'GENERAL_SERVICES_PHOTOGRAPHY': ('Other Expenses', 'expense'),  # Older name
        'GENERAL_SERVICES_PROFESSIONAL_SERVICES': ('Other Expenses', 'expense'),  # Older name
        'GENERAL_SERVICES_UTILITIES': ('Bills & Utilities', 'expense'),  # Older name
        'GENERAL_SERVICES_VETERINARY_SERVICES': ('Other Expenses', 'expense'),  # Older name
        '_DEFAULT': ('Other Expenses', 'expense'),
    },
    
    # Medical
    'MEDICAL': {
        'MEDICAL_DENTAL_CARE': ('Healthcare', 'expense'),
        'MEDICAL_EYE_CARE': ('Healthcare', 'expense'),
        'MEDICAL_NURSING_CARE': ('Healthcare', 'expense'),
        'MEDICAL_PHARMACIES_AND_SUPPLEMENTS': ('Healthcare', 'expense'),
        'MEDICAL_PRIMARY_CARE': ('Healthcare', 'expense'),
        'MEDICAL_VETERINARY_SERVICES': ('Other Expenses', 'expense'),
        'MEDICAL_OTHER_MEDICAL': ('Healthcare', 'expense'),
        # Also support older naming conventions
        'MEDICAL_DENTAL': ('Healthcare', 'expense'),  # Older name
        '_DEFAULT': ('Healthcare', 'expense'),
    },
    
    # Personal Care
    'PERSONAL_CARE': {
        'PERSONAL_CARE_GYMS_AND_FITNESS_CENTERS': ('Personal Care', 'expense'),
        'PERSONAL_CARE_HAIR_AND_BEAUTY': ('Personal Care', 'expense'),
        'PERSONAL_CARE_LAUNDRY_AND_DRY_CLEANING': ('Personal Care', 'expense'),
        'PERSONAL_CARE_OTHER_PERSONAL_CARE': ('Personal Care', 'expense'),
        '_DEFAULT': ('Personal Care', 'expense'),
    },
    
    # Home Improvement
    'HOME_IMPROVEMENT': {
        'HOME_IMPROVEMENT_FURNITURE': ('Home & Garden', 'expense'),
        'HOME_IMPROVEMENT_HARDWARE': ('Home & Garden', 'expense'),
        'HOME_IMPROVEMENT_REPAIR_AND_MAINTENANCE': ('Home & Garden', 'expense'),
        'HOME_IMPROVEMENT_SECURITY': ('Home & Garden', 'expense'),
        'HOME_IMPROVEMENT_OTHER_HOME_IMPROVEMENT': ('Home & Garden', 'expense'),
        '_DEFAULT': ('Home & Garden', 'expense'),
    },
    
    # Government and Non-Profit
    'GOVERNMENT_AND_NON_PROFIT': {
        'GOVERNMENT_AND_NON_PROFIT_DONATIONS': ('Other Expenses', 'expense'),
        'GOVERNMENT_AND_NON_PROFIT_GOVERNMENT_DEPARTMENTS_AND_AGENCIES': ('Other Expenses', 'expense'),
        'GOVERNMENT_AND_NON_PROFIT_TAX_PAYMENT': ('Taxes', 'expense'),
        'GOVERNMENT_AND_NON_PROFIT_OTHER_GOVERNMENT_AND_NON_PROFIT': ('Other Expenses', 'expense'),
        '_DEFAULT': ('Other Expenses', 'expense'),
    },
    
    # Transportation
    'TRANSPORTATION': {
        'TRANSPORTATION_GAS': ('Gas & Fuel', 'expense'),
        'TRANSPORTATION_PARKING': ('Transportation', 'expense'),
        'TRANSPORTATION_PUBLIC_TRANSIT': ('Transportation', 'expense'),
        'TRANSPORTATION_TAXIS_AND_RIDE_SHARES': ('Transportation', 'expense'),
        'TRANSPORTATION_TOLLS': ('Transportation', 'expense'),
        'TRANSPORTATION_BIKES_AND_SCOOTERS': ('Transportation', 'expense'),
        'TRANSPORTATION_OTHER_TRANSPORTATION': ('Transportation', 'expense'),
        # Also support older naming conventions
        'TRANSPORTATION_TAXIS': ('Transportation', 'expense'),  # Older name
        'TRANSPORTATION_PUBLIC_TRANSPORTATION': ('Transportation', 'expense'),  # Older name
        'TRANSPORTATION_GAS_STATIONS': ('Gas & Fuel', 'expense'),  # Older name
        'TRANSPORTATION_AUTOMOTIVE': ('Transportation', 'expense'),  # Older name
        '_DEFAULT': ('Transportation', 'expense'),
    },
    
    # Travel
    'TRAVEL': {
        'TRAVEL_FLIGHTS': ('Travel', 'expense'),
        'TRAVEL_LODGING': ('Travel', 'expense'),
        'TRAVEL_RENTAL_CARS': ('Travel', 'expense'),
        'TRAVEL_OTHER_TRAVEL': ('Travel', 'expense'),
        # Also support older naming conventions
        'TRAVEL_HOTELS': ('Travel', 'expense'),  # Older name
        'TRAVEL_TRAINS': ('Travel', 'expense'),  # Older name
        'TRAVEL_CRUISES': ('Entertainment', 'expense'),  # Older name - note this maps to Entertainment
        '_DEFAULT': ('Travel', 'expense'),
    },
    
    # Rent and Utilities
    'RENT_AND_UTILITIES': {
        'RENT_AND_UTILITIES_RENT': ('Bills & Utilities', 'expense'),
        'RENT_AND_UTILITIES_GAS_AND_ELECTRICITY': ('Bills & Utilities', 'expense'),
        'RENT_AND_UTILITIES_INTERNET_AND_CABLE': ('Bills & Utilities', 'expense'),
        'RENT_AND_UTILITIES_TELEPHONE': ('Bills & Utilities', 'expense'),
        'RENT_AND_UTILITIES_WATER': ('Bills & Utilities', 'expense'),
        'RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT': ('Bills & Utilities', 'expense'),
        'RENT_AND_UTILITIES_OTHER_UTILITIES': ('Bills & Utilities', 'expense'),
        '_DEFAULT': ('Bills & Utilities', 'expense'),
    },
}


def load_taxonomy_csv(csv_path: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Load Plaid category taxonomy from CSV file.
    
    Args:
        csv_path: Path to CSV file. If None, looks for file in project root.
        
    Returns:
        List of dictionaries with PRIMARY, DETAILED, and DESCRIPTION keys
    """
    if csv_path is None:
        # Look for CSV file in project root
        project_root = Path(__file__).parent.parent.parent
        csv_path = project_root / 'transactions-personal-finance-category-taxonomy.csv'
        
        # Also check backend directory
        if not csv_path.exists():
            csv_path = project_root / 'backend' / 'transactions-personal-finance-category-taxonomy.csv'
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Taxonomy CSV file not found: {csv_path}")
    
    categories = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            categories.append({
                'primary': row.get('PRIMARY', '').strip(),
                'detailed': row.get('DETAILED', '').strip(),
                'description': row.get('DESCRIPTION', '').strip(),
            })
    
    logger.info(f"Loaded {len(categories)} categories from {csv_path}")
    return categories


def generate_plaid_category_mappings(
    taxonomy_categories: Optional[List[Dict[str, str]]] = None,
    csv_path: Optional[str] = None
) -> Tuple[Dict[str, Tuple[str, str]], Dict[str, Tuple[str, str]]]:
    """
    Generate Plaid category mappings from taxonomy CSV.
    
    Args:
        taxonomy_categories: Optional pre-loaded category list
        csv_path: Optional path to CSV file
        
    Returns:
        Tuple of (detailed_category_mapping, primary_category_mapping)
        Each mapping is: "PLAID_CATEGORY": ("system_category_name", "category_type")
    """
    if taxonomy_categories is None:
        taxonomy_categories = load_taxonomy_csv(csv_path)
    
    detailed_mapping = {}
    primary_mapping = {}
    
    # Track which primary categories we've seen
    seen_primaries = set()
    
    for cat in taxonomy_categories:
        primary = cat['primary']
        detailed = cat['detailed']
        description = cat['description']
        
        if not primary or not detailed:
            continue
        
        # Determine transaction type from primary category
        # Income categories are always income type
        if primary in ['INCOME', 'TRANSFER_IN']:
            category_type = 'income'
        else:
            # All other categories are expenses
            category_type = 'expense'
        
        # Get mapping from SYSTEM_CATEGORY_MAPPINGS
        system_category_name = None
        mapped_type = category_type
        
        if primary in SYSTEM_CATEGORY_MAPPINGS:
            primary_mappings = SYSTEM_CATEGORY_MAPPINGS[primary]
            
            # Try detailed category first
            if detailed in primary_mappings:
                system_category_name, mapped_type = primary_mappings[detailed]
            # Fall back to default for primary category
            elif '_DEFAULT' in primary_mappings:
                system_category_name, mapped_type = primary_mappings['_DEFAULT']
        
        # If no mapping found, use intelligent fallback
        if not system_category_name:
            # Analyze description and primary category to determine system category
            system_category_name, mapped_type = _intelligent_category_mapping(
                primary, detailed, description
            )
        
        # Add to detailed mapping
        if system_category_name:
            detailed_mapping[detailed] = (system_category_name, mapped_type)
        
        # Add to primary mapping if we haven't seen this primary yet
        if primary not in seen_primaries and system_category_name:
            primary_mapping[primary] = (system_category_name, mapped_type)
            seen_primaries.add(primary)
    
    logger.info(
        f"Generated {len(detailed_mapping)} detailed category mappings and "
        f"{len(primary_mapping)} primary category mappings"
    )
    
    return detailed_mapping, primary_mapping


def _intelligent_category_mapping(
    primary: str,
    detailed: str,
    description: str
) -> Tuple[str, str]:
    """
    Intelligently map Plaid category to system category based on description and category name.
    
    Args:
        primary: Primary Plaid category
        detailed: Detailed Plaid category
        description: Category description
        
    Returns:
        Tuple of (system_category_name, category_type)
    """
    description_lower = description.lower()
    
    # Determine transaction type
    if primary in ['INCOME', 'TRANSFER_IN']:
        category_type = 'income'
    else:
        category_type = 'expense'
    
    # Intelligent mapping based on keywords in description
    if category_type == 'income':
        if 'salary' in description_lower or 'wages' in description_lower:
            return ('Salary', 'income')
        elif 'dividend' in description_lower or 'investment' in description_lower:
            return ('Investment', 'income')
        elif 'interest' in description_lower:
            return ('Interest', 'income')
        elif 'rental' in description_lower:
            return ('Rental Income', 'income')
        elif 'freelance' in description_lower or 'gig' in description_lower:
            return ('Freelance', 'income')
        else:
            return ('Other Income', 'income')
    else:
        # Expense categories
        if 'grocery' in description_lower or 'food' in description_lower and 'dining' not in description_lower:
            return ('Groceries', 'expense')
        elif 'restaurant' in description_lower or 'dining' in description_lower or 'coffee' in description_lower:
            return ('Food & Dining', 'expense')
        elif 'gas' in description_lower or 'fuel' in description_lower:
            return ('Gas & Fuel', 'expense')
        elif 'transport' in description_lower or 'parking' in description_lower or 'toll' in description_lower:
            return ('Transportation', 'expense')
        elif 'utility' in description_lower or 'rent' in description_lower or 'electricity' in description_lower:
            return ('Bills & Utilities', 'expense')
        elif 'medical' in description_lower or 'health' in description_lower or 'pharmacy' in description_lower:
            return ('Healthcare', 'expense')
        elif 'education' in description_lower or 'tuition' in description_lower or 'school' in description_lower:
            return ('Education', 'expense')
        elif 'entertainment' in description_lower or 'movie' in description_lower or 'music' in description_lower:
            return ('Entertainment', 'expense')
        elif 'shop' in description_lower or 'store' in description_lower or 'merchandise' in description_lower:
            return ('Shopping', 'expense')
        elif 'travel' in description_lower or 'hotel' in description_lower or 'flight' in description_lower:
            return ('Travel', 'expense')
        elif 'home' in description_lower or 'garden' in description_lower or 'furniture' in description_lower:
            return ('Home & Garden', 'expense')
        elif 'insurance' in description_lower:
            return ('Insurance', 'expense')
        elif 'tax' in description_lower:
            return ('Taxes', 'expense')
        else:
            return ('Other Expenses', 'expense')


def update_plaid_category_mapper(
    mapper_file_path: Optional[str] = None,
    csv_path: Optional[str] = None
) -> None:
    """
    Update plaid_category_mapper.py with generated mappings.
    
    Args:
        mapper_file_path: Path to plaid_category_mapper.py file
        csv_path: Path to taxonomy CSV file
    """
    if mapper_file_path is None:
        mapper_file_path = Path(__file__).parent / 'plaid_category_mapper.py'
    
    # Generate mappings
    detailed_mapping, primary_mapping = generate_plaid_category_mappings(csv_path=csv_path)
    
    # Read existing mapper file
    with open(mapper_file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Generate new mapping dictionaries as Python code
    detailed_mapping_code = _generate_mapping_dict_code(detailed_mapping, "PLAID_DETAILED_CATEGORY_MAPPING")
    primary_mapping_code = _generate_mapping_dict_code(primary_mapping, "PLAID_PRIMARY_CATEGORY_MAPPING")
    
    # Replace the mapping dictionaries in the file
    # This is a simple approach - in production, you might want to use AST manipulation
    import re
    
    # Replace detailed mapping
    detailed_pattern = r'PLAID_DETAILED_CATEGORY_MAPPING = \{[^}]+\}'
    content = re.sub(
        detailed_pattern,
        detailed_mapping_code,
        content,
        flags=re.DOTALL
    )
    
    # Replace primary mapping
    primary_pattern = r'PLAID_PRIMARY_CATEGORY_MAPPING = \{[^}]+\}'
    content = re.sub(
        primary_pattern,
        primary_mapping_code,
        content,
        flags=re.DOTALL
    )
    
    # Write updated content
    with open(mapper_file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    logger.info(f"Updated {mapper_file_path} with generated mappings")


def _generate_mapping_dict_code(mapping: Dict[str, Tuple[str, str]], var_name: str) -> str:
    """
    Generate Python dictionary code from mapping.
    
    Args:
        mapping: Dictionary mapping Plaid categories to (system_category, type) tuples
        var_name: Variable name for the dictionary
        
    Returns:
        Python code string for the dictionary
    """
    lines = [f"{var_name} = {{"]
    
    # Group by primary category prefix for better organization
    from collections import defaultdict
    by_primary = defaultdict(list)
    
    for key in sorted(mapping.keys()):
        # Extract primary category (first part before underscore)
        parts = key.split('_')
        if len(parts) > 1:
            primary = parts[0]  # e.g., "FOOD" from "FOOD_AND_DRINK_RESTAURANT"
        else:
            primary = key
        by_primary[primary].append(key)
    
    # Generate organized output
    for primary in sorted(by_primary.keys()):
        # Add comment for primary category group
        if primary not in ['INCOME', 'TRANSFER_IN', 'TRANSFER_OUT']:
            lines.append(f"    # {primary.replace('_', ' ').title()}")
        
        for key in sorted(by_primary[primary]):
            system_category, category_type = mapping[key]
            lines.append(f'    "{key}": ("{system_category}", "{category_type}"),')
        
        # Add blank line between groups
        if primary != sorted(by_primary.keys())[-1]:
            lines.append("")
    
    lines.append("}")
    
    return "\n".join(lines)


if __name__ == '__main__':
    # When run as script, update the mapper file
    import logging
    logging.basicConfig(level=logging.INFO)
    
    try:
        update_plaid_category_mapper()
        print("Successfully updated plaid_category_mapper.py with generated mappings")
    except Exception as e:
        print(f"Error updating mapper: {e}")
        raise

