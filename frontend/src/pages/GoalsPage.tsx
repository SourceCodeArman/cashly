/**
 * Goals page
 */
import { useState } from 'react'
import { useGoals } from '@/hooks/useGoals'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import GoalList from '@/components/goals/GoalList'
import ContributionList from '@/components/goals/ContributionList'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import EditGoalModal from '@/components/goals/EditGoalModal'
import ContributionModal from '@/components/goals/ContributionModal'
import TransferModal from '@/components/goals/TransferModal'
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal'
import { formatCurrency } from '@/utils/formatters'
import type { Goal, ContributionRulesConfig, ReminderSettings } from '@/types/goal.types'
import type { Account } from '@/types/account.types'

const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  target_amount: z.number().min(0.01, 'Target amount must be greater than 0'),
  deadline: z.string().optional(),
  goal_type: z.enum(['emergency_fund', 'vacation', 'purchase', 'debt_payoff', 'custom']).optional(),
  monthly_contribution: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined
      if (typeof val === 'number' && isNaN(val)) return undefined
      return val
    },
    z.coerce.number().min(0).optional()
  ),
  inferred_category_id: z.string().optional().nullable(),
  destination_account_id: z.string().optional().nullable(),
  contribution_rules: z.any().optional(),
  reminder_settings: z.any().optional(),
})

type GoalFormData = z.infer<typeof goalSchema>

type FilterType = 'all' | 'active' | 'completed' | 'archived'

