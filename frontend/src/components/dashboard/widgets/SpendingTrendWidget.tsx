import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AreaChartIcon, LineChartIcon, BarChartIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface SpendingTrendWidgetProps {
    data: { date: string; amount: string }[]
    className?: string
}

type SpendingTrendTooltipProps = {
    active?: boolean
    payload?: {
        value: number
    }[]
    label?: string
}

type ChartType = 'area' | 'line' | 'bar'

function SpendingTrendTooltip({ active, payload, label }: SpendingTrendTooltipProps) {
    if (!active || !payload || payload.length === 0) {
        return null
    }

    return (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs text-card-foreground shadow-sm">
            <div className="font-medium">{label}</div>
            <div>Amount: {formatCurrency(Number(payload[0].value))}</div>
        </div>
    )
}

export function SpendingTrendWidget({ data, className }: SpendingTrendWidgetProps) {
    const [chartType, setChartType] = useState<ChartType>('area')

    const chartData = data.map((item) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: parseFloat(item.amount),
    }))

    const renderChart = () => {
        const commonProps = {
            data: chartData,
        }

        const commonAxisProps = {
            xAxis: {
                dataKey: "date",
                tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                axisLine: { stroke: 'hsl(var(--border))' }
            },
            yAxis: {
                tick: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 },
                axisLine: { stroke: 'hsl(var(--border))' },
                tickFormatter: (value: number) => `$${value}`
            }
        }

        switch (chartType) {
            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        <defs>
                            <linearGradient id="colorDestructive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis {...commonAxisProps.xAxis} />
                        <YAxis {...commonAxisProps.yAxis} />
                        <Tooltip content={<SpendingTrendTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="amount"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorDestructive)"
                            dot={{ r: 4, fill: 'hsl(var(--destructive))' }}
                        />
                    </AreaChart>
                )
            case 'line':
                return (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis {...commonAxisProps.xAxis} />
                        <YAxis {...commonAxisProps.yAxis} />
                        <Tooltip content={<SpendingTrendTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="amount"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={3}
                            dot={{ r: 4, fill: 'hsl(var(--destructive))' }}
                        />
                    </LineChart>
                )
            case 'bar':
                return (
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis {...commonAxisProps.xAxis} />
                        <YAxis {...commonAxisProps.yAxis} />
                        <Tooltip content={<SpendingTrendTooltip />} />
                        <Bar
                            dataKey="amount"
                            fill="hsl(var(--destructive))"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                )
        }
    }

    return (
        <Card className={cn("border-border shadow-soft transition-shadow hover:shadow-md h-full flex flex-col", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-foreground">Spending Trend</CardTitle>
                        <CardDescription className="text-muted-foreground">Your spending over time</CardDescription>
                    </div>
                    <div className="flex gap-1">
                        <Button
                            variant={chartType === 'area' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setChartType('area')}
                            className="h-8 w-8 p-0"
                        >
                            <AreaChartIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={chartType === 'line' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setChartType('line')}
                            className="h-8 w-8 p-0"
                        >
                            <LineChartIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={chartType === 'bar' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setChartType('bar')}
                            className="h-8 w-8 p-0"
                        >
                            <BarChartIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {chartData.length > 0 ? (
                    <div className="h-full w-full focus:outline-none [&_svg]:focus:outline-none [&_svg]:outline-none">
                        <ResponsiveContainer width="100%" height="100%">
                            {renderChart()}
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        No spending data available
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
