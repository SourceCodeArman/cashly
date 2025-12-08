from django.db import models
from django.utils import timezone


class APIRequestLog(models.Model):
    """
    Stores individual API request data for detailed analytics.
    Raw logs are kept for 30 days, then aggregated data is used.
    """
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    endpoint = models.CharField(max_length=255, db_index=True)
    method = models.CharField(max_length=10, db_index=True)
    status_code = models.IntegerField(db_index=True)
    response_time_ms = models.FloatField()
    request_size_bytes = models.IntegerField(null=True, blank=True)
    response_size_bytes = models.IntegerField(null=True, blank=True)
    user_id = models.IntegerField(null=True, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    
    class Meta:
        db_table = 'api_request_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp', 'endpoint']),
            models.Index(fields=['endpoint', 'method']),
            models.Index(fields=['status_code', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.method} {self.endpoint} - {self.status_code} ({self.response_time_ms}ms)"


class APIAnalyticsHourly(models.Model):
    """
    Hourly aggregated analytics for efficient querying.
    Aggregated data is kept indefinitely for historical analysis.
    """
    hour = models.DateTimeField(db_index=True)
    endpoint = models.CharField(max_length=255, db_index=True)
    method = models.CharField(max_length=10)
    request_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    total_response_time_ms = models.FloatField(default=0)
    
    # Status code breakdown
    status_2xx = models.IntegerField(default=0)
    status_3xx = models.IntegerField(default=0)
    status_4xx = models.IntegerField(default=0)
    status_5xx = models.IntegerField(default=0)
    
    # Response time percentiles (stored for efficiency)
    min_response_time_ms = models.FloatField(default=0)
    max_response_time_ms = models.FloatField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)
    
    class Meta:
        db_table = 'api_analytics_hourly'
        ordering = ['-hour']
        unique_together = [['hour', 'endpoint', 'method']]
        indexes = [
            models.Index(fields=['-hour', 'endpoint']),
            models.Index(fields=['endpoint', 'method', '-hour']),
        ]
    
    def __str__(self):
        return f"{self.method} {self.endpoint} @ {self.hour} ({self.request_count} requests)"
    
    @property
    def avg_response_time_ms(self):
        """Calculate average response time."""
        if self.request_count > 0:
            return self.total_response_time_ms / self.request_count
        return 0
    
    @property
    def error_rate(self):
        """Calculate error rate as percentage."""
        if self.request_count > 0:
            return (self.error_count / self.request_count) * 100
        return 0
