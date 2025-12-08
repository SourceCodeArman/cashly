import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/services/transactionService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RecurringGroupCard } from '@/components/RecurringGroupCard';
import { Repeat, Play, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

import { toast } from 'sonner';
import { useTransactions } from '@/hooks/useTransactions';

export function RecurringTransactions() {
    const [runningDetection, setRunningDetection] = useState(false);
    const queryClient = useQueryClient();

    const { data: transactionsData, isLoading } = useTransactions({
        page_size: 200,
    });

    const detectMutation = useMutation({
        mutationFn: () => transactionService.detectRecurring(3, 180),
        onSuccess: (data) => {
            toast.success(
                `Detected ${data.data?.detected?.length || 0} recurring groups, marked ${data.data?.updated_count || 0} transactions`
            );
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to detect recurring transactions');
        },
    });

    const runDetection = async () => {
        setRunningDetection(true);
        try {
            await detectMutation.mutateAsync();
        } finally {
            setRunningDetection(false);
        }
    };

    const markNonRecurringMutation = useMutation({
        mutationFn: (transactionIds: string[]) => transactionService.markNonRecurring(transactionIds),
        onSuccess: (data) => {
            toast.success(data.message || `Marked ${data.data?.updated_count} transactions as non-recurring`);
            queryClient.invalidateQueries({ queryKey: ['transactions'] });

        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to mark as non-recurring');
        },
    });

    // Extract transactions
    const allTransactions = useMemo(() => {
        if (!transactionsData) return [];
        if ('results' in transactionsData && Array.isArray(transactionsData.results)) {
            return transactionsData.results;
        }
        if (Array.isArray(transactionsData)) {
            return transactionsData;
        }
        return [];
    }, [transactionsData]);

    // Filter recurring transactions
    const recurringTransactions = useMemo(
        () => allTransactions.filter((t) => t.isRecurring),
        [allTransactions]
    );

    // Group by merchant
    const groupedByMerchant = useMemo(() => {
        const groups = new Map<string, typeof recurringTransactions>();

        recurringTransactions.forEach((transaction) => {
            const merchant = transaction.merchantName || 'Unknown';
            if (!groups.has(merchant)) {
                groups.set(merchant, []);
            }
            groups.get(merchant)!.push(transaction);
        });

        return Array.from(groups.entries())
            .map(([merchant, transactions]) => {
                const sorted = transactions.sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                // Calculate average interval
                let intervalDays = 0;
                if (sorted.length > 1) {
                    const diffs = [];
                    for (let i = 0; i < sorted.length - 1; i++) {
                        const d1 = new Date(sorted[i].date).getTime();
                        const d2 = new Date(sorted[i + 1].date).getTime();
                        diffs.push(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
                    }
                    intervalDays = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
                }

                return {
                    merchant,
                    transactions: sorted,
                    count: transactions.length,
                    averageAmount:
                        transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) /
                        transactions.length,
                    totalAmount: transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0),
                    category: transactions[0].category,
                    intervalDays
                };
            })
            .sort((a, b) => b.count - a.count);
    }, [recurringTransactions]);

    // Calculate stats
    const stats = useMemo(() => {
        const totalRecurring = recurringTransactions.length;
        const uniqueMerchants = groupedByMerchant.length;
        const totalSpent = recurringTransactions.reduce(
            (sum, t) => sum + (parseFloat(t.amount) < 0 ? Math.abs(parseFloat(t.amount)) : 0),
            0
        );

        return {
            totalRecurring,
            uniqueMerchants,
            totalSpent,
        };
    }, [recurringTransactions, groupedByMerchant]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Recurring Transactions</h1>
                        <p className="text-muted-foreground">
                            Automatically detected recurring expenses and income
                        </p>
                    </div>
                    <Button onClick={runDetection} disabled={runningDetection}>
                        {runningDetection ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Detecting...
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4 mr-2" />
                                Run Detection
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Recurring Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="text-2xl font-bold">{stats.totalRecurring}</div>
                                <Badge variant="secondary">
                                    <Repeat className="h-3 w-3 mr-1" />
                                    Detected
                                </Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Unique Merchants</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold">{stats.uniqueMerchants}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Recurring Spending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-24" />
                        ) : (
                            <div className="text-2xl font-bold text-destructive">
                                {formatCurrency(stats.totalSpent)}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Grouped Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle>Recurring Merchants</CardTitle>
                    <CardDescription>
                        Grouped by merchant ({groupedByMerchant.length} merchants)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-24 w-full" />
                            ))}
                        </div>
                    ) : groupedByMerchant.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Repeat className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">No Recurring Transactions</h3>
                            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                                Click "Run Detection" to automatically identify recurring transactions in your
                                history
                            </p>
                            <Button onClick={runDetection} disabled={runningDetection}>
                                <Play className="h-4 w-4 mr-2" />
                                Run Detection Now
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {groupedByMerchant.map((group) => {
                                const avgAmount = group.averageAmount;

                                return (
                                    <RecurringGroupCard
                                        key={group.merchant}
                                        merchantName={group.merchant}
                                        amount={Number(avgAmount)}
                                        count={group.count}
                                        category={group.category} // Pass full category object or undefined
                                        transactions={group.transactions}
                                        intervalDays={group.intervalDays}
                                        onMarkNonRecurring={() => {
                                            const transactionIds = group.transactions.map(t => t.id);
                                            markNonRecurringMutation.mutate(transactionIds);
                                        }}
                                        isProcessing={markNonRecurringMutation.isPending}
                                    />
                                );
                            })}
                        </div>
                    )}
                </CardContent >
            </Card >
        </div >
    );
}
