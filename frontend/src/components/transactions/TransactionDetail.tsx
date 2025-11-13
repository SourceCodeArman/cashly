/**
 * Transaction detail modal component
 */
import Modal from '@/components/common/Modal'
import { formatCurrency, formatDate } from '@/utils/formatters'
import Button from '@/components/common/Button'
import CategorySelector from './CategorySelector'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { Transaction } from '@/types/transaction.types'
import { useState, useEffect } from 'react'

export interface TransactionDetailProps {
  transaction: Transaction
  isOpen: boolean
  onClose: () => void
  onCategorize?: (categoryId: string) => void
}

export default function TransactionDetail({
  transaction,
  isOpen,
  onClose,
  onCategorize,
}: TransactionDetailProps) {
  const amount = parseFloat(transaction.amount)
  const isExpense = amount < 0
  const transactionType = isExpense ? 'expense' : 'income'
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(transaction.category || '')
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [localTransaction, setLocalTransaction] = useState(transaction)

  // Update local transaction when prop changes
  useEffect(() => {
    setLocalTransaction(transaction)
    setSelectedCategoryId(transaction.category || '')
    setIsCategorizing(false) // Reset categorizing state when transaction updates
  }, [transaction])

  const handleCategoryChange = async (categoryId: string) => {
    if (categoryId === selectedCategoryId) {
      return // No change
    }

    setSelectedCategoryId(categoryId)
    
    if (!onCategorize) {
      return
    }

    if (!categoryId) {
      // Don't allow clearing category for now - just revert
      setSelectedCategoryId(localTransaction.category || '')
      return
    }

    setIsCategorizing(true)
    onCategorize(categoryId)
    // Note: The loading state will be cleared when the transaction updates via useEffect
    // The mutation handler in the parent will handle success/error
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Details" size="md">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-500">Merchant</label>
          <p className="mt-1 text-base text-gray-900">{transaction.merchant_name}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Amount</label>
          <p
            className={`mt-1 text-2xl font-bold ${
              isExpense ? 'text-danger-600' : 'text-success-600'
            }`}
          >
            {transaction.formatted_amount || formatCurrency(amount)}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Date</label>
          <p className="mt-1 text-base text-gray-900">{formatDate(transaction.date)}</p>
        </div>

        {transaction.description && (
          <div>
            <label className="text-sm font-medium text-gray-500">Description</label>
            <p className="mt-1 text-base text-gray-900">{transaction.description}</p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-500">Category</label>
          <div className="mt-1">
            {isCategorizing ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-500">Updating category...</span>
              </div>
            ) : (
              <CategorySelector
                value={selectedCategoryId}
                onChange={handleCategoryChange}
                type={transactionType}
                placeholder="Select a category"
                disabled={!onCategorize}
              />
            )}
          </div>
          {localTransaction.category_name && !selectedCategoryId && (
            <p className="mt-1 text-sm text-gray-400">
              Previously: {localTransaction.category_name}
            </p>
          )}
        </div>

        {transaction.account_name && (
          <div>
            <label className="text-sm font-medium text-gray-500">Account</label>
            <p className="mt-1 text-base text-gray-900">{transaction.account_name}</p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}

