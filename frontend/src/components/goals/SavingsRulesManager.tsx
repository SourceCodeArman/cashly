import { useState } from 'react'
import { Plus, Trash2, Power, PowerOff, TrendingUp, Percent, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { goalService, type SavingsRule, type CreateSavingsRulePayload } from '@/services/goalService'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useGoals } from '@/hooks/useGoals'
import { useCategories } from '@/hooks/useCategories'

export function SavingsRulesManager() {
  const queryClient = useQueryClient()
  const { data: goals } = useGoals()
  const { data: categories } = useCategories()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [ruleType, setRuleType] = useState<'roundup' | 'percentage'>('roundup')
  const [trigger, setTrigger] = useState<'all_expenses' | 'income' | 'category'>('all_expenses')
  const [selectedGoal, setSelectedGoal] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [percentage, setPercentage] = useState<string>('')
  const [isActive, setIsActive] = useState(true)

  const { data: savingsRules, isLoading } = useQuery({
    queryKey: ['savings-rules'],
    queryFn: async () => {
      const response = await goalService.listSavingsRules()
      if (response.status === 'success' && response.data) {
        return response.data
      }
      return []
    },
  })

  const createRuleMutation = useMutation({
    mutationFn: async (data: CreateSavingsRulePayload) => {
      const response = await goalService.createSavingsRule(data)
      if (response.status === 'success') {
        return response.data
      }
      throw new Error(response.message || 'Failed to create savings rule')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-rules'] })
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Savings rule created successfully')
      setDialogOpen(false)
      resetForm()
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create savings rule')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await goalService.toggleSavingsRuleActive(id)
      if (response.status === 'success') {
        return response.data
      }
      throw new Error(response.message || 'Failed to toggle savings rule')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-rules'] })
      toast.success('Savings rule updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update savings rule')
    },
  })

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await goalService.deleteSavingsRule(id)
      if (response.status === 'success') {
        return response
      }
      throw new Error(response.message || 'Failed to delete savings rule')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-rules'] })
      toast.success('Savings rule deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete savings rule')
    },
  })

  const resetForm = () => {
    setRuleType('roundup')
    setTrigger('all_expenses')
    setSelectedGoal('')
    setSelectedCategory('')
    setPercentage('')
    setIsActive(true)
  }

  const handleSubmit = () => {
    if (!selectedGoal) {
      toast.error('Please select a goal')
      return
    }

    if (ruleType === 'percentage' && !percentage) {
      toast.error('Please enter a percentage')
      return
    }

    if (trigger === 'category' && !selectedCategory) {
      toast.error('Please select a category')
      return
    }

    const payload: CreateSavingsRulePayload = {
      goal: selectedGoal,
      rule_type: ruleType,
      trigger: trigger,
      is_active: isActive,
      ...(ruleType === 'percentage' && percentage ? { percentage: parseFloat(percentage) } : {}),
      ...(trigger === 'category' && selectedCategory ? { category: selectedCategory } : { category: null }),
    }

    createRuleMutation.mutate(payload)
  }

  // Show all non-completed goals for savings rules (isActive is for whether goal can receive contributions)
  // Users should be able to create savings rules for any goal that isn't completed
  const activeGoals = goals?.filter((goal) => goal.isCompleted !== true) || []
  const expenseCategories = categories?.filter((cat) => cat.type === 'expense') || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Automated Savings</h2>
          <p className="text-muted-foreground">
            Set up automatic savings rules to contribute to your goals
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-accent" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              New Savings Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Savings Rule</DialogTitle>
              <DialogDescription>
                Automatically save money based on your transactions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal">Goal</Label>
                <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeGoals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruleType">Rule Type</Label>
                <Select value={ruleType} onValueChange={(value: 'roundup' | 'percentage') => setRuleType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roundup">Round-up Savings</SelectItem>
                    <SelectItem value="percentage">Percentage-based Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ruleType === 'percentage' && (
                <div className="space-y-2">
                  <Label htmlFor="percentage">Percentage (%)</Label>
                  <Input
                    id="percentage"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    placeholder="e.g., 5"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger</Label>
                <Select value={trigger} onValueChange={(value: 'all_expenses' | 'income' | 'category') => setTrigger(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_expenses">All Expenses</SelectItem>
                    <SelectItem value="income">Income Only</SelectItem>
                    <SelectItem value="category">Specific Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {trigger === 'category' && (
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-gradient-accent"
                onClick={handleSubmit}
                disabled={createRuleMutation.isPending}
              >
                {createRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
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
      ) : !savingsRules || savingsRules.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No savings rules</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Create a savings rule to automatically contribute to your goals
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {savingsRules.map((rule) => (
            <Card key={rule.rule_id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {rule.rule_type === 'roundup' ? (
                      <DollarSign className="h-5 w-5 text-primary" />
                    ) : (
                      <Percent className="h-5 w-5 text-primary" />
                    )}
                    <CardTitle className="text-lg">{rule.goal_name}</CardTitle>
                  </div>
                  <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription>
                  {rule.rule_type === 'roundup' ? 'Round-up Savings' : `${rule.percentage}% Savings`}
                  {' • '}
                  {rule.trigger === 'all_expenses'
                    ? 'All Expenses'
                    : rule.trigger === 'income'
                    ? 'Income Only'
                    : rule.category_name || 'Category'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Contributions</span>
                  <span className="font-semibold">{rule.total_contributions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">{formatCurrency(rule.total_amount)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActiveMutation.mutate(rule.rule_id)}
                    disabled={toggleActiveMutation.isPending}
                  >
                    {rule.is_active ? (
                      <>
                        <PowerOff className="mr-2 h-4 w-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-4 w-4" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this savings rule?')) {
                        deleteRuleMutation.mutate(rule.rule_id)
                      }
                    }}
                    disabled={deleteRuleMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

