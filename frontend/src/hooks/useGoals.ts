/**
 * Goals hook
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { goalService } from '@/services/goalService'
import type {
  Goal,
  GoalCreateData,
  GoalContribution,
  GoalUpdateData,
  ContributionCreateData,
  ContributionUpdateData,
  Contribution,
} from '@/types/goal.types'
import { toast } from 'sonner'
import { triggerConfetti } from '@/utils/confetti'

export function useGoals(isActive?: boolean, isCompleted?: boolean) {
  const queryClient = useQueryClient()

  // Get goals
  const {
    data: goalsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['goals', isActive, isCompleted],
    queryFn: async () => {
      const response = await goalService.getGoals(isActive, isCompleted)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch goals')
    },
    staleTime: 30000, // 30 seconds
  })

  // Get goal by ID
  const useGoal = (goalId: string) => {
    return useQuery({
      queryKey: ['goals', goalId],
      queryFn: async () => {
        const response = await goalService.getGoal(goalId)
        if (response.status === 'success' && response.data) {
          return response.data
        }
        throw new Error(response.message || 'Failed to fetch goal')
      },
      enabled: !!goalId,
    })
  }

  // Get contributions for a goal
  const useContributions = (goalId: string) => {
    return useQuery({
      queryKey: ['goals', goalId, 'contributions'],
      queryFn: async () => {
        const response = await goalService.listContributions(goalId)
        if (response.status === 'success' && response.data) {
          return response.data
        }
        throw new Error(response.message || 'Failed to fetch contributions')
      },
      enabled: !!goalId,
    })
  }

  // Get goal forecast
  const useGoalForecast = (goalId: string) => {
    return useQuery({
      queryKey: ['goals', goalId, 'forecast'],
      queryFn: async () => {
        const response = await goalService.getGoalForecast(goalId)
        if (response.status === 'success' && response.data) {
          return response.data
        }
        throw new Error(response.message || 'Failed to fetch goal forecast')
      },
      enabled: !!goalId,
    })
  }

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalCreateData) => {
      const response = await goalService.createGoal(data)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to create goal')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create goal')
    },
  })

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: GoalUpdateData }) => {
      const response = await goalService.updateGoal(goalId, data)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to update goal')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update goal')
    },
  })

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const response = await goalService.deleteGoal(goalId)
      if (response.status === 'success') {
        return goalId
      }
      throw new Error(response.message || 'Failed to delete goal')
    },
    onSuccess: (goalId) => {
      // Invalidate all goal queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      // Also remove the specific goal from cache if it exists
      queryClient.removeQueries({ queryKey: ['goals', goalId] })
      toast.success('Goal deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete goal')
    },
  })

  // Complete goal mutation
  const completeGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const response = await goalService.completeGoal(goalId)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to complete goal')
    },
    onSuccess: (goal) => {
      // Invalidate all goal queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      // Also update the specific goal in cache if it exists
      queryClient.setQueryData(['goals', goal.goal_id], goal)
      toast.success('Goal marked as completed')
      // Trigger confetti celebration
      triggerConfetti()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete goal')
    },
  })

  // Archive goal mutation
  const archiveGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const response = await goalService.archiveGoal(goalId)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to archive goal')
    },
    onSuccess: (goal) => {
      // Invalidate all goal queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      // Also update the specific goal in cache if it exists
      queryClient.setQueryData(['goals', goal.goal_id], goal)
      toast.success('Goal archived successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive goal')
    },
  })

  // Unarchive goal mutation
  const unarchiveGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const response = await goalService.unarchiveGoal(goalId)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to unarchive goal')
    },
    onSuccess: (goal) => {
      // Invalidate all goal queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      // Also update the specific goal in cache if it exists
      queryClient.setQueryData(['goals', goal.goal_id], goal)
      toast.success('Goal restored successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unarchive goal')
    },
  })

  // Add contribution mutation
  const addContributionMutation = useMutation({
    mutationFn: async ({
      goalId,
      contribution,
    }: {
      goalId: string
      contribution: ContributionCreateData
    }) => {
      // Get the goal before adding contribution to check if it was already completed
      // Check both individual goal cache and goals list cache
      let previousGoal = queryClient.getQueryData<Goal>(['goals', goalId])
      
      // If not found in individual cache, try to find it in the goals list
      if (!previousGoal) {
        const goalsQueries = queryClient.getQueriesData<Goal[]>({ queryKey: ['goals'] })
        for (const [, goals] of goalsQueries) {
          if (goals && Array.isArray(goals)) {
            const found = goals.find(g => g.goal_id === goalId)
            if (found) {
              previousGoal = found
              break
            }
          }
        }
      }
      
      const previousIsCompleted = previousGoal?.is_completed || false
      
      const response = await goalService.addContribution(goalId, contribution)
      if (response.status === 'success' && response.data) {
        return { contribution: response.data, previousIsCompleted, goalId }
      }
      throw new Error(response.message || 'Failed to contribute to goal')
    },
    onSuccess: async (data, variables) => {
      const { previousIsCompleted, goalId } = data
      
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goals', goalId, 'contributions'] })
      
      // Refetch the goal to check if it's now completed
      try {
        const goalResponse = await goalService.getGoal(goalId)
        if (goalResponse.status === 'success' && goalResponse.data) {
          const updatedGoal = goalResponse.data
          const isNowCompleted = updatedGoal.is_completed || false
          
          // Check if goal was just completed (wasn't completed before, is completed now)
          if (!previousIsCompleted && isNowCompleted) {
            // Goal was just completed through this contribution!
            triggerConfetti()
            toast.success('Goal completed! 🎉')
          } else {
            toast.success('Contribution recorded successfully')
          }
          
          // Update the goal in cache
          queryClient.setQueryData(['goals', goalId], updatedGoal)
        } else {
          toast.success('Contribution recorded successfully')
        }
      } catch (error) {
        // If refetch fails, still show success for the contribution
        toast.success('Contribution recorded successfully')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to contribute to goal')
    },
  })

  // Update contribution mutation
  const updateContributionMutation = useMutation({
    mutationFn: async ({
      goalId,
      contributionId,
      data,
    }: {
      goalId: string
      contributionId: string
      data: ContributionUpdateData
    }) => {
      // Get the goal before updating contribution to check if it was already completed
      let previousGoal = queryClient.getQueryData<Goal>(['goals', goalId])
      
      // If not found in individual cache, try to find it in the goals list
      if (!previousGoal) {
        const goalsQueries = queryClient.getQueriesData<Goal[]>({ queryKey: ['goals'] })
        for (const [, goals] of goalsQueries) {
          if (goals && Array.isArray(goals)) {
            const found = goals.find(g => g.goal_id === goalId)
            if (found) {
              previousGoal = found
              break
            }
          }
        }
      }
      
      const previousIsCompleted = previousGoal?.is_completed || false
      
      const response = await goalService.updateContribution(goalId, contributionId, data)
      if (response.status === 'success' && response.data) {
        return { contribution: response.data, previousIsCompleted, goalId }
      }
      throw new Error(response.message || 'Failed to update contribution')
    },
    onSuccess: async (data, variables) => {
      const { previousIsCompleted, goalId } = data
      
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goals', goalId, 'contributions'] })
      
      // Refetch the goal to check if it's now completed
      try {
        const goalResponse = await goalService.getGoal(goalId)
        if (goalResponse.status === 'success' && goalResponse.data) {
          const updatedGoal = goalResponse.data
          const isNowCompleted = updatedGoal.is_completed || false
          
          // Check if goal was just completed (wasn't completed before, is completed now)
          if (!previousIsCompleted && isNowCompleted) {
            // Goal was just completed through this contribution update!
            triggerConfetti()
            toast.success('Goal completed! 🎉')
          } else {
            toast.success('Contribution updated successfully')
          }
          
          // Update the goal in cache
          queryClient.setQueryData(['goals', goalId], updatedGoal)
        } else {
          toast.success('Contribution updated successfully')
        }
      } catch (error) {
        // If refetch fails, still show success for the contribution update
        toast.success('Contribution updated successfully')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update contribution')
    },
  })

  // Delete contribution mutation
  const deleteContributionMutation = useMutation({
    mutationFn: async ({
      goalId,
      contributionId,
    }: {
      goalId: string
      contributionId: string
    }) => {
      const response = await goalService.deleteContribution(goalId, contributionId)
      if (response.status === 'success') {
        return contributionId
      }
      throw new Error(response.message || 'Failed to delete contribution')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['goals', variables.goalId, 'contributions'] })
      toast.success('Contribution deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete contribution')
    },
  })

  // Authorize transfers mutation - creates authorization programmatically
  const authorizeTransfersMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const response = await goalService.authorizeTransfers(goalId)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to create transfer authorization')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Transfer authorization created successfully. Future transfers will be executed automatically.')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create transfer authorization')
    },
  })

  // Sync destination balance mutation
  const syncBalanceMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const response = await goalService.syncDestinationBalance(goalId)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to sync balance')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Balance synced successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync balance')
    },
  })

  const markCompleteMutation = useMutation({
    mutationFn: async ({ goalId, isCompleted }: { goalId: string; isCompleted: boolean }) => {
      const response = await goalService.markComplete(goalId, isCompleted)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to update goal status')
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success(variables.isCompleted ? 'Goal marked complete' : 'Goal marked active')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update goal status')
    },
  })

  return {
    goals: goalsData || [],
    isLoading,
    error,
    refetch,
    useGoal,
    useContributions,
    useGoalForecast,
    createGoal: createGoalMutation.mutate,
    isCreating: createGoalMutation.isPending,
    updateGoal: updateGoalMutation.mutate,
    isUpdating: updateGoalMutation.isPending,
    deleteGoal: deleteGoalMutation.mutate,
    isDeleting: deleteGoalMutation.isPending,
    completeGoal: completeGoalMutation.mutate,
    completeGoalAsync: completeGoalMutation.mutateAsync,
    isCompleting: completeGoalMutation.isPending,
    archiveGoal: archiveGoalMutation.mutate,
    archiveGoalAsync: archiveGoalMutation.mutateAsync,
    isArchiving: archiveGoalMutation.isPending,
    unarchiveGoal: unarchiveGoalMutation.mutate,
    unarchiveGoalAsync: unarchiveGoalMutation.mutateAsync,
    isUnarchiving: unarchiveGoalMutation.isPending,
    addContribution: addContributionMutation.mutate,
    isAddingContribution: addContributionMutation.isPending,
    updateContribution: updateContributionMutation.mutate,
    isUpdatingContribution: updateContributionMutation.isPending,
    deleteContribution: deleteContributionMutation.mutate,
    isDeletingContribution: deleteContributionMutation.isPending,
    markComplete: markCompleteMutation.mutate, // back-compat
    isMarkingComplete: markCompleteMutation.isPending,
    authorizeTransfers: authorizeTransfersMutation.mutateAsync,
    isAuthorizing: authorizeTransfersMutation.isPending,
    syncBalance: syncBalanceMutation.mutateAsync,
    isSyncingBalance: syncBalanceMutation.isPending,
  }
}

