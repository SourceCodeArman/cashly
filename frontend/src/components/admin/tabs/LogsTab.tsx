import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminService } from '@/services/adminService'
import type { AdminLogEntry } from '@/types'
import { formatDate } from '@/lib/utils'

const LOG_LEVELS = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const
const LOG_TYPES = ['django', 'error', 'security', 'api'] as const

export function LogsTab() {
  const [logType, setLogType] = useState<string>('')
  const [level, setLevel] = useState<string>('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'logs', logType, level, search, offset],
    queryFn: () => adminService.getLogs({
      type: logType as any,
      level: level as any,
      search: search || undefined,
      limit,
      offset,
    }),
  })

  const getLevelBadge = (level: string) => {
    const colors: Record<string, string> = {
      DEBUG: 'bg-gray-500',
      INFO: 'bg-blue-500',
      WARNING: 'bg-yellow-500',
      ERROR: 'bg-red-500',
      CRITICAL: 'bg-red-700',
    }
    return (
      <Badge className={colors[level] || 'bg-gray-500'} variant="default">
        {level}
      </Badge>
    )
  }

  const handleExport = () => {
    if (!logsData?.entries) return
    
    const content = logsData.entries.map(entry => 
      `[${entry.timestamp}] ${entry.level} ${entry.logger}: ${entry.message}`
    ).join('\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">System Logs</h2>
          <p className="text-muted-foreground">View and filter system log entries</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" size="sm" disabled={!logsData?.entries?.length}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Log Type</label>
              <div className="flex gap-2">
                <Select value={logType || undefined} onValueChange={setLogType}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOG_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {logType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLogType('')
                      setOffset(0)
                    }}
                    className="px-2"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Level</label>
              <div className="flex gap-2">
                <Select value={level || undefined} onValueChange={setLevel}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOG_LEVELS.map(lvl => (
                      <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {level && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLevel('')
                      setOffset(0)
                    }}
                    className="px-2"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setOffset(0)
                  }}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Log Entries</CardTitle>
            {logsData && (
              <CardDescription>
                Showing {offset + 1}-{Math.min(offset + limit, logsData.total)} of {logsData.total}
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logsData?.entries && logsData.entries.length > 0 ? (
            <>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {logsData.entries.map((entry: AdminLogEntry, index: number) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getLevelBadge(entry.level)}
                        <span className="text-xs text-muted-foreground font-mono">
                          {entry.logger}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {entry.type}
                      </Badge>
                    </div>
                    <p className="text-sm mt-1 break-words">{entry.message}</p>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {Math.floor(offset / limit) + 1} of {Math.ceil((logsData?.total || 0) / limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={!logsData || offset + limit >= logsData.total}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No log entries found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

