import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import type { Bill, CreateBillForm } from '@/types'
import { useEffect } from 'react'

const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    amount: z.string().min(1, 'Amount is required'),
    frequency: z.enum(['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
    dueDay: z.coerce.number().min(1).max(31),
    nextDueDate: z.string().min(1, 'Next due date is required'),
    categoryId: z.string().optional(),
    accountId: z.string().optional(),
    payee: z.string().optional(),
    notes: z.string().optional(),
    isAutopay: z.boolean(),
    reminderEnabled: z.boolean(),
    reminderDays: z.coerce.number().min(0).max(30),
    isActive: z.boolean(),
})

interface BillFormProps {
    initialData?: Bill
    onSubmit: (data: CreateBillForm) => void
    isLoading?: boolean
}

export function BillForm({ initialData, onSubmit, isLoading }: BillFormProps) {
    const { data: categories } = useCategories()
    const { data: accounts } = useAccounts()

    const defaultValues: Partial<z.infer<typeof formSchema>> = {
        name: initialData?.name || '',
        amount: initialData?.amount?.toString() || '',
        frequency: initialData?.frequency || 'monthly',
        dueDay: initialData?.dueDay || 1,
        nextDueDate: initialData?.nextDueDate || new Date().toISOString().split('T')[0],
        categoryId: initialData?.categoryId || undefined,
        accountId: initialData?.accountId || undefined,
        payee: initialData?.payee || '',
        notes: initialData?.notes || '',
        isAutopay: initialData?.isAutopay || false,
        reminderEnabled: initialData?.reminderEnabled ?? true,
        reminderDays: initialData?.reminderDays || 3,
        isActive: initialData?.isActive ?? true,
    }

    type FormValues = z.infer<typeof formSchema>

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues,
    })

    // Reset form when initialData changes
    useEffect(() => {
        if (initialData) {
            form.reset({
                name: initialData.name,
                amount: initialData.amount.toString(),
                frequency: initialData.frequency,
                dueDay: initialData.dueDay,
                nextDueDate: initialData.nextDueDate,
                categoryId: initialData.categoryId || undefined,
                accountId: initialData.accountId || undefined,
                payee: initialData.payee || '',
                notes: initialData.notes || '',
                isAutopay: initialData.isAutopay,
                reminderEnabled: initialData.reminderEnabled,
                reminderDays: initialData.reminderDays,
                isActive: initialData.isActive,
            })
        }
    }, [initialData, form])

    const handleSubmit = (values: z.infer<typeof formSchema>) => {
        onSubmit({
            name: values.name,
            amount: parseFloat(values.amount),
            frequency: values.frequency as any,
            dueDay: values.dueDay,
            nextDueDate: values.nextDueDate,
            category: values.categoryId || undefined, // Use category instead of categoryId for service
            account: values.accountId || undefined,   // Use account instead of accountId for service
            payee: values.payee,
            notes: values.notes,
            isAutopay: values.isAutopay,
            reminderEnabled: values.reminderEnabled,
            reminderDays: values.reminderDays,
            isActive: values.isActive,
        })
    }

    const expenseCategories = categories?.filter((c) => c.type === 'expense') || []
    const activeAccounts = accounts?.filter((a) => a.isActive) || []

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Bill Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Netflix, Rent" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Amount</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5">$</span>
                                        <Input className="pl-7" type="number" step="0.01" placeholder="0.00" {...field} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {expenseCategories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: category.color || '#9ca3af' }}
                                                    />
                                                    {category.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="frequency"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Frequency</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="nextDueDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Next Due Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="dueDay"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Due Day (of period)</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" max="31" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="accountId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Payment Account</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select account (optional)" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {activeAccounts.map((account) => (
                                            <SelectItem key={account.id} value={account.id}>
                                                {account.institutionName} ({account.name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="payee"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Payee / Company</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Citibank, Landlord" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                        <FormLabel>Auto-pay</FormLabel>
                        <FormDescription>
                            Is this bill set up for automatic payment?
                        </FormDescription>
                    </div>
                    <FormControl>
                        <FormField
                            control={form.control}
                            name="isAutopay"
                            render={({ field }) => (
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                    </FormControl>
                </div>

                <div className="space-y-4 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <FormLabel>Reminders</FormLabel>
                            <FormDescription>
                                Get notified before this bill is due
                            </FormDescription>
                        </div>
                        <FormControl>
                            <FormField
                                control={form.control}
                                name="reminderEnabled"
                                render={({ field }) => (
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </FormControl>
                    </div>

                    {form.watch('reminderEnabled') && (
                        <FormField
                            control={form.control}
                            name="reminderDays"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Days before due date</FormLabel>
                                    <FormControl>
                                        <Input type="number" min="0" max="30" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Add any notes here..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {!initialData && (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                                Enable this bill for tracking
                            </FormDescription>
                        </div>
                        <FormControl>
                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </FormControl>
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Saving...' : initialData ? 'Update Bill' : 'Create Bill'}
                </Button>
            </form>
        </Form>
    )
}
