import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, Activity, TrendingUp, AlertCircle, BarChart3, Zap, Clock, Server } from 'lucide-react'
import { adminService } from '@/services/adminService'
import {
  MetricCard
} from '@/components/admin/DataVisualization'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// No more demo data - using real API analytics

export function APIAnalyticsTab() {
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'api-analytics'],
    queryFn: adminService.getAPIAnalytics,
    refetchInterval: 60000, // Refresh every minute
  })

  // Use real data from API or fallback to empty arrays
  const apiUsageData = analytics?.hourlyData || []
  const endpointData = analytics?.topEndpoints || []
  const responseTimeData = analytics?.responseTimePercentiles ? [
    { percentile: 'P50', time: analytics.responseTimePercentiles.p50 },
    { percentile: 'P75', time: analytics.responseTimePercentiles.p75 },
    { percentile: 'P90', time: analytics.responseTimePercentiles.p90 },
    { percentile: 'P95', time: analytics.responseTimePercentiles.p95 },
    { percentile: 'P99', time: analytics.responseTimePercentiles.p99 },
  ] : []

  // Calculate method distribution percentages
  const methodData = analytics?.methodDistribution || []
  const totalMethodRequests = methodData.reduce((sum, m) => sum + m.count, 0)
  const methodPercentages = methodData.map(m => ({
    name: m.method,
    value: totalMethodRequests > 0 ? Math.round((m.count / totalMethodRequests) * 100) : 0,
    color: m.method === 'GET' ? '#10b981' :
      m.method === 'POST' ? '#3b82f6' :
        m.method === 'PUT' ? '#f59e0b' :
          m.method === 'DELETE' ? '#ef4444' : '#6b7280'
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">API Analytics</h2>
          <p className="text-muted-foreground text-lg">Monitor API usage, performance, and health metrics</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="default">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Requests (24h)"
          value={analytics?.summary.totalRequests24h?.toLocaleString() || '0'}
          change={{ value: 0, isPositive: true, label: "last 24 hours" }}
          icon={Activity}
          color="blue"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${analytics?.summary.avgResponseTimeMs?.toFixed(1) || '0'}ms`}
          change={{ value: 0, isPositive: true, label: "average" }}
          icon={Zap}
          color="green"
        />
        <MetricCard
          title="Error Rate"
          value={`${analytics?.summary.errorRate?.toFixed(1) || '0'}%`}
          change={{ value: 0, isPositive: false, label: "of requests" }}
          icon={AlertCircle}
          color="orange"
        />
        <MetricCard
          title="Requests/Second"
          value={analytics?.summary.requestsPerSecond?.toFixed(1) || '0'}
          change={{ value: 0, isPositive: true, label: "throughput" }}
          icon={Server}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="usage" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* API Usage Over Time */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  API Requests (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={apiUsageData}>
                    <defs>
                      <linearGradient id="apiUsage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} className="text-xs" />
                    <YAxis axisLine={false} tickLine={false} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                      labelFormatter={(label) => `${label}:00`}
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#apiUsage)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Request Distribution */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Request Methods
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={methodPercentages}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {methodPercentages.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                      formatter={(value) => [`${value}%`, 'Percentage']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {methodPercentages.map((method, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }}></div>
                      <span className="text-sm">{method.name} ({method.value}%)</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Response Time Distribution */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Response Time Percentiles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="percentile"
                      axisLine={false}
                      tickLine={false}
                      className="text-xs"
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      className="text-xs"
                      label={{ value: 'Response Time (ms)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                      formatter={(value) => [`${value}ms`, 'Response Time']}
                    />
                    <Bar
                      dataKey="time"
                      fill="#3b82f6"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Average Response Time</div>
                      <div className="text-sm text-muted-foreground">All endpoints</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {analytics?.summary.avgResponseTimeMs?.toFixed(1) || '0'}ms
                      </div>
                      <div className="text-xs text-muted-foreground">Last 24 hours</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">95th Percentile</div>
                      <div className="text-sm text-muted-foreground">Response time</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">
                        {analytics?.responseTimePercentiles?.p95?.toFixed(1) || '0'}ms
                      </div>
                      <div className="text-xs text-muted-foreground">P95 latency</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Throughput</div>
                      <div className="text-sm text-muted-foreground">Requests per second</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics?.summary.requestsPerSecond?.toFixed(1) || '0'}
                      </div>
                      <div className="text-xs text-muted-foreground">Average RPS</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Top Endpoints by Usage</CardTitle>
              <CardDescription>Most frequently accessed API endpoints in the last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {endpointData.length > 0 ? endpointData.map((endpoint, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs ${endpoint.method === 'GET' ? 'border-green-500 text-green-600' :
                            endpoint.method === 'POST' ? 'border-blue-500 text-blue-600' :
                              endpoint.method === 'PUT' ? 'border-yellow-500 text-yellow-600' :
                                endpoint.method === 'PATCH' ? 'border-purple-500 text-purple-600' :
                                  'border-red-500 text-red-600'
                          }`}
                      >
                        {endpoint.method}
                      </Badge>
                      <div>
                        <div className="font-medium">{endpoint.endpoint}</div>
                        <div className="text-xs text-muted-foreground">
                          {endpoint.count.toLocaleString()} requests
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{endpoint.avgResponseTime.toFixed(1)}ms</div>
                        <div className="text-xs text-muted-foreground">avg time</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-medium ${endpoint.errorCount > 20 ? 'text-red-600' :
                            endpoint.errorCount > 10 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                          {endpoint.errorCount}
                        </div>
                        <div className="text-xs text-muted-foreground">errors</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-medium ${endpoint.errorRate > 2 ? 'text-red-600' :
                            endpoint.errorRate > 1 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                          {endpoint.errorRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">error rate</div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No endpoint data available yet. Data will appear as API requests are made.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Error Trends */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Error Trends (24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={apiUsageData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} className="text-xs" />
                    <YAxis axisLine={false} tickLine={false} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                      labelFormatter={(label) => `${label}:00`}
                    />
                    <Line
                      type="monotone"
                      dataKey="errors"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Error Breakdown */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Error Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="font-medium">5xx Server Errors</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{analytics?.statusBreakdown?.['5xx'] || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        {analytics?.summary.totalRequests24h
                          ? ((analytics.statusBreakdown['5xx'] / analytics.summary.totalRequests24h) * 100).toFixed(1)
                          : '0'}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="font-medium">4xx Client Errors</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{analytics?.statusBreakdown?.['4xx'] || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        {analytics?.summary.totalRequests24h
                          ? ((analytics.statusBreakdown['4xx'] / analytics.summary.totalRequests24h) * 100).toFixed(1)
                          : '0'}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="font-medium">3xx Redirects</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{analytics?.statusBreakdown?.['3xx'] || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        {analytics?.summary.totalRequests24h
                          ? ((analytics.statusBreakdown['3xx'] / analytics.summary.totalRequests24h) * 100).toFixed(1)
                          : '0'}%
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium">2xx Success</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{analytics?.statusBreakdown?.['2xx'] || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        {analytics?.summary.totalRequests24h
                          ? ((analytics.statusBreakdown['2xx'] / analytics.summary.totalRequests24h) * 100).toFixed(1)
                          : '0'}%
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

