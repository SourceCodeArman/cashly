import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboardService'
import { queryKeys } from '@/lib/queryClient'

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const response = await dashboardService.getDashboardData()
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch dashboard data')
    },
  })
}

