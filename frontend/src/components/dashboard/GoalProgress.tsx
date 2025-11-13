/**
 * Goal progress component
 */
import { Link } from 'react-router-dom'
import Card from '@/components/common/Card'
import { formatCurrency } from '@/utils/formatters'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/LoadingSpinner'
import Button from '@/components/common/Button'
import type { Goal } from '@/types/goal.types'
import type { DashboardData } from '@/types/dashboard.types'

export interface GoalProgressProps {
  goals: Goal[] | DashboardData['goals']
  isLoading?: boolean
  onContribute?: (goalId: string) => void
}

export default function GoalProgress({ goals, isLoading, onContribute }: GoalProgressProps) {
  if (isLoading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4">Savings Goals</h3>
        <Skeleton className="h-32" />
      </Card>
    )
  }

  if (goals.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold mb-4">Savings Goals</h3>
        <EmptyState
          title="No goals yet"
          description="Create a savings goal to track your progress"
          actionLabel="Create Goal"
          onAction={() => (window.location.href = '/goals')}
        />
      </Card>
    )
  }

  // Filter active, non-completed goals for display
  const activeGoals = goals.filter((g) => {
    const isCompleted = 'is_completed' in g ? g.is_completed : false
    const isArchived = 'archived_at' in g ? !!g.archived_at : false
    return !isCompleted && !isArchived
  })
  const completedGoals = goals.filter((g) => {
    const isCompleted = 'is_completed' in g ? g.is_completed : false
    const isArchived = 'archived_at' in g ? !!g.archived_at : false
    return isCompleted && !isArchived
  })
  
  // Show the first active goal, or first goal if no active goals
  const displayGoal = activeGoals[0] || goals[0]
  if (!displayGoal) return null
  
  const progress = typeof displayGoal.progress_percentage === 'number' 
    ? displayGoal.progress_percentage 
    : 0
  const current = typeof displayGoal.current_amount === 'number'
    ? displayGoal.current_amount
    : parseFloat(String(displayGoal.current_amount))
  const target = typeof displayGoal.target_amount === 'number'
    ? displayGoal.target_amount
    : parseFloat(String(displayGoal.target_amount))
  
  // Get contribution totals - handle both Goal type and dashboard goal type
  let manualTotal = 0
  let automaticTotal = 0
  
  if ('manual_contributions_total' in displayGoal) {
    manualTotal = displayGoal.manual_contributions_total || 0
  } else if ('contributions' in displayGoal && displayGoal.contributions) {
    manualTotal = displayGoal.contributions.manual_total || 0
    automaticTotal = displayGoal.contributions.automatic_total || 0
  } else {
    // Fallback calculation
    const contributionsCount = 'contributions_count' in displayGoal 
      ? (displayGoal.contributions_count || 0)
      : 0
    if (contributionsCount > 0) {
      automaticTotal = Math.max(0, current - manualTotal)
    }
  }
  
  const isCompleted = 'is_completed' in displayGoal ? displayGoal.is_completed : false

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Savings Goals</h3>
        <Link
          to="/goals"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View all ({goals.length})
        </Link>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{displayGoal.name}</span>
              {isCompleted && (
                <span className="px-2 py-0.5 text-xs font-medium bg-success-100 text-success-800 rounded-full">
                  Completed
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(current)} / {formatCurrency(target)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="h-3 rounded-full transition-all"
              style={{
                width: `${Math.min(progress, 100)}%`,
                backgroundColor:
                  isCompleted || progress >= 100
                    ? 'rgb(34 197 94)' /* success-500 */
                    : 'rgb(59 130 246)' /* primary-500 */,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>
              {Math.min(progress, 100).toFixed(1)}%
              {isCompleted ? ' (completed)' : ' complete'}
            </span>
            {'days_remaining' in displayGoal && 
             displayGoal.days_remaining !== null && 
             displayGoal.days_remaining !== undefined && (
              <span>{displayGoal.days_remaining} days remaining</span>
            )}
          </div>
          {/* Contribution breakdown */}
          {(manualTotal > 0 || automaticTotal > 0) && (
            <div className="text-xs text-gray-500 space-y-1">
              {manualTotal > 0 && (
                <div className="flex justify-between">
                  <span>Manual:</span>
                  <span>{formatCurrency(manualTotal)}</span>
                </div>
              )}
              {automaticTotal > 0 && (
                <div className="flex justify-between">
                  <span>Automatic:</span>
                  <span>{formatCurrency(automaticTotal)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {activeGoals.length > 0 && (
          <div className="flex gap-2">
            {onContribute && (
              <Button 
                variant="primary" 
                size="sm" 
                fullWidth
                onClick={() => onContribute(displayGoal.goal_id)}
              >
                Contribute
              </Button>
            )}
            <Link to="/goals" className="flex-1">
              <Button variant="secondary" size="sm" fullWidth>
                View All
              </Button>
            </Link>
          </div>
        )}
        
        {completedGoals.length > 0 && activeGoals.length === 0 && (
          <div className="text-center text-sm text-gray-500">
            <p>{completedGoals.length} goal{completedGoals.length > 1 ? 's' : ''} completed</p>
            <Link to="/goals" className="text-primary-600 hover:text-primary-700 mt-1 inline-block">
              View completed goals
            </Link>
          </div>
        )}
      </div>
    </Card>
  )
}

