/**
 * Subscription service for API calls
 */
import api from './api'
import type {
  Subscription,
  SubscriptionResponse,
  StripeConfigResponse,
  CreateSubscriptionData,
} from '@/types/subscription.types'
import type { ApiResponse } from '@/types/api.types'

/**
 * Get Stripe configuration (publishable key)
 */
export async function getStripeConfig(): Promise<StripeConfigResponse> {
  const response = await api.get<StripeConfigResponse>('/subscriptions/stripe-config/')
  return response.data
}

/**
 * Get all subscriptions for the current user
 */
export async function getSubscriptions(): Promise<SubscriptionResponse> {
  const response = await api.get<SubscriptionResponse>('/subscriptions/')
  return response.data
}

/**
 * Get a single subscription by ID
 */
export async function getSubscription(
  subscriptionId: string
): Promise<ApiResponse<Subscription>> {
  const response = await api.get<ApiResponse<Subscription>>(
    `/subscriptions/${subscriptionId}/`
  )
  return response.data
}

/**
 * Create a new subscription
 */
export async function createSubscription(
  data: CreateSubscriptionData
): Promise<SubscriptionResponse> {
  const response = await api.post<SubscriptionResponse>('/subscriptions/create/', data)
  return response.data
}

/**
 * Update subscription (change plan, billing cycle, etc.)
 */
export async function updateSubscription(
  subscriptionId: string,
  data: Partial<CreateSubscriptionData>
): Promise<SubscriptionResponse> {
  const response = await api.patch<SubscriptionResponse>(
    `/subscriptions/${subscriptionId}/`,
    data
  )
  return response.data
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<SubscriptionResponse> {
  const response = await api.patch<SubscriptionResponse>(
    `/subscriptions/${subscriptionId}/cancel/`
  )
  return response.data
}

