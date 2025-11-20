import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Database, Table } from 'lucide-react'
import { adminService } from '@/services/adminService'
import type { AdminTableInfo } from '@/types'

export function DatabaseTab() {
  const queryClient = useQueryClient()

  const { data: dbStats, isLoading } = useQuery({
    queryKey: ['admin', 'database'],
    queryFn: adminService.getDatabaseStats,
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'database'] })
  }

  if (isLoading || !dbStats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Database Statistics</h2>
            <p className="text-muted-foreground">Monitor database performance and usage</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
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
          <h2 className="text-2xl font-semibold">Database Statistics</h2>
          <p className="text-muted-foreground">Monitor database performance and usage</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Database Info */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats.database?.size || 'Unknown'}</div>
            <p className="text-xs text-muted-foreground">Total database size</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <Table className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats.totalTables || 0}</div>
            <p className="text-xs text-muted-foreground">Database tables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rows</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(dbStats.totalRows || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all tables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connections</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats.connectionPool?.totalConnections || 0}</div>
            <p className="text-xs text-muted-foreground">
              {dbStats.connectionPool?.activeConnections || 0} active, {dbStats.connectionPool?.idleConnections || 0} idle
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Database Version */}
      <Card>
        <CardHeader>
          <CardTitle>Database Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono text-xs">{dbStats.database?.version || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Connection Count</span>
              <span>{dbStats.database?.connectionCount || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Sizes */}
      <Card>
        <CardHeader>
          <CardTitle>Table Statistics</CardTitle>
          <CardDescription>Tables sorted by row count</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {dbStats.tables && dbStats.tables.length > 0 ? (
              dbStats.tables.map((table: AdminTableInfo, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{table.modelName}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({table.appLabel})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {table.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="font-medium">{(table.rowCount || 0).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">rows</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{table.size}</div>
                      <div className="text-xs text-muted-foreground">size</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No table data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

