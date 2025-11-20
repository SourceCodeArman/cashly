import { Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface TotalBalanceWidgetProps {
    amount: string
}

export function TotalBalanceWidget({ amount }: TotalBalanceWidgetProps) {
    return (
        <Card className="border-border shadow-soft transition-shadow hover:shadow-md h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
                <Wallet className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="flex-1 flex items-center">
                <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(parseFloat(amount))}
                </div>
            </CardContent>
        </Card>
    )
}
