import { SystemStatsCards } from '@/components/admin/SystemStatsCards'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/adminService'
import { Skeleton } from '@/components/ui/skeleton'

export function OverviewTab() {
  const queryClient = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminService.getSystemStats,
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">System Overview</h2>
          <p className="text-muted-foreground">Monitor key metrics and system health</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Stats Cards */}
      <SystemStatsCards stats={stats || null} isLoading={statsLoading} />

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity Summary
          </CardTitle>
          <CardDescription>Quick overview of recent system activity</CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : stats ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New signups (7d)</span>
                <span className="font-medium">{stats.recentSignups7d}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active users (7d)</span>
                <span className="font-medium">{stats.activeUsers7d}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total accounts</span>
                <span className="font-medium">{(stats.totalAccounts || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total transactions</span>
                <span className="font-medium">{(stats.totalTransactions || 0).toLocaleString()}</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

