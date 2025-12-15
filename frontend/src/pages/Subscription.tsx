import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, Check, Loader2, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useSubscriptions,
  useSubscriptionConfig,
} from '@/hooks/useSubscription'
import { formatDate, cn } from '@/lib/utils'
import type { BillingCycle, SubscriptionTier } from '@/types'
import { subscriptionService } from '@/services/subscriptionService'
import { toast } from 'sonner'
import { PageHeader } from "@/components/PageHeader"

const FALLBACK_TIERS: SubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free Tier',
    description: 'Kickstart smarter spending with core tracking tools.',
    price: 0,
    priceDisplay: '$0.00',
    priceId: 'free',
    currency: 'usd',
    features: [
      'Up to 3 connected accounts',
      'Basic transaction tracking',
      'Monthly spending reports',
      'Mobile app access',
    ],
    badge: 'Start for free',
    billingCycles: [
      {
        id: 'monthly',
        price: 0,
        priceDisplay: '$0.00',
        priceId: 'free',
        currency: 'usd',
      },
    ],
  },
  {
    id: 'pro',
    name: 'Pro Tier',
    description: 'Unlock advanced planning tools for growing households.',
    price: 12.99,
    priceDisplay: '$12.99',
    priceId: 'price_1SU4sS9FH3KQIIeTUG3QLP7T',
    currency: 'usd',
    features: [
      'Up to 10 connected accounts',
      'AI categorization enabled',
      'Advanced analytics & insights',
      'Custom categories & budgets',
      'Goal tracking & forecasting',
      'Unlimited transaction history',
    ],
    badge: 'Most popular',
    billingCycles: [
      {
        id: 'monthly',
        price: 12.99,
        priceDisplay: '$12.99',
        priceId: 'price_1SU4sS9FH3KQIIeTUG3QLP7T',
        currency: 'usd',
      },
      {
        id: 'annual',
        price: 129.99,
        priceDisplay: '$129.99',
        priceId: 'price_1SU4sS9FH3KQIIeTUG3QLP7T_annual',
        currency: 'usd',
      },
    ],
  },
  {
    id: 'premium',
    name: 'Premium Tier',
    description: 'Enterprise-grade insights plus concierge-level guidance.',
    price: 19.99,
    priceDisplay: '$19.99',
    priceId: 'price_1SU4th9FH3KQIIeT32lJfeW2',
    currency: 'usd',
    features: [
      'Everything in Pro',
      'Investment portfolio tracking',
      'Tax optimization suggestions',
      'Dedicated account manager',
      'Custom integrations',
      'Advanced security features',
    ],
    badge: 'All-access',
    highlight: 'Includes AI insights & dedicated advisor',
    billingCycles: [
      {
        id: 'monthly',
        price: 19.99,
        priceDisplay: '$19.99',
        priceId: 'price_1SU4th9FH3KQIIeT32lJfeW2',
        currency: 'usd',
      },
      {
        id: 'annual',
        price: 199.0,
        priceDisplay: '$199.00',
        priceId: 'price_1SU4th9FH3KQIIeT32lJfeW2_annual',
        currency: 'usd',
      },
    ],
  },
]

