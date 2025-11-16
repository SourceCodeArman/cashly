/**
 * Subscription types
 */
export type SubscriptionStatus = 
  | 'active' 
  | 'trialing' 
  | 'past_due' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'unpaid'

export type SubscriptionPlan = 'premium' | 'pro'

export type BillingCycle = 'monthly' | 'annual'

export interface Subscription {
  subscription_id: string
  stripe_subscription_id: string
  stripe_customer_id: string
  status: SubscriptionStatus
  plan: SubscriptionPlan
  billing_cycle: BillingCycle
  price_id_monthly: string
  price_id_annual: string
  current_period_start: string
  current_period_end: string
  trial_start?: string | null
  trial_end?: string | null
  cancel_at_period_end: boolean
  canceled_at?: string | null
  created_at: string
  updated_at: string
}

export interface CreateSubscriptionData {
  payment_method_id: string
  plan: SubscriptionPlan
  billing_cycle: BillingCycle
  trial_enabled?: boolean
}

export interface StripeConfig {
  publishable_key: string
}

export interface SubscriptionResponse {
  status: 'success' | 'error'
  data: Subscription | Subscription[] | { count?: number; results?: Subscription[] }
  message: string
  errors?: Record<string, any>
}

export interface StripeConfigResponse {
  status: 'success' | 'error'
  data: StripeConfig
  message: string
}

