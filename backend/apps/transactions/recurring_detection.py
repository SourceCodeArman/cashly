"""
Recurring transaction detection algorithm.
Uses simple, clear criteria for identifying recurring transactions.
"""
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from collections import defaultdict
from difflib import SequenceMatcher
import re
from .models import Transaction


# Configuration - STRICT for subscription-only detection
# These settings are very conservative to avoid false positives from regular purchases
MERCHANT_SIMILARITY_THRESHOLD = 0.98  # 98% similarity - subscriptions have consistent names
AMOUNT_TOLERANCE_PERCENT = 0.01  # 1% tolerance - subscriptions charge exact amounts
MIN_OCCURRENCES_POSSIBLE = 3  # 3 matches = "possible recurring"
MIN_OCCURRENCES_CONFIRMED = 4  # 4+ matches = "confirmed recurring" (more evidence needed)
LOOKBACK_DAYS = 180  # 6 months

# Time interval ranges (in days) with tolerance - TIGHTER for subscriptions
# Subscriptions have very consistent billing cycles
INTERVALS = {
    'weekly': {'target': 7, 'min': 6, 'max': 8},  # ±1 day
    'biweekly': {'target': 14, 'min': 12, 'max': 16},  # ±2 days
    'monthly': {'target': 30, 'min': 27, 'max': 33},  # ±3 days
    'yearly': {'target': 365, 'min': 360, 'max': 370},  # ±5 days
}


def normalize_merchant_name(merchant_name: str) -> str:
    """
    Normalize merchant name for better matching.
    Removes common suffixes, numbers, locations, etc.
    """
    if not merchant_name:
        return ""
    
    # Convert to lowercase
    name = merchant_name.lower().strip()
    
    # Remove common patterns
    patterns_to_remove = [
        r'#\d+',  # Store numbers like "#1234"
        r'\d{3,}',  # Long numbers
        r'\b(store|location|branch)\s*\d+\b',  # Store/location numbers
        r'\b(inc|llc|ltd|corp|co)\b',  # Company suffixes
        r'\b(the)\b',  # Articles
        r'[^\w\s]',  # Special characters
    ]
    
    for pattern in patterns_to_remove:
        name = re.sub(pattern, ' ', name)
    
    # Remove extra whitespace
    name = ' '.join(name.split())
    
    return name


def merchants_are_similar(merchant1: str, merchant2: str) -> bool:
    """
    Check if two merchant names are similar using fuzzy matching.
    Returns True if similarity >= threshold.
    """
    norm1 = normalize_merchant_name(merchant1)
    norm2 = normalize_merchant_name(merchant2)
    
    if not norm1 or not norm2:
        return False
    
    # Use SequenceMatcher for fuzzy comparison
    ratio = SequenceMatcher(None, norm1, norm2).ratio()
    return ratio >= MERCHANT_SIMILARITY_THRESHOLD


def amounts_are_similar(amount1: Decimal, amount2: Decimal) -> bool:
    """
    Check if two amounts are within tolerance (5-10% difference).
    """
    if amount1 == 0 or amount2 == 0:
        return False
    
    # Calculate percentage difference
    diff = abs(amount1 - amount2)
    avg = (abs(amount1) + abs(amount2)) / 2
    percent_diff = diff / avg if avg > 0 else 0
    
    return percent_diff <= AMOUNT_TOLERANCE_PERCENT


def calculate_interval_days(date1, date2):
    """Calculate days between two dates."""
    return abs((date2 - date1).days)


def classify_interval(days: int) -> str:
    """
    Classify interval based on time ranges.
    Returns: 'weekly', 'biweekly', 'monthly', 'yearly', or None
    """
    for period_type, interval in INTERVALS.items():
        if interval['min'] <= days <= interval['max']:
            return period_type
    return None


