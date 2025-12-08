import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { DebtCreateData } from '@/types/debt.types';
import { useCreateDebt, useUpdateDebt } from '@/hooks/useDebts';
import { toast } from 'sonner';

const debtFormSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    debt_type: z.enum(['credit_card', 'personal_loan', 'mortgage', 'auto_loan', 'student_loan', 'other']),
    current_balance: z.string().min(1, { message: 'Balance is required' }),
    original_balance: z.string().min(1, { message: 'Original balance is required' }),
    interest_rate: z.string().min(1, { message: 'APR is required' }),
    minimum_payment: z.string().min(1, { message: 'Minimum payment is required' }),
    due_day: z.coerce.number().min(1).max(31),
    creditor_name: z.string().optional(),
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface DebtFormProps {
    initialData?: any;
    onSuccess: () => void;
    onCancel: () => void;
}

export function DebtForm({ initialData, onSuccess, onCancel }: DebtFormProps) {
    const createDebt = useCreateDebt();
    const updateDebt = useUpdateDebt();

    const isEditing = !!initialData;

    const form = useForm<DebtFormValues>({
        resolver: zodResolver(debtFormSchema),
        defaultValues: initialData || {
            name: '',
            debt_type: 'credit_card',
            current_balance: '',
            original_balance: '',
            interest_rate: '',
            minimum_payment: '',
            due_day: 1,
            creditor_name: '',
        },
    });

    const onSubmit = async (data: DebtFormValues) => {
        try {
            if (isEditing) {
                await updateDebt.mutateAsync({ id: initialData.debt_id, data });
                toast.success('Debt updated successfully');
            } else {
                await createDebt.mutateAsync(data as DebtCreateData);
                toast.success('Debt created successfully');
            }
            onSuccess();
        } catch (error) {
            toast.error(isEditing ? 'Failed to update debt' : 'Failed to create debt');
            console.error(error);
        }
    };

    const isLoading = createDebt.isPending || updateDebt.isPending;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Chase Sapphire" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="debt_type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select debt type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="credit_card">Credit Card</SelectItem>
                                    <SelectItem value="personal_loan">Personal Loan</SelectItem>
                                    <SelectItem value="auto_loan">Auto Loan</SelectItem>
                                    <SelectItem value="student_loan">Student Loan</SelectItem>
                                    <SelectItem value="mortgage">Mortgage</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="current_balance"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Current Balance</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                        <Input className="pl-6" type="number" step="0.01" {...field} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="original_balance"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Original Balance</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                        <Input className="pl-6" type="number" step="0.01" {...field} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="interest_rate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>APR (%)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input className="pr-6" type="number" step="0.01" {...field} />
                                        <span className="absolute right-3 top-2.5 text-muted-foreground">%</span>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="minimum_payment"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Min Payment</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                        <Input className="pl-6" type="number" step="0.01" {...field} />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="due_day"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Day Due (1-31)</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" max="31" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="creditor_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Creditor (Optional)</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. JP Morgan" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" type="button" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : (isEditing ? 'Update Debt' : 'Add Debt')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
