import apiClient from './apiClient'
import type { ApiResponse, Goal, CreateGoalForm, PaginatedResponse } from '@/types'

type GoalListServerResponse =
  | ApiResponse<Goal[]>
  | Goal[]
  | PaginatedResponse<Goal>
  | { status?: 'error'; data?: null; message?: string }

const toDecimalString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '0'
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  if (typeof value === 'string') {
    return value
  }

  return String(value)
}

interface RawGoalData {
  goal_id?: string
  id?: string
  name?: string
  target_amount?: string | number
  targetAmount?: string | number
  current_amount?: string | number
  currentAmount?: string | number
  deadline?: string
  goal_type?: string
  goalType?: string
  is_active?: boolean
  isActive?: boolean
  is_completed?: boolean
  isCompleted?: boolean
  progress_percentage?: number
  progress?: number
  progressPercentage?: number
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  destination_account_id?: string
  destinationAccountId?: string
  [key: string]: unknown
}

const normalizeGoal = (goal: RawGoalData): Goal & { destination_account_id?: string } => ({
  id: goal.goal_id ?? goal.id ?? '',
  name: goal.name ?? '',
  targetAmount: toDecimalString(goal.target_amount ?? goal.targetAmount),
  currentAmount: toDecimalString(goal.current_amount ?? goal.currentAmount),
  deadline: goal.deadline ?? undefined,
  goalType: goal.goal_type ?? goal.goalType ?? 'custom',
  isActive:
    typeof goal.is_active === 'boolean'
      ? goal.is_active
      : typeof goal.isActive === 'boolean'
        ? goal.isActive
        : false,
  isCompleted:
    typeof goal.is_completed === 'boolean'
      ? goal.is_completed
      : typeof goal.isCompleted === 'boolean'
        ? goal.isCompleted
        : false, // Default to false if not provided
  progress:
    typeof goal.progress_percentage === 'number'
      ? goal.progress_percentage
      : typeof goal.progress === 'number'
        ? goal.progress
        : goal.progressPercentage,
  createdAt: goal.created_at ?? goal.createdAt,
  updatedAt: goal.updated_at ?? goal.updatedAt,
  destination_account_id: goal.destination_account_id ?? goal.destinationAccountId ?? undefined,
})

const mapGoalPayload = (data: Partial<CreateGoalForm>) => {
  const payload: Record<string, unknown> = {}

  if (data.name !== undefined) {
    payload.name = data.name
  }
  if (data.targetAmount !== undefined) {
    payload.target_amount = data.targetAmount
  }
  if (data.deadline !== undefined) {
    payload.deadline = data.deadline
  }
  if (data.goalType !== undefined) {
    payload.goal_type = data.goalType
  }

  return payload
}

interface ContributionPayload {
  amount: number
  note?: string
  date?: string
}

