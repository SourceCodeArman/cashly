"""
Security logging middleware for Cashly.
"""
import logging
import time
from django.utils import timezone
from django.core.cache import cache

logger = logging.getLogger('security')
api_logger = logging.getLogger('api')


class SecurityLoggingMiddleware:
    """
    Middleware to log suspicious requests and security events.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Track API request for analytics
        start_time = time.time()
        
        # Log suspicious requests
        if self.is_suspicious_request(request):
            logger.warning(
                f"Suspicious request from {request.META.get('REMOTE_ADDR')}: "
                f"{request.method} {request.path}"
            )
        
        response = self.get_response(request)
        
        # Calculate response time
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Track API analytics for admin dashboard
        if request.path.startswith('/api/'):
            self._track_api_request(request, response, response_time)
        
        # Log security-related responses
        if response.status_code in [401, 403, 404]:
            logger.info(
                f"Security event: {response.status_code} for {request.method} {request.path} "
                f"from {request.META.get('REMOTE_ADDR')}"
            )
        
        return response
    
    def _track_api_request(self, request, response, response_time):
        """
        Track API request metrics for analytics.
        Stores data in Redis cache with TTL.
        """
        try:
            endpoint = request.path
            method = request.method
            status_code = response.status_code
            
            # Create key for this endpoint
            endpoint_key = f"api_analytics:{endpoint}:{method}"
            
            # Get or initialize endpoint stats
            stats = cache.get(endpoint_key, {
                'count': 0,
                'total_time': 0,
                'error_count': 0,
                'last_request': None,
            })
            
            stats['count'] += 1
            stats['total_time'] += response_time
            stats['last_request'] = timezone.now().isoformat()
            
            if status_code >= 400:
                stats['error_count'] += 1
            
            # Store with 7 day TTL
            cache.set(endpoint_key, stats, timeout=60 * 60 * 24 * 7)
            
            # Also log to API logger
            api_logger.info(
                f"{method} {endpoint} {status_code} {response_time:.2f}ms"
            )
        except Exception:
            # Don't fail requests if analytics tracking fails
            pass
    
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

