import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, parseISO } from 'date-fns'
import { useDebtPayments } from '@/hooks/useDebts'
import { Loader2 } from 'lucide-react'

interface PaymentHistoryProps {
    debtId?: string
}

export function PaymentHistory({ debtId }: PaymentHistoryProps) {
    const { data: payments, isLoading } = useDebtPayments(debtId)

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    if (!payments?.length) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Payments</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Date</th>
                                {!debtId && <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Debt</th>}
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Type</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Amount</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Principal</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Interest</th>
                                <th className="h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-right">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {payments.map((payment) => (
                                <tr key={payment.payment_id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                        {format(parseISO(payment.payment_date), 'MMM d, yyyy')}
                                    </td>
                                    {!debtId && (
                                        <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium">
                                            Debt Account
                                        </td>
                                    )}
                                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                        <Badge variant="outline" className="capitalize">
                                            {payment.payment_type}
                                        </Badge>
                                    </td>
                                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-bold">
                                        ${parseFloat(payment.amount).toLocaleString()}
                                    </td>
                                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-green-600">
                                        ${parseFloat(payment.applied_to_principal).toLocaleString()}
                                    </td>
                                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-orange-600">
                                        ${parseFloat(payment.applied_to_interest).toLocaleString()}
                                    </td>
                                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right text-muted-foreground max-w-[200px] truncate">
                                        {payment.notes || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