def get_category_recurring_weight(transaction) -> float:
    """
    Return a weight (0.0-1.0) indicating how likely this category
    is to contain recurring SUBSCRIPTION transactions.
    
    For subscription-only detection, we strongly bias toward known
    subscription categories and heavily penalize consumer purchases.
    """
    if not transaction.category:
        return 0.3  # Low weight if no category (likely not a subscription)
    
    category_name = transaction.category.name.lower()
    
    # HIGH probability - These are likely subscriptions
    subscription_keywords = [
        'subscription', 'membership', 'streaming', 'software',
        'gym', 'fitness', 'music', 'video', 'app', 'service',
        'cloud', 'hosting', 'saas', 'platform', 'premium'
    ]
    if any(keyword in category_name for keyword in subscription_keywords):
        return 1.0
    
    # MEDIUM-HIGH - Utilities and recurring bills (but we want subscriptions mostly)
    utility_keywords = ['utilities', 'internet', 'phone', 'cable']
    if any(keyword in category_name for keyword in utility_keywords):
        return 0.7
    
    # LOW probability - Consumer purchases (likely NOT subscriptions)
    consumer_keywords = [
        'restaurant', 'food', 'dining', 'coffee', 'cafe', 'bar',
        'groceries', 'grocery', 'shopping', 'retail', 'store',
        'gas', 'fuel', 'transportation', 'travel', 'entertainment'
    ]
    if any(keyword in category_name for keyword in consumer_keywords):
        return 0.1  # Very low - almost certainly not a subscription
    
    return 0.4  # Neutral/low for unknown categories



