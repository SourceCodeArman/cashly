/**
 * Subscription info component
 */
import { useState } from 'react'
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal'
import { useCurrentSubscription, useCancelSubscription } from '@/hooks/useSubscription'
import { formatCurrency } from '@/utils/formatters'
import { formatDate } from '@/utils/formatters'
import { cn } from '@/utils/helpers'
import LoadingSpinner from '@/components/common/LoadingSpinner'

export interface SubscriptionInfoProps {
  subscription?: any // Will be provided by hook
  isLoading?: boolean
  onCancel?: (subscriptionId: string) => void
  onUpgrade?: () => void
  isCanceling?: boolean
}

export default function SubscriptionInfo({
  onCancel,
  onUpgrade,
}: SubscriptionInfoProps) {
  const { currentSubscription, isLoadingSubscriptions } = useCurrentSubscription()
  const cancelSubscriptionMutation = useCancelSubscription()
  const [showCancelModal, setShowCancelModal] = useState(false)

  const handleCancel = async () => {
    if (currentSubscription) {
      try {
        await cancelSubscriptionMutation.mutateAsync(currentSubscription.subscription_id)
        if (onCancel) {
          onCancel(currentSubscription.subscription_id)
        }
        setShowCancelModal(false)
      } catch (error) {
        console.error('Failed to cancel subscription:', error)
      }
    }
  }

  if (isLoadingSubscriptions) {
    return (
      <Card>
        <LoadingSpinner />
      </Card>
    )
  }

  if (!currentSubscription) {
    return (
      <Card className="card-glass">
        <h2 className="text-lg font-semibold mb-4">Subscription</h2>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            You're currently on the free plan.
          </p>
          {onUpgrade && (
            <Button variant="primary" onClick={onUpgrade}>
              Upgrade to Premium
            </Button>
          )}
        </div>
      </Card>
    )
  }

  const statusColors = {
    active: 'bg-success-500',
    trialing: 'bg-violet-500',
    past_due: 'bg-warning-500',
    canceled: 'bg-gray-500',
    incomplete: 'bg-gray-400',
    incomplete_expired: 'bg-gray-400',
    unpaid: 'bg-danger-500',
  }

  const statusText = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    incomplete: 'Incomplete',
    incomplete_expired: 'Expired',
    unpaid: 'Unpaid',
  }

  const isActive = currentSubscription.status === 'active' || currentSubscription.status === 'trialing'
  const willCancel = currentSubscription.cancel_at_period_end

  return (
    <>
      <Card className="h-full flex flex-col card-glass p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold">Subscription</h2>
          <span
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium text-white',
              statusColors[currentSubscription.status] || 'bg-gray-500'
            )}
          >
            {statusText[currentSubscription.status] || currentSubscription.status}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Plan</p>
            <p className="text-lg font-semibold capitalize">
              {currentSubscription.plan} ({currentSubscription.billing_cycle})
            </p>
          </div>

          {isActive && (
            <>
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {willCancel ? 'Cancels on' : 'Renews on'}
                </p>
                <p className="text-base font-medium">
                  {formatDate(currentSubscription.current_period_end)}
                </p>
              </div>

              {currentSubscription.trial_end && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Trial ends</p>
                  <p className="text-base font-medium">
                    {formatDate(currentSubscription.trial_end)}
                  </p>
                </div>
              )}
            </>
          )}

          {willCancel && (
            <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
              <p className="text-sm text-warning-800">
                Your subscription will cancel on{' '}
                {formatDate(currentSubscription.current_period_end)}. You'll continue to have access until then.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {isActive && !willCancel && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                isLoading={cancelSubscriptionMutation.isPending}
              >
                Cancel Subscription
              </Button>
            )}
            {onUpgrade && (
              <Button variant="primary" size="sm" onClick={onUpgrade}>
                {currentSubscription.plan === 'premium' ? 'Upgrade to Pro' : 'Manage Subscription'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ConfirmDeleteModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You'll continue to have access until the end of your billing period."
        confirmText="Cancel Subscription"
        cancelText="Keep Subscription"
        confirmVariant="danger"
        isDeleting={cancelSubscriptionMutation.isPending}
      />
    </>
  )
}

