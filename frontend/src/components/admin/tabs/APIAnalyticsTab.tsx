import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Activity, TrendingUp, AlertCircle } from 'lucide-react'
import { adminService } from '@/services/adminService'
import { formatDate } from '@/lib/utils'

export function APIAnalyticsTab() {
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'api-analytics'],
    queryFn: adminService.getAPIAnalytics,
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">API Analytics</h2>
            <p className="text-muted-foreground">Monitor API usage and performance</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">API Analytics</h2>
          <p className="text-muted-foreground">Monitor API usage and performance</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics.summary.totalRequests || 0).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {(analytics.summary.totalErrors || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(analytics.summary.errorRate || 0).toFixed(2)}% error rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.summary.avgResponseTimeMs || 0).toFixed(2)}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(analytics.summary.errorRate || 0).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {(analytics.summary.errorRate || 0) < 1 ? 'Excellent' : (analytics.summary.errorRate || 0) < 5 ? 'Good' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Top Endpoints</CardTitle>
          <CardDescription>Most frequently accessed API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topEndpoints && analytics.topEndpoints.length > 0 ? (
            <div className="space-y-2">
              {analytics.topEndpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {endpoint.method}
                      </Badge>
                      <span className="font-mono text-sm truncate">{endpoint.endpoint}</span>
                    </div>
                    {endpoint.lastRequest && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last request: {formatDate(endpoint.lastRequest)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="font-medium">{(endpoint.count || 0).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">requests</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{(endpoint.avgResponseTime || 0).toFixed(2)}ms</div>
                      <div className="text-xs text-muted-foreground">avg time</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${(endpoint.errorRate || 0) > 5 ? 'text-destructive' : ''}`}>
                        {(endpoint.errorRate || 0).toFixed(2)}%
                      </div>
                      <div className="text-xs text-muted-foreground">errors</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No endpoint data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

