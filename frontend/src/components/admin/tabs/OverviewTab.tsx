import { SystemStatsCards } from '@/components/admin/SystemStatsCards'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, Activity, TrendingUp, Users, CreditCard, Zap, Clock } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/adminService'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'

export function OverviewTab() {
  const queryClient = useQueryClient()

  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminService.getSystemStats,
  })

  const handleRefresh = () => {
    refetch()
  }

  const totalPaidUsers = stats ? (stats.activeSubscriptions['premium'] || 0) + (stats.activeSubscriptions['pro'] || 0) : 0
  const conversionRate = stats ? Math.round((totalPaidUsers / Math.max(stats.totalUsers || 1, 1)) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">System Overview</h2>
          <p className="text-muted-foreground text-lg">Monitor key metrics and system health at a glance</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="default" className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* System Stats Cards */}
      <SystemStatsCards stats={stats || null} isLoading={statsLoading} />

      {/* Key Insights Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Conversion Rate */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">{conversionRate}%</div>
            <Progress value={conversionRate} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">
              {totalPaidUsers} of {stats?.totalUsers || 0} users are paying
            </p>
          </CardContent>
        </Card>

        {/* Account Activity */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              Account Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {stats ? Math.round(((stats.totalTransactions || 0) / Math.max(stats.totalAccounts || 1, 1))) : 0}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Average transactions per account
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {stats?.totalAccounts || 0} accounts
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Growth */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              Revenue Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {formatCurrency(parseFloat(stats?.thisMonthRevenue || '0'))}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              This month's new revenue
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Monthly recurring: {formatCurrency(parseFloat(stats?.totalRevenue || '0'))}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Summary */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity Summary
          </CardTitle>
          <CardDescription>Quick overview of recent system activity and key metrics</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {statsLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ) : stats ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  New Signups (7d)
                </div>
                <div className="text-2xl font-bold">{stats.recentSignups7d}</div>
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Last 7 days
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Active Users (7d)
                </div>
                <div className="text-2xl font-bold">{stats.activeUsers7d}</div>
                <Badge variant="secondary" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Weekly active
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Total Accounts
                </div>
                <div className="text-2xl font-bold">{(stats.totalAccounts || 0).toLocaleString()}</div>
                <Badge variant="outline" className="text-xs">
                  System wide
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  Total Transactions
                </div>
                <div className="text-2xl font-bold">{(stats.totalTransactions || 0).toLocaleString()}</div>
                <Badge variant="outline" className="text-xs">
                  All time
                </Badge>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

