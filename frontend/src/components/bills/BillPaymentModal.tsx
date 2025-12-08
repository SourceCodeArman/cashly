import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useMarkBillAsPaid } from '@/hooks/useBills'
import type { Bill } from '@/types'
import { useTransactions } from '@/hooks/useTransactions'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
    amount: z.string().min(1, 'Amount is required'),
    paymentDate: z.string().min(1, 'Payment date is required'),
    transactionId: z.string().optional(),
    notes: z.string().optional(),
})

interface BillPaymentModalProps {
    isOpen: boolean
    onClose: () => void
    bill: Bill
}

export function BillPaymentModal({ isOpen, onClose, bill }: BillPaymentModalProps) {
    const markAsPaid = useMarkBillAsPaid()
    const { data: transactions } = useTransactions({ limit: 10 }) // Get recent transactions

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: bill.amount,
            paymentDate: new Date().toISOString().split('T')[0],
            transactionId: undefined,
            notes: '',
        },
    })

    // Reset form when bill changes
    useEffect(() => {
        if (bill && isOpen) {
            form.reset({
                amount: bill.amount,
                paymentDate: new Date().toISOString().split('T')[0],
                transactionId: undefined,
                notes: '',
            })
        }
    }, [bill, isOpen, form])

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await markAsPaid.mutateAsync({
                id: bill.billId,
                data: {
                    bill: bill.billId,
                    amount: parseFloat(values.amount),
                    paymentDate: values.paymentDate,
                    transaction: values.transactionId || undefined,
                    notes: values.notes,
                },
            })
            onClose()
        } catch (error) {
            // Error handled by hook
        }
    }

    // Filter transactions that might match this bill (same amount or recent)
    const potentialTransactions = transactions?.results?.filter(t =>
        !t.isRecurring && Math.abs(parseFloat(t.amount)) === parseFloat(bill.amount)
    ) || []

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Mark as Paid</DialogTitle>
                    <DialogDescription>
                        Record a payment for {bill.name}. This will update the next due date.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount Paid</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5">$</span>
                                            <Input className="pl-7" type="number" step="0.01" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="paymentDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="transactionId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Link Transaction (Optional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a transaction" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {potentialTransactions.length > 0 && (
                                                <>
                                                    <div className="p-2 text-xs font-semibold text-muted-foreground">Matches</div>
                                                    {potentialTransactions.map((t) => (
                                                        <SelectItem key={t.id} value={t.id}>
                                                            {t.date} - {t.merchantName} (${t.amount})
                                                        </SelectItem>
                                                    ))}
                                                </>
                                            )}

                                            {/* Show other recent transactions if no direct matches or user wants to see more */}
                                            <div className="p-2 text-xs font-semibold text-muted-foreground">Recent</div>
                                            {transactions?.results?.slice(0, 5).map((t) => (
                                                // Don't duplicate if already shown above
                                                !potentialTransactions.find(pt => pt.id === t.id) && (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        {t.date} - {t.merchantName} (${t.amount})
                                                    </SelectItem>
                                                )
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notes</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Payment confirmation number, etc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={markAsPaid.isPending}>
                                {markAsPaid.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Confirm Payment'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