export function Subscription() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: subscriptions, isLoading } = useSubscriptions()
  const { data: subscriptionConfig, isLoading: isConfigLoading } = useSubscriptionConfig()

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')

  const currentSubscription = subscriptions?.[0]
  const activeTier = currentSubscription ? currentSubscription.plan : 'free'
  const tiers = subscriptionConfig?.tiers ?? FALLBACK_TIERS

  const [isRedirecting, setIsRedirecting] = useState(false)

  const canUpgrade = Boolean(subscriptionConfig?.publishableKey)

  // Handle auto-opening checkout from query parameters (redirect immediately)
  useEffect(() => {
    const shouldCheckout = searchParams.get('checkout') === 'true'
    const tierParam = searchParams.get('tier')

    // Attempt to read billing cycle from params, default to state
    const cycleParam = searchParams.get('cycle')
    if (cycleParam === 'annual' || cycleParam === 'monthly') {
      setBillingCycle(cycleParam)
    }

    if (shouldCheckout && tierParam && tiers.length > 0) {
      const selectedTier = tiers.find((t) => t.id === tierParam)
      if (selectedTier && selectedTier.id !== 'free') {
        // Clear params
        setSearchParams({})
        // Trigger checkout
        handleSelectTier(selectedTier)
      }
    }
  }, [searchParams, tiers, setSearchParams])

  const handleSelectTier = async (tier: SubscriptionTier) => {
    // If downgrading to free, or if user is on free and clicks manage (which shouldn't happen via this handler based on logic, but safety first)
    if (tier.id === 'free') {
      handlePortalRedirect()
      return
    }

    setIsRedirecting(true)
    try {
      const successUrl = window.location.href
      const cancelUrl = window.location.href

      const response = await subscriptionService.createCheckoutSession(
        tier.id,
        billingCycle,
        successUrl,
        cancelUrl
      )

      if (response.status === 'success' && response.data) {
        window.location.href = response.data.url
      } else {
        toast.error('Failed to start checkout. Please try again.')
        setIsRedirecting(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('An error occurred. Please try again.')
      setIsRedirecting(false)
    }
  }

  const handlePortalRedirect = async () => {
    setIsRedirecting(true)
    try {
      const returnUrl = window.location.href
      const response = await subscriptionService.createPortalSession(returnUrl)

      if (response.status === 'success' && response.data) {
        window.location.href = response.data.url
      } else {
        toast.error('Failed to open billing portal. Please try again.')
        setIsRedirecting(false)
      }
    } catch (error) {
      console.error('Portal error:', error)
      toast.error('An error occurred. Please try again.')
      setIsRedirecting(false)
    }
  }

  const formatPlanLabel = (plan: string) => {
    if (plan === 'pro') return 'Pro'
    if (plan === 'premium') return 'Premium'
    if (plan === 'enterprise') return 'Enterprise'
    return plan
  }
  const formatCycleLabel = (cycle?: string | null) =>
    cycle ? `${cycle.charAt(0).toUpperCase()}${cycle.slice(1)} ` : 'Monthly'

  const pendingPlanCopy =
    currentSubscription?.pendingPlan && currentSubscription?.currentPeriodEnd
      ? `Switches to ${formatPlanLabel(currentSubscription.pendingPlan)} (${formatCycleLabel(
        currentSubscription.pendingBillingCycle ?? 'monthly'
      )
      }) on ${formatDate(currentSubscription.currentPeriodEnd)} `
      : null

  const isDowngradeScheduled =
    Boolean(currentSubscription?.cancelAtPeriodEnd) &&
    (currentSubscription?.pendingPlan ? currentSubscription.pendingPlan === 'free' : true) &&
    currentSubscription?.plan !== 'free'

  const downgradeCopy =
    isDowngradeScheduled && currentSubscription?.currentPeriodEnd
      ? `Downgrades to Free on ${formatDate(currentSubscription.currentPeriodEnd)} `
      : isDowngradeScheduled
        ? 'Downgrade to Free scheduled for the end of the current period'
        : null

  const renewalStatusCopy = currentSubscription
    ? currentSubscription?.currentPeriodEnd
      ? pendingPlanCopy ||
      (currentSubscription.cancelAtPeriodEnd
        ? `Ends on ${formatDate(currentSubscription.currentPeriodEnd)} `
        : `Renews on ${formatDate(currentSubscription.currentPeriodEnd)} `)
      : 'Pending schedule'
    : '—'

  if (isLoading || isConfigLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription"
        description="Manage your subscription and billing"
      />

      {!canUpgrade && (
        <div className="rounded-md border border-dashed border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground">
          Stripe publishable key is missing. Set `VITE_STRIPE_PUBLISHABLE_KEY` in `frontend /.env` to
          enable in-app upgrades.
        </div>
      )}

      {currentSubscription ? (
        <Card className="border-border shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Subscription
                </CardTitle>
                <CardDescription>Your subscription details</CardDescription>
              </div>
              <Badge variant={currentSubscription?.status === 'active' ? 'default' : 'secondary'}>
                {currentSubscription?.plan?.toUpperCase() || 'FREE'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Tier</div>
                <div className="text-lg font-semibold capitalize">{currentSubscription?.plan || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <div className="text-lg font-semibold capitalize">{currentSubscription?.status || '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Billing Cycle</div>
                <div className="text-lg font-semibold capitalize">
                  {currentSubscription?.billingCycle || '—'}
                </div>
              </div>
              {currentSubscription?.currentPeriodEnd && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Current Period End</div>
                  <div className="text-lg font-semibold">
                    {formatDate(currentSubscription.currentPeriodEnd)}
                  </div>
                </div>
              )}
              {currentSubscription?.trialEnd && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Trial Ends</div>
                  <div className="text-lg font-semibold">
                    {formatDate(currentSubscription.trialEnd)}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-muted-foreground">Renewal Status</div>
                <div className="text-lg font-semibold">{renewalStatusCopy}</div>
              </div>
            </div>
            {(pendingPlanCopy || downgradeCopy) && (
              <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-sm text-primary">
                {pendingPlanCopy ?? downgradeCopy}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handlePortalRedirect}
                disabled={isRedirecting}
              >
                {isRedirecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                Manage Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No active subscription</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              You are currently on the free tier
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annual">
              Annual
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Save 20%
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isActive = tier.id === activeTier
          const buttonDisabled = (tier.id === 'free' && activeTier === 'free') || !canUpgrade
          const isFreeTier = tier.id === 'free'

          // Get price for selected cycle
          const cycleData = tier.billingCycles?.find(c => c.id === billingCycle) || tier.billingCycles?.[0]

          // Fallback to top-level props if no specific cycle data (backward compatibility)
          const priceDisplay = cycleData ? cycleData.priceDisplay : tier.priceDisplay
          const tierPriceDisplay = isFreeTier ? 'Free' : priceDisplay
          const tierPriceSuffix = isFreeTier ? '' : billingCycle === 'annual' ? '/year' : '/month'

          return (
            <Card
              key={tier.id}
              className={cn(
                'flex h-full flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
                isActive ? 'ring-2 ring-primary shadow-lg' : 'border-border shadow-soft',
                tier.id === 'pro' && 'border-primary shadow-2xl shadow-primary/20 scale-[1.02] z-10 relative overflow-hidden'
              )}
            >
              {tier.id === 'pro' && (
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
              )}
              <CardHeader className={cn("pb-4", tier.id === 'pro' && "bg-primary/5")}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className={cn("text-xl", tier.id === 'pro' && "text-primary")}>{tier.name}</CardTitle>
                    <CardDescription className="mt-1.5">{tier.description}</CardDescription>
                  </div>
                  {tier.badge && (
                    <Badge
                      variant={tier.id === 'pro' ? 'default' : 'secondary'}
                      className={cn("text-xs text-nowrap shadow-sm", tier.id === 'pro' && "bg-primary text-primary-foreground hover:bg-primary/90")}
                    >
                      {tier.badge}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-6 pt-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">{tierPriceDisplay}</span>
                  {tierPriceSuffix && (
                    <span className="text-muted-foreground font-medium">{tierPriceSuffix}</span>
                  )}
                </div>

                {tier.highlight && (
                  <div className="rounded-lg bg-secondary/50 p-3 text-sm text-secondary-foreground border border-secondary">
                    <span className="font-medium">✨ {tier.highlight}</span>
                  </div>
                )}

                <div className="flex-1">
                  <div className="text-sm font-medium mb-4 text-foreground/80">Includes:</div>
                  <ul className="space-y-3 text-sm">
                    {tier.features.map((feature) => (
                      <li key={`${tier.id}-${feature}`} className="flex items-start gap-3">
                        <div className={cn(
                          "mt-0.5 flex h-5 w-5 items-center justify-center rounded-full",
                          tier.id === 'pro' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <Check className="h-3 w-3" />
                        </div>
                        <span className="text-muted-foreground leading-tight">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-4">
                  <Button
                    className={cn(
                      "w-full h-11 text-base font-semibold shadow-md transition-all hover:scale-[1.02]",
                      tier.id === 'pro' && "shadow-primary/25 hover:shadow-primary/40"
                    )}
                    variant={tier.id === 'free' ? 'outline' : 'default'}
                    disabled={buttonDisabled || isRedirecting}
                    onClick={() => handleSelectTier(tier)}
                  >
                    {isRedirecting && isActive ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : isActive ? (
                      'Current Plan'
                    ) : tier.id === 'free' ? (
                      'Downgrade'
                    ) : (
                      'Subscribe'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
