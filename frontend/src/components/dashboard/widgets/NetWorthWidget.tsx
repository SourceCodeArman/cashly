import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { analyticsService } from '@/services/analyticsService';
import { Skeleton } from '@/components/ui/skeleton';

interface NetWorthWidgetProps {
    className?: string;
}

export function NetWorthWidget({ className }: NetWorthWidgetProps) {
    const { data: netWorthData, isLoading } = useQuery({
        queryKey: ['netWorth'],
        queryFn: analyticsService.getNetWorth,
    });

    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
        );
    }

    const netWorth = netWorthData?.net_worth || 0;
    const assets = netWorthData?.assets || 0;
    const liabilities = netWorthData?.liabilities || 0;
    const isPositive = netWorth >= 0;

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 mb-2">
                    <div className="text-2xl font-bold">
                        ${Math.abs(netWorth).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                    </div>
                    {isPositive ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                        <span>Assets:</span>
                        <span className="font-medium text-green-600">
                            ${assets.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span>Liabilities:</span>
                        <span className="font-medium text-red-600">
                            ${liabilities.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
