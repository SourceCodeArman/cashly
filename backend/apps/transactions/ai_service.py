"""
AI service abstraction layer for transaction categorization.

Provides a provider-agnostic interface for AI-powered transaction categorization,
supporting multiple backends (Ollama, OpenAI, Anthropic, etc.).
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from django.conf import settings
import logging
import requests

logger = logging.getLogger(__name__)


class AICategorizationService(ABC):
    """
    Abstract base class for AI categorization services.
    
    All AI providers must implement this interface to ensure consistent
    behavior across different backends.
    """
    
    @abstractmethod
    def categorize_transaction(
        self,
        transaction_data: Dict[str, Any],
        available_categories: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Categorize a single transaction using AI.
        
        Args:
            transaction_data: Dictionary containing transaction details:
                - merchant_name: str
                - amount: Decimal or float
                - description: str
                - date: str (ISO format)
                - type: str ('expense' or 'income')
            available_categories: List of category dictionaries, each containing:
                - category_id: str (UUID)
                - name: str
                - type: str ('expense', 'income', 'transfer')
                - description: Optional[str]
        
        Returns:
            Dictionary with:
                - category_id: str (UUID of suggested category)
                - confidence_score: float (0.0 to 1.0)
                - reasoning: Optional[str] (explanation for the categorization)
            Returns None if categorization fails.
        """
        pass
    
    @abstractmethod
    def categorize_batch(
        self,
        transactions_data: List[Dict[str, Any]],
        available_categories: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Categorize multiple transactions in a batch.
        
        Args:
            transactions_data: List of transaction dictionaries
            available_categories: List of category dictionaries
        
        Returns:
            Dictionary mapping transaction identifiers to categorization results:
                {
                    'transaction_id': {
                        'category_id': str,
                        'confidence_score': float,
                        'reasoning': Optional[str]
                    },
                    ...
                }
        """
        pass


class OllamaCategorizationService(AICategorizationService):
    """
    Ollama-based AI categorization service.
    
    Uses local Ollama instance for transaction categorization.
    """
    
    def __init__(self, base_url: str = None, model: str = None):
        """
        Initialize Ollama service.
        
        Args:
            base_url: Ollama API base URL (defaults to settings.OLLAMA_BASE_URL)
            model: Model name to use (defaults to settings.OLLAMA_MODEL)
        """
        self.base_url = base_url or getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
        self.model = model or getattr(settings, 'OLLAMA_MODEL', 'llama3.1:8b')
        self.api_url = f"{self.base_url}/api/generate"
        
    def _build_prompt(
        self,
        transaction_data: Dict[str, Any],
        available_categories: List[Dict[str, Any]]
    ) -> str:
        """
        Build the prompt for transaction categorization.
        
        Args:
            transaction_data: Transaction details
            available_categories: Available categories
        
        Returns:
            Formatted prompt string
        """
        # Format transaction details
        amount = abs(float(transaction_data.get('amount', 0)))
        amount_str = f"${amount:,.2f}"
        transaction_type = transaction_data.get('type', 'expense')
        merchant = transaction_data.get('merchant_name', 'Unknown')
        description = transaction_data.get('description', '')
        date = transaction_data.get('date', '')
        
        # Format categories
        categories_text = "\n".join([
            f"- {cat['category_id']}: {cat['name']} ({cat['type']})"
            for cat in available_categories
        ])
        
        prompt = f"""You are a financial transaction categorization assistant. Analyze the following transaction and suggest the most appropriate category.

Transaction Details:
- Merchant: {merchant}
- Amount: {amount_str}
- Type: {transaction_type}
- Description: {description}
- Date: {date}

Available Categories:
{categories_text}

Please respond with a JSON object in this exact format:
{{
    "category_id": "<uuid-of-best-category>",
    "confidence_score": <float-between-0-and-1>,
    "reasoning": "<brief-explanation-of-why-this-category>"
}}

Only respond with valid JSON. Do not include any additional text before or after the JSON."""
        
        return prompt
    
    def _parse_response(self, response_text: str) -> Optional[Dict[str, Any]]:
        """
        Parse the AI response and extract categorization result.
        
        Args:
            response_text: Raw response from Ollama
        
        Returns:
            Parsed categorization result or None if parsing fails
        """
        import json
        import re
        
        try:
            # Try to extract JSON from response (in case there's extra text)
            json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
            if json_match:
                response_text = json_match.group(0)
            
            result = json.loads(response_text.strip())
            
            # Validate required fields
            if 'category_id' not in result:
                logger.warning("AI response missing category_id")
                return None
            
            # Ensure confidence_score is a float between 0 and 1
            confidence = result.get('confidence_score', 0.5)
            if not isinstance(confidence, (int, float)):
                confidence = 0.5
            confidence = max(0.0, min(1.0, float(confidence)))
            
            return {
                'category_id': str(result['category_id']),
                'confidence_score': confidence,
                'reasoning': result.get('reasoning', '')
            }
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.error(f"Failed to parse AI response: {str(e)}")
            logger.debug(f"Response text: {response_text}")
            return None
    
    def categorize_transaction(
        self,
        transaction_data: Dict[str, Any],
        available_categories: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Categorize a single transaction using Ollama.
        
        Args:
            transaction_data: Transaction details
            available_categories: Available categories
        
        Returns:
            Categorization result or None if categorization fails
        """
        if not available_categories:
            logger.warning("No categories available for categorization")
            return None
        
        try:
            prompt = self._build_prompt(transaction_data, available_categories)
            
            # Call Ollama API
            response = requests.post(
                self.api_url,
                json={
                    'model': self.model,
                    'prompt': prompt,
                    'stream': False,
                    'format': 'json'
                },
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            response_text = result.get('response', '')
            
            if not response_text:
                logger.warning("Empty response from Ollama")
                return None
            
            return self._parse_response(response_text)
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ollama API request failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during categorization: {str(e)}")
            return None
    
    def categorize_batch(
        self,
        transactions_data: List[Dict[str, Any]],
        available_categories: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Categorize multiple transactions in a batch.
        
        For Ollama, we process sequentially to avoid overwhelming the local instance.
        In production with cloud providers, this could be parallelized.
        
        Args:
            transactions_data: List of transaction dictionaries
            available_categories: List of category dictionaries
        
        Returns:
            Dictionary mapping transaction identifiers to categorization results
        """
        results = {}
        
        for transaction in transactions_data:
            transaction_id = transaction.get('transaction_id') or transaction.get('id', 'unknown')
            
            try:
                result = self.categorize_transaction(transaction, available_categories)
                if result:
                    results[transaction_id] = result
                else:
                    logger.warning(f"Failed to categorize transaction {transaction_id}")
            except Exception as e:
                logger.error(f"Error categorizing transaction {transaction_id}: {str(e)}")
        
        return results


class AIServiceFactory:
    """
    Factory for creating AI categorization service instances.
    
    Determines which service to use based on configuration.
    """
    
    @staticmethod
    def create_service() -> Optional[AICategorizationService]:
        """
        Create an AI categorization service based on settings.
        
        Returns:
            Instance of AICategorizationService or None if disabled
        """
        if not getattr(settings, 'AI_CATEGORIZATION_ENABLED', True):
            logger.info("AI categorization is disabled")
            return None
        
        provider = getattr(settings, 'AI_PROVIDER', 'ollama').lower()
        
        if provider == 'ollama':
            base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434')
            model = getattr(settings, 'OLLAMA_MODEL', 'llama3.1:8b')
            return OllamaCategorizationService(base_url=base_url, model=model)
        
        elif provider == 'openai':
            # Future implementation
            logger.warning("OpenAI provider not yet implemented")
            return None
        
        elif provider == 'anthropic':
            # Future implementation
            logger.warning("Anthropic provider not yet implemented")
            return None
        
        else:
            logger.error(f"Unknown AI provider: {provider}")
            return None

