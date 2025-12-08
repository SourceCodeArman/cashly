import { useQuery } from '@tanstack/react-query'
import { subscriptionService } from '@/services/subscriptionService'
import { queryKeys } from '@/lib/queryClient'

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
