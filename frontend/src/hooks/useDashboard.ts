import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboardService'
import { queryKeys } from '@/lib/queryClient'

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const response = await dashboardService.getDashboardData()
      if (response.status === 'success' && response.data) {
        // Backend returns snake_case, transform to camelCase for frontend
        const backendData = response.data as any

        // Extract nested values from total_balance object
        const balanceData = backendData.total_balance || {}

        // Transform goals_progress from snake_case to camelCase
        const transformedGoals = (backendData.goals_progress || []).map((goal: any) => ({
          id: goal.goal_id,
          name: goal.name,
          targetAmount: goal.target_amount?.toString() || '0',
          currentAmount: goal.current_amount?.toString() || '0',
          deadline: goal.deadline,
          goalType: goal.goal_type,
          isActive: goal.is_active,
          isCompleted: goal.is_completed,
          progress: goal.progress_percentage,
        }))

        return {
          totalBalance: balanceData.total_balance || 0,
          totalIncome: backendData.total_income || 0,
          totalSpending: backendData.total_spending || 0,
          recentTransactions: backendData.recent_transactions || [],
          monthlySpending: backendData.monthly_spending || {},
          goalsProgress: backendData.goals_progress || [],
          categorySpending: backendData.category_spending || [],
          budgetSummary: backendData.budget_summary || {},
          // Additional fields for widgets
          spendingTrend: backendData.spending_trends || [],  // Use spending trends for trend chart
          activeGoals: transformedGoals,  // Use transformed goals for widget
        }
      }
      throw new Error(response.message || 'Failed to fetch dashboard data')
    },
  })
}

