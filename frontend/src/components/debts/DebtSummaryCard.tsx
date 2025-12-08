import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebtSummary } from '@/hooks/useDebts';
import { Wallet, TrendingDown, Percent, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function DebtSummaryCard() {
    const { data: summary, isLoading } = useDebtSummary();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!summary) return null;

    const stats = [
        {
            label: 'Total Balance',
            value: formatCurrency(Number(summary.total_balance)),
            icon: Wallet,
            color: 'text-rose-500',
        },
        {
            label: 'Monthly Usage',
            value: formatCurrency(Number(summary.total_minimum_payments)),
            subtext: 'Minimum Payments',
            icon: CreditCard,
            color: 'text-amber-500',
        },
        {
            label: 'Avg. Interest Rate',
            value: `${Number(summary.average_interest_rate).toFixed(2)}%`,
            icon: Percent,
            color: 'text-blue-500',
        },
        {
            label: 'Total Paid Off',
            value: formatCurrency(Number(summary.total_paid_off)),
            icon: TrendingDown,
            color: 'text-emerald-500',
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-medium">Debt Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="flex items-center p-4 bg-secondary/20 rounded-lg border border-border/50"
                        >
                            <div className={`p-3 rounded-full bg-background border border-border mr-4 ${stat.color}`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {stat.label}
                                </p>
                                <h3 className="text-2xl font-bold tracking-tight">
                                    {stat.value}
                                </h3>
                                {stat.subtext && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stat.subtext}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
