/**
 * Account detail modal component
 */
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Modal from '@/components/common/Modal'
import ConfirmModal from '@/components/common/ConfirmModal'
import Tabs from '@/components/common/Tabs'
import TransactionList from '@/components/transactions/TransactionList'
import GoalList from '@/components/goals/GoalList'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { formatCurrency, formatAccountNumber, formatRelativeTime, formatAccountType } from '@/utils/formatters'
import { transactionService } from '@/services/transactionService'
import { goalService } from '@/services/goalService'
import type { Account } from '@/types/account.types'

export interface AccountDetailModalProps {
  account: Account | null
  isOpen: boolean
  onClose: () => void
  onSync?: (accountId: string) => Promise<void>
  onDelete?: (accountId: string) => Promise<void>
  onDeactivate?: (accountId: string) => Promise<void>
  onActivate?: (accountId: string) => Promise<void>
  onUpdate?: (accountId: string, updates: { custom_name?: string | null }) => Promise<void>
  isSyncing?: boolean
  isDeleting?: boolean
  isUpdating?: boolean
  isDeactivating?: boolean
  isActivating?: boolean
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'goals', label: 'Goals' },
  { id: 'budget', label: 'Budget' },
]

export default function AccountDetailModal({
  account,
  isOpen,
  onClose,
  onSync,
  onDelete,
  onDeactivate,
  onActivate,
  onUpdate,
  isSyncing,
  isDeleting,
  isUpdating,
  isDeactivating,
  isActivating,
}: AccountDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Reset to overview tab when modal opens or account changes
  useEffect(() => {
    if (isOpen && account) {
      setActiveTab('overview')
    }
  }, [isOpen, account?.account_id])

  // Fetch transactions for this account
  const {
    data: transactionsData,
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useQuery({
    queryKey: ['transactions', 'account', account?.account_id],
    queryFn: async () => {
      if (!account) return null
      const response = await transactionService.getTransactions({
        account: account.account_id,
      })
      if (response.status === 'success' && response.data) {
        return response.data.results || []
      }
      throw new Error(response.message || 'Failed to fetch transactions')
    },
    enabled: isOpen && !!account && activeTab === 'transactions',
    staleTime: 30000,
  })

  // Fetch all goals and filter by destination_account_id
  const {
    data: goalsData,
    isLoading: isLoadingGoals,
    error: goalsError,
  } = useQuery({
    queryKey: ['goals', 'destination', account?.account_id],
    queryFn: async () => {
      if (!account) return null
      const response = await goalService.getGoals()
      if (response.status === 'success' && response.data) {
        // Filter goals where destination_account_id matches this account
        return response.data.filter(
          (goal) => goal.destination_account_id === account.account_id
        )
      }
      throw new Error(response.message || 'Failed to fetch goals')
    },
    enabled: isOpen && !!account && activeTab === 'goals',
    staleTime: 30000,
  })

  const transactions = transactionsData || []
  const goals = goalsData || []

  const formattedAccountNumber = account ? formatAccountNumber(account.account_number_masked) : null
  const displayName = account?.custom_name || account?.institution_name || 'Account'

  const handleSync = async () => {
    if (account && onSync) {
      await onSync(account.account_id)
    }
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (account && onDelete) {
      await onDelete(account.account_id)
      setShowDeleteConfirm(false)
      onClose() // Close the account detail modal after deletion
    }
  }

  const handleUpdate = async (updates: { custom_name?: string | null }) => {
    if (account && onUpdate) {
      await onUpdate(account.account_id, updates)
    }
  }

  const handleDeactivate = async () => {
    if (account && onDeactivate) {
      await onDeactivate(account.account_id)
    }
  }

  const handleActivate = async () => {
    if (account && onActivate) {
      await onActivate(account.account_id)
    }
  }

  if (!account) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={displayName}
      size="xxl"
    >
      <div className="flex flex-col h-[600px]">
        <div className="flex justify-center flex-shrink-0 mb-4">
          <div className="w-full max-w-2xl">
            <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg overflow-hidden scrollbar-hide p-4">
            {activeTab === 'overview' && (
              <div className="space-y-6">
              {/* Balance Section */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                    <p className="text-4xl font-bold text-gray-900">
                      {formatCurrency(parseFloat(account.balance), account.currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Account Type</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {formatAccountType(account.account_type) || account.account_type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h3>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Institution</dt>
                      <dd className="mt-1 text-sm text-gray-900">{account.institution_name}</dd>
                    </div>
                    {formattedAccountNumber && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Account Number</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">
                          {formattedAccountNumber}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            account.is_active
                              ? 'bg-success-100 text-success-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </dd>
                    </div>
                    {account.last_synced_at && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last Synced</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {formatRelativeTime(account.last_synced_at)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="flex gap-3 flex-wrap">
                    {account.is_active ? (
                      <>
                        {onSync && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSync}
                            isLoading={isSyncing}
                            disabled={isSyncing}
                          >
                            Sync Account
                          </Button>
                        )}
                        {onDeactivate && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleDeactivate}
                            isLoading={isDeactivating}
                            disabled={isDeactivating}
                          >
                            Deactivate
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleDelete}
                            isLoading={isDeleting}
                            disabled={isDeleting}
                          >
                            Disconnect
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        {onActivate && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleActivate}
                            isLoading={isActivating}
                            disabled={isActivating}
                          >
                            Activate
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleDelete}
                            isLoading={isDeleting}
                            disabled={isDeleting}
                          >
                            Disconnect
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div>
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <LoadingSpinner size="lg" />
                </div>
              ) : transactionsError ? (
                <EmptyState
                  title="Failed to load transactions"
                  description={
                    transactionsError instanceof Error
                      ? transactionsError.message
                      : 'An error occurred while loading transactions'
                  }
                />
              ) : (
                <TransactionList
                  transactions={transactions}
                  isLoading={isLoadingTransactions}
                  hideWrapper={true}
                />
              )}
            </div>
          )}

          {activeTab === 'goals' && (
            <div>
              {isLoadingGoals ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <LoadingSpinner size="lg" />
                </div>
              ) : goalsError ? (
                <EmptyState
                  title="Failed to load goals"
                  description={
                    goalsError instanceof Error
                      ? goalsError.message
                      : 'An error occurred while loading goals'
                  }
                />
              ) : goals.length === 0 ? (
                <EmptyState
                  title="No goals linked to this account"
                  description="This account is not set as a destination for any savings goals"
                />
              ) : (
                <GoalList goals={goals} />
              )}
            </div>
          )}

          {activeTab === 'budget' && (
            <div className="flex items-center justify-center min-h-[400px]">
              <EmptyState
                title="Budgeting coming soon"
                description="Account-specific budgeting features will be available in a future update"
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Disconnect Account"
        message="Are you sure you want to disconnect this account? This action cannot be undone."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </Modal>
  )
}

