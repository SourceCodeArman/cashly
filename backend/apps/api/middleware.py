"""
Security logging middleware for Cashly.
"""
import logging
from django.utils import timezone

logger = logging.getLogger('security')


class SecurityLoggingMiddleware:
    """
    Middleware to log suspicious requests and security events.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Log suspicious requests
        if self.is_suspicious_request(request):
            logger.warning(
                f"Suspicious request from {request.META.get('REMOTE_ADDR')}: "
                f"{request.method} {request.path}"
            )
        
        response = self.get_response(request)
        
        # Log security-related responses
        if response.status_code in [401, 403, 404]:
            logger.info(
                f"Security event: {response.status_code} for {request.method} {request.path} "
                f"from {request.META.get('REMOTE_ADDR')}"
            )
        
        return response
    
    def is_suspicious_request(self, request):
        """
        Check for common attack patterns in request path and query string.
        """
        suspicious_patterns = [
            '../', '..\\', 'script>', 'javascript:', 'onload=',
            'union select', 'drop table', 'exec('
        ]
        
        path = request.path.lower()
        query = str(request.GET).lower()
        
        for pattern in suspicious_patterns:
            if pattern in path or pattern in query:
                return True
        
        return False

