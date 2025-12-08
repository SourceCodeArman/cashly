import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useStrategyComparison, useStrategies, useCreateStrategy } from '@/hooks/useDebts'
import { Loader2, Save, TrendingDown } from 'lucide-react'
import type { StrategyType } from '@/types/debt.types'

export function DebtStrategy() {
    const [monthlyBudget, setMonthlyBudget] = useState<string>('')
    const [debouncedBudget, setDebouncedBudget] = useState<number>(0)
    const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('snowball')

    // In a real app we'd debounce this input properly
    const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMonthlyBudget(e.target.value)
    }

    const handleCompare = () => {
        const val = parseFloat(monthlyBudget)
        if (!isNaN(val) && val > 0) {
            setDebouncedBudget(val)
        }
    }

    const { data: comparison, isLoading: isComparing } = useStrategyComparison(debouncedBudget)
    const { mutate: createStrategy, isPending: isSaving } = useCreateStrategy()
    const { data: currentStrategies } = useStrategies()

    const activeStrategy = currentStrategies?.find(s => s.is_active)

    const handleSaveStrategy = () => {
        if (!debouncedBudget) return

        createStrategy({
            strategy_type: selectedStrategy,
            monthly_budget: debouncedBudget.toString(),
            priority_order: selectedStrategy === 'custom' ? [] : undefined // Backend generates if empty
        })
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Payoff Strategy Calculator</CardTitle>
                    <CardDescription>
                        Compare Snowball vs Avalanche methods to see which saves you more money.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-end mb-6">
                        <div className="w-full max-w-xs space-y-2">
                            <Label>Monthly Debt Budget ($)</Label>
                            <Input
                                type="number"
                                placeholder="Total available for debts"
                                value={monthlyBudget}
                                onChange={handleBudgetChange}
                            />
                        </div>
                        <Button onClick={handleCompare} disabled={!monthlyBudget}>
                            Compare Strategies
                        </Button>
                    </div>

                    {isComparing && (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {comparison && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Snowball Card */}
                            <Card className={`border-2 cursor-pointer transition-colors ${selectedStrategy === 'snowball' ? 'border-blue-500 bg-blue-50/50' : 'hover:border-gray-300'}`} onClick={() => setSelectedStrategy('snowball')}>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg">Snowball Method</h3>
                                        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">Psychological Wins</div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">Pay smallest balances first.</p>

                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>Time to Debt Free:</span>
                                            <span className="font-bold">{comparison.snowball.months} months</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Total Interest:</span>
                                            <span className="font-bold text-red-600">${parseFloat(comparison.snowball.total_interest).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Avalanche Card */}
                            <Card className={`border-2 cursor-pointer transition-colors ${selectedStrategy === 'avalanche' ? 'border-blue-500 bg-blue-50/50' : 'hover:border-gray-300'}`} onClick={() => setSelectedStrategy('avalanche')}>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg">Avalanche Method</h3>
                                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">Math Optimal</div>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">Pay highest interest rates first.</p>

                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>Time to Debt Free:</span>
                                            <span className="font-bold">{comparison.avalanche.months} months</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Total Interest:</span>
                                            <span className="font-bold text-red-600">${parseFloat(comparison.avalanche.total_interest).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {parseFloat(comparison.savings) > 0 && (
                                        <div className="mt-4 p-2 bg-green-50 text-green-700 rounded flex items-center gap-2 text-sm">
                                            <TrendingDown className="h-4 w-4" />
                                            Saves ${parseFloat(comparison.savings).toLocaleString()} vs Snowball
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {comparison && (
                        <div className="mt-6 flex justify-end">
                            <Button onClick={handleSaveStrategy} disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save This Strategy
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {activeStrategy && (
                <Card className="bg-muted/50">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Strategy</p>
                            <p className="text-lg font-bold capitalize">{activeStrategy.strategy_type.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground">Budget: ${activeStrategy.monthly_budget}/mo</p>
                        </div>
                        <Button variant="outline" size="sm">Manage</Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
