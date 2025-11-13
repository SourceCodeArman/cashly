/**
 * Transaction list component
 */
import { useState, useEffect } from 'react'
import TransactionItem from './TransactionItem'
import TransactionDetail from './TransactionDetail'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/LoadingSpinner'
import type { Transaction } from '@/types/transaction.types'

export interface TransactionListProps {
  transactions: Transaction[]
  isLoading?: boolean
  onTransactionClick?: (transaction: Transaction) => void
  onCategorize?: (transactionId: string, categoryId: string) => void
}

export default function TransactionList({
  transactions,
  isLoading,
  onTransactionClick,
  onCategorize,
}: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)

  const handleCategorize = (transactionId: string, categoryId: string) => {
    if (onCategorize) {
      onCategorize(transactionId, categoryId)
    }
  }

  // Update selected transaction when transactions list updates
  useEffect(() => {
    if (selectedTransaction) {
      const updated = transactions.find(
        (t) => t.transaction_id === selectedTransaction.transaction_id
      )
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTransaction)) {
        setSelectedTransaction(updated)
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
    setSelectedTransaction(transaction)
    onTransactionClick?.(transaction)
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {transactions.map((transaction) => (
          <TransactionItem
            key={transaction.transaction_id}
            transaction={transaction}
            onClick={() => handleClick(transaction)}
          />
        ))}
      </div>

      {selectedTransaction && (
        <TransactionDetail
          transaction={selectedTransaction}
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onCategorize={(categoryId) =>
            handleCategorize(selectedTransaction.transaction_id, categoryId)
          }
        />
      )}
    </>
  )
}

