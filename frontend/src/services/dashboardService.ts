/**
 * Dashboard service
 */
import api from './api'
import type { ApiResponse } from '@/types/api.types'
import type { DashboardData } from '@/types/dashboard.types'

export const dashboardService = {
  /**
   * Get dashboard data
   */
  async getDashboardData(month?: number, year?: number): Promise<ApiResponse<DashboardData>> {
    const params = new URLSearchParams()
    if (month !== undefined) {
      params.append('month', month.toString())
    }
    if (year !== undefined) {
      params.append('year', year.toString())
    }
    
    const response = await api.get<ApiResponse<DashboardData>>(
      `/dashboard/?${params.toString()}`
    )
    return response.data
  },
}

