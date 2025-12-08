import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NetWorthData } from '@/types/analytics.types';
import { DollarSign, Wallet, CreditCard } from 'lucide-react';

interface NetWorthCardProps {
    data: NetWorthData | null;
    loading?: boolean;
}

export function NetWorthCard({ data, loading }: NetWorthCardProps) {
    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-1/3 bg-muted rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-1/2 bg-muted rounded mb-2" />
                            <div className="h-4 w-1/4 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${data.net_worth.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        Total Assets - Total Liabilities
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assets</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">${data.assets.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        Cash, Investments, Savings
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Liabilities</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">${data.liabilities.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        Credit Cards, Loans
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
