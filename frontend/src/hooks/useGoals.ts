import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalService } from '@/services/goalService'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'
import type { ApiResponse, CreateGoalForm, Goal } from '@/types'

export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: goalService.listGoals,
  })
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: queryKeys.goal(id),
    queryFn: async () => {
      const response = await goalService.getGoal(id)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch goal')
    },
    enabled: !!id,
  })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateGoalForm) => goalService.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
      toast.success('Goal created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create goal')
    },
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<Goal>, Error, { id: string; data: Partial<CreateGoalForm> }>({
    mutationFn: ({ id, data }) => goalService.updateGoal(id, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
      queryClient.invalidateQueries({ queryKey: queryKeys.goal(variables.id) })
      toast.success('Goal updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update goal')
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => goalService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
      toast.success('Goal deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete goal')
    },
  })
}

export function useContributeToGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, amount, note, date }: { id: string; amount: number; note?: string; date?: string }) =>
      goalService.contributeToGoal(id, { amount, note, date }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals })
      const goalId = response?.data?.id
      if (goalId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.goal(goalId) })
      }
      toast.success('Contribution recorded successfully')
    },
    onError: (error: Error) => {
      toast.error(error?.message ?? 'Failed to record contribution')
    },
  })
}

