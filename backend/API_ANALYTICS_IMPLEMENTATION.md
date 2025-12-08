# API Analytics Implementation Summary

## Overview
Implemented comprehensive API analytics tracking with a hybrid storage approach:
- **Redis**: Real-time metrics (7-day TTL)
- **PostgreSQL**: Persistent historical data (30 days raw logs + indefinite hourly aggregates)

## Components Implemented

### 1. Database Models (`apps/api/models.py`)
- **APIRequestLog**: Stores individual API request data
  - Tracks: endpoint, method, status code, response time, request/response sizes, user, IP, user agent
  - Retention: 30 days (raw logs)
  
- **APIAnalyticsHourly**: Hourly aggregated analytics
  - Tracks: request counts, error counts, response times, status code breakdown
  - Retention: Indefinite (for historical analysis)

### 2. Enhanced Middleware (`apps/api/middleware.py`)
- Tracks all API requests to `/api/` endpoints
- Captures comprehensive request data:
  - Response time (milliseconds)
  - Request/response sizes (bytes)
  - User ID (if authenticated)
  - Client IP address
  - User agent
- Updates Redis cache for real-time metrics
- Queues database writes via Celery (async, non-blocking)
- Maintains list of all tracked endpoints

### 3. Celery Tasks (`apps/api/tasks.py`)
- **log_api_request**: Async task to write request logs to database
  - Retries on failure with exponential backoff
  
- **aggregate_hourly_analytics**: Periodic task (runs every hour)
  - Aggregates previous hour's logs into hourly summaries
  - Groups by endpoint and method
  - Calculates counts, averages, percentiles, status breakdowns
  
- **cleanup_old_logs**: Periodic task (runs daily at 3 AM)
  - Deletes raw logs older than 30 days
  - Keeps hourly aggregates indefinitely

### 4. Enhanced Admin View (`apps/api/admin_views.py`)
Completely rewrote `AdminAPIAnalyticsView` to provide:

**Summary Metrics:**
- Total requests (24h and 7d)
- Total errors (24h)
- Error rate (%)
- Average response time (ms)
- Requests per second (throughput)

**Time Series Data:**
- Hourly request/error counts (last 24 hours)

**Endpoint Analytics:**
- Top 10 endpoints by usage
- Per-endpoint: count, avg response time, error count, error rate

**Status Code Breakdown:**
- 2xx, 3xx, 4xx, 5xx counts

**Response Time Percentiles:**
- P50, P75, P90, P95, P99

**HTTP Method Distribution:**
- Request counts per method (GET, POST, PUT, PATCH, DELETE)

### 5. Celery Beat Schedule (`config/celery.py`)
Added periodic tasks:
- `aggregate-hourly-analytics`: Runs every hour at :05
- `cleanup-old-api-logs`: Runs daily at 3 AM

### 6. Management Command
Created `aggregate_analytics` command for manual aggregation:
```bash
# Aggregate last hour
python manage.py aggregate_analytics

# Backfill multiple hours
python manage.py aggregate_analytics --hours=24 --backfill
```

### 7. Frontend Updates

**TypeScript Types (`frontend/src/types/index.ts`):**
- Updated `AdminAPIAnalytics` interface with new fields
- Added `AdminHourlyData` and `AdminMethodDistribution` interfaces

**API Analytics Tab (`frontend/src/components/admin/tabs/APIAnalyticsTab.tsx`):**
- Removed all demo/generated data
- Uses real API data from backend
- Updated all metric cards with live data
- Updated charts with real-time information
- Added fallback messages when no data is available

## Data Flow

1. **Request Processing:**
   ```
   API Request → Middleware → Redis (real-time) → Celery Task → Database (persistent)
   ```

2. **Hourly Aggregation:**
   ```
   Raw Logs (last hour) → Celery Beat Task → Hourly Aggregates Table
   ```

3. **Admin Dashboard:**
   ```
   Frontend → API Request → AdminAPIAnalyticsView → Redis + Database → Response
   ```

## Migration

A migration file was created: `apps/api/migrations/0002_alter_apianalyticshourly_options_and_more.py`

**To apply:**
```bash
cd backend
python manage.py migrate api
```

**Note:** Database connection was not available during implementation, so migration needs to be run when database is accessible.

## Usage

### For Admins (Frontend)
1. Navigate to Admin Dashboard → API Analytics tab
2. View real-time metrics refreshing every 60 seconds
3. Explore hourly trends, top endpoints, error rates, and performance metrics

### For Developers (Backend)
```python
# Query recent logs
from apps.api.models import APIRequestLog
recent_logs = APIRequestLog.objects.filter(
    timestamp__gte=timezone.now() - timedelta(hours=1)
)

# Query hourly aggregates
from apps.api.models import APIAnalyticsHourly
hourly_stats = APIAnalyticsHourly.objects.filter(
    hour__gte=timezone.now() - timedelta(days=7)
)

# Manual aggregation
from apps.api.tasks import aggregate_hourly_analytics
result = aggregate_hourly_analytics()
```

## Performance Considerations

1. **Non-blocking**: Database writes are async via Celery
2. **Efficient Queries**: Hourly aggregates reduce query load for historical data
3. **Automatic Cleanup**: Old raw logs are deleted to manage storage
4. **Redis Caching**: Real-time metrics served from cache

## Next Steps

1. **Run Migration**: Apply database migration when DB is accessible
2. **Start Celery Workers**: Ensure Celery workers are running for async tasks
3. **Start Celery Beat**: Enable periodic task scheduler
4. **Generate Traffic**: Make API requests to populate analytics
5. **Monitor**: Check admin dashboard for real-time data

## Testing

After deployment:
1. Make some API requests (login, fetch accounts, etc.)
2. Check Redis cache: `cache.get('api_analytics:all_endpoints')`
3. Check database: `APIRequestLog.objects.count()`
4. Wait 1 hour and verify hourly aggregation runs
5. View admin dashboard to see live metrics

