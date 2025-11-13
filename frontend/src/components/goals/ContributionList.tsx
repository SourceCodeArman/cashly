/**
 * ContributionList component
 */
import { formatCurrency } from '@/utils/formatters'
import Button from '@/components/common/Button'
import type { Contribution } from '@/types/goal.types'

export interface ContributionListProps {
  contributions: Contribution[]
  isLoading?: boolean
  onEdit?: (contributionId: string) => void
  onDelete?: (contributionId: string) => void
  goalId?: string
}

export default function ContributionList({
  contributions,
  isLoading,
  onEdit,
  onDelete,
  goalId,
}: ContributionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-md" />
        ))}
      </div>
    )
  }

  if (contributions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No contributions yet</p>
        <p className="text-sm mt-1">Contributions will appear here when you add them</p>
      </div>
    )
  }

  // Group contributions by month
  const groupedByMonth = contributions.reduce((acc, contribution) => {
    const date = new Date(contribution.date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(contribution)
    return acc
  }, {} as Record<string, Contribution[]>)

  const sortedMonths = Object.keys(groupedByMonth).sort().reverse()

  return (
    <div className="space-y-6">
      {sortedMonths.map((monthKey) => {
        const monthContributions = groupedByMonth[monthKey]
        const [year, month] = monthKey.split('-')
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })
        const monthTotal = monthContributions.reduce((sum, c) => sum + parseFloat(c.amount), 0)

        return (
          <div key={monthKey} className="space-y-2">
            <div className="flex items-center justify-between pb-2 border-b">
              <h4 className="font-semibold text-gray-900">{monthName}</h4>
              <span className="text-sm font-medium text-gray-600">
                Total: {formatCurrency(monthTotal)}
              </span>
            </div>
            <div className="space-y-2">
              {monthContributions.map((contribution) => {
                const isManual = contribution.source === 'manual'
                const canEdit = isManual && onEdit
                const canDelete = isManual && onDelete

                return (
                  <div
                    key={contribution.contribution_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {formatCurrency(parseFloat(contribution.amount))}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            isManual
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isManual ? 'Manual' : 'Automatic'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {new Date(contribution.date).toLocaleDateString()}
                        {contribution.note && <span className="ml-2">• {contribution.note}</span>}
                      </div>
                    </div>
                    {(canEdit || canDelete) && (
                      <div className="flex gap-2 ml-4">
                        {canEdit && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onEdit?.(contribution.contribution_id)}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => onDelete?.(contribution.contribution_id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

