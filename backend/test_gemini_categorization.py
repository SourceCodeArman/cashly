#!/usr/bin/env python
"""
Test script for Gemini AI categorization.

This script tests the Gemini AI categorization service with a sample transaction.
Set the GEMINI_API_KEY environment variable before running.

Usage:
    python test_gemini_categorization.py
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

from apps.transactions.models import Category
from apps.transactions.ai_service import GeminiCategorizationService
from apps.transactions.categorization import format_transaction_for_ai, format_categories_for_ai


def test_gemini_categorization():
    """Test Gemini categorization with a sample transaction."""
    
    # Check if API key is set
    api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("❌ Error: GEMINI_API_KEY or GOOGLE_API_KEY environment variable not set")
        print("Get your API key from: https://makersuite.google.com/app/apikey")
        return False
    
    print("🔧 Initializing Gemini AI Service...")
    try:
        service = GeminiCategorizationService(api_key=api_key)
        print(f"✅ Gemini service initialized with model: {service.model_name}")
    except Exception as e:
        print(f"❌ Failed to initialize Gemini service: {e}")
        return False
    
    # Sample transaction
    sample_transaction = {
        'transaction_id': 'test-001',
        'merchant_name': 'Starbucks',
        'amount': -4.50,
        'description': 'Coffee purchase',
        'date': '2024-12-08',
        'type': 'expense',
        'location': {}
    }
    
    # Get some sample categories from the database
    print("\n📋 Fetching available categories...")
    categories = list(Category.objects.filter(
        is_system_category=True,
        type='expense'
    )[:10])  # Limit to 10 categories for testing
    
    if not categories:
        print("❌ No categories found in database")
        print("Run: python manage.py seed_categories")
        return False
    
    print(f"✅ Found {len(categories)} categories")
    for cat in categories:
        print(f"   - {cat.name} ({cat.category_id})")
    
    # Format data for AI
    categories_data = format_categories_for_ai(categories)
    
    # Test categorization
    print(f"\n🤖 Categorizing transaction: {sample_transaction['merchant_name']} (-${abs(sample_transaction['amount'])})")
    try:
        result = service.categorize_transaction(sample_transaction, categories_data)
        
        if result:
            # Find the suggested category
            suggested_category = next(
                (cat for cat in categories if str(cat.category_id) == result['category_id']),
                None
            )
            
            print("\n✅ Categorization successful!")
            print(f"   Category: {suggested_category.name if suggested_category else 'Unknown'}")
            print(f"   Category ID: {result['category_id']}")
            print(f"   Confidence: {result['confidence_score']:.2%}")
            print(f"   Reasoning: {result.get('reasoning', 'N/A')}")
            return True
        else:
            print("❌ Categorization returned no result")
            return False
            
    except Exception as e:
        print(f"❌ Categorization failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    print("=" * 60)
    print("🧪 Gemini AI Categorization Test")
    print("=" * 60)
    
    success = test_gemini_categorization()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Test PASSED")
        print("\nNext steps:")
        print("1. Set AI_PROVIDER=gemini in your .env file")
        print("2. Restart the backend: docker-compose restart web")
        print("3. Test via API endpoint: POST /api/v1/transactions/{id}/suggest_category")
    else:
        print("❌ Test FAILED")
        print("\nTroubleshooting:")
        print("1. Verify GEMINI_API_KEY is set correctly")
        print("2. Check that categories exist: python manage.py seed_categories")
        print("3. Review error messages above")
    print("=" * 60)
    
    sys.exit(0 if success else 1)
