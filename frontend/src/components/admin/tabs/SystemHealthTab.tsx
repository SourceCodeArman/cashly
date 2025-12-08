import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Database, Zap, Server, HardDrive, Cpu, MemoryStick, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { adminService } from '@/services/adminService'

export function SystemHealthTab() {
  const queryClient = useQueryClient()

  const { data: health, isLoading } = useQuery({
    queryKey: ['admin', 'system-health'],
    queryFn: adminService.getSystemHealth,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'system-health'] })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Healthy</Badge>
      case 'degraded':
        return <Badge variant="default" className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Degraded</Badge>
      case 'unhealthy':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Unhealthy</Badge>
      default:
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Unknown</Badge>
    }
  }

  if (isLoading || !health) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">System Health</h2>
            <p className="text-muted-foreground">Monitor system components and resources</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
          <h2 className="text-2xl font-semibold">System Health</h2>
          <p className="text-muted-foreground">Monitor system components and resources</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overall System Status</CardTitle>
            {getStatusBadge(health.overallStatus)}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(health.timestamp).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Database</CardTitle>
            </div>
            {getStatusBadge(health.database.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {health.database.connected ? (
            <>
              {health.database.version && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono">{health.database.version.split(',')[0]}</span>
                </div>
              )}
              {health.database.size && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Database Size</span>
                  <span>{health.database.size}</span>
                </div>
              )}
              {health.database.connectionCount !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Connections</span>
                  <span>{health.database.connectionCount} total, {health.database.activeConnections || 0} active</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-destructive">{health.database.error || 'Connection failed'}</p>
          )}
        </CardContent>
      </Card>

      {/* Cache */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <CardTitle>Cache (Redis)</CardTitle>
            </div>
            {getStatusBadge(health.cache.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {health.cache.connected ? (
            <>
              {health.cache.backend && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Backend</span>
                  <span className="font-mono text-xs">{health.cache.backend.split('.').pop()}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-destructive">{health.cache.error || 'Connection failed'}</p>
          )}
        </CardContent>
      </Card>

      {/* Celery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <CardTitle>Celery Workers</CardTitle>
            </div>
            {getStatusBadge(health.celery.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Active Workers</span>
            <span>{health.celery.workerCount}</span>
          </div>
          {health.celery.workers && health.celery.workers.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Workers: </span>
              <span className="font-mono text-xs">{health.celery.workers.join(', ')}</span>
            </div>
          )}
          {health.celery.note && (
            <p className="text-xs text-muted-foreground">{health.celery.note}</p>
          )}
        </CardContent>
      </Card>

      {/* System Resources */}
      {health.system.status === 'healthy' && health.system.cpuPercent !== undefined && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                <CardTitle>CPU Usage</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="font-medium">{(health.system.cpuPercent || 0).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${health.system.cpuPercent || 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {health.system.memory && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-5 w-5" />
                  <CardTitle>Memory</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="font-medium">
                      {(health.system.memory.usedGb || 0).toFixed(2)} GB / {(health.system.memory.totalGb || 0).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${health.system.memory.percent || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 GB</span>
                    <span>{(health.system.memory.percent || 0).toFixed(1)}%</span>
                    <span>{(health.system.memory.totalGb || 0).toFixed(2)} GB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {health.system.disk && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  <CardTitle>Disk Usage</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="font-medium">
                      {(health.system.disk.usedGb || 0).toFixed(2)} GB / {(health.system.disk.totalGb || 0).toFixed(2)} GB
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${health.system.disk.percent || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0 GB</span>
                    <span>{(health.system.disk.percent || 0).toFixed(1)}%</span>
                    <span>{(health.system.disk.totalGb || 0).toFixed(2)} GB</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {health.system.uptimeHours !== undefined && (
            <Card>
              <CardHeader>
                <CardTitle>System Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <span className="font-medium">{(health.system.uptimeHours || 0).toFixed(1)} hours</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

