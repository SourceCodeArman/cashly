import apiClient from './apiClient'
import type {
  ApiResponse,
  BillingCycle,
  Subscription,
  SubscriptionPlan,
  SubscriptionTier,
} from '@/types'

interface AccountSelectionAccount {
  account_id: string
  institution_name: string
  custom_name?: string | null
  account_type: string
  balance: string
  account_number_masked?: string | null
}

interface AccountSelectionData {
  accountSelectionRequired: true
  accounts: AccountSelectionAccount[]
  excessCount: number
  freeLimit: number
}

type SubscriptionApi = {
  subscription_id: string
  customer_id?: string
  plan: SubscriptionPlan
  billing_cycle?: BillingCycle
  status: string
  current_period_start?: string
  current_period_end?: string
  trial_start?: string
  trial_end?: string
  cancel_at_period_end: boolean
  created_at?: string
  updated_at?: string
  pending_plan?: SubscriptionPlan
  pending_billing_cycle?: BillingCycle
  pending_requested_at?: string
}

type SubscriptionTierApi = {
  id: SubscriptionPlan
  name: string
  description: string
  price: number
  price_display: string
  price_id: string
  currency: string
  features: string[]
  badge?: string | null
  highlight?: string | null
  billing_cycles?: {
    id: BillingCycle
    price: number
    price_display: string
    price_id: string
    currency: string
  }[]
}

type SubscriptionConfigApi = {
  publishable_key: string
  currency: string
  tiers: SubscriptionTierApi[]
}

type CreateSubscriptionRequest = {
  plan: Exclude<SubscriptionPlan, 'free'>
  billingCycle: BillingCycle
  paymentMethodId: string
  trialEnabled?: boolean
}

type SubscriptionWithClientSecret = Subscription & { clientSecret?: string }

export interface PaymentMethodSummary {
  id: string
  brand?: string
  last4?: string
  expMonth?: number
  expYear?: number
  funding?: string
  country?: string
}

export interface SubscriptionConfig {
  publishableKey: string
  currency: string
  tiers: SubscriptionTier[]
}

const normalizeSubscription = (subscription: SubscriptionApi): Subscription => ({
  subscriptionId: subscription.subscription_id,
  customerId: subscription.customer_id,
  plan: subscription.plan,
  billingCycle: subscription.billing_cycle ?? 'monthly',
  status: subscription.status,
  currentPeriodStart: subscription.current_period_start,
  currentPeriodEnd: subscription.current_period_end,
  trialStart: subscription.trial_start,
  trialEnd: subscription.trial_end,
  cancelAtPeriodEnd: subscription.cancel_at_period_end,
  createdAt: subscription.created_at,
  updatedAt: subscription.updated_at,
  pendingPlan: subscription.pending_plan,
  pendingBillingCycle: subscription.pending_billing_cycle,
  pendingRequestedAt: subscription.pending_requested_at,
})

const normalizeTier = (tier: SubscriptionTierApi): SubscriptionTier => ({
  id: tier.id,
  name: tier.name,
  description: tier.description,
  price: tier.price,
  priceDisplay: tier.price_display,
  priceId: tier.price_id,
  currency: tier.currency,
  features: tier.features,
  badge: tier.badge ?? undefined,
  highlight: tier.highlight ?? undefined,
  billingCycles:
    tier.billing_cycles?.map((cycle) => ({
      id: cycle.id,
      price: cycle.price,
      priceDisplay: cycle.price_display,
      priceId: cycle.price_id,
      currency: cycle.currency,
    })) ?? [
      {
        id: 'monthly',
        price: tier.price,
        priceDisplay: tier.price_display,
        priceId: tier.price_id,
        currency: tier.currency,
      },
    ],
})

