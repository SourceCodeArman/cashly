import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp } from 'lucide-react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';
import { format, subDays } from 'date-fns';
import { useSubscriptions } from '@/hooks/useSubscription';
import { PremiumGuard } from '@/components/common/PremiumGuard';
import { useNavigate } from 'react-router-dom';

interface SankeyWidgetProps {
    className?: string;
}

export function SankeyWidget({ className }: SankeyWidgetProps) {
    const navigate = useNavigate();
    const [chartData, setChartData] = useState<any>(null);

    // Check subscription status
    const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptions();
    const activeSubscription = subscriptions?.find(sub => sub.status === 'active' || sub.status === 'trialing');
    const hasProAccess = activeSubscription?.plan === 'pro' || activeSubscription?.plan === 'premium';

    // Fetch Sankey data for last 30 days
    const { data: sankeyData, isLoading: sankeyLoading } = useQuery({
        queryKey: ['sankey-widget'],
        queryFn: () => analyticsService.getSankeyData(
            format(subDays(new Date(), 30), 'yyyy-MM-dd'),
            format(new Date(), 'yyyy-MM-dd')
        ),
        enabled: hasProAccess && !subscriptionsLoading,
    });

    // Demo data for free tier
    const demoSankeyData = {
        nodes: [
            { name: "Income", color: "#10b981" },
            { name: "Expenses", color: "#ef4444" },
            { name: "Savings", color: "#22c55e" }
        ],
        links: [
            { source: 0, target: 1, value: 3500 },
            { source: 0, target: 2, value: 1500 }
        ]
    };

    useEffect(() => {
        const data = hasProAccess ? sankeyData : demoSankeyData;
        if (data && data.nodes && data.links) {
            setChartData({
                nodes: data.nodes,
                links: data.links
            });
        }
    }, [sankeyData, hasProAccess]);

    const isLoading = hasProAccess ? sankeyLoading : false;
    const displayData = hasProAccess ? sankeyData : demoSankeyData;

    return (
        <PremiumGuard
            hasAccess={hasProAccess}
            loading={subscriptionsLoading}
            title="Cash Flow Visualization"
            description="Visualize how money flows through your accounts. Upgrade to Pro."
        >
            <Card className={className}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Cash Flow
                            </CardTitle>
                            <CardDescription>
                                Last 30 days
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/analytics')}
                        >
                            View Details
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="h-[300px]">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : !displayData || !displayData.nodes || displayData.nodes.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <p className="text-muted-foreground text-sm">No data available</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <Sankey
                                data={chartData}
                                node={(props: any) => {
                                    const { x, y, width, height, index } = props;
                                    const nodeColor = displayData?.nodes?.[index]?.color || '#8b5cf6';
                                    const nodeName = displayData?.nodes?.[index]?.name || '';

                                    return (
                                        <g>
                                            <rect
                                                x={x}
                                                y={y}
                                                width={width}
                                                height={height}
                                                fill={nodeColor}
                                                fillOpacity={0.9}
                                            />
                                            <text
                                                x={x + width / 2}
                                                y={y + height + 15}
                                                textAnchor="middle"
                                                fontSize={10}
                                                fill="currentColor"
                                                fontWeight="500"
                                            >
                                                {nodeName}
                                            </text>
                                        </g>
                                    );
                                }}
                                link={{ stroke: '#94a3b8', strokeOpacity: 0.5 }}
                                nodePadding={30}
                                margin={{ top: 10, right: 80, bottom: 30, left: 10 }}
                            >
                                <Tooltip
                                    content={({ payload }) => {
                                        if (!payload || payload.length === 0) return null;
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-background border rounded-lg p-2 shadow-lg">
                                                {data.name ? (
                                                    <p className="font-semibold text-sm">{data.name}</p>
                                                ) : (
                                                    <>
                                                        <p className="text-xs">
                                                            {data.source?.name} → {data.target?.name}
                                                        </p>
                                                        <p className="font-semibold text-sm">
                                                            ${data.value?.toLocaleString(undefined, {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2
                                                            })}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    }}
                                />
                            </Sankey>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </PremiumGuard>
    );
}
