import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { budgetService } from '@/services/budgetService'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'
import type { ApiResponse, CreateBudgetForm, Budget } from '@/types'

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets,
    queryFn: budgetService.listBudgets,
  })
}

export function useBudget(id: string) {
  return useQuery({
    queryKey: queryKeys.budget(id),
    queryFn: async () => {
      const response = await budgetService.getBudget(id)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch budget')
    },
    enabled: !!id,
  })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateBudgetForm) => budgetService.createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsageSummary })
      toast.success('Budget created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create budget')
    },
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<Budget>, Error, { id: string; data: Partial<CreateBudgetForm> }>({
    mutationFn: ({ id, data }) => budgetService.updateBudget(id, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets })
      queryClient.invalidateQueries({ queryKey: queryKeys.budget(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsageSummary })
      toast.success('Budget updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update budget')
    },
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => budgetService.deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets })
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetUsageSummary })
      toast.success('Budget deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete budget')
    },
  })
}

export function useBudgetUsageSummary() {
  return useQuery({
    queryKey: queryKeys.budgetUsageSummary,
    queryFn: budgetService.getUsageSummary,
  })
}

