/**
 * Dashboard page
 */
import { useDashboard } from '@/hooks/useDashboard'
import BalanceCard from '@/components/dashboard/BalanceCard'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import SpendingSummary from '@/components/dashboard/SpendingSummary'
import GoalProgress from '@/components/dashboard/GoalProgress'
import CategoryChart from '@/components/dashboard/CategoryChart'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import Card from '@/components/common/Card'
import { formatCurrency } from '@/utils/formatters'

export default function DashboardPage() {
  const { dashboardData, isLoading, error, refetch } = useDashboard()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorMessage
        title="Failed to load dashboard"
        message={error instanceof Error ? error.message : 'An error occurred'}
        onRetry={() => refetch()}
      />
    )
  }

  if (!dashboardData) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your finances</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <BalanceCard
            totalBalance={dashboardData.account_balance.total_balance}
            accounts={dashboardData.account_balance.accounts}
          />
          
          {/* Investment and Debt Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <div className="text-sm text-gray-600">Total Investment</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(dashboardData.account_balance.total_investment)}
              </div>
            </Card>
            <Card>
              <div className="text-sm text-gray-600">Total Debt</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(dashboardData.account_balance.total_debt)}
              </div>
            </Card>
          </div>
          
          <RecentTransactions
            transactions={dashboardData.recent_transactions}
          />
          
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <GoalProgress 
            goals={dashboardData.goals} 
            isLoading={isLoading}
            onContribute={(goalId) => {
              // Navigate to goals page with contribution modal
              window.location.href = `/goals?contribute=${goalId}`
            }}
          />
          
          <CategoryChart data={dashboardData.category_chart_data} />
          <SpendingSummary
            totalExpenses={dashboardData.monthly_spending.total_expenses}
            transactionCount={dashboardData.monthly_spending.transaction_count}
            byCategory={dashboardData.monthly_spending.by_category}
          />
        </div>
      </div>
    </div>
  )
}
