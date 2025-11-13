/**
 * Transactions page
 */
import { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import TransactionList from '@/components/transactions/TransactionList'
import TransactionFilters from '@/components/transactions/TransactionFilters'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import Pagination from '@/components/common/Pagination'
import type { TransactionFilters as TransactionFiltersType } from '@/types/transaction.types'

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFiltersType>({ page: 1 })
  const [showFilters, setShowFilters] = useState(false)
  const { transactions, pagination, isLoading, error, refetch, goToPage, categorizeTransaction } = useTransactions(filters)

  const handleCategorize = (transactionId: string, categoryId: string) => {
    if (!categoryId) {
      return // Don't allow empty category for now
    }
    categorizeTransaction(
      { transactionId, categoryId },
      {
        onSuccess: () => {
          // Refetch transactions to get updated data
          refetch()
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600 mt-1">View and manage your transactions</p>
        </div>
        <div className="ml-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
      </div>

      <TransactionFilters
        filters={filters}
        onFiltersChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
        onClear={() => setFilters({ page: 1 })}
        isOpen={showFilters}
        onToggle={() => setShowFilters(!showFilters)}
        hideToggleButton
      />

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <ErrorMessage
          title="Failed to load transactions"
          message={error instanceof Error ? error.message : 'An error occurred'}
          onRetry={() => refetch()}
        />
      ) : (
        <TransactionList 
          transactions={transactions} 
          onCategorize={handleCategorize}
        />
      )}

      {pagination && pagination.count > 0 && (
        <Pagination
          currentPage={pagination.currentPage || 1}
          totalPages={pagination.totalPages || 1}
          totalCount={pagination.count}
          pageSize={pagination.pageSize || 20}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      )}
    </div>
  )
}
