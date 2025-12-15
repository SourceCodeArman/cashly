import { RefreshCw, Link as LinkIcon, Loader2, Unlink, Trash2, Info, Calendar, Building2, Receipt, Target, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlaidLink } from '@/components/PlaidLink'
import { useAccounts, useSyncAccount, useSyncAllAccounts, useDisconnectAccount, useDisconnectAllAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useGoals } from '@/hooks/useGoals'
import { formatCurrency, maskAccountNumber, formatAccountType, formatDate, cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { Account, Goal } from '@/types'
import { PageHeader } from "@/components/PageHeader"

export function Accounts() {
  const { data: accounts, isLoading } = useAccounts()
  const syncAccount = useSyncAccount()
  const syncAllAccounts = useSyncAllAccounts()
  const disconnectAccount = useDisconnectAccount()
  const disconnectAllAccounts = useDisconnectAllAccounts()

  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [disconnectAllDialogOpen, setDisconnectAllDialogOpen] = useState(false)
  const [accountToDisconnect, setAccountToDisconnect] = useState<string | null>(null)
  const accountToDisconnectRef = useRef<string | null>(null)
  const [accountDetailsOpen, setAccountDetailsOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [syncingAccountIds, setSyncingAccountIds] = useState<Set<string>>(new Set())
  const [isSyncingAll, setIsSyncingAll] = useState(false)

  const handleSync = async (accountId: string) => {
    setSyncingAccountIds((prev) => new Set(prev).add(accountId))
    syncAccount.mutate(accountId, {
      onSettled: () => {
        setSyncingAccountIds((prev) => {
          const next = new Set(prev)
          next.delete(accountId)
          return next
        })
      },
    })
  }

  const handleSyncAll = async () => {
    if (!accounts || accounts.length === 0) {
      return
    }

    const accountIds = accounts.map((account) => account.id).filter(Boolean) as string[]
    if (accountIds.length === 0) {
      toast.error('No accounts to sync')
      return
    }

    // Mark all accounts as syncing and set sync all flag
    setIsSyncingAll(true)
    setSyncingAccountIds(new Set(accountIds))

    syncAllAccounts.mutate(accountIds, {
      onSettled: () => {
        // Clear all syncing states after sync completes
        setIsSyncingAll(false)
        setSyncingAccountIds(new Set())
      },
    })
  }

  const handleDisconnectClick = (accountId: string) => {
    console.log('Setting account to disconnect:', accountId)
    accountToDisconnectRef.current = accountId
    setAccountToDisconnect(accountId)
    setDisconnectDialogOpen(true)
  }

  const handleDisconnectConfirm = async () => {
    // Use ref as fallback in case state was cleared
    const accountId = accountToDisconnect || accountToDisconnectRef.current
    if (!accountId) {
      console.error('No account ID to disconnect. Current state:', {
        accountToDisconnect,
        refValue: accountToDisconnectRef.current,
        accounts
      })
      toast.error('No account selected. Please try again.')
      setDisconnectDialogOpen(false)
      return
    }

    console.log('Disconnecting account:', accountId)
    disconnectAccount.mutate(accountId, {
      onSuccess: () => {
        console.log('Account disconnected successfully')
        accountToDisconnectRef.current = null
        setDisconnectDialogOpen(false)
        setAccountToDisconnect(null)
      },
      onError: (error) => {
        console.error('Failed to disconnect account:', error)
        // Error toast is handled by the hook
        // Don't close dialog on error so user can retry
      },
    })
  }

  const handleDisconnectAllClick = () => {
    setDisconnectAllDialogOpen(true)
  }

  const handleDisconnectAllConfirm = () => {
    if (!accounts || accounts.length === 0) {
      return
    }

    const accountIds = accounts.map((account) => account.id)
    disconnectAllAccounts.mutate(accountIds, {
      onSuccess: () => {
        setDisconnectAllDialogOpen(false)
      },
    })
  }

  const accountToDisconnectName = accounts?.find((acc) => acc.id === accountToDisconnect)?.name ||
    accounts?.find((acc) => acc.id === accountToDisconnect)?.institutionName ||
    'this account'

  const handleAccountClick = (account: Account) => {
    setSelectedAccount(account)
    setAccountDetailsOpen(true)
  }

  const handleViewDetails = (account: Account, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setSelectedAccount(account)
    setAccountDetailsOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
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
    <PlaidLink>
      {({ openLink, loading }) => (
        <div className="space-y-6">
          {/* Page Header */}
          {/* Page Header */}
          <PageHeader
            title="Accounts"
            description="Manage your connected bank accounts and view balances"
          >
            <div className="flex gap-2">
              {accounts && accounts.length > 0 && (
                <>
                  <Button
                    onClick={handleSyncAll}
                    disabled={syncAllAccounts.isPending || isSyncingAll}
                    variant="outline"
                  >
                    {syncAllAccounts.isPending || isSyncingAll ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing All...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync All
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleDisconnectAllClick}
                    disabled={disconnectAllAccounts.isPending}
                    variant="destructive"
                  >
                    {disconnectAllAccounts.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Disconnect All
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button onClick={openLink} disabled={loading} className="bg-gradient-primary">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Connect Account
                  </>
                )}
              </Button>
            </div>
          </PageHeader>

          {/* Accounts Grid */}
          {accounts && accounts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => {
                const accountId = account.id
                if (!accountId) {
                  console.error('Account missing ID in component:', account)
                }
                return (
                  <Card
                    key={accountId || `account-${account.institutionName}`}
                    className="border-border shadow-soft transition-shadow hover:shadow-md cursor-pointer"
                    onClick={() => handleAccountClick(account)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="break-words flex-1 min-w-0">
                          {account.name || account.institutionName || 'Unknown Account'}
                        </CardTitle>
                        <Badge variant={account.isActive !== false ? 'default' : 'secondary'} className="shrink-0">
                          {account.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <CardDescription>
                        {account.maskedAccountNumber
                          ? maskAccountNumber(account.maskedAccountNumber)
                          : 'No account number'} • {formatAccountType(account.accountType)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-3xl font-bold">{formatCurrency(parseFloat(account.balance))}</div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation() // Prevent card click
                            const accountId = account.id
                            if (accountId) {
                              handleSync(accountId)
                            } else {
                              console.error('Account missing ID for sync:', account)
                              toast.error('Account ID not found. Please refresh the page.')
                            }
                          }}
                          disabled={syncingAccountIds.has(accountId) || isSyncingAll}
                        >
                          {syncingAccountIds.has(accountId) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Sync Now
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleViewDetails(account, e)}
                          title="View account details"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation() // Prevent card click
                            const accountId = account.id
                            console.log('Disconnect button clicked, account:', account, 'accountId:', accountId)
                            if (accountId) {
                              handleDisconnectClick(accountId)
                            } else {
                              console.error('Account missing ID:', account)
                              toast.error('Account ID not found. Please refresh the page.')
                            }
                          }}
                          disabled={disconnectAccount.isPending}
                          title="Disconnect account"
                        >
                          {disconnectAccount.isPending && accountToDisconnect === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unlink className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LinkIcon className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No accounts connected</h3>
                <p className="mb-4 text-sm text-center text-muted-foreground">
                  Connect your bank accounts to start tracking your finances
                </p>
                <Button onClick={openLink} disabled={loading} className="bg-gradient-primary">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Connect Account
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Disconnect Account Dialog */}
          <Dialog
            open={disconnectDialogOpen}
            onOpenChange={(open) => {
              if (!open && !disconnectAccount.isPending) {
                setDisconnectDialogOpen(false)
                setAccountToDisconnect(null)
                accountToDisconnectRef.current = null
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Disconnect Account</DialogTitle>
                <DialogDescription>
                  Are you sure you want to disconnect {accountToDisconnectName}? This will stop syncing transactions from this account, but your transaction history will be preserved.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDisconnectDialogOpen(false)
                    setAccountToDisconnect(null)
                    accountToDisconnectRef.current = null
                  }}
                  disabled={disconnectAccount.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDisconnectConfirm}
                  disabled={disconnectAccount.isPending || !accountToDisconnect}
                >
                  {disconnectAccount.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Disconnect All Accounts Dialog */}
          <Dialog open={disconnectAllDialogOpen} onOpenChange={setDisconnectAllDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Disconnect All Accounts</DialogTitle>
                <DialogDescription>
                  Are you sure you want to disconnect all {accounts?.length || 0} account(s)? This will stop syncing transactions from all accounts, but your transaction history will be preserved.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDisconnectAllDialogOpen(false)}
                  disabled={disconnectAllAccounts.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDisconnectAllConfirm}
                  disabled={disconnectAllAccounts.isPending}
                >
                  {disconnectAllAccounts.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect All'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Account Details Dialog */}
          <Dialog open={accountDetailsOpen} onOpenChange={setAccountDetailsOpen}>
            <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
                <DialogTitle className="text-xl">Account Details</DialogTitle>
                <DialogDescription className="mt-1.5">
                  View detailed information about this account
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 flex flex-col overflow-hidden px-6 min-h-0">
                {selectedAccount && (
                  <AccountDetailsTabs account={selectedAccount} />
                )}
              </div>
              <DialogFooter className="px-6 py-4 border-t gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAccountDetailsOpen(false)}
                >
                  Close
                </Button>
                {selectedAccount && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const accountId = selectedAccount.id
                        if (accountId) {
                          handleSync(accountId)
                        }
                      }}
                      disabled={syncingAccountIds.has(selectedAccount.id) || isSyncingAll}
                    >
                      {syncingAccountIds.has(selectedAccount.id) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sync Now
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        const accountId = selectedAccount.id
                        if (accountId) {
                          setAccountDetailsOpen(false)
                          handleDisconnectClick(accountId)
                        }
                      }}
                    >
                      <Unlink className="mr-2 h-4 w-4" />
                      Disconnect Account
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </PlaidLink>
  )
}

// Account Details Tabs Component
function AccountDetailsTabs({ account }: { account: Account }) {
  const accountId = account.id
  const [activeTab, setActiveTab] = useState('overview')
  const tabsRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

  // Fetch transactions for this account
  const { data: transactionsData, isLoading: transactionsLoading } = useTransactions(
    accountId ? { account: accountId } : undefined
  )
  const transactions = transactionsData?.results || []

  // Fetch all goals and filter by destination_account_id
  const { data: allGoals, isLoading: goalsLoading } = useGoals()
  const accountGoals = allGoals?.filter((goal) => {
    // Check if goal has destination_account_id field (from API response)
    const goalAccountId = (goal as Goal & { destination_account_id?: string }).destination_account_id
    return goalAccountId && String(goalAccountId) === String(accountId)
  }) || []

  // Update indicator position when active tab changes
  useEffect(() => {
    const updateIndicator = () => {
      if (tabsRef.current) {
        const activeButton = tabsRef.current.querySelector(`[data-state="active"]`) as HTMLElement
        if (activeButton) {
          const tabsList = tabsRef.current
          const tabsListRect = tabsList.getBoundingClientRect()
          const buttonRect = activeButton.getBoundingClientRect()
          setIndicatorStyle({
            left: buttonRect.left - tabsListRect.left,
            width: buttonRect.width,
          })
        }
      }
    }

    // Update on mount and when activeTab changes
    updateIndicator()

    // Also update on window resize
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [activeTab])

  // Track tab order and previous tab to determine slide direction
  // Tab order: Overview (0) → Transactions (1) → Goals (2) → Budgets (3)
  const prevTabRef = useRef('overview')
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')

  // Calculate slide direction based on tab order
  // Forward (right): Overview → Transactions → Goals (index increases)
  // Backward (left): Goals → Transactions → Overview (index decreases)
  useEffect(() => {
    const tabOrder = ['overview', 'transactions', 'goals', 'budgets']
    const currentIndex = tabOrder.indexOf(activeTab)
    const prevIndex = tabOrder.indexOf(prevTabRef.current)

    // Only update direction if tab actually changed and indices are valid
    if (currentIndex !== -1 && prevIndex !== -1 && currentIndex !== prevIndex) {
      // Calculate direction and update state outside of synchronous effect
      const newDirection: 'left' | 'right' = currentIndex > prevIndex ? 'right' : 'left'
      // Use requestAnimationFrame to defer state update
      requestAnimationFrame(() => {
        setSlideDirection(newDirection)
      })
    }

    // Update previous tab ref after direction is set
    prevTabRef.current = activeTab
  }, [activeTab])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
      <TabsList ref={tabsRef} className="grid w-full grid-cols-4 mb-4 bg-muted shrink-0 h-12 p-1 rounded-lg border border-border/50 relative">
        {/* Sliding Indicator */}
        <div
          className="absolute top-1 bottom-1 bg-background rounded-md shadow-md transition-all duration-300 ease-out pointer-events-none z-0"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
        <TabsTrigger
          value="overview"
          className="text-muted-foreground hover:text-foreground/80 transition-all duration-200 ease-in-out h-10 rounded-md font-medium relative z-10"
        >
          <Info className="mr-2 h-4 w-4" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="transactions"
          className="text-muted-foreground hover:text-foreground/80 transition-all duration-200 ease-in-out h-10 rounded-md font-medium relative z-10"
        >
          <Receipt className="mr-2 h-4 w-4" />
          Transactions
        </TabsTrigger>
        <TabsTrigger
          value="goals"
          className="text-muted-foreground hover:text-foreground/80 transition-all duration-200 ease-in-out h-10 rounded-md font-medium relative z-10"
        >
          <Target className="mr-2 h-4 w-4" />
          Goals
        </TabsTrigger>
        <TabsTrigger
          value="budgets"
          disabled
          className="opacity-50 h-10 rounded-md font-medium transition-opacity duration-200 text-muted-foreground relative z-10"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Budgets
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-hidden min-h-0 py-4 relative">
        {/* Overview Tab */}
        <TabsContent
          value="overview"
          slideDirection={slideDirection}
          className="space-y-6 mt-0 h-full overflow-y-auto absolute inset-0 top-4"
        >
          {/* Account Name and Status */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b">
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-semibold break-words text-foreground">
                {account.name || account.institutionName || 'Unknown Account'}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                {formatAccountType(account.accountType)}
              </p>
            </div>
            <Badge variant={account.isActive !== false ? 'default' : 'secondary'} className="shrink-0">
              {account.isActive !== false ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {/* Balance */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
            <div className="text-sm font-medium text-muted-foreground mb-2">Current Balance</div>
            <div className="text-3xl font-bold text-foreground">{formatCurrency(parseFloat(account.balance || '0'))}</div>
          </div>

          {/* Account Information Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Building2 className="h-3.5 w-3.5" />
                <span>Institution</span>
              </div>
              <div className="font-semibold text-foreground">
                {account.institutionName || 'Unknown'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span>Account Number</span>
              </div>
              <div className="font-semibold text-foreground font-mono">
                {account.maskedAccountNumber
                  ? maskAccountNumber(account.maskedAccountNumber)
                  : 'Not available'}
              </div>
            </div>

            {account.plaidAccountId && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Plaid Account ID</span>
                </div>
                <div className="font-mono text-sm text-foreground">
                  {account.plaidAccountId}
                </div>
              </div>
            )}

            {account.createdAt && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Connected</span>
                </div>
                <div className="font-semibold text-foreground">
                  {formatDate(account.createdAt)}
                </div>
              </div>
            )}

            {account.updatedAt && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Last Updated</span>
                </div>
                <div className="font-semibold text-foreground">
                  {formatDate(account.updatedAt)}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent
          value="transactions"
          slideDirection={slideDirection}
          className="mt-0 h-full overflow-y-auto absolute inset-0 top-4"
        >
          {transactionsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No transactions found</p>
                <p className="text-xs text-muted-foreground mt-1">This account has no transactions yet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-2">
              {transactions.map((transaction) => {
                const amount = parseFloat(transaction.amount || '0')
                const isIncome = amount > 0
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:bg-muted/50 hover:border-border/80 hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-foreground truncate">
                          {transaction.merchantName || transaction.description || 'Transaction'}
                        </div>
                        {transaction.category && (
                          <Badge
                            variant="outline"
                            className="shrink-0"
                            style={{
                              borderColor: `${transaction.category.color || '#999'}40`,
                              color: transaction.category.color || '#999',
                              backgroundColor: `${transaction.category.color || '#999'}10`,
                            }}
                          >
                            {transaction.category.name}
                          </Badge>
                        )}
                      </div>
                      {transaction.description && transaction.description !== transaction.merchantName && (
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {transaction.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'text-lg font-bold shrink-0',
                        isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {isIncome ? '+' : ''}
                      {formatCurrency(Math.abs(amount))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent
          value="goals"
          slideDirection={slideDirection}
          className="mt-0 h-full overflow-y-auto absolute inset-0 top-4"
        >
          {goalsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : accountGoals.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
              <div className="text-center">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">No goals linked to this account</p>
                <p className="text-xs text-muted-foreground mt-1">Goals with this account as destination will appear here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {accountGoals.map((goal) => {
                const currentAmount = parseFloat(goal.currentAmount || '0')
                const targetAmount = parseFloat(goal.targetAmount || '1')
                const progress = Math.min((currentAmount / targetAmount) * 100, 100)

                return (
                  <Card key={goal.id} className="border-border/80 hover:border-border transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-lg font-semibold text-foreground">{goal.name}</CardTitle>
                        <Badge variant={goal.isActive ? 'default' : 'secondary'} className="shrink-0">
                          {goal.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <div>
                        <div className="flex justify-between text-sm mb-3">
                          <span className="text-muted-foreground font-medium">Progress</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(currentAmount)} / {formatCurrency(targetAmount)}
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {progress.toFixed(1)}% complete
                        </div>
                      </div>
                      {goal.deadline && (
                        <div className="flex items-center gap-2 text-sm pt-2 border-t">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Deadline:</span>
                          <span className="font-semibold text-foreground">{formatDate(goal.deadline)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Budgets Tab - Placeholder */}
        <TabsContent
          value="budgets"
          slideDirection={slideDirection}
          className="mt-0 h-full overflow-y-auto absolute inset-0 top-4"
        >
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-sm font-medium text-foreground">Budget tracking coming soon</p>
              <p className="text-xs text-muted-foreground mt-1">This feature will be available in a future update</p>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )
}

