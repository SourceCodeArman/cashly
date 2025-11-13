"""
Transaction categorization utilities.

Provides helper functions for formatting transactions and categories for AI processing,
and orchestrates the categorization workflow.
"""
from typing import Dict, List, Optional, Any
from decimal import Decimal
from django.db import transaction as db_transaction
from django.utils import timezone
import logging

from .models import Transaction, Category
from .ai_service import AIServiceFactory

logger = logging.getLogger(__name__)


def format_transaction_for_ai(transaction: Transaction) -> Dict[str, Any]:
    """
    Format a Transaction model instance for AI processing.
    
    Args:
        transaction: Transaction model instance
    
    Returns:
        Dictionary with transaction data formatted for AI
    """
    return {
        'transaction_id': str(transaction.transaction_id),
        'merchant_name': transaction.merchant_name,
        'amount': float(transaction.amount),
        'description': transaction.description or '',
        'date': transaction.date.isoformat() if transaction.date else '',
        'type': 'expense' if transaction.amount < 0 else 'income',
        'location': transaction.location or {},
    }


def format_categories_for_ai(categories: List[Category]) -> List[Dict[str, Any]]:
    """
    Format Category model instances for AI processing.
    
    Args:
        categories: List of Category model instances
    
    Returns:
        List of dictionaries with category data formatted for AI
    """
    return [
        {
            'category_id': str(cat.category_id),
            'name': cat.name,
            'type': cat.type,
            'description': f"{cat.name} ({cat.get_type_display()})",
        }
        for cat in categories
    ]


def get_available_categories_for_user(user, transaction_type: str = None) -> List[Category]:
    """
    Get available categories for a user, optionally filtered by transaction type.
    
    Args:
        user: User instance
        transaction_type: Optional filter by type ('expense', 'income', 'transfer')
    
    Returns:
        List of Category instances
    """
    categories = Category.objects.for_user(user)
    
    if transaction_type:
        categories = categories.filter(type=transaction_type)
    
    return list(categories)


def auto_categorize_transaction(
    transaction: Transaction,
    ai_service: Optional[Any] = None
) -> Optional[Category]:
    """
    Automatically categorize a transaction using AI.
    
    Args:
        transaction: Transaction model instance to categorize
        ai_service: Optional AI service instance (creates one if not provided)
    
    Returns:
        Category instance if successful, None otherwise
    """
    # Skip if already categorized or user-modified
    if transaction.category and transaction.user_modified:
        logger.debug(f"Transaction {transaction.transaction_id} already user-modified, skipping AI categorization")
        return None
    
    # Skip if already has a category (unless we want to re-categorize)
    if transaction.category:
        logger.debug(f"Transaction {transaction.transaction_id} already has category, skipping")
        return None
    
    # Get AI service
    if ai_service is None:
        ai_service = AIServiceFactory.create_service()
    
    if ai_service is None:
        logger.debug("AI service not available, skipping categorization")
        return None
    
    try:
        # Format transaction and categories for AI
        transaction_data = format_transaction_for_ai(transaction)
        transaction_type = 'expense' if transaction.amount < 0 else 'income'
        available_categories = get_available_categories_for_user(transaction.user, transaction_type)
        
        if not available_categories:
            logger.warning(f"No categories available for user {transaction.user.id}")
            return None
        
        categories_data = format_categories_for_ai(available_categories)
        
        # Get AI categorization
        result = ai_service.categorize_transaction(transaction_data, categories_data)
        
        if not result:
            logger.debug(f"AI service returned no result for transaction {transaction.transaction_id}")
            return None
        
        # Find the suggested category
        try:
            category = Category.objects.get(category_id=result['category_id'])
            
            # Verify category is available to user
            if not category.is_system_category and category.user != transaction.user:
                logger.warning(f"Suggested category {result['category_id']} not available to user")
                return None
            
            # Verify category type matches transaction type
            if (transaction_type == 'expense' and category.type != 'expense') or \
               (transaction_type == 'income' and category.type != 'income'):
                logger.warning(f"Category type mismatch: transaction is {transaction_type}, category is {category.type}")
                return None
            
            logger.info(
                f"AI categorized transaction {transaction.transaction_id} as {category.name} "
                f"(confidence: {result.get('confidence_score', 0):.2f})"
            )
            
            return category
            
        except Category.DoesNotExist:
            logger.warning(f"Suggested category {result['category_id']} not found")
            return None
            
    except Exception as e:
        logger.error(f"Error during AI categorization: {str(e)}", exc_info=True)
        return None


def get_category_suggestions(
    transaction: Transaction,
    limit: int = 3,
    ai_service: Optional[Any] = None
) -> List[Dict[str, Any]]:
    """
    Get multiple category suggestions for a transaction.
    
    Note: Current implementation returns single suggestion. Future enhancements
    could request multiple suggestions from the AI.
    
    Args:
        transaction: Transaction model instance
        limit: Maximum number of suggestions to return
        ai_service: Optional AI service instance
    
    Returns:
        List of suggestion dictionaries with:
            - category_id: str
            - category_name: str
            - confidence_score: float
            - reasoning: str
    """
    # Get AI service
    if ai_service is None:
        ai_service = AIServiceFactory.create_service()
    
    if ai_service is None:
        return []
    
    try:
        # Format transaction and categories for AI
        transaction_data = format_transaction_for_ai(transaction)
        transaction_type = 'expense' if transaction.amount < 0 else 'income'
        available_categories = get_available_categories_for_user(transaction.user, transaction_type)
        
        if not available_categories:
            return []
        
        categories_data = format_categories_for_ai(available_categories)
        
        # Get AI categorization
        result = ai_service.categorize_transaction(transaction_data, categories_data)
        
        if not result:
            return []
        
        # Get category details
        try:
            category = Category.objects.get(category_id=result['category_id'])
            
            return [{
                'category_id': str(category.category_id),
                'category_name': category.name,
                'confidence_score': result.get('confidence_score', 0.0),
                'reasoning': result.get('reasoning', '')
            }]
        except Category.DoesNotExist:
            return []
            
    except Exception as e:
        logger.error(f"Error getting category suggestions: {str(e)}", exc_info=True)
        return []


def apply_category_to_transaction(
    transaction: Transaction,
    category: Category,
    user_modified: bool = False
) -> bool:
    """
    Apply a category to a transaction.
    
    Args:
        transaction: Transaction instance
        category: Category instance
        user_modified: Whether this was a user modification
    
    Returns:
        True if successful, False otherwise
    """
    try:
        transaction.category = category
        if user_modified:
            transaction.user_modified = True
        transaction.save(update_fields=['category', 'user_modified'])
        return True
    except Exception as e:
        logger.error(f"Error applying category to transaction: {str(e)}")
        return False

