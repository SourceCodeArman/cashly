import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { DebtAccount, DebtPaymentCreateData, PaymentType } from '@/types/debt.types'
import { useRecordDebtPayment } from '@/hooks/useDebts'

const paymentTypes: { value: PaymentType; label: string }[] = [
    { value: 'minimum', label: 'Minimum Payment' },
    { value: 'extra', label: 'Extra Payment' },
    { value: 'full', label: 'Full Payoff' },
]

const formSchema = z.object({
    amount: z.string().min(1, 'Amount is required').regex(/^\d*\.?\d*$/, 'Must be a valid number'),
    payment_date: z.string().min(1, 'Payment date is required'),
    payment_type: z.enum(['minimum', 'extra', 'full']),
    notes: z.string().optional(),
})

interface DebtPaymentFormProps {
    debt: DebtAccount
    onSuccess: () => void
}

export function DebtPaymentForm({ debt, onSuccess }: DebtPaymentFormProps) {
    const recordPayment = useRecordDebtPayment()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: debt.minimum_payment || '',
            payment_date: new Date().toISOString().split('T')[0],
            payment_type: 'minimum',
            notes: '',
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const payload: DebtPaymentCreateData = {
                debt: debt.debt_id,
                amount: values.amount,
                payment_date: values.payment_date,
                payment_type: values.payment_type,
                notes: values.notes,
            }

            await recordPayment.mutateAsync(payload)
            onSuccess()
        } catch (error) {
            console.error('Failed to record payment', error)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="payment_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Payment Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {paymentTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount ($)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="payment_date"
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
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Payment details..." className="resize-none" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full" disabled={recordPayment.isPending}>
                    {recordPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Record Payment
                </Button>
            </form>
        </Form>
    )
}
