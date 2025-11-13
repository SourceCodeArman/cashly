/**
 * Accounts page
 */
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAccounts } from '@/hooks/useAccounts'
import AccountList from '@/components/accounts/AccountList'
import AccountFilters, { type AccountFiltersState } from '@/components/accounts/AccountFilters'
import PlaidLink from '@/components/accounts/PlaidLink'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import Modal from '@/components/common/Modal'
import { applyAccountFilters } from '@/utils/accountFilters'

export default function AccountsPage() {
  const {
    accounts,
    isLoading,
    error,
    refetch,
    syncAccount,
    isSyncing,
    deleteAccount,
    isDeleting,
    updateAccount,
    isUpdating,
    createLinkToken,
    linkToken,
    isCreatingLinkToken,
    connectAccount,
    isConnecting,
  } = useAccounts()
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [filters, setFilters] = useState<AccountFiltersState>({
    search: '',
    accountType: 'all',
    status: 'all',
    sortBy: 'name_asc',
  })

  // Auto-open connect modal when navigated with ?connect=1
  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('connect') === '1') {
      setShowConnectModal(true)
    }
  }, [location.search])

  // Apply filters and sorting to accounts
  const filteredAccounts = useMemo(() => {
    if (!accounts || accounts.length === 0) return []
    return applyAccountFilters(accounts, filters)
  }, [accounts, filters])

  // Check if filters are active
  const hasActiveFilters =
    filters.search !== '' ||
    filters.accountType !== 'all' ||
    filters.status !== 'all'

  // Check if we have accounts but filters returned no results
  const hasAccountsButNoResults = accounts.length > 0 && filteredAccounts.length === 0 && hasActiveFilters

  const handleSync = async (accountId: string) => {
    setSyncingAccountId(accountId)
    try {
      await syncAccount(accountId)
    } finally {
      setSyncingAccountId(null)
    }
  }

  const handleDelete = async (accountId: string) => {
    if (window.confirm('Are you sure you want to disconnect this account?')) {
      await deleteAccount(accountId)
    }
  }

  const handleUpdate = async (accountId: string, updates: { custom_name?: string | null }) => {
    await updateAccount({ accountId, updates })
  }

  const handleClearFilters = () => {
    setFilters({
      search: '',
      accountType: 'all',
      status: 'all',
      sortBy: 'name_asc',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your connected bank accounts</p>
        </div>
        <Button variant="primary" onClick={() => setShowConnectModal(true)}>
          Connect Account
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <ErrorMessage
          title="Failed to load accounts"
          message={error instanceof Error ? error.message : 'An error occurred'}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <AccountFilters
            filters={filters}
            onFiltersChange={setFilters}
            resultCount={filteredAccounts.length}
          />
          <AccountList
            accounts={filteredAccounts}
            onSync={handleSync}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            syncingAccountId={syncingAccountId || undefined}
            isUpdating={isUpdating}
            emptyStateTitle={
              hasAccountsButNoResults
                ? 'No accounts match your filters'
                : 'No accounts connected'
            }
            emptyStateDescription={
              hasAccountsButNoResults
                ? 'Try adjusting your search or filter criteria to see more accounts'
                : 'Connect a bank account to start tracking your finances'
            }
            emptyStateActionLabel={
              hasAccountsButNoResults ? 'Clear Filters' : 'Connect Account'
            }
            onEmptyStateAction={
              hasAccountsButNoResults ? handleClearFilters : undefined
            }
          />
        </>
      )}

      <Modal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        title="Connect Account"
      >
        <PlaidLink
          linkToken={linkToken}
          isLoadingToken={isCreatingLinkToken}
          isConnecting={isConnecting}
          onCreateLinkToken={() => createLinkToken()}
          onConnect={connectAccount}
          onClose={() => setShowConnectModal(false)}
        />
      </Modal>
    </div>
  )
}
