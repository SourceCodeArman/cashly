import { useMemo, useState } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/store/authStore'
import { useCreateSubscription } from '@/hooks/useSubscription'
import type { BillingCycle, SubscriptionPlan, SubscriptionTier } from '@/types'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

type SubscriptionCheckoutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tier: SubscriptionTier | null
  billingCycle: BillingCycle
  onBillingCycleChange: (cycle: BillingCycle) => void
  publishableKey?: string
  hasActiveSubscription: boolean
  onCompleted?: () => void
  mode?: 'new' | 'manage'
}

const CARD_ELEMENT_OPTIONS: StripeElementsOptions['appearance'] = {
  theme: 'stripe',
  labels: 'floating',
  variables: {
    colorPrimary: '#0f172a',
  },
}

const isPaidPlan = (plan: SubscriptionPlan): plan is Exclude<SubscriptionPlan, 'free'> =>
  plan !== 'free'

export function SubscriptionCheckoutDialog({
  open,
  onOpenChange,
  tier,
  billingCycle,
  onBillingCycleChange,
  publishableKey,
  hasActiveSubscription,
  onCompleted,
  mode = 'new',
}: SubscriptionCheckoutDialogProps) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg overflow-hidden border-0 p-0 bg-background/20 backdrop-blur-xl shadow-2xl" overlayClassName="bg-transparent backdrop-blur-sm">
        <div className="absolute inset-0 pointer-events-none rounded-lg border border-white/10 ring-1 ring-black/5" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative p-6"
        >
          <DialogHeader className="mb-6">
            <DialogTitle className="flex items-center gap-2 text-2xl">
              {mode === 'manage' ? (
                'Update subscription'
              ) : (
                <>
                  Complete your upgrade <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-base">
              {mode === 'manage'
                ? 'Update billing cycle or payment details for your current plan.'
                : `Enter your payment details to ${hasActiveSubscription ? 'change' : 'start'} your plan.`}
            </DialogDescription>
          </DialogHeader>

          {!tier ? (
            <p className="text-sm text-muted-foreground">Select a tier to continue.</p>
          ) : !publishableKey ? (
            <p className="rounded-md border border-dashed border-warning/50 bg-warning/10 p-3 text-sm text-warning-foreground">
              Stripe publishable key is not configured. Add `VITE_STRIPE_PUBLISHABLE_KEY` in your
              frontend `.env` to enable checkout.
            </p>
          ) : !stripePromise ? (
            <p className="text-sm text-muted-foreground">Preparing secure checkout…</p>
          ) : (
            <Elements stripe={stripePromise} options={{ appearance: CARD_ELEMENT_OPTIONS }}>
              <CheckoutForm
                tier={tier}
                billingCycle={billingCycle}
                onBillingCycleChange={onBillingCycleChange}
                hasActiveSubscription={hasActiveSubscription}
                onCompleted={onCompleted}
                mode={mode}
              />
            </Elements>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

type CheckoutFormProps = {
  tier: SubscriptionTier
  billingCycle: BillingCycle
  onBillingCycleChange: (cycle: BillingCycle) => void
  hasActiveSubscription: boolean
  onCompleted?: () => void
  mode: 'new' | 'manage'
}

function CheckoutForm({
  tier,
  billingCycle,
  onBillingCycleChange,
  hasActiveSubscription,
  onCompleted,
  mode,
}: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuthStore()
  const createSubscription = useCreateSubscription()
  const [cardError, setCardError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const selectedCycle =
    tier.billingCycles.find((cycle) => cycle.id === billingCycle) ?? tier.billingCycles[0]

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCardError(null)

    if (!stripe || !elements) {
      setCardError('Stripe is not ready yet. Please wait a moment and try again.')
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setCardError('Unable to load payment form. Refresh and try again.')
      return
    }

    if (!isPaidPlan(tier.id)) {
      setCardError('The free plan does not require checkout.')
      return
    }

    setIsConfirming(true)
    const billingDetails = {
      name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || undefined,
      email: user?.email,
    }

    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: billingDetails,
      })

      if (error || !paymentMethod) {
        throw new Error(error?.message || 'Unable to create payment method. Please try again.')
      }

      const subscription = await createSubscription.mutateAsync({
        plan: tier.id,
        billingCycle,
        paymentMethodId: paymentMethod.id,
        trialEnabled: mode === 'new' && !hasActiveSubscription,
      })

      if (subscription.clientSecret) {
        const confirmation = await stripe.confirmCardPayment(subscription.clientSecret)
        if (confirmation.error) {
          throw new Error(confirmation.error.message || 'Card confirmation failed')
        }
      }

      toast.success(mode === 'manage' ? 'Plan change scheduled for next period' : 'Subscription created successfully')
      cardElement.clear()
      onCompleted?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to process payment'
      setCardError(message)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-xl bg-secondary/30 p-4 border border-border/50">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-lg font-bold text-primary">{tier.name} Plan</Label>
          <div className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
            {mode === 'manage' ? 'Updating' : 'Selected'}
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{tier.description}</p>
        {mode === 'manage' && (
          <div className="mt-3 rounded-md bg-background/50 p-2 text-xs text-muted-foreground border border-border/50">
            Use this form to adjust your billing cycle or refresh payment details. Your plan remains active
            until the current period ends.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Billing Cycle</Label>
        <div className="grid grid-cols-2 gap-3">
          {tier.billingCycles.map((cycle) => {
            const isSelected = billingCycle === cycle.id
            return (
              <div
                key={cycle.id}
                className={cn(
                  "relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50 hover:bg-secondary/50",
                  isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background"
                )}
                onClick={() => onBillingCycleChange(cycle.id)}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 rounded-full bg-primary p-1 text-primary-foreground shadow-sm">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold capitalize">{cycle.id}</span>
                  <span className="text-lg font-bold text-primary">{cycle.priceDisplay}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Payment Method</Label>
        <div className="rounded-xl border border-border bg-background p-4 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1f2937',
                  fontFamily: 'inherit',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                },
                invalid: {
                  color: '#ef4444',
                },
              },
            }}
          />
        </div>
      </div>

      <div className="rounded-xl bg-primary/5 p-4 border border-primary/10 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total due today</span>
          <span className="text-2xl font-bold text-primary">{selectedCycle?.priceDisplay ?? '-'}</span>
        </div>
        {!hasActiveSubscription && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>7-day free trial included</span>
          </div>
        )}
      </div>

      {cardError && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-md"
        >
          {cardError}
        </motion.p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02]"
        disabled={isConfirming || createSubscription.isPending}
      >
        {isConfirming ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Processing...</span>
          </div>
        ) : mode === 'manage' ? (
          'Save Changes'
        ) : (
          `Confirm ${tier.name} Plan`
        )}
      </Button>
    </form>
  )
}


