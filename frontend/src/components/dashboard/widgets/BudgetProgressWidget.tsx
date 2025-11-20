import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils'
import { useBudgetUsageSummary } from '@/hooks/useBudgets'
import { Skeleton } from '@/components/ui/skeleton'

export function BudgetProgressWidget() {
    const { data: budgetSummary, isLoading } = useBudgetUsageSummary()

    if (isLoading) {
        return (
            <Card className="border-border shadow-soft h-full">
                <CardHeader>
                    <CardTitle>Budget Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        )
    }

    // Take top 3 budgets by percentage used
    const topBudgets = budgetSummary
        ? [...budgetSummary].sort((a, b) => b.percentageUsed - a.percentageUsed).slice(0, 3)
        : []

    return (
        <Card className="border-border shadow-soft transition-shadow hover:shadow-md h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-foreground">Budget Watch</CardTitle>
                <CardDescription className="text-muted-foreground">Top spending categories</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto min-h-0 space-y-4">
                {topBudgets.length > 0 ? (
                    topBudgets.map((budget) => (
                        <div key={budget.budgetId} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{budget.categoryName}</span>
                                <span className={`text-sm ${budget.isOverBudget ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {budget.percentageUsed.toFixed(0)}%
                                </span>
                            </div>
                            <Progress
                                value={Math.min(budget.percentageUsed, 100)}
                                className={`h-2 ${budget.isOverBudget ? '[&>div]:bg-destructive' : ''}`}
                            />
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{formatCurrency(parseFloat(budget.spent))}</span>
                                <span>{formatCurrency(parseFloat(budget.amount))}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        No active budgets
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
