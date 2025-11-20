import apiClient from './apiClient'
import type { ApiResponse, DashboardData } from '@/types'

export const dashboardService = {
  async getDashboardData(trendDays: number = 30): Promise<ApiResponse<DashboardData>> {
    const response = await apiClient.get<ApiResponse<DashboardData>>('/dashboard/', {
      params: { trend_days: trendDays },
    })
    return response.data
  },
}

