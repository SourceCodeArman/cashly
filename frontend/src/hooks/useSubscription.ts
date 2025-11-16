/**
 * React hooks for subscription management
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  getStripeConfig,
} from '@/services/subscriptionService'
import type {
  Subscription,
  CreateSubscriptionData,
  StripeConfig,
} from '@/types/subscription.types'

/**
 * Get Stripe configuration
 */
export function useStripeConfig() {
  return useQuery<StripeConfig>({
    queryKey: ['stripe-config'],
    queryFn: async () => {
      const response = await getStripeConfig()
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get all subscriptions for the current user
 */
export function useSubscriptions() {
  return useQuery<Subscription[]>({
    queryKey: ['subscriptions'],
    queryFn: async () => {
      const response = await getSubscriptions()
      if (Array.isArray(response.data)) {
        return response.data
      }
      if ('results' in response.data && Array.isArray(response.data.results)) {
        return response.data.results
      }
      return []
    },
  })
}

/**
 * Get current active subscription
 */
export function useCurrentSubscription() {
  const { data: subscriptions, ...rest } = useSubscriptions()
  
  const currentSubscription = subscriptions?.find(
    (sub) => sub.status === 'active' || sub.status === 'trialing'
  )
  
  return {
    currentSubscription: currentSubscription || null,
    isLoadingSubscriptions: rest.isLoading,
    ...rest,
  }
}

/**
 * Get a single subscription by ID
 */
export function useSubscriptionById(subscriptionId: string | null) {
  return useQuery<Subscription | null>({
    queryKey: ['subscription', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) return null
      const response = await getSubscription(subscriptionId)
      return response.data
    },
    enabled: !!subscriptionId,
  })
}

/**
 * Create subscription mutation
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreateSubscriptionData) => createSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}

/**
 * Update subscription mutation
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ subscriptionId, data }: { subscriptionId: string; data: Partial<CreateSubscriptionData> }) =>
      updateSubscription(subscriptionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}

/**
 * Cancel subscription mutation
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (subscriptionId: string) => cancelSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
    },
  })
}

/**
 * Main subscription hook with common operations
 * Note: This replaces the default export pattern - use useCurrentSubscription() directly if needed
 */
export function useSubscriptionManagement() {
  const { currentSubscription, isLoadingSubscriptions } = useCurrentSubscription()
  const cancelSubscriptionMutation = useCancelSubscription()
  
  return {
    currentSubscription,
    isLoadingSubscriptions,
    cancelSubscription: async (subscriptionId: string) => {
      return cancelSubscriptionMutation.mutateAsync(subscriptionId)
    },
    isCanceling: cancelSubscriptionMutation.isPending,
  }
}

