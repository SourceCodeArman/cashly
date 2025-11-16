/**
 * Goal service
 */
import api from './api'
import type { ApiResponse } from '@/types/api.types'
import type {
  Goal,
  GoalCreateData,
  GoalContribution,
  GoalForecast,
  GoalUpdateData,
  Contribution,
  ContributionCreateData,
  ContributionUpdateData,
} from '@/types/goal.types'

export const goalService = {
  /**
   * Get user goals
   */
  async getGoals(isActive?: boolean, isCompleted?: boolean): Promise<ApiResponse<Goal[]>> {
    const params = new URLSearchParams()
    if (isActive !== undefined) {
      params.append('is_active', isActive.toString())
    }
    if (isCompleted !== undefined) {
      params.append('is_completed', isCompleted.toString())
    }
    
    const response = await api.get<ApiResponse<Goal[]> | Goal[] | { results: Goal[] }>(
      `/goals/?${params.toString()}`
    )
    const data = response.data as unknown
    if (typeof data === 'object' && data !== null && 'status' in (data as Record<string, unknown>)) {
      return data as ApiResponse<Goal[]>
    }
    // DRF paginated list
    if (
      typeof data === 'object' &&
      data !== null &&
      'results' in (data as Record<string, unknown>) &&
      Array.isArray((data as { results: unknown }).results)
    ) {
      return {
        status: 'success',
        data: (data as { results: Goal[] }).results,
        message: 'OK',
      }
    }
    // DRF simple list (no pagination)
    if (Array.isArray(data)) {
      return {
        status: 'success',
        data: data as Goal[],
        message: 'OK',
      }
    }
    return {
      status: 'error',
      data: [],
      message: 'Unexpected goals response format',
    }
  },

  /**
   * Get goal by ID
   */
  async getGoal(goalId: string): Promise<ApiResponse<Goal>> {
    const response = await api.get<ApiResponse<Goal> | Goal>(`/goals/${goalId}/`)
    const data = response.data as unknown
    if (typeof data === 'object' && data !== null && 'status' in (data as Record<string, unknown>)) {
      return data as ApiResponse<Goal>
    }
    if (typeof data === 'object' && data !== null) {
      return {
        status: 'success',
        data: data as Goal,
        message: 'OK',
      }
    }
    return {
      status: 'error',
      data: undefined as unknown as Goal,
      message: 'Unexpected goal response format',
    }
  },

  /**
   * Create new goal
   */
  async createGoal(data: GoalCreateData): Promise<ApiResponse<Goal>> {
    const response = await api.post<ApiResponse<Goal> | Goal>('/goals/', data)
    const responseData = response.data as unknown
    
    // Handle ApiResponse format
    if (typeof responseData === 'object' && responseData !== null && 'status' in (responseData as Record<string, unknown>)) {
      return responseData as ApiResponse<Goal>
    }
    
    // Handle direct Goal object (DRF default)
    if (typeof responseData === 'object' && responseData !== null) {
      return {
        status: 'success',
        data: responseData as Goal,
        message: 'Goal created successfully',
      }
    }
    
    return {
      status: 'error',
      data: undefined as unknown as Goal,
      message: 'Unexpected goal response format',
    }
  },

  /**
   * Update goal
   */
  async updateGoal(goalId: string, data: GoalUpdateData): Promise<ApiResponse<Goal>> {
    const response = await api.patch<ApiResponse<Goal> | Goal>(`/goals/${goalId}/`, data)
    const responseData = response.data as unknown
    
    // Handle ApiResponse format
    if (typeof responseData === 'object' && responseData !== null && 'status' in (responseData as Record<string, unknown>)) {
      return responseData as ApiResponse<Goal>
    }
    
    // Handle direct Goal object (DRF default)
    if (typeof responseData === 'object' && responseData !== null) {
      return {
        status: 'success',
        data: responseData as Goal,
        message: 'Goal updated successfully',
      }
    }
    
    return {
      status: 'error',
      data: undefined as unknown as Goal,
      message: 'Unexpected goal response format',
    }
  },

  /**
   * Mark goal complete
   */
  async completeGoal(goalId: string): Promise<ApiResponse<Goal>> {
    const response = await api.post<ApiResponse<Goal>>(`/goals/${goalId}/complete/`)
    return response.data
  },

  /**
   * Mark goal complete/incomplete (deprecated - use completeGoal)
   */
  async markComplete(goalId: string, isCompleted: boolean): Promise<ApiResponse<Goal>> {
    if (isCompleted) {
      return this.completeGoal(goalId)
    }
    // Uncomplete by updating the goal
    const response = await api.patch<ApiResponse<Goal>>(`/goals/${goalId}/`, {
      is_completed: false,
    })
    return response.data
  },

  /**
   * Archive goal
   */
  async archiveGoal(goalId: string): Promise<ApiResponse<Goal>> {
    const response = await api.post<ApiResponse<Goal> | Goal>(`/goals/${goalId}/archive/`)
    const responseData = response.data as unknown
    
    // Handle ApiResponse format
    if (typeof responseData === 'object' && responseData !== null && 'status' in (responseData as Record<string, unknown>)) {
      return responseData as ApiResponse<Goal>
    }
    
    // Handle direct Goal object (DRF default)
    if (typeof responseData === 'object' && responseData !== null) {
      return {
        status: 'success',
        data: responseData as Goal,
        message: 'Goal archived successfully',
      }
    }
    
    return {
      status: 'error',
      data: undefined as unknown as Goal,
      message: 'Unexpected archive response format',
    }
  },

  /**
   * Unarchive goal
   */
  async unarchiveGoal(goalId: string): Promise<ApiResponse<Goal>> {
    const response = await api.post<ApiResponse<Goal> | Goal>(`/goals/${goalId}/unarchive/`)
    const responseData = response.data as unknown
    
    // Handle ApiResponse format
    if (typeof responseData === 'object' && responseData !== null && 'status' in (responseData as Record<string, unknown>)) {
      return responseData as ApiResponse<Goal>
    }
    
    // Handle direct Goal object (DRF default)
    if (typeof responseData === 'object' && responseData !== null) {
      return {
        status: 'success',
        data: responseData as Goal,
        message: 'Goal restored successfully',
      }
    }
    
    return {
      status: 'error',
      data: undefined as unknown as Goal,
      message: 'Unexpected unarchive response format',
    }
  },

  /**
   * Delete goal
   */
  async deleteGoal(goalId: string): Promise<ApiResponse<null>> {
    try {
      const response = await api.delete<ApiResponse<null> | string | null>(`/goals/${goalId}/`)
      const responseData = response.data as unknown
      
      // Handle ApiResponse format (our custom response)
      if (typeof responseData === 'object' && responseData !== null && 'status' in (responseData as Record<string, unknown>)) {
        return responseData as ApiResponse<null>
      }
      
      // Handle empty response or 204 No Content (DRF default)
      // Our custom destroy method returns 200 with ApiResponse, but handle both cases
      if (response.status === 200 || response.status === 204) {
        return {
          status: 'success',
          data: null,
          message: 'Goal deleted successfully',
        }
      }
      
      return {
        status: 'success',
        data: null,
        message: 'Goal deleted successfully',
      }
    } catch (error: any) {
      // If the request succeeded but we got an error parsing the response
      // Check if it's a 204 or 200 status
      if (error.response?.status === 204 || error.response?.status === 200) {
        return {
          status: 'success',
          data: null,
          message: 'Goal deleted successfully',
        }
      }
      throw error
    }
  },

  /**
   * Add contribution to goal (new RESTful path)
   */
  async addContribution(
    goalId: string,
    contribution: ContributionCreateData
  ): Promise<ApiResponse<Contribution>> {
    const response = await api.post<ApiResponse<Contribution> | Contribution>(
      `/goals/${goalId}/contributions/`,
      contribution
    )
    const responseData = response.data as unknown
    
    // Handle ApiResponse format
    if (typeof responseData === 'object' && responseData !== null && 'status' in (responseData as Record<string, unknown>)) {
      return responseData as ApiResponse<Contribution>
    }
    
    // Handle direct Contribution object (DRF default)
    if (typeof responseData === 'object' && responseData !== null) {
      return {
        status: 'success',
        data: responseData as Contribution,
        message: 'Contribution created successfully',
      }
    }
    
    return {
      status: 'error',
      data: undefined as unknown as Contribution,
      message: 'Unexpected contribution response format',
    }
  },

  /**
   * List contributions for a goal
   */
  async listContributions(goalId: string): Promise<ApiResponse<Contribution[]>> {
    const response = await api.get<ApiResponse<Contribution[]> | Contribution[] | { results: Contribution[] }>(
      `/goals/${goalId}/contributions/`
    )
    const data = response.data as unknown
    
    // Handle ApiResponse format
    if (typeof data === 'object' && data !== null && 'status' in (data as Record<string, unknown>)) {
      return data as ApiResponse<Contribution[]>
    }
    
    // Handle DRF paginated response
    if (typeof data === 'object' && data !== null && 'results' in (data as Record<string, unknown>)) {
      return {
        status: 'success',
        data: (data as { results: Contribution[] }).results,
        message: 'OK',
      }
    }
    
    // Handle direct array (DRF default)
    if (Array.isArray(data)) {
      return {
        status: 'success',
        data: data as Contribution[],
        message: 'OK',
      }
    }
    
    return {
      status: 'error',
      data: [],
      message: 'Unexpected contributions response format',
    }
  },

  /**
   * Get contribution by ID
   */
  async getContribution(goalId: string, contributionId: string): Promise<ApiResponse<Contribution>> {
    const response = await api.get<ApiResponse<Contribution>>(
      `/goals/${goalId}/contributions/${contributionId}/`
    )
    return response.data
  },

  /**
   * Update contribution
   */
  async updateContribution(
    goalId: string,
    contributionId: string,
    data: ContributionUpdateData
  ): Promise<ApiResponse<Contribution>> {
    const response = await api.patch<ApiResponse<Contribution>>(
      `/goals/${goalId}/contributions/${contributionId}/`,
      data
    )
    return response.data
  },

  /**
   * Delete contribution
   */
  async deleteContribution(goalId: string, contributionId: string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(
      `/goals/${goalId}/contributions/${contributionId}/`
    )
    return response.data
  },

  /**
   * Back-compat: contribute action (deprecated - use addContribution)
   */
  async contributeToGoal(goalId: string, contribution: GoalContribution): Promise<ApiResponse<Goal>> {
    const response = await api.post<ApiResponse<Goal>>(
      `/goals/${goalId}/contribute/`,
      { amount: contribution.amount, date: contribution.date, note: contribution.note }
    )
    return response.data
  },

  /**
   * Get goal forecast
   */
  async getGoalForecast(goalId: string): Promise<ApiResponse<GoalForecast>> {
    const response = await api.get<ApiResponse<GoalForecast>>(`/goals/${goalId}/forecast/`)
    return response.data
  },

  /**
   * Get contributions for a goal (alias for listContributions)
   */
  async getContributions(goalId: string): Promise<ApiResponse<Contribution[]>> {
    return this.listContributions(goalId)
  },

  /**
   * Authorize transfers for a goal - creates authorization programmatically (no Link UI)
   */
  async authorizeTransfers(goalId: string): Promise<ApiResponse<{ goal: Goal; authorization_id: string; decision?: string }>> {
    try {
      const response = await api.post<ApiResponse<{ goal: Goal; authorization_id: string; decision?: string }>>(`/goals/${goalId}/authorize-transfers/`)
      const responseData = response.data as unknown
      
      if (typeof responseData === 'object' && responseData !== null && 'status' in (responseData as Record<string, unknown>)) {
        return responseData as ApiResponse<{ goal: Goal; authorization_id: string; decision?: string }>
      }
      
      return {
        status: 'error',
        data: undefined as unknown as { goal: Goal; authorization_id: string; decision?: string },
        message: 'Unexpected authorization response format',
      }
    } catch (error: any) {
      // Extract error message from Axios error response
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      if (error.response?.data?.data?.message) {
        throw new Error(error.response.data.data.message)
      }
      throw error
    }
  },

  /**
   * Complete transfer authorization after Plaid Link
   */
  async completeAuthorization(goalId: string, publicToken: string, metadata: any): Promise<ApiResponse<Goal>> {
    const response = await api.post<ApiResponse<Goal> | Goal>(`/goals/${goalId}/complete-authorization/`, {
      public_token: publicToken,
      metadata: metadata,
    })
    const responseData = response.data as unknown
    
    if (typeof responseData === 'object' && responseData !== null && 'status' in (responseData as Record<string, unknown>)) {
      return responseData as ApiResponse<Goal>
    }
    
    if (typeof responseData === 'object' && responseData !== null) {
      return {
        status: 'success',
        data: responseData as Goal,
        message: 'Transfer authorization completed successfully',
      }
    }
    
    return {
      status: 'error',
      data: undefined as unknown as Goal,
      message: 'Unexpected authorization completion response format',
    }
  },

  /**
   * Sync destination account balance
   */
  async syncDestinationBalance(goalId: string): Promise<ApiResponse<Goal>> {
    const response = await api.post<ApiResponse<Goal> | Goal>(`/goals/${goalId}/sync-balance/`)
    const responseData = response.data as unknown
    
    if (typeof responseData === 'object' && responseData !== null && 'status' in (responseData as Record<string, unknown>)) {
      return responseData as ApiResponse<Goal>
    }
    
    if (typeof responseData === 'object' && responseData !== null) {
      return {
        status: 'success',
        data: responseData as Goal,
        message: 'Balance synced successfully',
      }
    }
    
    return {
      status: 'error',
      data: undefined as unknown as Goal,
      message: 'Unexpected sync response format',
    }
  },

  /**
   * Get goal-compatible accounts (checking/savings only)
   */
  async getGoalCompatibleAccounts(): Promise<ApiResponse<Array<{ account_id: string; name: string; account_type: string; balance: string }>>> {
    const response = await api.get<ApiResponse<Array<{ account_id: string; name: string; account_type: string; balance: string }>>>('/accounts/goal-compatible/')
    return response.data
  },
}

