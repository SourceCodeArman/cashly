/**
 * Account list component
 */
import AccountCard from './AccountCard'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/LoadingSpinner'
import type { Account } from '@/types/account.types'

export interface AccountListProps {
  accounts: Account[]
  isLoading?: boolean
  onSync?: (accountId: string) => void
  onDelete?: (accountId: string) => void
  onUpdate?: (accountId: string, updates: { custom_name?: string | null }) => Promise<void>
  syncingAccountId?: string
  isUpdating?: boolean
  emptyStateTitle?: string
  emptyStateDescription?: string
  emptyStateActionLabel?: string
  onEmptyStateAction?: () => void
}

export default function AccountList({
  accounts,
  isLoading,
  onSync,
  onDelete,
  onUpdate,
  syncingAccountId,
  isUpdating,
  emptyStateTitle = 'No accounts connected',
  emptyStateDescription = 'Connect a bank account to start tracking your finances',
  emptyStateActionLabel = 'Connect Account',
  onEmptyStateAction,
}: AccountListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        title={emptyStateTitle}
        description={emptyStateDescription}
        actionLabel={emptyStateActionLabel}
        onAction={onEmptyStateAction || (() => (window.location.href = '/accounts'))}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((account) => (
        <AccountCard
          key={account.account_id}
          account={account}
          onSync={onSync ? () => onSync(account.account_id) : undefined}
          onDelete={onDelete ? () => onDelete(account.account_id) : undefined}
          onUpdate={onUpdate ? (accountId, updates) => onUpdate(accountId, updates) : undefined}
          isSyncing={syncingAccountId === account.account_id}
          isUpdating={isUpdating}
        />
      ))}
    </div>
  )
}

