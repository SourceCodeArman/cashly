import { useState, useCallback, useEffect, ReactNode } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { accountService } from '@/services/accountService'
import { useAccounts } from '@/hooks/useAccounts'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'

interface PlaidAccount {
  id: string
  name: string
  mask?: string
  type: string
}

interface PlaidInstitution {
  institution_id: string
  name?: string
}

interface PlaidLinkProps {
  children: (props: {
    openLink: () => void
    ready: boolean
    loading: boolean
  }) => ReactNode
}

export function PlaidLink({ children }: PlaidLinkProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<PlaidAccount[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [institution, setInstitution] = useState<PlaidInstitution | null>(null)
  const { data: existingAccounts } = useAccounts()
  const queryClient = useQueryClient()

  const onSuccess = useCallback(
    (
      public_token: string,
      metadata: { accounts: PlaidAccount[]; institution?: PlaidInstitution | null }
    ) => {
      setPublicToken(public_token)
      setAccounts(metadata.accounts || [])
      // Start with no accounts selected by default
      setSelectedAccountIds([])
      setInstitution(metadata.institution ?? null)
      setShowAccountDialog(true)
    },
    []
  )

  const { open, ready } = usePlaidLink({
    token: linkToken ?? '',
    onSuccess,
    onExit: () => {
      setLinkToken(null)
      setLoading(false)
    },
  })

  useEffect(() => {
    if (linkToken && ready) {
      open()
    }
  }, [linkToken, ready, open])

  const handleConnect = async () => {
    setLoading(true)
    try {
      const response = await accountService.createLinkToken()
      if (response.status === 'success' && response.data) {
        setLinkToken(response.data.link_token)
      } else {
        toast.error(response.message || 'Failed to create link token')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      console.error('Plaid link error:', error)
    } finally {
      setLoading(false)
    }
  }

  const isAccountAlreadyConnected = (plaidAccountId: string) => {
    return existingAccounts?.some((acc) => acc.plaidAccountId === plaidAccountId) || false
  }

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId]
    )
  }

  const handleSelectAll = () => {
    // Select all accounts that aren't already connected
    const availableAccountIds = accounts
      .filter((account) => !isAccountAlreadyConnected(account.id))
      .map((account) => account.id)
    
    // If all available accounts are already selected, deselect all
    // Otherwise, select all available accounts
    const allSelected = availableAccountIds.every((id) => selectedAccountIds.includes(id))
    
    if (allSelected) {
      setSelectedAccountIds([])
    } else {
      setSelectedAccountIds(availableAccountIds)
    }
  }

  const handleConnectAccounts = async () => {
    if (!publicToken || selectedAccountIds.length === 0) {
      toast.error('Please select at least one account')
      return
    }

    if (!institution?.institution_id) {
      toast.error('Unable to identify selected institution. Please restart the connection.')
      return
    }

    setLoading(true)
    try {
      const response = await accountService.connectAccount({
        publicToken,
        institutionId: institution.institution_id,
        institutionName: institution.name,
        selectedAccountIds,
      })
      if (response.status === 'success' && response.data) {
        const { accounts_created, duplicates_skipped } = response.data
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts })
        toast.success(
          `${accounts_created} account(s) linked, ${duplicates_skipped} duplicate(s) skipped`
        )
        setShowAccountDialog(false)
        setPublicToken(null)
        setAccounts([])
        setSelectedAccountIds([])
        setInstitution(null)
      } else {
        toast.error(response.message || 'Failed to connect accounts')
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.')
      console.error('Connect accounts error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {children({
        openLink: handleConnect,
        ready,
        loading,
      })}
      {/* Account Selection Dialog */}
      <Dialog
        open={showAccountDialog}
        onOpenChange={(open) => {
          setShowAccountDialog(open)
          if (!open) {
            setInstitution(null)
            setPublicToken(null)
            setAccounts([])
            setSelectedAccountIds([])
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Accounts to Link</DialogTitle>
            <DialogDescription>
              Choose which accounts you want to connect to Cashly. Accounts that are already
              connected will be skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {accounts
                .filter((account) => !isAccountAlreadyConnected(account.id))
                .every((account) => selectedAccountIds.includes(account.id))
                ? 'Deselect All'
                : 'Select All'}
            </Button>
          </div>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {accounts.map((account) => {
              const alreadyConnected = isAccountAlreadyConnected(account.id)
              const isSelected = selectedAccountIds.includes(account.id)
              return (
                <div
                  key={account.id}
                  className="flex items-start space-x-3 rounded-lg border border-border p-3"
                >
                  <Checkbox
                    id={account.id}
                    checked={isSelected}
                    onCheckedChange={() => handleAccountToggle(account.id)}
                    disabled={alreadyConnected}
                  />
                  <Label
                    htmlFor={account.id}
                    className="flex-1 cursor-pointer space-y-1"
                  >
                    <div className="font-medium">{account.name}</div>
                    {account.mask && (
                      <div className="text-sm text-muted-foreground">
                        •••• {account.mask}
                      </div>
                    )}
                    {alreadyConnected && (
                      <div className="text-xs text-destructive">
                        Already connected
                      </div>
                    )}
                  </Label>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConnectAccounts}
              disabled={selectedAccountIds.length === 0 || loading}
              className="bg-gradient-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                `Connect ${selectedAccountIds.length} Account(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

