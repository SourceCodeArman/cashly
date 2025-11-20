#!/usr/bin/env python
"""
Debug script to check transaction categorization issues.
Run with: python debug_categorization.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.transactions.models import Transaction, Category
from apps.transactions.plaid_category_mapper import (
    PLAID_DETAILED_CATEGORY_MAPPING,
    PLAID_PRIMARY_CATEGORY_MAPPING,
)

def main():
    print("=" * 80)
    print("TRANSACTION CATEGORIZATION DEBUG REPORT")
    print("=" * 80)
    
    # Check system categories
    print("\n1. SYSTEM CATEGORIES:")
    print("-" * 80)
    categories = Category.objects.filter(is_system_category=True).order_by('type', 'name')
    print(f"Total system categories: {categories.count()}")
    for cat in categories:
        print(f"  - {cat.name} ({cat.type})")
    
    # Check transactions
    print("\n2. TRANSACTION ANALYSIS:")
    print("-" * 80)
    all_txns = Transaction.objects.all()
    print(f"Total transactions: {all_txns.count()}")
    
    # Transactions with categories
    categorized = all_txns.exclude(category__isnull=True)
    print(f"Transactions with categories: {categorized.count()}")
    
    # Transactions without categories
    uncategorized = all_txns.filter(category__isnull=True)
    print(f"Transactions without categories: {uncategorized.count()}")
    
    # Transactions with Plaid category data
    with_plaid = all_txns.exclude(plaid_category__isnull=True).exclude(plaid_category={})
    print(f"Transactions with Plaid category data: {with_plaid.count()}")
    
    # Transactions without Plaid category data
    without_plaid = all_txns.filter(plaid_category__isnull=True) | all_txns.filter(plaid_category={})
    print(f"Transactions without Plaid category data: {without_plaid.count()}")
    
    # Category distribution
    print("\n3. CATEGORY DISTRIBUTION:")
    print("-" * 80)
    from django.db.models import Count
    category_counts = categorized.values('category__name').annotate(count=Count('id')).order_by('-count')
    for item in category_counts[:20]:
        print(f"  {item['category__name']}: {item['count']}")
    
    # Sample transactions with Plaid data
    print("\n4. SAMPLE TRANSACTIONS WITH PLAID CATEGORY DATA:")
    print("-" * 80)
    sample_with_plaid = with_plaid[:5]
    for txn in sample_with_plaid:
        plaid_cat = txn.plaid_category or {}
        print(f"\n  Merchant: {txn.merchant_name}")
        print(f"  Amount: {txn.amount}")
        print(f"  Current Category: {txn.category.name if txn.category else 'None'}")
        print(f"  Plaid Category: primary={plaid_cat.get('primary')}, detailed={plaid_cat.get('detailed')}")
        
        # Check if mapping exists
        detailed = plaid_cat.get('detailed')
        primary = plaid_cat.get('primary')
        if detailed and detailed in PLAID_DETAILED_CATEGORY_MAPPING:
            mapped_name, mapped_type = PLAID_DETAILED_CATEGORY_MAPPING[detailed]
            print(f"  ✓ Detailed mapping found: {detailed} -> {mapped_name} ({mapped_type})")
        elif primary and primary in PLAID_PRIMARY_CATEGORY_MAPPING:
            mapped_name, mapped_type = PLAID_PRIMARY_CATEGORY_MAPPING[primary]
            print(f"  ✓ Primary mapping found: {primary} -> {mapped_name} ({mapped_type})")
        else:
            print(f"  ✗ No mapping found for: primary={primary}, detailed={detailed}")
    
    # Sample transactions without Plaid data
    print("\n5. SAMPLE TRANSACTIONS WITHOUT PLAID CATEGORY DATA:")
    print("-" * 80)
    sample_without_plaid = without_plaid[:5]
    for txn in sample_without_plaid:
        print(f"  {txn.merchant_name}: {txn.amount} -> {txn.category.name if txn.category else 'No category'}")
    
    print("\n" + "=" * 80)
    print("DEBUG REPORT COMPLETE")
    print("=" * 80)

if __name__ == '__main__':
    main()

