/**
 * Goal card component
 */
import Card from '@/components/common/Card'
import Button from '@/components/common/Button'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/helpers'
import type { Goal } from '@/types/goal.types'

export interface GoalCardProps {
  goal: Goal
  onContribute?: () => void
  onView?: () => void
  onEdit?: () => void
  onComplete?: () => void
  onArchive?: () => void
  onUnarchive?: () => void
  onDelete?: () => void
  onAuthorize?: () => void
  onSyncBalance?: () => void
}

export default function GoalCard({
  goal,
  onContribute,
  onView,
  onEdit,
  onComplete,
  onArchive,
  onUnarchive,
  onDelete,
  onAuthorize,
  onSyncBalance,
}: GoalCardProps) {
  const progress = goal.progress_percentage || 0
  const current = parseFloat(goal.current_amount)
  const target = parseFloat(goal.target_amount)
  const isCompleted = goal.is_completed
  const isArchived = !!goal.archived_at
  const manualTotal = goal.manual_contributions_total || 0
  const automaticTotal = (goal.contributions_count || 0) > 0 
    ? (current - manualTotal) 
    : 0

  return (
    <Card clickable={!!onView} onClick={onView}>
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
          <div className="flex flex-col items-end gap-1">
            {isCompleted && (
              <span className="px-2 py-1 text-xs font-medium bg-success-100 text-success-800 rounded-full">
                Completed
              </span>
            )}
            {isArchived && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                Archived
              </span>
            )}
            {goal.is_activation_pending && !isArchived && (
              <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                Pending Authorization
              </span>
            )}
            {!goal.is_active && !isArchived && !goal.is_activation_pending && (
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                Inactive
              </span>
            )}
          </div>
        </div>
        {/* Destination account info */}
        {(goal.destination_account_name || goal.destination_account_type) && (
          <div className="mb-2">
            <span className="text-xs text-gray-500">
              Account: <span className="font-medium">{goal.destination_account_name || 'Cash'}</span>
              {goal.destination_account_type && goal.destination_account_type !== 'cash' && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                  {goal.destination_account_type}
                </span>
              )}
              {goal.destination_account_type === 'cash' && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-800 rounded">
                  Cash
                </span>
              )}
            </span>
          </div>
        )}
        {/* Contribution rules summary */}
        {goal.contribution_rules?.enabled && goal.contribution_rules.source_accounts.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-gray-500">
              Auto-contributing from {goal.contribution_rules.source_accounts.length} account(s)
            </p>
          </div>
        )}
        {/* Reminder status for cash goals */}
        {goal.reminder_settings?.enabled && goal.destination_account_type === 'cash' && (
          <div className="mb-2">
            <p className="text-xs text-gray-500">
              Reminders: {goal.reminder_settings.frequency}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            {formatCurrency(current)} / {formatCurrency(target)}
          </span>
          <span className="text-sm font-medium text-gray-900">
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className={cn(
              'h-3 rounded-full transition-all',
              progress >= 100 || isCompleted ? 'bg-success-500' : 'bg-primary-500'
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
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

      {goal.deadline && (
        <p className="text-xs text-gray-500 mb-4">
          Deadline: {new Date(goal.deadline).toLocaleDateString()}
          {goal.days_remaining !== null && goal.days_remaining !== undefined && (
            <span className="ml-2">
              ({goal.days_remaining} days remaining)
            </span>
          )}
        </p>
      )}

      {goal.inferred_category_name && (
        <p className="text-xs text-gray-500 mb-4">
          Category: {goal.inferred_category_name}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {goal.is_activation_pending && onAuthorize && !isArchived && (
          <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); onAuthorize(); }} fullWidth>
            Authorize Transfers
          </Button>
        )}
        {goal.destination_account_id && onSyncBalance && !isArchived && (
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onSyncBalance(); }} fullWidth>
            Sync Balance
          </Button>
        )}
        {onContribute && !isCompleted && !isArchived && goal.is_active && (
          <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); onContribute(); }} fullWidth>
            Contribute
          </Button>
        )}
        {(onEdit || onComplete || onArchive || onUnarchive || onDelete) && (
          <div className="flex gap-2">
            {onEdit && !isArchived && (
              <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(); }} fullWidth>
                Edit
              </Button>
            )}
            {onComplete && !isCompleted && !isArchived && (
              <Button
                variant="success"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onComplete(); }}
                fullWidth
              >
                Complete
              </Button>
            )}
            {onArchive && !isArchived && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onArchive(); }}
                fullWidth
              >
                Archive
              </Button>
            )}
            {onUnarchive && isArchived && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onUnarchive(); }}
                fullWidth
              >
                Restore
              </Button>
            )}
            {onDelete && (
              <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} fullWidth>
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

