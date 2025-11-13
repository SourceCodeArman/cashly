/**
 * Dashboard hook
 */
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboardService'
import type { DashboardData } from '@/types/dashboard.types'

export function useDashboard(month?: number, year?: number) {
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', month, year],
    queryFn: async () => {
      const response = await dashboardService.getDashboardData(month, year)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch dashboard data')
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  })

  return {
    dashboardData,
    isLoading,
    error,
    refetch,
  }
}

