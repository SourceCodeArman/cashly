import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface TotalIncomeWidgetProps {
    amount: string
}

export function TotalIncomeWidget({ amount }: TotalIncomeWidgetProps) {
    return (
        <Card className="border-border shadow-soft transition-shadow hover:shadow-md h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
                <TrendingUp className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent className="flex-1 flex items-center">
                <div className="text-2xl font-serif font-bold text-foreground">
                    {formatCurrency(parseFloat(amount))}
                </div>
            </CardContent>
        </Card>
    )
}
