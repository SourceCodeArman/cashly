import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { categoryService } from '@/services/categoryService';

const splitSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    amount: z.string().min(1, 'Amount is required'),
    description: z.string().optional(),
});

const formSchema = z.object({
    splits: z.array(splitSchema).min(1, 'At least one split is required'),
});

interface TransactionSplitFormProps {
    transactionId: string;
    transactionAmount: number;
    onSuccess?: () => void;
}

export function TransactionSplitForm({
    transactionId,
    transactionAmount,
    onSuccess,
}: TransactionSplitFormProps) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: categoriesData } = useQuery({
        queryKey: ['categories'],
        queryFn: () => categoryService.listCategories(false),
    });

    const categories = categoriesData?.data || [];

    const { control, register, handleSubmit, watch, formState: { errors } } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            splits: [{ category: '', amount: '', description: '' }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'splits',
    });

    const splits = watch('splits');
    const totalSplit = splits.reduce((sum, split) => {
        const amount = parseFloat(split.amount || '0');
        return sum + amount;
    }, 0);

    const remaining = Math.abs(transactionAmount) - totalSplit;

    const createSplitsMutation = useMutation({
        mutationFn: (data: any) =>
            transactionService.bulkCreateSplits({
                transaction_id: transactionId,
                splits: data.splits,
            }),
        onSuccess: () => {
            toast.success('Transaction splits created successfully');
            queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
            onSuccess?.();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create splits');
        },
    });

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        if (Math.abs(remaining) > 0.01) {
            toast.error(`Split amounts must total $${Math.abs(transactionAmount).toFixed(2)}`);
            return;
        }

        setIsSubmitting(true);
        try {
            await createSplitsMutation.mutateAsync(data);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Split Transaction</CardTitle>
                <CardDescription>
                    Split this ${Math.abs(transactionAmount).toFixed(2)} transaction across multiple categories
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-4 items-start">
                            <div className="flex-1 space-y-2">
                                <Label>Category</Label>
                                <Select
                                    value={splits[index]?.category}
                                    onValueChange={(value) => {
                                        const event = { target: { value, name: `splits.${index}.category` } };
                                        register(`splits.${index}.category`).onChange(event);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat: any) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.icon} {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.splits?.[index]?.category && (
                                    <p className="text-sm text-destructive">
                                        {errors.splits[index]?.category?.message}
                                    </p>
                                )}
                            </div>

                            <div className="w-32 space-y-2">
                                <Label>Amount</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    {...register(`splits.${index}.amount`)}
                                />
                                {errors.splits?.[index]?.amount && (
                                    <p className="text-sm text-destructive">
                                        {errors.splits[index]?.amount?.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                <Label>Description (optional)</Label>
                                <Input
                                    placeholder="Description"
                                    {...register(`splits.${index}.description`)}
                                />
                            </div>

                            {fields.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(index)}
                                    className="mt-8"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ category: '', amount: '', description: '' })}
                        className="w-full"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Split
                    </Button>

                    <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Transaction Amount:</span>
                            <span className="font-medium">${Math.abs(transactionAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Total Split:</span>
                            <span className="font-medium">${totalSplit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold border-t pt-2">
                            <span>Remaining:</span>
                            <span className={remaining < -0.01 ? 'text-destructive' : remaining > 0.01 ? 'text-warning' : 'text-success'}>
                                ${remaining.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {errors.splits && (
                        <p className="text-sm text-destructive">{errors.splits.message}</p>
                    )}

                    <div className="flex gap-2">
                        <Button type="submit" disabled={isSubmitting || Math.abs(remaining) > 0.01}>
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Splits
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
