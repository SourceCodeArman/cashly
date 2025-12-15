import { TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface TotalSpendingWidgetProps {
    amount: string
}

export function TotalSpendingWidget({ amount }: TotalSpendingWidgetProps) {
    return (
        <Card className="border-border shadow-soft transition-shadow hover:shadow-md h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Spending</CardTitle>
                <TrendingDown className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent className="flex-1 flex items-center">
                <div className="text-2xl font-serif font-bold text-foreground">
                    {formatCurrency(parseFloat(amount))}
                </div>
            </CardContent>
        </Card>
    )
}
