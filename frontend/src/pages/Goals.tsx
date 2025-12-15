import { useState } from 'react'
import { Plus, Target as TargetIcon, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SkeletonCard } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'
import { useGoals, useCreateGoal, useContributeToGoal } from '@/hooks/useGoals'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SavingsRulesManager } from '@/components/goals/SavingsRulesManager'
import { PageHeader } from "@/components/PageHeader"

const createGoalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  targetAmount: z.number().min(0.01, 'Target amount must be greater than 0'),
  deadline: z.string().optional(),
  goalType: z.string().optional(),
})

type CreateGoalForm = z.infer<typeof createGoalSchema>

const contributionSchema = z.object({
  amount: z.number().min(0.01, 'Contribution amount must be greater than 0'),
  note: z.string().max(200).optional(),
})

type ContributionForm = z.infer<typeof contributionSchema>

export function Goals() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const { data: goals, isLoading } = useGoals()
  const createGoal = useCreateGoal()
  const contributeToGoal = useContributeToGoal()

  const {
    register: registerCreateGoal,
    handleSubmit: handleCreateGoalSubmit,
    formState: { errors: createGoalErrors },
    reset: resetCreateGoalForm,
    watch: watchCreateGoal,
    setValue: setCreateGoalValue,
  } = useForm<CreateGoalForm>({
    resolver: zodResolver(createGoalSchema),
  })

  const {
    register: registerContribution,
    handleSubmit: handleContributionSubmit,
    formState: { errors: contributionErrors },
    reset: resetContributionForm,
    watch: watchContribution,
    setValue: setContributionValue,
  } = useForm<ContributionForm>({
    resolver: zodResolver(contributionSchema),
  })

  const onSubmit = async (data: CreateGoalForm) => {
    try {
      await createGoal.mutateAsync({
        name: data.name,
        targetAmount: data.targetAmount,
        deadline: data.deadline,
        goalType: data.goalType || 'custom',
      })
      resetCreateGoalForm()
      setDialogOpen(false)
    } catch (error) {
      console.error('Error creating goal:', error)
    }
  }

  const onContribute = async (data: ContributionForm) => {
    if (!selectedGoalId) return
    try {
      await contributeToGoal.mutateAsync({
        id: selectedGoalId,
        amount: data.amount,
        note: data.note?.trim() ? data.note.trim() : undefined,
      })
      resetContributionForm()
      setContributionDialogOpen(false)
      setSelectedGoalId(null)
    } catch (error) {
      console.error('Error contributing to goal:', error)
    }
  }

  const handleOpenContributionDialog = (goalId: string) => {
    setSelectedGoalId(goalId)
    resetContributionForm()
    setContributionDialogOpen(true)
  }

  // Show all non-completed goals as active (isActive is for whether goal can receive contributions)
  // Completed goals are shown separately
  // Use explicit boolean check to handle undefined values
  const activeGoals = goals?.filter((goal) => goal.isCompleted !== true) || []
  const completedGoals = goals?.filter((goal) => goal.isCompleted === true) || []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      {/* Page Header */}
      <PageHeader
        title="Goals"
        description="Track your savings goals and monitor your progress"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-accent">
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Set a savings goal and track your progress toward achieving it
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGoalSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Goal Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Emergency Fund"
                  {...registerCreateGoal('name')}
                />
                {createGoalErrors.name && (
                  <p className="text-sm text-destructive">{createGoalErrors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Target Amount</Label>
                <CurrencyInput
                  id="targetAmount"
                  value={watchCreateGoal('targetAmount')}
                  onChange={(value) => {
                    setCreateGoalValue('targetAmount', value, { shouldValidate: true })
                  }}
                />
                {createGoalErrors.targetAmount && (
                  <p className="text-sm text-destructive">{createGoalErrors.targetAmount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Target Date (Optional)</Label>
                <Input
                  id="deadline"
                  type="date"
                  {...registerCreateGoal('deadline')}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-accent" disabled={createGoal.isPending}>
                  Create Goal
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Active Goals */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Active Goals</h2>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : activeGoals.length === 0 ? (
          <EmptyState
            icon={TargetIcon}
            title="No active goals yet"
            description="Create your first savings goal to start tracking your progress toward financial milestones."
            actionLabel="Create Goal"
            onAction={() => setDialogOpen(true)}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {activeGoals.map((goal) => {
              const current = parseFloat(goal.currentAmount)
              const target = parseFloat(goal.targetAmount)
              const progress = target > 0 ? (current / target) * 100 : 0
              return (
                <Card key={goal.id} className="border-border shadow-soft">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TargetIcon className="h-5 w-5 text-primary" />
                        <CardTitle>{goal.name}</CardTitle>
                      </div>
                      <Badge>{goal.goalType}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Current</div>
                        <div className="text-lg font-semibold">{formatCurrency(current)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Target</div>
                        <div className="text-lg font-semibold">{formatCurrency(target)}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {goal.deadline ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Target: {formatDate(goal.deadline)}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No target date</div>
                      )}
                      <Button size="sm" onClick={() => handleOpenContributionDialog(goal.id)}>
                        Contribute
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Automated Savings Rules */}
      <SavingsRulesManager />

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Completed Goals</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {completedGoals.map((goal) => {
              const current = parseFloat(goal.currentAmount)
              const target = parseFloat(goal.targetAmount)
              return (
                <Card
                  key={goal.id}
                  className="border-border opacity-60 shadow-soft"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TargetIcon className="h-5 w-5 text-success" />
                        <CardTitle>{goal.name}</CardTitle>
                      </div>
                      <Badge variant="outline">Completed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Achieved</div>
                        <div className="text-lg font-semibold text-success">
                          {formatCurrency(current)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Target</div>
                        <div className="text-lg font-semibold">{formatCurrency(target)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <Dialog open={contributionDialogOpen} onOpenChange={(open) => {
        setContributionDialogOpen(open)
        if (!open) {
          setSelectedGoalId(null)
          resetContributionForm()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contribute to Goal</DialogTitle>
            <DialogDescription>
              {selectedGoalId
                ? `Add a manual contribution to ${goals?.find((goal) => goal.id === selectedGoalId)?.name ?? 'this goal'}.`
                : 'Select a goal to contribute to.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContributionSubmit(onContribute)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contributionAmount">Amount</Label>
              <CurrencyInput
                id="contributionAmount"
                value={watchContribution('amount')}
                onChange={(value) => {
                  setContributionValue('amount', value, { shouldValidate: true })
                }}
              />
              {contributionErrors.amount && (
                <p className="text-sm text-destructive">{contributionErrors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contributionNote">Note (Optional)</Label>
              <Textarea
                id="contributionNote"
                placeholder="e.g., Paycheck deposit"
                {...registerContribution('note')}
              />
              {contributionErrors.note && (
                <p className="text-sm text-destructive">{contributionErrors.note.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setContributionDialogOpen(false)
                  setSelectedGoalId(null)
                  resetContributionForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-accent" disabled={contributeToGoal.isPending || !selectedGoalId}>
                {contributeToGoal.isPending ? 'Saving...' : 'Add Contribution'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

