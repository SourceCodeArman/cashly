/**
 * Goal list component
 */
import GoalCard from './GoalCard'
import EmptyState from '@/components/common/EmptyState'
import { Skeleton } from '@/components/common/LoadingSpinner'
import type { Goal } from '@/types/goal.types'

export interface GoalListProps {
  goals: Goal[]
  isLoading?: boolean
  onContribute?: (goalId: string) => void
  onView?: (goalId: string) => void
  onEdit?: (goalId: string) => void
  onComplete?: (goalId: string) => void
  onArchive?: (goalId: string) => void
  onUnarchive?: (goalId: string) => void
  onDelete?: (goalId: string) => void
  onAuthorize?: (goalId: string) => void
  onSyncBalance?: (goalId: string) => void
}

export default function GoalList({
  goals,
  isLoading,
  onContribute,
  onView,
  onEdit,
  onComplete,
  onArchive,
  onUnarchive,
  onDelete,
  onAuthorize,
  onSyncBalance,
}: GoalListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <EmptyState
        title="No goals yet"
        description="Create a savings goal to track your progress"
        actionLabel="Create Goal"
        onAction={() => (window.location.href = '/goals')}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {goals.map((goal) => (
        <GoalCard
          key={goal.goal_id}
          goal={goal}
          onContribute={onContribute ? () => onContribute(goal.goal_id) : undefined}
          onView={onView ? () => onView(goal.goal_id) : undefined}
          onEdit={onEdit ? () => onEdit(goal.goal_id) : undefined}
          onComplete={onComplete ? () => onComplete(goal.goal_id) : undefined}
          onArchive={onArchive ? () => onArchive(goal.goal_id) : undefined}
          onUnarchive={onUnarchive ? () => onUnarchive(goal.goal_id) : undefined}
          onDelete={onDelete ? () => onDelete(goal.goal_id) : undefined}
          onAuthorize={onAuthorize ? () => onAuthorize(goal.goal_id) : undefined}
          onSyncBalance={onSyncBalance ? () => onSyncBalance(goal.goal_id) : undefined}
        />
      ))}
    </div>
  )
}