export const goalService = {
  async listGoals(): Promise<Goal[]> {
    const response = await apiClient.get<GoalListServerResponse>('/goals/')
    const payload = response.data
    const normalizeArray = (goals: RawGoalData[]) => goals.map((goal) => normalizeGoal(goal))

    if (Array.isArray(payload)) {
      return normalizeArray(payload as unknown as RawGoalData[])
    }

    if ('results' in payload && Array.isArray(payload.results)) {
      return normalizeArray(payload.results as unknown as RawGoalData[])
    }

    if ('status' in payload) {
      if (payload.status === 'success' && Array.isArray(payload.data)) {
        return normalizeArray(payload.data as unknown as RawGoalData[])
      }
      throw new Error(payload.message || 'Failed to fetch goals')
    }

    throw new Error('Failed to fetch goals')
  },

  async getGoal(id: string): Promise<ApiResponse<Goal>> {
    const response = await apiClient.get<ApiResponse<Goal>>(`/goals/${id}/`)
    if (response.data.status === 'success' && response.data.data) {
      response.data.data = normalizeGoal(response.data.data as unknown as RawGoalData)
    }
    return response.data
  },

  async createGoal(data: CreateGoalForm): Promise<ApiResponse<Goal>> {
    const response = await apiClient.post<ApiResponse<Goal>>('/goals/', mapGoalPayload(data))
    if (response.data.status === 'success' && response.data.data) {
      response.data.data = normalizeGoal(response.data.data as unknown as RawGoalData)
    }
    return response.data
  },

  async updateGoal(id: string, data: Partial<CreateGoalForm>): Promise<ApiResponse<Goal>> {
    const response = await apiClient.patch<ApiResponse<Goal>>(
      `/goals/${id}/`,
      mapGoalPayload(data)
    )
    if (response.data.status === 'success' && response.data.data) {
      response.data.data = normalizeGoal(response.data.data as unknown as RawGoalData)
    }
    return response.data
  },

  async deleteGoal(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/goals/${id}/`)
    return response.data
  },

  async contributeToGoal(id: string, data: ContributionPayload): Promise<ApiResponse<Goal>> {
    const response = await apiClient.post<ApiResponse<Goal>>(`/goals/${id}/contribute/`, {
      amount: data.amount,
      ...(data.note ? { note: data.note } : {}),
      ...(data.date ? { date: data.date } : {}),
    })
    if (response.data.status === 'success' && response.data.data) {
      response.data.data = normalizeGoal(response.data.data as unknown as RawGoalData)
    }
    return response.data
  },

  // Savings Rules API
  async listSavingsRules(): Promise<ApiResponse<SavingsRule[]>> {
    const response = await apiClient.get<ApiResponse<SavingsRule[]>>('/goals/savings-rules/')
    return response.data
  },

  async getSavingsRule(id: string): Promise<ApiResponse<SavingsRule>> {
    const response = await apiClient.get<ApiResponse<SavingsRule>>(`/goals/savings-rules/${id}/`)
    return response.data
  },

  async createSavingsRule(data: CreateSavingsRulePayload): Promise<ApiResponse<SavingsRule>> {
    const response = await apiClient.post<ApiResponse<SavingsRule>>('/goals/savings-rules/', data)
    return response.data
  },

  async updateSavingsRule(id: string, data: Partial<CreateSavingsRulePayload>): Promise<ApiResponse<SavingsRule>> {
    const response = await apiClient.patch<ApiResponse<SavingsRule>>(`/goals/savings-rules/${id}/`, data)
    return response.data
  },

  async deleteSavingsRule(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/goals/savings-rules/${id}/`)
    return response.data
  },

  async toggleSavingsRuleActive(id: string): Promise<ApiResponse<SavingsRule>> {
    const response = await apiClient.post<ApiResponse<SavingsRule>>(`/goals/savings-rules/${id}/toggle_active/`)
    return response.data
  },

  async getSavingsRuleContributions(id: string): Promise<ApiResponse<{ contributions: SavingsContribution[]; count: number; total_amount: number }>> {
    const response = await apiClient.get<ApiResponse<{ contributions: SavingsContribution[]; count: number; total_amount: number }>>(
      `/goals/savings-rules/${id}/contributions/`
    )
    return response.data
  },

  async listSavingsContributions(): Promise<ApiResponse<{ contributions: SavingsContribution[]; count: number; total_amount: number }>> {
    const response = await apiClient.get<ApiResponse<{ contributions: SavingsContribution[]; count: number; total_amount: number }>>(
      '/goals/savings-contributions/'
    )
    return response.data
  },
}

export interface SavingsRule {
  rule_id: string
  goal_id: string
  goal_name: string
  rule_type: 'roundup' | 'percentage'
  trigger: 'all_expenses' | 'income' | 'category'
  percentage?: number | string
  category_id?: string
  category_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
  total_contributions: number
  total_amount: number
}

export interface CreateSavingsRulePayload {
  goal: string
  rule_type: 'roundup' | 'percentage'
  trigger: 'all_expenses' | 'income' | 'category'
  percentage?: number | string
  category?: string | null
  is_active?: boolean
}

export interface SavingsContribution {
  contribution_id: string
  rule_id: string
  rule_type: string
  goal_id: string
  goal_name: string
  transaction_id: string
  merchant_name: string
  amount: number | string
  applied_at: string
}

