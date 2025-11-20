import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionService } from '@/services/subscriptionService'
import type {
  CreateSubscriptionRequest,
  SubscriptionWithClientSecret,
  PaymentMethodSummary,
} from '@/services/subscriptionService'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'

export function useSubscriptionConfig() {
  return useQuery({
    queryKey: queryKeys.subscriptionConfig,
    queryFn: async () => {
      const response = await subscriptionService.getSubscriptionConfig()
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch subscription config')
    },
  })
}

export function useSubscriptions() {
  return useQuery({
    queryKey: queryKeys.subscriptions,
    queryFn: async () => {
      const response = await subscriptionService.listSubscriptions()
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch subscriptions')
    },
  })
}

export function useCreateSubscription() {
  const queryClient = useQueryClient()

  return useMutation<SubscriptionWithClientSecret, Error, CreateSubscriptionRequest>({
    mutationFn: async (payload: CreateSubscriptionRequest) => {
      const response = await subscriptionService.createSubscription(payload)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to create subscription')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create subscription')
    },
  })
}

export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { id: string; accountIds?: string[] }) => {
      const response = await subscriptionService.cancelSubscription(payload.id, payload.accountIds)
      
      // Handle account selection required
      if (
        response.status === 'error' &&
        response.data &&
        'accountSelectionRequired' in response.data &&
        response.data.accountSelectionRequired
      ) {
        // Return the account selection data instead of throwing
        interface AccountSelectionData {
          accountSelectionRequired: true
          accounts: Array<{
            account_id: string
            institution_name: string
            custom_name?: string | null
            account_type: string
            balance: string
            account_number_masked?: string | null
          }>
          excessCount: number
          freeLimit: number
        }
        return {
          accountSelectionRequired: true,
          accounts: response.data.accounts,
          excessCount: response.data.excessCount,
          freeLimit: response.data.freeLimit,
        } as AccountSelectionData
      }
      
      if (response.status === 'success' && response.data && 'subscriptionId' in response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to cancel subscription')
    },
    onSuccess: (data) => {
      // Only show success if cancellation actually completed (not account selection required)
      if (data && typeof data === 'object' && !('accountSelectionRequired' in data)) {
        queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions })
        toast.success('Subscription cancelled successfully')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel subscription')
    },
  })
}

export function usePaymentMethod(enabled = true) {
  return useQuery({
    queryKey: ['payment-method'],
    enabled,
    queryFn: async () => {
      const response = await subscriptionService.getPaymentMethod()
      if (response.status === 'success') {
        return response.data
      }
      throw new Error(response.message || 'Failed to load payment method')
    },
  })
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient()

  return useMutation<PaymentMethodSummary | null, Error, string>({
    mutationFn: async (paymentMethodId: string) => {
      const response = await subscriptionService.updatePaymentMethod(paymentMethodId)
      if (response.status === 'success') {
        return response.data
      }
      throw new Error(response.message || 'Failed to update payment method')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-method'] })
      toast.success('Payment method updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update payment method')
    },
  })
}

export function useKeepSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await subscriptionService.keepSubscription(id)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to keep current plan')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions })
      toast.success('Your current plan will continue')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to keep current plan')
    },
  })
}

export function useAccountSelection(subscriptionId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['account-selection', subscriptionId],
    queryFn: async () => {
      if (!subscriptionId) throw new Error('Subscription ID is required')
      const response = await subscriptionService.getAccountSelection(subscriptionId)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch account selection')
    },
    enabled: enabled && !!subscriptionId,
  })
}

export function useUpdateAccountSelection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { subscriptionId: string; accountIds: string[] }) => {
      const response = await subscriptionService.updateAccountSelection(
        payload.subscriptionId,
        payload.accountIds
      )
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to update account selection')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions })
      queryClient.invalidateQueries({ queryKey: ['account-selection', variables.subscriptionId] })
      toast.success('Account selection updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update account selection')
    },
  })
}

