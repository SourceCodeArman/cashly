/**
 * Transaction item component
 */
import { formatCurrency, formatDate } from '@/utils/formatters'
import { cn } from '@/utils/helpers'
import type { Transaction } from '@/types/transaction.types'

export interface TransactionItemProps {
  transaction: Transaction
  onClick?: () => void
}

export default function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const amount = parseFloat(transaction.amount)
  const isExpense = amount < 0

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {transaction.merchant_name}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-gray-500">{formatDate(transaction.date)}</p>
          {transaction.category_name && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{transaction.category_name}</span>
            </>
          )}
          {transaction.account_name && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{transaction.account_name}</span>
            </>
          )}
        </div>
      </div>
      <div className="ml-4 text-right">
        <p
          className={cn(
            'text-sm font-semibold',
            isExpense ? 'text-danger-600' : 'text-success-600'
          )}
        >
          {transaction.formatted_amount || formatCurrency(amount)}
        </p>
      </div>
    </div>
  )
}

