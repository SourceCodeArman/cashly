"""
Custom exception handler for consistent error responses.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns consistent error response format.
    
    Response format:
    {
        'status': 'error',
        'data': None,
        'message': 'Error message',
        'errors': {...}  # Detailed validation errors if applicable
    }
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Log the error
        logger.error(f"API Error: {exc.__class__.__name__} - {str(exc)}")
        
        # Customize the response data
        custom_response_data = {
            'status': 'error',
            'data': None,
            'message': 'An error occurred',
            'errors': response.data if isinstance(response.data, dict) else {'detail': response.data},
            'code': response.status_code
        }
        response.data = custom_response_data
    
    return response