def detect_recurring_transactions(
    user,
    min_occurrences=MIN_OCCURRENCES_CONFIRMED,
    lookback_days=LOOKBACK_DAYS
):
    """
    Detect recurring transactions using simple, clear criteria:
    
    1. Merchant names must be identical or very similar (fuzzy match)
    2. Amounts must be within 5-10% of each other
    3. Time intervals must match weekly/biweekly/monthly/yearly patterns
    4. 2 matches = "possible recurring", 3+ = "confirmed recurring"
    
    Returns:
        tuple: (detected_groups, updated_count)
    """
    # Get transactions from the last N days
    cutoff_date = timezone.now().date() - timedelta(days=lookback_days)
    
    # First, clear all existing recurring flags for this user
    # This ensures each detection run starts fresh
    cleared_count = Transaction.objects.filter(
        account__user=user,
        is_recurring=True
    ).update(is_recurring=False)
    
    transactions = Transaction.objects.filter(
        account__user=user,
        date__gte=cutoff_date,
        account__isnull=False  # Only include transactions with an account
    ).exclude(
        is_transfer=True  # Exclude transfers from recurring detection
    ).exclude(
        is_recurring_dismissed=True  # Exclude user-dismissed recurring transactions
    ).select_related('account').order_by('account_id', 'merchant_name', 'date')
    
    # Group by account first, then by merchant (fuzzy) within each account
    account_groups = defaultdict(list)
    
    for transaction in transactions:
        # Skip if somehow account_id is None
        if not transaction.account_id:
            continue
        account_groups[transaction.account_id].append(transaction)
    
    # Analyze each account separately
    detected_groups = []
    updated_count = 0
    
    for account_id, account_transactions in account_groups.items():
        # Group by merchant (fuzzy) within this account
        merchant_groups = defaultdict(list)
        processed_ids = set()
        
        for transaction in account_transactions:
            if transaction.transaction_id in processed_ids:
                continue
            
            # Find matching merchant group
            matched = False
            for merchant_key in list(merchant_groups.keys()):
                if merchants_are_similar(transaction.merchant_name, merchant_key):
                    merchant_groups[merchant_key].append(transaction)
                    processed_ids.add(transaction.transaction_id)
                    matched = True
                    break
            
            if not matched:
                # Create new group
                merchant_groups[transaction.merchant_name].append(transaction)
                processed_ids.add(transaction.transaction_id)
        
        # Analyze each merchant group for recurring patterns
        for merchant_name, group_transactions in merchant_groups.items():
            if len(group_transactions) < MIN_OCCURRENCES_POSSIBLE:
                continue
            
            # Sort by date
            group_transactions.sort(key=lambda t: t.date)
            
            # Find recurring subgroups with similar amounts
            amount_groups = defaultdict(list)
            
            for transaction in group_transactions:
                amount = abs(transaction.amount)
                
                # Find matching amount group
                matched = False
                for key_amount in list(amount_groups.keys()):
                    if amounts_are_similar(amount, key_amount):
                        amount_groups[key_amount].append(transaction)
                        matched = True
                        break
                
                if not matched:
                    amount_groups[amount].append(transaction)
            
            # Check each amount group for time pattern
            for amount, transactions_list in amount_groups.items():
                if len(transactions_list) < MIN_OCCURRENCES_POSSIBLE:
                    continue
                
                # Calculate intervals between consecutive transactions
                intervals = []
                for i in range(1, len(transactions_list)):
                    days = calculate_interval_days(
                        transactions_list[i-1].date,
                        transactions_list[i].date
                    )
                    intervals.append(days)
                
                # Check if intervals match a pattern
                if not intervals:
                    continue
                
                # Classify the most common interval
                interval_classifications = [classify_interval(d) for d in intervals]
                interval_classifications = [ic for ic in interval_classifications if ic]  # Remove None
                
                if not interval_classifications:
                    continue
                
                # Get most common classification
                period_type = max(set(interval_classifications), key=interval_classifications.count)
                avg_interval = sum(intervals) / len(intervals)
                
                # NEW: Check interval consistency - subscriptions have very consistent intervals
                # Calculate standard deviation of intervals
                if len(intervals) > 1:
                    mean_interval = sum(intervals) / len(intervals)
                    variance = sum((x - mean_interval) ** 2 for x in intervals) / len(intervals)
                    std_dev = variance ** 0.5
                    
                    # For subscriptions, standard deviation should be low (consistent timing)
                    # Allow max ~10% variance from mean
                    max_std_dev = mean_interval * 0.10
                    if std_dev > max_std_dev:
                        # Intervals are too inconsistent - probably not a subscription
                        continue
                
                # NEW: Calculate category weight for subscription likelihood
                # Use the first transaction's category (they should all be similar)
                category_weight = get_category_recurring_weight(transactions_list[0])
                
                # NEW: Apply category-based filtering for subscription-only detection
                # If category weight is too low or neutral, skip this group entirely
                # 0.3 = uncategorized/neutral, we want only clearly categorized subscriptions
                if category_weight <= 0.3:
                    # Very unlikely to be a subscription (e.g., restaurants, groceries, uncategorized)
                    continue
                
                # Determine confidence level
                occurrences = len(transactions_list)
                if occurrences >= MIN_OCCURRENCES_CONFIRMED:
                    confidence_level = "confirmed"
                    is_recurring = True
                else:
                    confidence_level = "possible"
                    is_recurring = (occurrences >= min_occurrences)  # Only mark if meets threshold
                
                # NEW: Adjust confidence based on category weight
                # Even if we have enough occurrences, lower confidence for uncertain categories
                base_confidence = 0.9 if confidence_level == "confirmed" else 0.7
                adjusted_confidence = base_confidence * category_weight
                
                # NEW: Only mark as recurring if category weight is high enough
                # This prevents false positives from ambiguous categories
                if adjusted_confidence < 0.5:
                    is_recurring = False  # Don't mark as recurring if confidence too low
                
                # Mark transactions as recurring
                if is_recurring:
                    for transaction in transactions_list:
                        if not transaction.is_recurring:
                            transaction.is_recurring = True
                            transaction.save(update_fields=['is_recurring'])
                            updated_count += 1
                
                # Add to detected groups
                detected_groups.append({
                    'merchant': merchant_name,
                'normalized_merchant': normalize_merchant_name(merchant_name),
                'amount': float(amount),
                'period_type': period_type,
                'interval_days': int(avg_interval),
                'occurrences': occurrences,
                'confidence_level': confidence_level,
                'confidence_score': round(adjusted_confidence, 2),
                'category_weight': round(category_weight, 2),
                'transaction_ids': [t.transaction_id for t in transactions_list],
                    'first_date': str(transactions_list[0].date),
                    'last_date': str(transactions_list[-1].date),
                    'account_id': str(account_id),
                    'account_name': (
                        transactions_list[0].account.custom_name 
                        or transactions_list[0].account.institution_name
                        if transactions_list[0].account else 'Unknown'
                    ),
                })
    
    return detected_groups, updated_count


def find_similar_recurring_transactions(transaction, user, max_results=5):
    """
    Find similar transactions that might be part of the same recurring pattern.
    """
    cutoff_date = timezone.now().date() - timedelta(days=LOOKBACK_DAYS)
    
    similar = Transaction.objects.filter(
        account__user=user,
        date__gte=cutoff_date
    ).exclude(
        transaction_id=transaction.transaction_id
    ).exclude(
        is_transfer=True
    )
    
    # Filter by similar merchant and amount
    results = []
    for t in similar:
        if merchants_are_similar(transaction.merchant_name, t.merchant_name):
            if amounts_are_similar(abs(transaction.amount), abs(t.amount)):
                results.append(t)
        
        if len(results) >= max_results:
            break
    
    return results
