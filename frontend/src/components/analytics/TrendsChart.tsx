import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TrendData } from '@/types/analytics.types';

interface TrendsChartProps {
    data: TrendData[];
    loading?: boolean;
}

export function TrendsChart({ data, loading }: TrendsChartProps) {
    if (loading) {
        return (
            <Card className="h-[350px] animate-pulse">
                <CardHeader>
                    <div className="h-6 w-1/3 bg-muted rounded" />
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] bg-muted rounded" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Spending Trends</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="month"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spending']}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="amount"
                                stroke="#8884d8"
                                strokeWidth={2}
                                dot={{ r: 4, fill: "#8884d8" }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
