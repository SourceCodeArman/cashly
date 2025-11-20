import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, RotateCw, Trash2, TestTube, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { adminService } from '@/services/adminService'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export function DebuggingToolsTab() {
  const queryClient = useQueryClient()
  const [accountId, setAccountId] = useState('')

  const { data: testResults, isLoading: testLoading } = useQuery({
    queryKey: ['admin', 'test-endpoints'],
    queryFn: adminService.testEndpoints,
  })

  const triggerSyncMutation = useMutation({
    mutationFn: (accountId: string) => adminService.triggerSync(accountId),
    onSuccess: () => {
      toast.success('Account sync triggered successfully')
      setAccountId('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to trigger sync')
    },
  })

  const clearCacheMutation = useMutation({
    mutationFn: () => adminService.clearCache(),
    onSuccess: () => {
      toast.success('Cache cleared successfully')
      queryClient.invalidateQueries()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to clear cache')
    },
  })

  const handleTriggerSync = () => {
    if (!accountId.trim()) {
      toast.error('Please enter an account ID')
      return
    }
    triggerSyncMutation.mutate(accountId.trim())
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Available</Badge>
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Debugging Tools</h2>
        <p className="text-muted-foreground">Manual actions and system testing</p>
      </div>

      {/* Manual Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCw className="h-5 w-5" />
              Trigger Account Sync
            </CardTitle>
            <CardDescription>Manually trigger transaction sync for an account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Account ID</label>
              <Input
                placeholder="Enter account ID"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              />
            </div>
            <Button
              onClick={handleTriggerSync}
              disabled={triggerSyncMutation.isPending || !accountId.trim()}
              className="w-full"
            >
              {triggerSyncMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Triggering...
                </>
              ) : (
                <>
                  <RotateCw className="h-4 w-4 mr-2" />
                  Trigger Sync
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Clear Cache
            </CardTitle>
            <CardDescription>Clear all cached data from Redis</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={clearCacheMutation.isPending}
                >
                  {clearCacheMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Cache
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Cache?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all cached data from Redis. This action cannot be undone.
                    The cache will be repopulated as data is accessed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearCacheMutation.mutate()}>
                    Clear Cache
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* Test Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            External API Connectivity
          </CardTitle>
          <CardDescription>Test connectivity to external services</CardDescription>
        </CardHeader>
        <CardContent>
          {testLoading || !testResults ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Plaid */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Plaid</h3>
                    <p className="text-sm text-muted-foreground">Banking integration service</p>
                  </div>
                  {getStatusBadge(testResults.plaid.status)}
                </div>
                {testResults.plaid.status === 'available' ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Client ID:</span>{' '}
                      <Badge variant={testResults.plaid.clientIdConfigured ? 'default' : 'destructive'}>
                        {testResults.plaid.clientIdConfigured ? 'Configured' : 'Missing'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Secret:</span>{' '}
                      <Badge variant={testResults.plaid.secretConfigured ? 'default' : 'destructive'}>
                        {testResults.plaid.secretConfigured ? 'Configured' : 'Missing'}
                      </Badge>
                    </div>
                    {testResults.plaid.environment && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Environment:</span>{' '}
                        <Badge variant="outline">{testResults.plaid.environment}</Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-destructive">{testResults.plaid.error}</p>
                )}
              </div>

              {/* Stripe */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Stripe</h3>
                    <p className="text-sm text-muted-foreground">Payment processing service</p>
                  </div>
                  {getStatusBadge(testResults.stripe.status)}
                </div>
                {testResults.stripe.status === 'available' ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Secret Key:</span>{' '}
                      <Badge variant={testResults.stripe.secretKeyConfigured ? 'default' : 'destructive'}>
                        {testResults.stripe.secretKeyConfigured ? 'Configured' : 'Missing'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Publishable Key:</span>{' '}
                      <Badge variant={testResults.stripe.publishableKeyConfigured ? 'default' : 'destructive'}>
                        {testResults.stripe.publishableKeyConfigured ? 'Configured' : 'Missing'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">{testResults.stripe.error}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

