import { useMemo, useState } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import type { Subscription, BillingCycle, SubscriptionTier } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { usePaymentMethod, useUpdatePaymentMethod } from '@/hooks/useSubscription'
import { toast } from 'sonner'
import { SubscriptionSwitchCycleDialog } from '@/components/subscription/SubscriptionSwitchCycleDialog'
import { motion } from 'framer-motion'

type SubscriptionManageDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: Subscription | null
  publishableKey?: string
  tier?: SubscriptionTier | null
  onCancel: () => void
  cancelDisabled?: boolean
}

export function SubscriptionManageDialog({
  open,
  onOpenChange,
  subscription,
  publishableKey,
  tier,
  onCancel,
  cancelDisabled,
}: SubscriptionManageDialogProps) {
  const { data: paymentMethod, isLoading, refetch } = usePaymentMethod(open)
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  )
  const { isPending, mutateAsync } = useUpdatePaymentMethod()
  const formatPlanLabel = (plan: string) => (plan === 'pro' ? 'Pro' : plan === 'premium' ? 'Premium' : plan)
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false)
  const [switchTargetCycle, setSwitchTargetCycle] = useState<BillingCycle>('monthly')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl overflow-hidden border-0 p-0 bg-background/20 backdrop-blur-xl shadow-2xl" overlayClassName="bg-transparent backdrop-blur-sm">
        <div className="absolute inset-0 pointer-events-none rounded-lg border border-white/10 ring-1 ring-black/5" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative p-6"
        >
          <DialogHeader>
            <DialogTitle>Manage subscription</DialogTitle>
            <DialogDescription>
              Review your current plan, payment method, and cancellation options.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-6">
            {subscription ? (
              <div className="rounded-lg border border-border/60 bg-background/40 backdrop-blur-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current plan</p>
                    <p className="text-lg font-semibold">{formatPlanLabel(subscription.plan)}</p>
                  </div>
                  <Badge variant="outline" className="bg-background/50">{subscription.billingCycle}</Badge>
                </div>
                {subscription.currentPeriodEnd && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {subscription.cancelAtPeriodEnd
                      ? `Ends on ${formatDate(subscription.currentPeriodEnd)}`
                      : `Renews on ${formatDate(subscription.currentPeriodEnd)}`}
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
                No active subscription found.
              </p>
            )}

            {subscription?.pendingPlan && (
              <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-sm text-primary">
                Plan change scheduled to {formatPlanLabel(subscription.pendingPlan)} (
                {subscription.pendingBillingCycle ?? subscription.billingCycle}) at the end of the current period.
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Payment method</p>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading card details…</p>
              ) : paymentMethod ? (
                <p className="text-sm text-muted-foreground">
                  {paymentMethod.brand
                    ? `${paymentMethod.brand.charAt(0).toUpperCase()}${paymentMethod.brand.slice(1)}`
                    : 'Card'}{' '}
                  ending in {paymentMethod.last4 || '****'} — expires{' '}
                  {paymentMethod.expMonth ? paymentMethod.expMonth.toString().padStart(2, '0') : 'MM'}/
                  {paymentMethod.expYear ?? 'YYYY'}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No payment method on file. Add one below to keep your plan active.
                </p>
              )}
            </div>

            {!publishableKey ? (
              <p className="rounded-md border border-dashed border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
                Stripe publishable key missing. Add `VITE_STRIPE_PUBLISHABLE_KEY` to enable payment updates.
              </p>
            ) : !stripePromise ? (
              <p className="text-sm text-muted-foreground">Preparing secure card update form…</p>
            ) : (
              <Elements stripe={stripePromise}>
                <UpdateCardForm
                  isSubmitting={isPending}
                  onSubmit={async (paymentMethodId) => {
                    await mutateAsync(paymentMethodId)
                    await refetch()
                  }}
                />
              </Elements>
            )}
          </div>

          <DialogFooter className="mt-6 flex flex-col gap-3 sm:flex-col">
            <Button
              variant="outline"
              className="w-full bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80"
              onClick={() => {
                if (!subscription) return
                const targetCycle = subscription.billingCycle === 'monthly' ? 'annual' : 'monthly'
                setSwitchTargetCycle(targetCycle)
                setSwitchDialogOpen(true)
              }}
              disabled={!subscription}
            >
              {subscription?.pendingPlan
                ? 'Update scheduled change'
                : subscription?.billingCycle === 'monthly'
                  ? 'Switch to annual'
                  : 'Switch to monthly'}
            </Button>
            <Button
              variant="destructive"
              className="w-full !ml-0 shadow-lg shadow-destructive/20"
              onClick={onCancel}
              disabled={cancelDisabled || !subscription}
            >
              Cancel subscription
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
      {subscription && (
        <SubscriptionSwitchCycleDialog
          open={switchDialogOpen}
          onOpenChange={setSwitchDialogOpen}
          subscription={subscription}
          targetCycle={switchTargetCycle}
          targetPriceDisplay={getPriceDisplay(tier, switchTargetCycle)}
          publishableKey={publishableKey}
          paymentMethod={paymentMethod}
          paymentMethodLoading={isLoading}
          renewalDate={subscription.currentPeriodEnd}
          onPaymentMethodRefetch={async () => {
            await refetch()
          }}
        />
      )}
    </Dialog>
  )
}

type UpdateCardFormProps = {
  onSubmit: (paymentMethodId: string) => Promise<void>
  isSubmitting: boolean
}

function UpdateCardForm({ onSubmit, isSubmitting }: UpdateCardFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuthStore()
  const [cardError, setCardError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stripe || !elements) {
      setCardError('Stripe is not ready yet. Please try again.')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setCardError('Unable to load card input. Refresh and try again.')
      return
    }

    setCardError(null)
    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
          email: user?.email,
        },
      })

      if (error || !paymentMethod) {
        throw new Error(error?.message || 'Failed to create payment method')
      }

      await onSubmit(paymentMethod.id)
      toast.success('Card updated')
      cardElement.clear()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update card'
      setCardError(message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border/60 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Update card</Label>
        <div className="rounded-md border p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1f2937',
                  '::placeholder': { color: '#9ca3af' },
                },
                invalid: { color: '#ef4444' },
              },
            }}
          />
        </div>
      </div>
      {cardError && <p className="text-sm text-destructive">{cardError}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting || !stripe}>
        {isSubmitting ? 'Updating…' : 'Save payment method'}
      </Button>
    </form>
  )
}

const getPriceDisplay = (tier: SubscriptionTier | null | undefined, cycle: BillingCycle) => {
  if (!tier?.billingCycles) return undefined
  const match = tier.billingCycles.find((option) => option.id === cycle)
  return match?.priceDisplay
}


