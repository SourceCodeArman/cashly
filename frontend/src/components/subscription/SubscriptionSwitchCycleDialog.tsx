import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardElement, Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import type { StripeCardElement } from '@stripe/stripe-js'
import type { Subscription, BillingCycle } from '@/types'
import type { PaymentMethodSummary } from '@/services/subscriptionService'
import { useAuthStore } from '@/store/authStore'
import { useCreateSubscription, useUpdatePaymentMethod } from '@/hooks/useSubscription'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

type SubscriptionSwitchCycleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription: Subscription
  targetCycle: BillingCycle
  targetPriceDisplay?: string
  publishableKey?: string
  paymentMethod?: PaymentMethodSummary | null
  paymentMethodLoading: boolean
  renewalDate?: string | null
  onPaymentMethodRefetch: () => Promise<void> | void
}

export function SubscriptionSwitchCycleDialog({
  open,
  onOpenChange,
  subscription,
  targetCycle,
  targetPriceDisplay,
  publishableKey,
  paymentMethod,
  paymentMethodLoading,
  renewalDate,
  onPaymentMethodRefetch,
}: SubscriptionSwitchCycleDialogProps) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  )

  const [cardChoice, setCardChoice] = useState<'existing' | 'new'>(paymentMethod ? 'existing' : 'new')
  const [cardError, setCardError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cardElement, setCardElement] = useState<StripeCardElement | null>(null)
  const createSubscription = useCreateSubscription()
  const updatePaymentMethod = useUpdatePaymentMethod()
  const { user } = useAuthStore()

  useEffect(() => {
    setCardChoice(paymentMethod ? 'existing' : 'new')
  }, [paymentMethod])

  const planLabel = formatPlanLabel(subscription.plan)
  const targetLabel = targetCycle === 'annual' ? 'annual' : 'monthly'
  const renewalLabel = formatRenewalDate(renewalDate)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setCardError(null)

    let paymentMethodId = paymentMethod?.id
    try {
      setSubmitting(true)
      if (cardChoice === 'new') {
        if (!stripePromise) {
          setCardError('Payment form unavailable. Add Stripe publishable key.')
          setSubmitting(false)
          return
        }
        const stripe = await stripePromise
        if (!stripe || !cardElement) {
          setCardError('Payment form not ready. Please try again.')
          setSubmitting(false)
          return
        }

        const { error, paymentMethod: createdMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: {
            name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
            email: user?.email,
          },
        })

        if (error || !createdMethod) {
          throw new Error(error?.message || 'Failed to create payment method')
        }

        await updatePaymentMethod.mutateAsync(createdMethod.id)
        await onPaymentMethodRefetch()
        paymentMethodId = createdMethod.id
        cardElement.clear()
        toast.success('Payment method saved')
      }

      if (!paymentMethodId) {
        throw new Error('Add a payment method to continue')
      }

      const plan = subscription.plan
      if (plan === 'free') {
        throw new Error('Billing cycle changes are only available for paid plans')
      }

      await createSubscription.mutateAsync({
        plan,
        billingCycle: targetCycle,
        paymentMethodId,
        trialEnabled: false,
      })

      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to schedule billing change'
      setCardError(message)
    } finally {
      setSubmitting(false)
    }
  }

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
            <DialogTitle>Change Subscription Billing Cycle</DialogTitle>
            <DialogDescription>
              Update billing cycle to {targetLabel} for your current plan.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 rounded-lg border border-border/60 bg-background/40 backdrop-blur-sm p-4">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-lg font-semibold">{planLabel}</p>
              <Badge variant="outline" className="bg-background/50">{subscription.billingCycle}</Badge>
            </div>
          </div>

          <div className="mt-4 space-y-2 rounded-lg border border-border/60 bg-background/40 backdrop-blur-sm p-4">
            <p className="text-sm font-medium">New Billing Cycle Information</p>
            <p className="text-sm text-muted-foreground">
              {targetLabel.charAt(0).toUpperCase() + targetLabel.slice(1)} — Starts on {renewalLabel} —{' '}
              {targetPriceDisplay ?? 'See pricing'}
            </p>
          </div>

          <div className="mt-4 space-y-3 rounded-lg border border-border/60 bg-background/40 backdrop-blur-sm p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Card Details</p>
              {paymentMethodLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
            </div>
            {paymentMethod && (
              <label className="block cursor-pointer">
                <input
                  type="radio"
                  className="peer sr-only"
                  checked={cardChoice === 'existing'}
                  onChange={() => setCardChoice('existing')}
                />
                <div
                  className={cn(
                    'relative flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-all duration-300 ease-out',
                    'border-border bg-background/50 hover:border-primary/60 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40',
                    cardChoice === 'existing' && 'border-primary shadow-lg ring-2 ring-primary/30 bg-primary/5'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">Use saved card</span>
                    <span className="text-xs text-muted-foreground">{formatCardSummary(paymentMethod)}</span>
                  </div>
                  <span
                    className={cn(
                      'relative inline-flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300',
                      cardChoice === 'existing'
                        ? 'border-primary bg-primary/90 scale-110 shadow-primary/30 shadow-lg'
                        : 'border-muted scale-95 bg-muted/20'
                    )}
                  >
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full bg-background transition-opacity duration-300',
                        cardChoice === 'existing' ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </span>
                </div>
              </label>
            )}
            <label className="block cursor-pointer">
              <input
                type="radio"
                className="peer sr-only"
                checked={cardChoice === 'new'}
                onChange={() => setCardChoice('new')}
              />
              <div
                className={cn(
                  'relative flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-all duration-300 ease-out',
                  'border-border bg-background/50 hover:border-primary/60 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40',
                  cardChoice === 'new' && 'border-primary shadow-lg ring-2 ring-primary/30 bg-primary/5'
                )}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Use a different card</span>
                  <span className="text-xs text-muted-foreground">Add a new payment method securely with Stripe</span>
                </div>
                <span
                  className={cn(
                    'relative inline-flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300',
                    cardChoice === 'new'
                      ? 'border-primary bg-primary/90 scale-110 shadow-primary/30 shadow-lg'
                      : 'border-muted scale-95 bg-muted/20'
                  )}
                >
                  <span
                    className={cn(
                      'h-2.5 w-2.5 rounded-full bg-background transition-opacity duration-300',
                      cardChoice === 'new' ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </span>
              </div>
            </label>
            {publishableKey ? (
              <Elements stripe={stripePromise}>
                <div
                  className={cn(
                    'overflow-hidden rounded-md border transition-all duration-300 ease-out',
                    cardChoice === 'new'
                      ? 'pointer-events-auto opacity-100 translate-y-0 border-border bg-background/50 p-3'
                      : 'pointer-events-none opacity-0 -translate-y-2 border-transparent p-0'
                  )}
                  aria-hidden={cardChoice !== 'new'}
                >
                  <CardElement
                    onReady={(element) => setCardElement(element)}
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
              </Elements>
            ) : cardChoice === 'new' ? (
              <p className="text-sm text-warning-foreground">
                Stripe publishable key missing. Add `VITE_STRIPE_PUBLISHABLE_KEY` to use a new card.
              </p>
            ) : null}
            {cardError && <p className="text-sm text-destructive">{cardError}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="flex items-center justify-between rounded-lg border border-dashed border-border/60 bg-background/40 backdrop-blur-sm p-4 text-sm">
              <span>Total due {renewalLabel}</span>
              <span className="text-lg font-semibold">{targetPriceDisplay ?? '—'}</span>
            </div>

            <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting} className="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || paymentMethodLoading} className="shadow-lg shadow-primary/20">
                {submitting ? 'Scheduling…' : `Confirm ${targetLabel} billing`}
              </Button>
            </DialogFooter>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

const formatPlanLabel = (plan: string) => (plan === 'pro' ? 'Pro' : plan === 'premium' ? 'Premium' : plan)

const formatCardSummary = (paymentMethod: PaymentMethodSummary) => {
  const brand = paymentMethod.brand
    ? `${paymentMethod.brand.charAt(0).toUpperCase()}${paymentMethod.brand.slice(1)}`
    : 'Card'
  return `${brand} ending in ${paymentMethod.last4 ?? '****'}`
}

const formatRenewalDate = (iso?: string | null) => {
  if (!iso) {
    return 'next renewal'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return 'next renewal'
  }
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}

