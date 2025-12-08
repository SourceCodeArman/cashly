import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Bill } from '@/types'
import { format, parseISO } from 'date-fns'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface UpcomingBillsWidgetProps {
    bills: Bill[]
    isLoading?: boolean
}

export function UpcomingBillsWidget({ bills, isLoading }: UpcomingBillsWidgetProps) {
    if (isLoading) {
        return <UpcomingBillsSkeleton />
    }

    // Take top 5 upcoming
    const upcoming = bills.slice(0, 5)

    if (upcoming.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Upcoming Bills</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        No upcoming bills in the next 7 days.
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">Upcoming Bills (Next 7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {upcoming.map((bill) => (
                    <div key={bill.billId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${bill.isOverdue ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {bill.isOverdue ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                            </div>
                            <div>
                                <p className="text-sm font-medium line-clamp-1">{bill.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    Due {format(parseISO(bill.nextDueDate), 'MMM d')}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">${bill.amount}</p>
                            <p className={`text-xs ${bill.isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {bill.isOverdue ? 'Overdue' : bill.daysUntilDue === 0 ? 'Today' : `${bill.daysUntilDue} days`}
                            </p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

function UpcomingBillsSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-2 w-16" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Skeleton className="h-3 w-12" />
                            <Skeleton className="h-2 w-8" />
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}
