/**
 * Transaction list component
 */
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import TransactionItem from './TransactionItem'
import TransactionDetail from './TransactionDetail'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/LoadingSpinner'
import { transactionService } from '@/services/transactionService'
import type { Transaction } from '@/types/transaction.types'

export interface TransactionListProps {
  transactions: Transaction[]
  isLoading?: boolean
  onTransactionClick?: (transaction: Transaction) => void
  onCategorize?: (transactionId: string, categoryId: string) => void
  hideWrapper?: boolean
}

export default function TransactionList({
  transactions,
  isLoading,
  onTransactionClick,
  onCategorize,
  hideWrapper = false,
}: TransactionListProps) {
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  
  // Fetch full transaction detail when a transaction is selected
  const { data: transactionDetailResponse, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['transaction', selectedTransactionId],
    queryFn: async () => {
      if (!selectedTransactionId) return null
      const response = await transactionService.getTransaction(selectedTransactionId)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch transaction')
    },
    enabled: !!selectedTransactionId,
  })
  
  const selectedTransaction = transactionDetailResponse || null

  const handleCategorize = (transactionId: string, categoryId: string) => {
    if (onCategorize) {
      onCategorize(transactionId, categoryId)
    }
  }

  // Update selected transaction when transactions list updates
  useEffect(() => {
    if (selectedTransaction && selectedTransactionId) {
      const updated = transactions.find(
        (t) => t.transaction_id === selectedTransactionId
      )
      if (updated) {
        // If the list transaction is updated, we'll rely on the detail query to update
        // The detail query will have the latest data
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions])

  if (isLoading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions found"
        description="Try adjusting your filters or connect an account"
      />
    )
  }

  const handleClick = (transaction: Transaction) => {
    setSelectedTransactionId(transaction.transaction_id)
    onTransactionClick?.(transaction)
  }

  const transactionItems = transactions.map((transaction) => (
          <TransactionItem
            key={transaction.transaction_id}
            transaction={transaction}
            onClick={() => handleClick(transaction)}
          />
  ))

  return (
    <>
      {hideWrapper ? (
        <div className="divide-y divide-gray-100">
          {transactionItems}
        </div>
      ) : (
        <div className="bg-white/30 rounded-lg border border-gray-200 divide-y divide-gray-100">
          {transactionItems}
      </div>
      )}

      {selectedTransaction && (
        <TransactionDetail
          transaction={selectedTransaction}
          isOpen={!!selectedTransaction && !isLoadingDetail}
          onClose={() => setSelectedTransactionId(null)}
          onCategorize={(categoryId) =>
            handleCategorize(selectedTransaction.transaction_id, categoryId)
          }
        />
      )}
    </>
  )
}

