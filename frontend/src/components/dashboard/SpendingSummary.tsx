/**
 * Spending summary component
 */
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import Card from '@/components/common/Card'
import { formatCurrency, formatPercentage } from '@/utils/formatters'
import { cn } from '@/utils/helpers'

export interface CategorySpending {
  category_id?: string
  category_name: string
  total: number
  count: number
}

export interface SpendingSummaryProps {
  totalExpenses: number
  transactionCount: number
  byCategory: CategorySpending[]
  previousMonthTotal?: number
}

export default function SpendingSummary({
  totalExpenses,
  transactionCount,
  byCategory,
  previousMonthTotal,
}: SpendingSummaryProps) {
  const change = previousMonthTotal
    ? ((totalExpenses - previousMonthTotal) / previousMonthTotal) * 100
    : 0
  const isIncrease = change > 0

  const topCategories = byCategory.slice(0, 5)

  return (
    <Card className="card-glass">
      <h3 className="text-lg font-semibold mb-4">Spending Summary</h3>
      
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold text-gray-900">
            {formatCurrency(totalExpenses)}
          </span>
          {previousMonthTotal && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm',
                isIncrease ? 'text-danger-600' : 'text-success-600'
              )}
            >
              {isIncrease ? (
                <ArrowUpIcon className="h-4 w-4" />
              ) : (
                <ArrowDownIcon className="h-4 w-4" />
              )}
              {formatPercentage(Math.abs(change))}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500">
          {transactionCount} transaction{transactionCount !== 1 ? 's' : ''} this month
        </p>
      </div>

      {topCategories.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Top Categories</h4>
          {topCategories.map((category) => {
            const percentage = (category.total / totalExpenses) * 100
            return (
              <div key={category.category_id || category.category_name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{category.category_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(category.total)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatPercentage(percentage)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

