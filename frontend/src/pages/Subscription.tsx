import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useSubscriptions,
  useCancelSubscription,
  useSubscriptionConfig,
  useKeepSubscription,
  useUpdateAccountSelection,
} from '@/hooks/useSubscription'
import { useAccounts } from '@/hooks/useAccounts'
import { formatDate, cn } from '@/lib/utils'
import type { BillingCycle, SubscriptionTier } from '@/types'
import { SubscriptionCheckoutDialog } from '@/components/subscription/SubscriptionCheckoutDialog'
import { SubscriptionCancelDialog } from '@/components/subscription/SubscriptionCancelDialog'
import { SubscriptionManageDialog } from '@/components/subscription/SubscriptionManageDialog'
import { AccountSelectionDialog } from '@/components/subscription/AccountSelectionDialog'
import { subscriptionService } from '@/services/subscriptionService'

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
      'Export to CSV/PDF',
      'Priority support',
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
        price: 99.0,
        priceDisplay: '$99.00',
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
  // Enterprise tier hidden for now
]

export function Subscription() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: subscriptions, isLoading } = useSubscriptions()
  const { data: subscriptionConfig, isLoading: isConfigLoading } = useSubscriptionConfig()
  const cancelSubscription = useCancelSubscription()
  const keepSubscriptionMutation = useKeepSubscription()
  const updateAccountSelection = useUpdateAccountSelection()
  const { data: accounts } = useAccounts()

  const currentSubscription = subscriptions?.[0]
  const activeTier = currentSubscription ? currentSubscription.plan : 'free'
  const tiers = subscriptionConfig?.tiers ?? FALLBACK_TIERS
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutTier, setCheckoutTier] = useState<SubscriptionTier | null>(null)
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [dialogMode, setDialogMode] = useState<'new' | 'manage'>('new')
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
  const [isAccountSelectionOpen, setIsAccountSelectionOpen] = useState(false)
  const [accountSelectionData, setAccountSelectionData] = useState<{
    accounts: Array<{ account_id: string; institution_name: string; custom_name?: string | null; account_type: string; balance: string; account_number_masked?: string | null }>
    excessCount: number
    freeLimit: number
    initialSelection?: string[]
    hasSelection?: boolean
  } | null>(null)

  const canUpgrade = Boolean(subscriptionConfig?.publishableKey)
  const hasActiveSubscription = Boolean(
    currentSubscription && ['active', 'trialing'].includes(currentSubscription.status)
  )
  const currentTier = useMemo(
    () => tiers.find((tier) => tier.id === currentSubscription?.plan) ?? null,
    [tiers, currentSubscription?.plan]
  )

  // Handle auto-opening checkout modal from query parameters
  useEffect(() => {
    const shouldCheckout = searchParams.get('checkout') === 'true'
    const tierParam = searchParams.get('tier')
    const cycleParam = searchParams.get('cycle') as BillingCycle | null

    if (shouldCheckout && tierParam && tiers.length > 0) {
      const selectedTier = tiers.find((t) => t.id === tierParam)
      if (selectedTier && selectedTier.id !== 'free') {
        setCheckoutTier(selectedTier)
        setBillingCycle(cycleParam || 'monthly')
        setDialogMode('new')
        setIsCheckoutOpen(true)

        // Clear query parameters after setting state
        setSearchParams({})
      }
    }
  }, [searchParams, tiers, setSearchParams])

  const handleCancel = async () => {
    if (!currentSubscription) return

    try {
      const result = await cancelSubscription.mutateAsync({ id: currentSubscription.subscriptionId })

      // Check if account selection is required
      if (
        result &&
        typeof result === 'object' &&
        'accountSelectionRequired' in result &&
        result.accountSelectionRequired === true &&
        'accounts' in result &&
        Array.isArray(result.accounts)
      ) {
        setAccountSelectionData({
          accounts: result.accounts || [],
          excessCount: result.excessCount || 0,
          freeLimit: result.freeLimit || 3,
        })
        setIsCancelDialogOpen(false)
        setIsAccountSelectionOpen(true)
      } else {
        setIsCancelDialogOpen(false)
      }
    } catch (error) {
      // Error is already handled by the mutation's onError
      console.error('Failed to cancel subscription:', error)
      setIsCancelDialogOpen(false)
    }
  }

  const handleAccountSelectionConfirm = async (accountIds: string[]) => {
    if (!currentSubscription) return

    try {
      await cancelSubscription.mutateAsync({
        id: currentSubscription.subscriptionId,
        accountIds,
      })
      setIsAccountSelectionOpen(false)
      setAccountSelectionData(null)
    } catch (error) {
      // Error is already handled by the mutation's onError
      console.error('Failed to cancel subscription with account selection:', error)
    }
  }

  const handleSelectTier = (tier: SubscriptionTier) => {
    if (tier.id === 'free' || !canUpgrade) {
      return
    }

    const isCurrentPlan = currentSubscription?.plan === tier.id
    const fallbackCycle = tier.billingCycles[0]?.id ?? 'monthly'
    setCheckoutTier(tier)
    setDialogMode(isCurrentPlan ? 'manage' : 'new')
    setBillingCycle(isCurrentPlan ? currentSubscription?.billingCycle ?? fallbackCycle : fallbackCycle)
    setIsCheckoutOpen(true)
  }

  const handleManageSubscription = async () => {
    if (!currentSubscription) {
      return
    }

    // Check if user has excess accounts and downgrade is scheduled
    const isDowngradeScheduled =
      Boolean(currentSubscription?.cancelAtPeriodEnd) &&
      (currentSubscription?.pendingPlan ? currentSubscription.pendingPlan === 'free' : true) &&
      currentSubscription?.plan !== 'free'

    if (isDowngradeScheduled && accounts) {
      const activeAccounts = accounts.filter((acc) => acc.isActive !== false)
      const freeLimit = 3

      if (activeAccounts.length > freeLimit) {
        // Fetch current account selection from backend
        try {
          const selectionResponse = await subscriptionService.getAccountSelection(
            currentSubscription.subscriptionId
          )

          if (selectionResponse.status === 'success' && selectionResponse.data) {
            const selectionData = selectionResponse.data

            setAccountSelectionData({
              accounts: selectionData.accounts,
              excessCount: selectionData.excess_account_count,
              freeLimit: selectionData.free_tier_limit,
              initialSelection: selectionData.accounts_to_keep || [],
              hasSelection: selectionData.has_selection,
            })
            setIsAccountSelectionOpen(true)
            return
          }
        } catch (error) {
          console.error('Failed to fetch account selection:', error)
          // Fallback to using accounts from useAccounts hook
        }

        // Fallback: use accounts from hook if API call fails
        const excessCount = activeAccounts.length - freeLimit

        // Transform accounts to match AccountSelectionDialog format
        const accountData = activeAccounts.map((acc) => ({
          account_id: acc.id,
          institution_name: acc.institutionName || 'Unknown',
          custom_name: acc.name || null,
          account_type: acc.accountType || '',
          balance: acc.balance || '0',
          account_number_masked: acc.maskedAccountNumber || null,
        }))

        setAccountSelectionData({
          accounts: accountData,
          excessCount,
          freeLimit,
          initialSelection: [],
          hasSelection: false,
        })
        setIsAccountSelectionOpen(true)
        return
      }
    }

    // Default: open manage dialog
    setIsManageDialogOpen(true)
  }

  const handleEditAccountSelectionConfirm = async (accountIds: string[]) => {
    if (!currentSubscription) return

    try {
      await updateAccountSelection.mutateAsync({
        subscriptionId: currentSubscription.subscriptionId,
        accountIds,
      })
      setIsAccountSelectionOpen(false)
      setAccountSelectionData(null)
    } catch (error) {
      // Error is already handled by the mutation's onError
      console.error('Failed to update account selection:', error)
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
  const canCancelSubscription =
    currentSubscription && ['active', 'trialing'].includes(currentSubscription.status)

  const handleKeepCurrentPlan = () => {
    if (!currentSubscription || keepSubscriptionMutation.isPending) {
      return
    }
    keepSubscriptionMutation.mutate(currentSubscription.subscriptionId)
  }

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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

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
                variant={isDowngradeScheduled ? 'default' : 'outline'}
                onClick={isDowngradeScheduled ? handleKeepCurrentPlan : handleManageSubscription}
                disabled={
                  !canUpgrade ||
                  !currentTier ||
                  (isDowngradeScheduled && keepSubscriptionMutation.isPending)
                }
              >
                {isDowngradeScheduled
                  ? keepSubscriptionMutation.isPending
                    ? 'Keeping current plan…'
                    : 'Keep current plan'
                  : 'Manage Plan'}
              </Button>
              {isDowngradeScheduled ? (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={!canUpgrade || !currentTier}
                >
                  Edit downgrade
                </Button>
              ) : (
                canCancelSubscription && (
                  <Button
                    variant="destructive"
                    onClick={() => setIsCancelDialogOpen(true)}
                    disabled={cancelSubscription.isPending}
                  >
                    Cancel Subscription
                  </Button>
                )
              )}
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

      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => {
          const isActive = tier.id === activeTier
          const buttonDisabled = tier.id === 'free' ? false : !canUpgrade
          const showChangePlanCopy =
            tier.id === 'free' && currentSubscription && currentSubscription.plan !== 'free'
          const pendingCycle = currentSubscription?.pendingBillingCycle ?? currentSubscription?.billingCycle
          const tierSupportsPendingCycle = tier.billingCycles.some((cycle) => cycle.id === pendingCycle)
          const isPendingTarget =
            currentSubscription?.pendingPlan === tier.id && pendingCycle && tierSupportsPendingCycle
          const handleTierButtonClick = () => {
            if (tier.id === 'free') {
              if (showChangePlanCopy) {
                if (isDowngradeScheduled) {
                  handleKeepCurrentPlan()
                } else {
                  handleManageSubscription()
                }
              }
              return
            }
            handleSelectTier(tier)
          }
          const tierButtonLabel =
            tier.id === 'free'
              ? isActive
                ? 'Current Plan'
                : showChangePlanCopy
                  ? isDowngradeScheduled
                    ? 'Keep current plan'
                    : 'Change Plan'
                  : 'Start for Free'
              : isActive
                ? 'Manage Plan'
                : isPendingTarget
                  ? 'Change Scheduled'
                  : currentSubscription
                    ? 'Change Plan'
                    : 'Upgrade'
          const isFreeTier = tier.id === 'free'
          const tierPriceDisplay = isFreeTier ? 'Free' : tier.priceDisplay
          const tierPriceSuffix = isFreeTier ? '' : '/month'

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

                {tier.id === 'free' && isDowngradeScheduled && currentSubscription?.currentPeriodEnd && (
                  <div className="rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 p-2 text-xs text-muted-foreground">
                    Downgrade scheduled for {formatDate(currentSubscription?.currentPeriodEnd)}
                  </div>
                )}

                <div className="flex-1">
                  <div className="text-sm font-medium mb-4 text-foreground/80">Includes:</div>
                  <ul className="space-y-3 text-sm">
                    {tier.features.map((feature) => (
                      <li key={`${tier.id} -${feature} `} className="flex items-start gap-3">
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
                    disabled={
                      buttonDisabled ||
                      (tier.id === 'free' && isDowngradeScheduled && keepSubscriptionMutation.isPending)
                    }
                    onClick={handleTierButtonClick}
                  >
                    {tier.id === 'free' && isDowngradeScheduled && keepSubscriptionMutation.isPending
                      ? 'Keeping current plan…'
                      : tierButtonLabel}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <SubscriptionCheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={(open) => {
          setIsCheckoutOpen(open)
          if (!open) {
            setCheckoutTier(null)
            setDialogMode('new')
          }
        }}
        tier={checkoutTier}
        billingCycle={billingCycle}
        onBillingCycleChange={setBillingCycle}
        publishableKey={subscriptionConfig?.publishableKey}
        hasActiveSubscription={hasActiveSubscription}
        mode={dialogMode}
        onCompleted={() => {
          setIsCheckoutOpen(false)
          setCheckoutTier(null)
          setDialogMode('new')
        }}
      />
      <SubscriptionManageDialog
        open={isManageDialogOpen}
        onOpenChange={setIsManageDialogOpen}
        subscription={currentSubscription ?? null}
        publishableKey={subscriptionConfig?.publishableKey}
        tier={currentTier}
        onCancel={() => {
          setIsManageDialogOpen(false)
          setIsCancelDialogOpen(true)
        }}
        cancelDisabled={cancelSubscription.isPending}
      />
      <SubscriptionCancelDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onConfirm={handleCancel}
        isLoading={cancelSubscription.isPending}
        planName={currentSubscription?.plan}
        currentPeriodEnd={currentSubscription?.currentPeriodEnd}
      />
      {accountSelectionData && (
        <AccountSelectionDialog
          open={isAccountSelectionOpen}
          onOpenChange={(open) => {
            setIsAccountSelectionOpen(open)
            if (!open) {
              setAccountSelectionData(null)
            }
          }}
          onConfirm={
            // Use edit handler if subscription is already cancelled (edit mode)
            // Otherwise use cancel handler (initial cancellation)
            currentSubscription?.cancelAtPeriodEnd
              ? handleEditAccountSelectionConfirm
              : handleAccountSelectionConfirm
          }
          accounts={accountSelectionData.accounts}
          freeLimit={accountSelectionData.freeLimit}
          excessCount={accountSelectionData.excessCount}
          initialSelection={accountSelectionData.initialSelection}
          isEditing={currentSubscription?.cancelAtPeriodEnd && accountSelectionData.hasSelection}
          isLoading={
            currentSubscription?.cancelAtPeriodEnd
              ? updateAccountSelection.isPending
              : cancelSubscription.isPending
          }
        />
      )}
    </div>
  )
}

