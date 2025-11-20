import apiClient from './apiClient'
import type { ApiResponse, Budget, CreateBudgetForm, BudgetUsageSummary, PaginatedResponse } from '@/types'

type BudgetListServerResponse =
  | ApiResponse<Budget[]>
  | Budget[]
  | PaginatedResponse<Budget>
  | { status?: 'error'; data?: null; message?: string }

interface RawBudgetData {
  budget_id?: string
  id?: string
  category_id?: string
  categoryId?: string
  category_name?: string
  categoryName?: string
  period_type?: 'weekly' | 'monthly' | 'yearly' | 'custom'
  periodType?: 'weekly' | 'monthly' | 'yearly' | 'custom'
  amount?: string | number
  period_start?: string
  periodStart?: string
  period_end?: string
  periodEnd?: string
  alerts_enabled?: boolean
  alertsEnabled?: boolean
  alert_threshold?: string | number
  alertThreshold?: string | number
  usage?: {
    spent?: string | number
    remaining?: string | number
    percentage_used?: number
    percentageUsed?: number
    is_over_budget?: boolean
    isOverBudget?: boolean
    alert_threshold_reached?: boolean
    alertThresholdReached?: boolean
  }
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
}

interface RawUsageSummaryItem {
  budget_id?: string
  budgetId?: string
  category_name?: string
  categoryName?: string
  amount?: string | number
  spent?: string | number
  remaining?: string | number
  percentage_used?: number
  percentageUsed?: number
  is_over_budget?: boolean
  isOverBudget?: boolean
  period_start?: string
  periodStart?: string
  period_end?: string
  periodEnd?: string
}

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

const normalizeBudget = (budget: RawBudgetData): Budget => ({
  id: budget.budget_id ?? budget.id ?? '',
  categoryId: budget.category_id ?? budget.categoryId ?? '',
  categoryName: budget.category_name ?? budget.categoryName ?? '',
  periodType: budget.period_type ?? budget.periodType ?? 'monthly',
  amount: toDecimalString(budget.amount),
  periodStart: budget.period_start ?? budget.periodStart ?? '',
  periodEnd: budget.period_end ?? budget.periodEnd ?? '',
  alertsEnabled: budget.alerts_enabled ?? budget.alertsEnabled ?? false,
  alertThreshold: toDecimalString(
    budget.alert_threshold ?? budget.alertThreshold ?? 80
  ),
  usage: budget.usage
    ? {
        spent: toDecimalString(budget.usage.spent ?? 0),
        remaining: toDecimalString(budget.usage.remaining ?? 0),
        percentageUsed: budget.usage.percentage_used ?? budget.usage.percentageUsed ?? 0,
        isOverBudget: budget.usage.is_over_budget ?? budget.usage.isOverBudget ?? false,
        alertThresholdReached:
          budget.usage.alert_threshold_reached ?? budget.usage.alertThresholdReached ?? false,
      }
    : undefined,
  createdAt: budget.created_at ?? budget.createdAt,
  updatedAt: budget.updated_at ?? budget.updatedAt,
})

const mapBudgetPayload = (data: Partial<CreateBudgetForm>) => {
  const payload: Record<string, unknown> = {}

  if (data.category !== undefined) {
    payload.category = data.category
  }
  if (data.periodType !== undefined) {
    payload.period_type = data.periodType
  }
  if (data.amount !== undefined) {
    payload.amount = data.amount
  }
  if (data.periodStart !== undefined) {
    payload.period_start = data.periodStart
  }
  if (data.periodEnd !== undefined) {
    payload.period_end = data.periodEnd
  }
  if (data.alertsEnabled !== undefined) {
    payload.alerts_enabled = data.alertsEnabled
  }
  if (data.alertThreshold !== undefined) {
    payload.alert_threshold = data.alertThreshold
  }

  return payload
}

export const budgetService = {
  async listBudgets(): Promise<Budget[]> {
    const response = await apiClient.get<BudgetListServerResponse>('/budgets/')
    const payload = response.data
    const normalizeArray = (budgets: RawBudgetData[]) => budgets.map((budget) => normalizeBudget(budget))

    if (Array.isArray(payload)) {
      return normalizeArray(payload)
    }

    if ('results' in payload && Array.isArray(payload.results)) {
      return normalizeArray(payload.results)
    }

    if ('status' in payload) {
      if (payload.status === 'success' && Array.isArray(payload.data)) {
        return normalizeArray(payload.data)
      }
      throw new Error(payload.message || 'Failed to fetch budgets')
    }

    throw new Error('Failed to fetch budgets')
  },

  async getBudget(id: string): Promise<ApiResponse<Budget>> {
    const response = await apiClient.get<ApiResponse<Budget>>(`/budgets/${id}/`)
    if (response.data.status === 'success' && response.data.data) {
      response.data.data = normalizeBudget(response.data.data as RawBudgetData)
    }
    return response.data
  },

  async createBudget(data: CreateBudgetForm): Promise<ApiResponse<Budget>> {
    const response = await apiClient.post<ApiResponse<Budget>>('/budgets/', mapBudgetPayload(data))
    if (response.data.status === 'success' && response.data.data) {
      response.data.data = normalizeBudget(response.data.data as RawBudgetData)
    }
    return response.data
  },

  async updateBudget(id: string, data: Partial<CreateBudgetForm>): Promise<ApiResponse<Budget>> {
    const response = await apiClient.patch<ApiResponse<Budget>>(
      `/budgets/${id}/`,
      mapBudgetPayload(data)
    )
    if (response.data.status === 'success' && response.data.data) {
      response.data.data = normalizeBudget(response.data.data as RawBudgetData)
    }
    return response.data
  },

  async deleteBudget(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/budgets/${id}/`)
    return response.data
  },

  async getUsageSummary(): Promise<BudgetUsageSummary[]> {
    const response = await apiClient.get<ApiResponse<BudgetUsageSummary[]>>(
      '/budgets/usage-summary/'
    )
    if (response.data.status === 'success' && Array.isArray(response.data.data)) {
      return response.data.data.map((item: RawUsageSummaryItem) => ({
        budgetId: item.budget_id ?? item.budgetId ?? '',
        categoryName: item.category_name ?? item.categoryName ?? '',
        amount: toDecimalString(item.amount),
        spent: toDecimalString(item.spent),
        remaining: toDecimalString(item.remaining),
        percentageUsed: item.percentage_used ?? item.percentageUsed ?? 0,
        isOverBudget: item.is_over_budget ?? item.isOverBudget ?? false,
        periodStart: item.period_start ?? item.periodStart ?? '',
        periodEnd: item.period_end ?? item.periodEnd ?? '',
      }))
    }
    throw new Error(response.data.message || 'Failed to fetch budget usage summary')
  },
}

