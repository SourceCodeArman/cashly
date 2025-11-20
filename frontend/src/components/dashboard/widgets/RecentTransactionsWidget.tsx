import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types'
import { format } from 'date-fns'

interface RecentTransactionsWidgetProps {
    transactions: Transaction[]
}

export function RecentTransactionsWidget({ transactions }: RecentTransactionsWidgetProps) {
    return (
        <Card className="border-border shadow-soft transition-shadow hover:shadow-md h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-foreground">Recent Transactions</CardTitle>
                <CardDescription className="text-muted-foreground">Your latest financial activity</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto min-h-0">
                {transactions && transactions.length > 0 ? (
                    <div className="space-y-4">
                        {transactions.slice(0, 5).map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium leading-none text-foreground">
                                        {transaction.merchantName || transaction.description || 'Unknown Merchant'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(transaction.date), 'MMM d, yyyy')}
                                    </p>
                                </div>
                                <div className={`font-medium ${transaction.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                                    {transaction.type === 'income' ? '+' : ''}
                                    {formatCurrency(parseFloat(transaction.amount))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        No recent transactions
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