export const subscriptionService = {
  async getSubscriptionConfig(): Promise<ApiResponse<SubscriptionConfig>> {
    const response = await apiClient.get<ApiResponse<SubscriptionConfigApi>>('/subscriptions/config/')
    const payload = response.data

    if (payload.status === 'success' && payload.data) {
      return {
        status: 'success',
        data: {
          publishableKey: payload.data.publishable_key,
          currency: payload.data.currency,
          tiers: payload.data.tiers.map(normalizeTier),
        },
        message: payload.message,
      }
    }

    return {
      status: payload.status,
      data: null,
      message: payload.message,
      errors: payload.errors,
    }
  },

  async listSubscriptions(): Promise<ApiResponse<Subscription[]>> {
    const response = await apiClient.get<ApiResponse<SubscriptionApi[]>>('/subscriptions/')
    const payload = response.data

    if (payload.status === 'success' && payload.data) {
      return {
        status: 'success',
        data: payload.data.map(normalizeSubscription),
        message: payload.message,
      }
    }

    return {
      status: payload.status,
      data: null,
      message: payload.message,
      errors: payload.errors,
    }
  },

  async createCheckoutSession(
    plan: string,
    billingCycle: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<ApiResponse<{ id: string; url: string }>> {
    const response = await apiClient.post<ApiResponse<{ id: string; url: string }>>(
      '/subscriptions/checkout-session/',
      {
        plan,
        billing_cycle: billingCycle,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }
    )
    return response.data
  },

  async createPortalSession(
    returnUrl: string
  ): Promise<ApiResponse<{ id: string; url: string }>> {
    const response = await apiClient.post<ApiResponse<{ id: string; url: string }>>(
      '/subscriptions/portal-session/',
      {
        return_url: returnUrl,
      }
    )
    return response.data
  },

  async cancelSubscription(
    id: string,
    accountIds?: string[]
  ): Promise<ApiResponse<Subscription | AccountSelectionData>> {
    try {
      const response = await apiClient.patch<ApiResponse<SubscriptionApi>>(
        `/subscriptions/${id}/cancel/`,
        accountIds ? { account_ids: accountIds } : undefined
      )
      const payload = response.data

      if (payload.status === 'success' && payload.data) {
        return {
          status: 'success',
          data: normalizeSubscription(payload.data),
          message: payload.message,
        }
      }

      return {
        status: payload.status,
        data: payload.data ? normalizeSubscription(payload.data) : null,
        message: payload.message,
        errors: payload.errors,
      }
    } catch (error: unknown) {
      // Handle account selection required error
      interface ErrorResponse {
        response?: {
          status?: number
          data?: {
            error_code?: string
            data?: {
              accounts?: AccountSelectionAccount[]
              excess_account_count?: number
              free_tier_limit?: number
            }
            message?: string
            errors?: Record<string, string[]>
          }
        }
      }
      const err = error as ErrorResponse
      if (err.response?.status === 400 && err.response?.data?.error_code === 'ACCOUNT_SELECTION_REQUIRED') {
        const errorData = err.response.data.data
        return {
          status: 'error',
          data: {
            accountSelectionRequired: true,
            accounts: errorData?.accounts || [],
            excessCount: errorData?.excess_account_count || 0,
            freeLimit: errorData?.free_tier_limit || 3,
          } as AccountSelectionData,
          message: err.response.data.message,
          errors: err.response.data.errors,
        }
      }
      // Re-throw other errors
      throw error
    }
  },

  async getAccountSelection(
    subscriptionId: string
  ): Promise<ApiResponse<{
    has_selection: boolean
    accounts_to_keep: string[]
    selection_completed_at: string | null
    deactivation_scheduled_at: string
    current_period_end: string
    total_accounts: number
    free_tier_limit: number
    excess_account_count: number
    accounts: Array<{
      account_id: string
      institution_name: string
      custom_name?: string | null
      account_type: string
      balance: string
      account_number_masked?: string | null
    }>
  }>> {
    const response = await apiClient.get<ApiResponse<{
      has_selection: boolean
      accounts_to_keep: string[]
      selection_completed_at: string | null
      deactivation_scheduled_at: string
      current_period_end: string
      total_accounts: number
      free_tier_limit: number
      excess_account_count: number
      accounts: Array<{
        account_id: string
        institution_name: string
        custom_name?: string | null
        account_type: string
        balance: string
      }>
    }>>(`/subscriptions/${subscriptionId}/select-accounts/`)
    const payload = response.data

    if (payload.status === 'success' && payload.data) {
      return {
        status: 'success',
        data: payload.data,
        message: payload.message,
      }
    }

    return {
      status: payload.status,
      data: payload.data || null,
      message: payload.message,
      errors: payload.errors,
    }
  },

  async updateAccountSelection(
    subscriptionId: string,
    accountIds: string[]
  ): Promise<ApiResponse<{ selection_id: string; accounts_to_keep: string[]; deactivation_scheduled_at: string; current_period_end: string }>> {
    const response = await apiClient.post<ApiResponse<{
      selection_id: string
      accounts_to_keep: string[]
      deactivation_scheduled_at: string
      current_period_end: string
    }>>(
      `/subscriptions/${subscriptionId}/select-accounts/`,
      { account_ids: accountIds }
    )
    const payload = response.data

    if (payload.status === 'success' && payload.data) {
      return {
        status: 'success',
        data: payload.data,
        message: payload.message,
      }
    }

    return {
      status: payload.status,
      data: payload.data || null,
      message: payload.message,
      errors: payload.errors,
    }
  },

  async keepSubscription(id: string): Promise<ApiResponse<Subscription>> {
    const response = await apiClient.post<ApiResponse<SubscriptionApi>>(
      `/subscriptions/${id}/keep-current-plan/`
    )
    const payload = response.data

    if (payload.status === 'success' && payload.data) {
      return {
        status: 'success',
        data: normalizeSubscription(payload.data),
        message: payload.message,
      }
    }

    return {
      status: payload.status,
      data: payload.data ? normalizeSubscription(payload.data) : null,
      message: payload.message,
      errors: payload.errors,
    }
  },
}

export type { CreateSubscriptionRequest, SubscriptionWithClientSecret }
