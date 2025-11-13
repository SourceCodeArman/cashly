/**
 * Recent transactions component
 */
import { Link } from 'react-router-dom'
import Card from '@/components/common/Card'
import { formatCurrency, formatDate } from '@/utils/formatters'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/LoadingSpinner'

export interface RecentTransaction {
  transaction_id: string
  merchant_name: string
  amount: number
  formatted_amount: string
  date: string
  category_name?: string
  account_name: string
}

export interface RecentTransactionsProps {
  transactions: RecentTransaction[]
  isLoading?: boolean
}

export default function RecentTransactions({
  transactions,
  isLoading,
}: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        <EmptyState
          title="No transactions yet"
          description="Connect an account to see your transactions here"
          actionLabel="Connect Account"
          onAction={() => (window.location.href = '/accounts')}
        />
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <Link
          to="/transactions"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.transaction_id}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
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
                    <p className="text-xs text-gray-500">{transaction.category_name}</p>
                  </>
                )}
              </div>
            </div>
            <div className="ml-4 text-right">
              <p
                className={`text-sm font-semibold ${
                  transaction.amount < 0 ? 'text-danger-600' : 'text-success-600'
                }`}
              >
                {transaction.formatted_amount}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

