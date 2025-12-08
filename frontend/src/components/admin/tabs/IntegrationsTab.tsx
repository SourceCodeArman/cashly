import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, CreditCard, Link2, CheckCircle2, AlertCircle } from 'lucide-react'
import { adminService } from '@/services/adminService'

export function IntegrationsTab() {
  const queryClient = useQueryClient()

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['admin', 'integrations'],
    queryFn: adminService.getIntegrationsStatus,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'integrations'] })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Healthy</Badge>
      case 'degraded':
        return <Badge variant="default" className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Degraded</Badge>
      default:
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Unknown</Badge>
    }
  }

  if (isLoading || !integrations) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Integrations</h2>
            <p className="text-muted-foreground">Monitor third-party service connections</p>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
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
          <h2 className="text-2xl font-semibold">Integrations</h2>
          <p className="text-muted-foreground">Monitor third-party service connections</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Plaid Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              <CardTitle>Plaid Integration</CardTitle>
            </div>
            {getStatusBadge(integrations.plaid.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.plaid.error ? (
            <p className="text-sm text-destructive">{integrations.plaid.error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Accounts</p>
                  <p className="text-lg font-semibold">{integrations.plaid.totalAccounts}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Accounts</p>
                  <p className="text-lg font-semibold">{integrations.plaid.activeAccounts}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Accounts with Errors</p>
                  <p className={`text-lg font-semibold ${integrations.plaid.accountsWithErrors > 0 ? 'text-destructive' : ''}`}>
                    {integrations.plaid.accountsWithErrors}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                  <p className={`text-lg font-semibold ${(integrations.plaid.errorRatePercent || 0) > 10 ? 'text-destructive' : ''}`}>
                    {(integrations.plaid.errorRatePercent || 0).toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  Recent syncs (24h): <span className="font-medium">{integrations.plaid.recentSyncs24h}</span>
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stripe Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <CardTitle>Stripe Integration</CardTitle>
            </div>
            {getStatusBadge(integrations.stripe.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.stripe.error ? (
            <p className="text-sm text-destructive">{integrations.stripe.error}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Recent Events (24h)</p>
                  <p className="text-lg font-semibold">{integrations.stripe.recentEvents24h}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processed Events</p>
                  <p className="text-lg font-semibold">{integrations.stripe.processedEvents24h}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing Rate</p>
                  <p className="text-lg font-semibold">
                    {(integrations.stripe.processingRate || 0).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                  <p className="text-lg font-semibold">{integrations.stripe.activeSubscriptions}</p>
                </div>
              </div>
              {integrations.stripe.eventTypes && integrations.stripe.eventTypes.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Recent Event Types:</p>
                  <div className="flex flex-wrap gap-2">
                    {integrations.stripe.eventTypes.slice(0, 5).map((event: any, index: number) => (
                      <Badge key={index} variant="outline">
                        {event.event_type} ({event.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

