import { useState, useEffect, useRef } from 'react'
import { Plus, Wallet, Calendar, Edit, Trash2, AlertTriangle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calculatePeriodDates, formatDateForAPI, formatPeriodType, isAutoCalculatedPeriod } from '@/lib/budgetUtils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Budget, CreateBudgetForm } from '@/types'
import { PageHeader } from "@/components/PageHeader"

const createBudgetSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  periodType: z.enum(['weekly', 'monthly', 'yearly', 'custom']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  periodStart: z.string().min(1, 'Period start date is required'),
  periodEnd: z.string().min(1, 'Period end date is required'),
  alertsEnabled: z.boolean().optional(),
  alertThreshold: z.number().min(0).max(100).optional(),
})

type BudgetForm = z.infer<typeof createBudgetSchema>

export function Budgets() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const { data: budgets, isLoading } = useBudgets()
  const { data: categories } = useCategories()
  const createBudget = useCreateBudget()
  const updateBudget = useUpdateBudget()
  const deleteBudget = useDeleteBudget()

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    formState: { errors: createErrors },
    reset: resetCreateForm,
    watch: watchCreate,
    setValue: setCreateValue,
  } = useForm<BudgetForm>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: {
      periodType: 'monthly',
      alertsEnabled: true,
      alertThreshold: 80,
    },
  })

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors },
    reset: resetEditForm,
    watch: watchEdit,
    setValue: setEditValue,
  } = useForm<BudgetForm>({
    resolver: zodResolver(createBudgetSchema),
  })

  const watchedPeriodType = watchCreate('periodType')
  const watchedPeriodStart = watchCreate('periodStart')
  const watchedPeriodEnd = watchCreate('periodEnd')
  const watchedEditPeriodType = watchEdit('periodType')
  const watchedEditPeriodStart = watchEdit('periodStart')
  const watchedEditPeriodEnd = watchEdit('periodEnd')

  // Refs to prevent circular updates and track which field was changed
  const createUpdatingRef = useRef<'start' | 'end' | 'both' | null>(null)
  const editUpdatingRef = useRef<'start' | 'end' | null>(null)
  const createInitializedRef = useRef(false)
  const lastPeriodTypeRef = useRef<string | null>(null)
  const lastChangedFieldRef = useRef<'start' | 'end' | 'type' | null>(null)
  const editLastChangedFieldRef = useRef<'start' | 'end' | 'type' | null>(null)

  // Initialize period dates only once when create dialog opens
  useEffect(() => {
    if (createDialogOpen && !createInitializedRef.current) {
      // Get today's date in local timezone (avoid timezone issues)
      const today = new Date()
      const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      // Use current period type or default to 'monthly'
      const periodType = watchedPeriodType || 'monthly'

      if (isAutoCalculatedPeriod(periodType)) {
        // Auto-calculate for non-custom periods
        const { periodStart, periodEnd } = calculatePeriodDates(periodType, todayLocal)
        createUpdatingRef.current = 'both'
        setCreateValue('periodStart', formatDateForAPI(periodStart), { shouldValidate: false })
        setCreateValue('periodEnd', formatDateForAPI(periodEnd), { shouldValidate: false })
      } else {
        // For custom periods, set both dates to today (user will adjust manually)
        createUpdatingRef.current = 'both'
        setCreateValue('periodStart', formatDateForAPI(todayLocal), { shouldValidate: false })
        setCreateValue('periodEnd', formatDateForAPI(todayLocal), { shouldValidate: false })
      }

      lastPeriodTypeRef.current = periodType
      setTimeout(() => {
        createUpdatingRef.current = null
        createInitializedRef.current = true
      }, 100)
    } else if (!createDialogOpen) {
      // Reset initialization flag when dialog closes
      createInitializedRef.current = false
      lastPeriodTypeRef.current = null
      lastChangedFieldRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createDialogOpen])

  // Track period type changes (create form)
  useEffect(() => {
    const periodTypeChanged = lastPeriodTypeRef.current !== watchedPeriodType && lastPeriodTypeRef.current !== null

    if (periodTypeChanged && createDialogOpen && createInitializedRef.current) {
      lastChangedFieldRef.current = 'type'
    }

    lastPeriodTypeRef.current = watchedPeriodType || null
  }, [watchedPeriodType, createDialogOpen])

  // Auto-calculate period end when period start changes OR period type changes (create form)
  // Skip auto-calculation for custom periods
  useEffect(() => {
    if (
      watchedPeriodType &&
      watchedPeriodStart &&
      createDialogOpen &&
      createInitializedRef.current &&
      createUpdatingRef.current !== 'end' &&
      createUpdatingRef.current !== 'both' &&
      isAutoCalculatedPeriod(watchedPeriodType) &&
      (lastChangedFieldRef.current === 'start' || lastChangedFieldRef.current === 'type')
    ) {
      // Parse the start date using local date components to avoid timezone issues
      const startDateMatch = watchedPeriodStart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
      if (startDateMatch) {
        const [, year, month, day] = startDateMatch
        const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        const { periodEnd } = calculatePeriodDates(watchedPeriodType, startDate)
        createUpdatingRef.current = 'end'
        setCreateValue('periodEnd', formatDateForAPI(periodEnd), { shouldValidate: false })
        setTimeout(() => {
          createUpdatingRef.current = null
          lastChangedFieldRef.current = null
        }, 100)
      }
    }
  }, [watchedPeriodType, watchedPeriodStart, createDialogOpen, setCreateValue])

  // Auto-calculate period start when period end changes (create form)
  // Skip auto-calculation for custom periods
  useEffect(() => {
    if (
      watchedPeriodType &&
      watchedPeriodEnd &&
      createDialogOpen &&
      createInitializedRef.current &&
      createUpdatingRef.current !== 'start' &&
      createUpdatingRef.current !== 'both' &&
      isAutoCalculatedPeriod(watchedPeriodType) &&
      lastChangedFieldRef.current === 'end'
    ) {
      // Parse the end date using local date components to avoid timezone issues
      const endDateMatch = watchedPeriodEnd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
      if (endDateMatch) {
        const [, year, month, day] = endDateMatch
        const endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        // Calculate start date by working backwards from end date
        const startDate = new Date(endDate)
        switch (watchedPeriodType) {
          case 'weekly':
            startDate.setDate(startDate.getDate() - 6) // 7 days total
            break
          case 'monthly':
            startDate.setDate(1) // First day of the month
            break
          case 'yearly':
            startDate.setMonth(0)
            startDate.setDate(1) // First day of the year
            break
        }
        createUpdatingRef.current = 'start'
        setCreateValue('periodStart', formatDateForAPI(startDate), { shouldValidate: false })
        setTimeout(() => {
          createUpdatingRef.current = null
          lastChangedFieldRef.current = null
        }, 100)
      }
    }
  }, [watchedPeriodType, watchedPeriodEnd, createDialogOpen, setCreateValue])

  // Track period type changes (edit form)
  const editLastPeriodTypeRef = useRef<string | null>(null)
  useEffect(() => {
    const periodTypeChanged = editLastPeriodTypeRef.current !== watchedEditPeriodType && editLastPeriodTypeRef.current !== null

    if (periodTypeChanged && editDialogOpen) {
      editLastChangedFieldRef.current = 'type'
    }

    editLastPeriodTypeRef.current = watchedEditPeriodType || null
  }, [watchedEditPeriodType, editDialogOpen])

  // Auto-calculate period end when period start changes OR period type changes (edit form)
  // Skip auto-calculation for custom periods
  useEffect(() => {
    if (
      watchedEditPeriodType &&
      watchedEditPeriodStart &&
      editDialogOpen &&
      editUpdatingRef.current !== 'end' &&
      isAutoCalculatedPeriod(watchedEditPeriodType) &&
      (editLastChangedFieldRef.current === 'start' || editLastChangedFieldRef.current === 'type')
    ) {
      // Parse the start date using local date components to avoid timezone issues
      const startDateMatch = watchedEditPeriodStart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
      if (startDateMatch) {
        const [, year, month, day] = startDateMatch
        const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        const { periodEnd } = calculatePeriodDates(watchedEditPeriodType, startDate)
        editUpdatingRef.current = 'end'
        setEditValue('periodEnd', formatDateForAPI(periodEnd), { shouldValidate: false })
        setTimeout(() => {
          editUpdatingRef.current = null
          editLastChangedFieldRef.current = null
        }, 100)
      }
    }
  }, [watchedEditPeriodType, watchedEditPeriodStart, editDialogOpen, setEditValue])

  // Auto-calculate period start when period end changes (edit form)
  // Skip auto-calculation for custom periods
  useEffect(() => {
    if (
      watchedEditPeriodType &&
      watchedEditPeriodEnd &&
      editDialogOpen &&
      editUpdatingRef.current !== 'start' &&
      isAutoCalculatedPeriod(watchedEditPeriodType) &&
      editLastChangedFieldRef.current === 'end'
    ) {
      // Parse the end date using local date components to avoid timezone issues
      const endDateMatch = watchedEditPeriodEnd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
      if (!endDateMatch) return

      const [, year, month, day] = endDateMatch
      const endDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      // Calculate start date by working backwards from end date
      const startDate = new Date(endDate)
      switch (watchedEditPeriodType) {
        case 'weekly':
          startDate.setDate(startDate.getDate() - 6) // 7 days total
          break
        case 'monthly':
          startDate.setDate(1) // First day of the month
          break
        case 'yearly':
          startDate.setMonth(0)
          startDate.setDate(1) // First day of the year
          break
      }
      editUpdatingRef.current = 'start'
      setEditValue('periodStart', formatDateForAPI(startDate), { shouldValidate: false })
      setTimeout(() => {
        editUpdatingRef.current = null
        editLastChangedFieldRef.current = null
      }, 100)
    }
  }, [watchedEditPeriodType, watchedEditPeriodEnd, editDialogOpen, setEditValue])

  // Helper function to get category display name
  // Since parentCategoryName is null, we just return the category name
  const getCategoryDisplayName = (category: { name: string; parentCategoryName?: string }) => {
    // If parent category name exists, return it
    if (category.parentCategoryName) {
      return category.parentCategoryName
    }
    // Otherwise, return the category name itself
    return category.name.trim()
  }

  const expenseCategories = categories?.filter((cat) => cat.type === 'expense') || []

  const onSubmitCreate = async (data: BudgetForm) => {
    try {
      const payload: CreateBudgetForm = {
        category: data.category,
        periodType: data.periodType,
        amount: data.amount,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        alertsEnabled: data.alertsEnabled ?? true,
        alertThreshold: data.alertThreshold ?? 80,
      }
      await createBudget.mutateAsync(payload)
      resetCreateForm()
      setCreateDialogOpen(false)
    } catch (error) {
      console.error('Error creating budget:', error)
    }
  }

  const onSubmitEdit = async (data: BudgetForm) => {
    if (!selectedBudget) return
    try {
      const payload: Partial<CreateBudgetForm> = {
        category: data.category,
        periodType: data.periodType,
        amount: data.amount,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        alertsEnabled: data.alertsEnabled,
        alertThreshold: data.alertThreshold,
      }
      await updateBudget.mutateAsync({ id: selectedBudget.id, data: payload })
      resetEditForm()
      setEditDialogOpen(false)
      setSelectedBudget(null)
      editLastChangedFieldRef.current = null
      editLastPeriodTypeRef.current = null
    } catch (error) {
      console.error('Error updating budget:', error)
    }
  }

  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget)
    const budgetAmount = parseFloat(budget.amount)
    resetEditForm({
      category: budget.categoryId,
      periodType: budget.periodType,
      amount: budgetAmount,
      periodStart: budget.periodStart,
      periodEnd: budget.periodEnd,
      alertsEnabled: budget.alertsEnabled,
      alertThreshold: parseFloat(budget.alertThreshold),
    })
    editLastChangedFieldRef.current = null
    editLastPeriodTypeRef.current = budget.periodType
    setEditDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedBudget) return
    try {
      await deleteBudget.mutateAsync(selectedBudget.id)
      setDeleteDialogOpen(false)
      setSelectedBudget(null)
    } catch (error) {
      console.error('Error deleting budget:', error)
    }
  }

  const getBudgetStatusColor = (percentageUsed: number, alertThreshold: number) => {
    if (percentageUsed >= 100) return 'text-destructive'
    if (percentageUsed >= alertThreshold) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      {/* Page Header */}
      <PageHeader
        title="Budgets"
        description="Set spending limits by category and track your budget usage"
      >
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-accent" onClick={() => resetCreateForm()}>
              <Plus className="mr-2 h-4 w-4" />
              New Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Set a spending limit for a category over a specific time period
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit(onSubmitCreate)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={watchCreate('category')}
                  onValueChange={(value) => setCreateValue('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {getCategoryDisplayName(category)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createErrors.category && (
                  <p className="text-sm text-destructive">{createErrors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Budget Amount</Label>
                <CurrencyInput
                  id="amount"
                  value={watchCreate('amount')}
                  onChange={(value) => {
                    setCreateValue('amount', value, { shouldValidate: true })
                  }}
                />
                {createErrors.amount && (
                  <p className="text-sm text-destructive">{createErrors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodType">Period Type</Label>
                <Select
                  value={watchCreate('periodType')}
                  onValueChange={(value) => {
                    lastChangedFieldRef.current = 'type'
                    setCreateValue('periodType', value as 'weekly' | 'monthly' | 'yearly' | 'custom')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {createErrors.periodType && (
                  <p className="text-sm text-destructive">{createErrors.periodType.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periodStart">Period Start</Label>
                  <DatePicker
                    value={watchCreate('periodStart')}
                    onChange={(value) => {
                      lastChangedFieldRef.current = 'start'
                      setCreateValue('periodStart', value)
                    }}
                    placeholder="Select start date"
                  />
                  {createErrors.periodStart && (
                    <p className="text-sm text-destructive">{createErrors.periodStart.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodEnd">Period End</Label>
                  <DatePicker
                    value={watchCreate('periodEnd')}
                    onChange={(value) => {
                      lastChangedFieldRef.current = 'end'
                      setCreateValue('periodEnd', value)
                    }}
                    placeholder="Select end date"
                  />
                  {createErrors.periodEnd && (
                    <p className="text-sm text-destructive">{createErrors.periodEnd.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="alertsEnabled">Enable Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Get notified when approaching budget limit
                  </p>
                </div>
                <Switch
                  id="alertsEnabled"
                  checked={watchCreate('alertsEnabled') ?? true}
                  onCheckedChange={(checked) => setCreateValue('alertsEnabled', checked)}
                />
              </div>

              {watchCreate('alertsEnabled') && (
                <div className="space-y-2">
                  <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                  <Input
                    id="alertThreshold"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="80"
                    {...registerCreate('alertThreshold', { valueAsNumber: true })}
                  />
                  {createErrors.alertThreshold && (
                    <p className="text-sm text-destructive">
                      {createErrors.alertThreshold.message}
                    </p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false)
                    resetCreateForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-accent" disabled={createBudget.isPending}>
                  Create Budget
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Budgets List */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !budgets || budgets.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No budgets created</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Create your first budget to start tracking your spending limits
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {budgets.map((budget) => {
            const usage = budget.usage
            const percentageUsed = usage?.percentageUsed ?? 0
            const spent = parseFloat(usage?.spent ?? '0')
            const remaining = parseFloat(usage?.remaining ?? budget.amount)
            const budgetAmount = parseFloat(budget.amount)
            const alertThreshold = parseFloat(budget.alertThreshold)

            return (
              <Card key={budget.id} className="border-border shadow-soft">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-primary" />
                      <CardTitle>{budget.categoryName}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{formatPeriodType(budget.periodType)}</Badge>
                      {usage?.isOverBudget && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Over Budget
                        </Badge>
                      )}
                      {usage?.alertThresholdReached && !usage.isOverBudget && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                          Alert
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {usage && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Usage</span>
                        <span
                          className={`font-semibold ${getBudgetStatusColor(
                            percentageUsed,
                            alertThreshold
                          )}`}
                        >
                          {percentageUsed.toFixed(1)}%
                        </span>
                      </div>
                      <div className="relative">
                        <Progress
                          value={Math.min(percentageUsed, 100)}
                          className="h-2"
                        />
                        <div
                          className="absolute top-0 left-0 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(percentageUsed, 100)}%`,
                            backgroundColor:
                              percentageUsed >= 100
                                ? 'hsl(var(--destructive))'
                                : percentageUsed >= alertThreshold
                                  ? 'rgb(234, 179, 8)'
                                  : 'hsl(var(--primary))',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Spent</div>
                      <div
                        className={`text-lg font-semibold ${usage?.isOverBudget ? 'text-destructive' : ''
                          }`}
                      >
                        {formatCurrency(spent)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Remaining</div>
                      <div
                        className={`text-lg font-semibold ${remaining < 0 ? 'text-destructive' : ''
                          }`}
                      >
                        {formatCurrency(Math.max(0, remaining))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <div className="text-muted-foreground">Budget</div>
                    <div className="font-semibold">{formatCurrency(budgetAmount)}</div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDate(budget.periodStart)} - {formatDate(budget.periodEnd)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    {budget.alertsEnabled && (
                      <div className="text-xs text-muted-foreground">
                        Alerts at {alertThreshold}%
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(budget)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBudget(budget)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Budget</DialogTitle>
            <DialogDescription>Update your budget settings</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onSubmitEdit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={watchEdit('category')}
                onValueChange={(value) => setEditValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {getCategoryDisplayName(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editErrors.category && (
                <p className="text-sm text-destructive">{editErrors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-periodType">Period Type</Label>
              <Select
                value={watchEdit('periodType')}
                onValueChange={(value) => {
                  editLastChangedFieldRef.current = 'type'
                  setEditValue('periodType', value as 'weekly' | 'monthly' | 'yearly' | 'custom')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {editErrors.periodType && (
                <p className="text-sm text-destructive">{editErrors.periodType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Budget Amount</Label>
              <CurrencyInput
                id="edit-amount"
                value={watchEdit('amount')}
                onChange={(value) => {
                  setEditValue('amount', value, { shouldValidate: true })
                }}
              />
              {editErrors.amount && (
                <p className="text-sm text-destructive">{editErrors.amount.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-periodStart">Period Start</Label>
                <DatePicker
                  value={watchEdit('periodStart')}
                  onChange={(value) => {
                    editLastChangedFieldRef.current = 'start'
                    setEditValue('periodStart', value)
                  }}
                  placeholder="Select start date"
                />
                {editErrors.periodStart && (
                  <p className="text-sm text-destructive">{editErrors.periodStart.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-periodEnd">Period End</Label>
                <DatePicker
                  value={watchEdit('periodEnd')}
                  onChange={(value) => {
                    editLastChangedFieldRef.current = 'end'
                    setEditValue('periodEnd', value)
                  }}
                  placeholder="Select end date"
                />
                {editErrors.periodEnd && (
                  <p className="text-sm text-destructive">{editErrors.periodEnd.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-alertsEnabled">Enable Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Get notified when approaching budget limit
                </p>
              </div>
              <Switch
                id="edit-alertsEnabled"
                checked={watchEdit('alertsEnabled') ?? true}
                onCheckedChange={(checked) => setEditValue('alertsEnabled', checked)}
              />
            </div>

            {watchEdit('alertsEnabled') && (
              <div className="space-y-2">
                <Label htmlFor="edit-alertThreshold">Alert Threshold (%)</Label>
                <Input
                  id="edit-alertThreshold"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="80"
                  {...registerEdit('alertThreshold', { valueAsNumber: true })}
                />
                {editErrors.alertThreshold && (
                  <p className="text-sm text-destructive">{editErrors.alertThreshold.message}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false)
                  setSelectedBudget(null)
                  resetEditForm()
                  editLastChangedFieldRef.current = null
                  editLastPeriodTypeRef.current = null
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-accent" disabled={updateBudget.isPending}>
                Update Budget
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the budget for {selectedBudget?.categoryName}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBudget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

