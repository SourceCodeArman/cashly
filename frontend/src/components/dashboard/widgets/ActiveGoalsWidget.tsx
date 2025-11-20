import { Target } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils'
import type { Goal } from '@/types'

interface ActiveGoalsWidgetProps {
    goals: Goal[]
}

export function ActiveGoalsWidget({ goals }: ActiveGoalsWidgetProps) {
    return (
        <Card className="border-border shadow-soft transition-shadow hover:shadow-md h-full flex flex-col">
            <CardHeader className="px-6 pt-6 pb-0">
                <CardTitle className="text-foreground">Active Goals</CardTitle>
                <CardDescription className="text-muted-foreground">Your savings goals progress</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto min-h-0 space-y-4">
                {goals && goals.length > 0 ? (
                    goals.map((goal) => {
                        const current = parseFloat(goal.currentAmount)
                        const target = parseFloat(goal.targetAmount)
                        const progress = target > 0 ? (current / target) * 100 : 0
                        return (
                            <div key={goal.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-primary" />
                                        <span className="font-medium text-foreground">{goal.name}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{formatCurrency(current)}</span>
                                    <span>{formatCurrency(target)}</span>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        No active goals
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
