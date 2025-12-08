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
        Stores data in Redis cache with TTL and queues database write.
        """
        try:
            endpoint = request.path
            method = request.method
            status_code = response.status_code
            
            # Get request/response sizes
            request_size = self._get_request_size(request)
            response_size = self._get_response_size(response)
            
            # Get user info
            user_id = request.user.id if hasattr(request, 'user') and request.user.is_authenticated else None
            
            # Get IP address
            ip_address = self._get_client_ip(request)
            
            # Get user agent
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Update Redis cache for real-time metrics
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
            
            # Track all unique endpoints in a list (for endpoint discovery)
            endpoints_key = 'api_analytics:all_endpoints'
            all_endpoints = cache.get(endpoints_key, set())
            if not isinstance(all_endpoints, set):
                all_endpoints = set()
            all_endpoints.add(endpoint_key)
            cache.set(endpoints_key, all_endpoints, timeout=60 * 60 * 24 * 7)
            
            # Queue database write (async via Celery)
            try:
                from .tasks import log_api_request
                log_api_request.delay({
                    'endpoint': endpoint,
                    'method': method,
                    'status_code': status_code,
                    'response_time_ms': response_time,
                    'request_size_bytes': request_size,
                    'response_size_bytes': response_size,
                    'user_id': user_id,
                    'ip_address': ip_address,
                    'user_agent': user_agent,
                })
            except Exception as celery_exc:
                # If Celery is not available, just log the error
                api_logger.debug(f"Could not queue analytics task: {celery_exc}")
            
            # Also log to API logger
            api_logger.info(
                f"{method} {endpoint} {status_code} {response_time:.2f}ms "
                f"req:{request_size}b res:{response_size}b"
            )
        except Exception as exc:
            # Don't fail requests if analytics tracking fails
            api_logger.debug(f"Analytics tracking error: {exc}")
            pass
    
    def _get_request_size(self, request):
        """Calculate request size in bytes."""
        try:
            size = 0
            # Add body size
            if hasattr(request, 'body'):
                size += len(request.body)
            # Add headers size (approximate)
            for key, value in request.META.items():
                if key.startswith('HTTP_'):
                    size += len(key) + len(str(value))
            return size
        except Exception:
            return None
    
    def _get_response_size(self, response):
        """Calculate response size in bytes."""
        try:
            if hasattr(response, 'content'):
                return len(response.content)
            return None
        except Exception:
            return None
    
    def _get_client_ip(self, request):
        """Get client IP address from request."""
        # Check for X-Forwarded-For header (proxy/load balancer)
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
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