export default function GoalsPage() {
  const [filter, setFilter] = useState<FilterType>('active')
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showContributionModal, setShowContributionModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showContributionsModal, setShowContributionsModal] = useState(false)
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showAuthorizationModal, setShowAuthorizationModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  
  // Determine filter values for API
  const isActive = filter === 'active' ? true : filter === 'archived' ? false : undefined
  const isCompleted = filter === 'completed' ? true : undefined
  
  const {
    goals,
    isLoading,
    error,
    refetch,
    createGoal,
    isCreating,
    updateGoal,
    isUpdating,
    deleteGoal,
    isDeleting,
    addContribution,
    isAddingContribution,
    completeGoal,
    completeGoalAsync,
    isCompleting,
    archiveGoal,
    archiveGoalAsync,
    isArchiving,
    unarchiveGoal,
    unarchiveGoalAsync,
    isUnarchiving,
    useContributions,
    authorizeTransfers,
    isAuthorizing,
    syncBalance,
    isSyncingBalance,
    transfer,
    isTransferring,
  } = useGoals(isActive, isCompleted)
  
  // Get categories for goal creation/edit
  const { categories } = useCategories()
  const categoryOptions = categories.map((cat) => ({
    id: cat.category_id,
    name: cat.name,
  }))
  
  // Get accounts for goal linking
  const { accounts, isLoading: isLoadingAccounts } = useAccounts()
  const goalCompatibleAccounts = accounts.filter(
    (acc: Account) => acc.account_type === 'checking' || acc.account_type === 'savings'
  )
  
  // State for contribution rules and reminder settings
  const [destinationAccountId, setDestinationAccountId] = useState<string | null>(null)
  const [selectedSourceAccounts, setSelectedSourceAccounts] = useState<string[]>([])
  const [contributionRulesEnabled, setContributionRulesEnabled] = useState(false)
  const [reminderSettingsEnabled, setReminderSettingsEnabled] = useState(false)
  
  // Get contributions for selected goal
  const contributionsQuery = useContributions(selectedGoal?.goal_id || '')
  const contributions = contributionsQuery.data || []
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema) as any,
  })

  const onSubmit = async (data: GoalFormData) => {
    // Build contribution rules if enabled
    let contributionRules: ContributionRulesConfig | undefined
    if (contributionRulesEnabled && destinationAccountId) {
      contributionRules = {
        enabled: true,
        destination_account_id: destinationAccountId,
        source_accounts: selectedSourceAccounts.map(accountId => ({
          account_id: accountId,
          rule: {
            type: 'fixed_monthly' as const,
            amount: 100, // Default, will be configurable in full implementation
            frequency: 'monthly' as const,
          },
        })),
      }
    }
    
    // Build reminder settings if enabled and cash goal
    let reminderSettings: ReminderSettings | undefined
    if (reminderSettingsEnabled && !destinationAccountId) {
      reminderSettings = {
        enabled: true,
        frequency: 'weekly',
        channels: ['email'],
        day_of_week: 1, // Monday
        time: '09:00',
      }
    }
    
    await createGoal({
      name: data.name,
      target_amount: data.target_amount,
      deadline: data.deadline,
      goal_type: data.goal_type,
      monthly_contribution: data.monthly_contribution,
      inferred_category_id: data.inferred_category_id || null,
      destination_account_id: destinationAccountId || null,
      contribution_rules: contributionRules,
      reminder_settings: reminderSettings,
    })
    reset()
    setDestinationAccountId(null)
    setSelectedSourceAccounts([])
    setContributionRulesEnabled(false)
    setReminderSettingsEnabled(false)
    setShowCreateModal(false)
  }

  const filteredGoals = goals.filter((goal) => {
    if (filter === 'all') return true
    if (filter === 'active') return goal.is_active && !goal.archived_at && !goal.is_completed
    if (filter === 'completed') return goal.is_completed && !goal.archived_at
    if (filter === 'archived') return goal.archived_at
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
          <p className="text-gray-600 mt-1">Track your savings progress</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          Create Goal
        </Button>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'active' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={filter === 'completed' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed
        </Button>
        <Button
          variant={filter === 'archived' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('archived')}
        >
          Archived
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <ErrorMessage
          title="Failed to load goals"
          message={error instanceof Error ? error.message : 'An error occurred'}
          onRetry={() => refetch()}
        />
      ) : (
        <GoalList
          goals={filteredGoals}
          onContribute={(goalId) => {
            const g = goals.find((x) => x.goal_id === goalId) || null
            setSelectedGoal(g)
            setShowContributionModal(true)
          }}
          onEdit={(goalId) => {
            const g = goals.find((x) => x.goal_id === goalId) || null
            setSelectedGoal(g)
            setShowEditModal(true)
          }}
          onComplete={(goalId) => {
            const g = goals.find((x) => x.goal_id === goalId) || null
            if (g) {
              setSelectedGoal(g)
              // Check if goal has reached its target
              const current = parseFloat(g.current_amount)
              const target = parseFloat(g.target_amount)
              const hasReachedTarget = current >= target
              
              if (hasReachedTarget) {
                // Goal has reached target, complete immediately
                completeGoal(goalId)
              } else {
                // Goal hasn't reached target, show confirmation
                setShowCompleteModal(true)
              }
            }
          }}
          onArchive={(goalId) => {
            const g = goals.find((x) => x.goal_id === goalId) || null
            setSelectedGoal(g)
            setShowArchiveModal(true)
          }}
          onUnarchive={(goalId) => {
            unarchiveGoal(goalId)
          }}
          onDelete={(goalId) => {
            const g = goals.find((x) => x.goal_id === goalId) || null
            setSelectedGoal(g)
            setShowDeleteModal(true)
          }}
          onView={(goalId) => {
            const g = goals.find((x) => x.goal_id === goalId) || null
            setSelectedGoal(g)
            setShowContributionsModal(true)
          }}
          onAuthorize={async (goalId) => {
            const g = goals.find((x) => x.goal_id === goalId) || null
            setSelectedGoal(g)
            if (g) {
              setShowAuthorizationModal(true)
            }
          }}
          onSyncBalance={(goalId) => {
            const g = goals.find((x) => x.goal_id === goalId) || null
            setSelectedGoal(g)
            if (g) {
              syncBalance(goalId)
            }
          }}
          onTransfer={(goalId) => {
            const g = goals.find((x) => x.goal_id === goalId) || null
            setSelectedGoal(g)
            if (g) {
              setShowTransferModal(true)
            }
          }}
        />
      )}

      {/* Edit Goal */}
      {selectedGoal && (
        <EditGoalModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedGoal(null)
          }}
          goal={selectedGoal}
          categories={categoryOptions}
          onSubmit={(data) => {
            updateGoal({ goalId: selectedGoal.goal_id, data })
            setShowEditModal(false)
            setSelectedGoal(null)
          }}
          isSubmitting={isUpdating}
        />
      )}

      {/* Add Contribution */}
      {selectedGoal && (
        <ContributionModal
          isOpen={showContributionModal}
          onClose={() => {
            setShowContributionModal(false)
            setSelectedGoal(null)
          }}
          onSubmit={(data) => {
            addContribution({ goalId: selectedGoal.goal_id, contribution: data })
            setShowContributionModal(false)
            setSelectedGoal(null)
          }}
          isSubmitting={isAddingContribution}
        />
      )}

      {/* Transfer Modal */}
      {selectedGoal && selectedGoal.destination_account_id && (
        <TransferModal
          isOpen={showTransferModal}
          onClose={() => {
            setShowTransferModal(false)
            setSelectedGoal(null)
          }}
          onSubmit={async (data) => {
            if (selectedGoal.destination_account_id) {
              // The TransferModal handles the transfer and shows progress
              // We just need to call the transfer mutation
              try {
                const result = await transfer({
                  sourceAccountId: data.source_account_id,
                  destinationAccountId: selectedGoal.destination_account_id,
                  goalId: selectedGoal.goal_id,
                  amount: data.amount,
                  description: data.description,
                })
                // Return result so TransferModal can handle progress
                return result
              } catch (error) {
                // Re-throw error so TransferModal can handle it
                throw error
              }
            }
          }}
          goalId={selectedGoal.goal_id}
          destinationAccountId={selectedGoal.destination_account_id}
          destinationAccountName={selectedGoal.destination_account_name}
          accounts={accounts}
          isSubmitting={isTransferring}
        />
      )}

      {/* View Contributions */}
      {selectedGoal && (
        <Modal
          isOpen={showContributionsModal}
          onClose={() => {
            setShowContributionsModal(false)
            setSelectedGoal(null)
          }}
          title={`Contributions: ${selectedGoal.name}`}
        >
          <ContributionList
            contributions={contributions}
            isLoading={contributionsQuery.isLoading}
            goalId={selectedGoal.goal_id}
          />
        </Modal>
      )}

      {/* Transfer Authorization Modal */}
      {selectedGoal && (
        <Modal
          isOpen={showAuthorizationModal}
          onClose={() => {
            setShowAuthorizationModal(false)
            setSelectedGoal(null)
          }}
          title={`Authorize Automatic Transfers: ${selectedGoal.name}`}
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              By authorizing, you agree to allow Cashly to automatically transfer funds from your source account
              to your goal's destination account based on your contribution rules.
            </p>
            
            {selectedGoal.contribution_rules?.source_accounts && selectedGoal.contribution_rules.source_accounts.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Transfer Details:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {selectedGoal.contribution_rules.source_accounts.map((source: any, idx: number) => {
                    const sourceAccount = accounts.find((acc: Account) => acc.account_id === source.account_id)
                    return (
                      <li key={idx}>
                        From: {sourceAccount?.institution_name || 'Unknown'} {sourceAccount?.account_type || ''} account
                        {source.rule?.amount && ` - $${source.rule.amount} ${source.rule.type?.replace('_', ' ') || 'per period'}`}
                      </li>
                    )
                  })}
                  <li>
                    To: {selectedGoal.destination_account_name || 'Destination Account'}
                  </li>
                </ul>
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAuthorizationModal(false)
                  setSelectedGoal(null)
                }}
                disabled={isAuthorizing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (selectedGoal) {
                    try {
                      await authorizeTransfers(selectedGoal.goal_id)
                      setShowAuthorizationModal(false)
                      setSelectedGoal(null)
                    } catch (error) {
                      console.error('Failed to authorize transfers:', error)
                    }
                  }
                }}
                disabled={isAuthorizing}
              >
                {isAuthorizing ? 'Authorizing...' : 'Authorize Automatic Transfers'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Complete */}
      {selectedGoal && (
        <ConfirmDeleteModal
          isOpen={showCompleteModal}
          onClose={() => {
            setShowCompleteModal(false)
            setSelectedGoal(null)
          }}
          title="Complete Goal"
          message={
            (() => {
              const current = parseFloat(selectedGoal.current_amount)
              const target = parseFloat(selectedGoal.target_amount)
              const progress = ((current / target) * 100).toFixed(1)
              const remaining = target - current
              
              return `The goal "${selectedGoal.name}" has not reached its target amount yet. ` +
                     `Current progress: ${formatCurrency(current)} / ${formatCurrency(target)} (${progress}%). ` +
                     `Remaining: ${formatCurrency(remaining)}. ` +
                     `Are you sure you want to mark this goal as complete?`
            })()
          }
          confirmText="Complete Anyway"
          cancelText="Cancel"
          confirmVariant="primary"
          isDeleting={isCompleting}
          onConfirm={async () => {
            try {
              await completeGoalAsync(selectedGoal.goal_id)
              setShowCompleteModal(false)
              setSelectedGoal(null)
            } catch (error) {
              // Error is already handled by the mutation
              console.error('Failed to complete goal:', error)
            }
          }}
        />
      )}

      {/* Confirm Archive */}
      {selectedGoal && (
        <ConfirmDeleteModal
          isOpen={showArchiveModal}
          onClose={() => {
            setShowArchiveModal(false)
            setSelectedGoal(null)
          }}
          title="Archive Goal"
          message={`Are you sure you want to archive the goal "${selectedGoal.name}"? You can restore it later.`}
          confirmText="Archive"
          isDeleting={isArchiving}
          onConfirm={async () => {
            try {
              await archiveGoalAsync(selectedGoal.goal_id)
              setShowArchiveModal(false)
              setSelectedGoal(null)
            } catch (error) {
              // Error is already handled by the mutation
              console.error('Failed to archive goal:', error)
            }
          }}
        />
      )}

      {/* Confirm Delete */}
      {selectedGoal && (
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedGoal(null)
          }}
          title="Delete Goal"
          message={`Are you sure you want to delete the goal "${selectedGoal.name}"? This cannot be undone.`}
          confirmText="Delete Goal"
          isDeleting={isDeleting}
          onConfirm={() => {
            deleteGoal(selectedGoal.goal_id)
            setShowDeleteModal(false)
            setSelectedGoal(null)
          }}
        />
      )}
      
      {/* Create Goal Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          reset()
        }}
        title="Create Savings Goal"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Goal Name"
            {...register('name')}
            error={errors.name?.message}
            placeholder="e.g., Emergency Fund"
          />

          <Input
            label="Target Amount"
            type="number"
            step="0.01"
            {...register('target_amount', { valueAsNumber: true })}
            error={errors.target_amount?.message}
            placeholder="1000.00"
          />

          <Input
            label="Deadline (Optional)"
            type="date"
            {...register('deadline')}
            error={errors.deadline?.message}
          />

          <Input
            label="Monthly Contribution (Optional)"
            type="number"
            step="0.01"
            {...register('monthly_contribution', { valueAsNumber: true })}
            error={errors.monthly_contribution?.message}
            placeholder="100.00"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Type (Optional)
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('goal_type')}
            >
              <option value="">Select type</option>
              <option value="emergency_fund">Emergency Fund</option>
              <option value="vacation">Vacation</option>
              <option value="purchase">Major Purchase</option>
              <option value="debt_payoff">Debt Payoff</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination Account (Optional)
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={destinationAccountId || ''}
              onChange={(e) => {
                const value = e.target.value
                setDestinationAccountId(value || null)
                if (!value) {
                  setContributionRulesEnabled(false)
                  setReminderSettingsEnabled(true) // Enable reminders for cash
                } else {
                  setReminderSettingsEnabled(false)
                }
              }}
            >
              <option value="">Cash (Physical Savings)</option>
              {isLoadingAccounts ? (
                <option disabled>Loading accounts...</option>
              ) : (
                goalCompatibleAccounts.map((acc: Account) => (
                  <option key={acc.account_id} value={acc.account_id}>
                    {acc.custom_name || acc.institution_name} - {acc.account_type} ({acc.account_number_masked}) - {formatCurrency(parseFloat(acc.balance))}
                  </option>
                ))
              )}
            </select>
            {destinationAccountId && (
              <p className="mt-1 text-xs text-blue-600">
                Starting balance will be synced from this account
              </p>
            )}
            {!destinationAccountId && (
              <p className="mt-1 text-xs text-gray-500">
                Select "Cash" if you're saving physical cash. You can set up reminders to contribute manually.
              </p>
            )}
          </div>

          {destinationAccountId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Accounts for Contributions (Optional)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {goalCompatibleAccounts
                  .filter((acc: Account) => acc.account_id !== destinationAccountId)
                  .map((acc: Account) => (
                    <label key={acc.account_id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedSourceAccounts.includes(acc.account_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSourceAccounts([...selectedSourceAccounts, acc.account_id])
                            setContributionRulesEnabled(true)
                          } else {
                            setSelectedSourceAccounts(selectedSourceAccounts.filter(id => id !== acc.account_id))
                            if (selectedSourceAccounts.length === 1) {
                              setContributionRulesEnabled(false)
                            }
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">
                        {acc.custom_name || acc.institution_name} - {acc.account_type} ({acc.account_number_masked})
                      </span>
                    </label>
                  ))}
              </div>
              {selectedSourceAccounts.length > 0 && (
                <p className="mt-1 text-xs text-blue-600">
                  {selectedSourceAccounts.length} source account(s) selected. You'll need to authorize automatic transfers after creating the goal.
                </p>
              )}
            </div>
          )}

          {!destinationAccountId && (
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={reminderSettingsEnabled}
                  onChange={(e) => setReminderSettingsEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable reminders for cash contributions
                </span>
              </label>
              {reminderSettingsEnabled && (
                <p className="mt-1 text-xs text-gray-500">
                  You'll receive email reminders to set aside cash for this goal
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category for Automatic Tracking (Optional)
            </label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('inferred_category_id')}
            >
              <option value="">None</option>
              {categoryOptions.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Transactions in this category will automatically contribute to this goal
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                reset()
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating} fullWidth>
              Create Goal
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
