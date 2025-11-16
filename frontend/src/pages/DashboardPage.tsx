/**
 * Dashboard page
 */
import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDashboard } from '@/hooks/useDashboard'
import BalanceCard from '@/components/dashboard/BalanceCard'
import RecentTransactions from '@/components/dashboard/RecentTransactions'
import SpendingSummary from '@/components/dashboard/SpendingSummary'
import GoalProgress from '@/components/dashboard/GoalProgress'
import CategoryChart from '@/components/dashboard/CategoryChart'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import Card from '@/components/common/Card'
import Modal from '@/components/common/Modal'
import SubscriptionForm from '@/components/subscriptions/SubscriptionForm'
import { formatCurrency } from '@/utils/formatters'
import type { SubscriptionPlan } from '@/types/subscription.types'

export default function DashboardPage() {
  const { dashboardData, isLoading, error, refetch } = useDashboard()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCheckout, setShowCheckout] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const checkoutProcessedRef = useRef(false)

  // Check for checkout parameter and open checkout modal
  useEffect(() => {
    // Skip if already processed or modal already showing
    if (checkoutProcessedRef.current || showCheckout) {
      return
    }

    const checkout = searchParams.get('checkout')
    const plan = searchParams.get('plan')
    
    // Only process if we have valid checkout params
    if (checkout === 'true' && (plan === 'premium' || plan === 'pro')) {
      console.log('[Dashboard] Opening checkout modal for plan:', plan)
      
      // Mark as processed to prevent duplicate processing
      checkoutProcessedRef.current = true
      
      // Set the plan and show modal
      setSelectedPlan(plan as SubscriptionPlan)
      setShowCheckout(true)
      
      // Remove query params from URL after a delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        console.log('[Dashboard] Clearing URL params')
        setSearchParams({}, { replace: true })
      }, 500)
      
      return () => clearTimeout(timer)
    } else if (checkout || plan) {
      console.log('[Dashboard] Invalid or missing checkout params:', { checkout, plan })
    }
  }, [searchParams, setSearchParams, showCheckout])

  const handleCloseCheckout = () => {
    setShowCheckout(false)
    setSelectedPlan(null)
    // Reset the ref so it can be opened again if needed
    checkoutProcessedRef.current = false
  }

  const handleSubscriptionSuccess = () => {
    // Close checkout modal after successful subscription
    setShowCheckout(false)
    setSelectedPlan(null)
    checkoutProcessedRef.current = false
  }

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
    <>
      {/* Checkout Modal */}
      {showCheckout && selectedPlan && (
        <Modal
          isOpen={showCheckout}
          onClose={handleCloseCheckout}
          title={`Subscribe to ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`}
          size="lg"
        >
          <SubscriptionForm
            plan={selectedPlan}
            onSuccess={handleSubscriptionSuccess}
            onCancel={handleCloseCheckout}
          />
        </Modal>
      )}

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
            <Card className="card-glass">
              <div className="text-sm text-gray-600">Total Investment</div>
              <div className="text-2xl font-semibold text-gray-900 mt-1">
                {formatCurrency(dashboardData.account_balance.total_investment)}
              </div>
            </Card>
            <Card className="card-glass">
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
    </>
  )
}
