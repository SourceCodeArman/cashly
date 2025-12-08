import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebtProjection } from '@/hooks/useDebts';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface DebtProjectionChartProps {
    debtId: string;
    monthlyPayment?: number;
}

export function DebtProjectionChart({ debtId, monthlyPayment }: DebtProjectionChartProps) {
    const { data, isLoading } = useDebtProjection(debtId, monthlyPayment);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Payoff Projection</CardTitle>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!data || !data.data || data.data.projection.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Payoff Projection</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data.data.projection}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#888888' }}
                                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                                minTickGap={30}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#888888' }}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => [formatCurrency(Number(value)), 'Balance']}
                                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                stroke="#f43f5e"
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    Projected payoff in <span className="font-bold text-foreground">{data.data.months_to_payoff} months</span> with
                    total interest of <span className="font-bold text-foreground">{formatCurrency(Number(data.data.total_interest))}</span>
                </div>
            </CardContent>
        </Card>
    );
}
