/**
 * InsightsWidget - Dashboard widget showing top insights.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Lightbulb,
    ArrowRight,
    TrendingUp,
    AlertCircle,
    RefreshCw,
    Wallet,
    DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Insight, InsightType } from '@/types/insight.types';
import { insightService } from '@/services/insightService';

interface InsightsWidgetProps {
    maxItems?: number;
    className?: string;
}

const getInsightIcon = (type: InsightType) => {
    switch (type) {
        case 'subscription':
            return RefreshCw;
        case 'unusual_spending':
            return AlertCircle;
        case 'merchant_pattern':
            return Wallet;
        case 'savings_opportunity':
            return DollarSign;
        case 'income_analysis':
        case 'spending_trend':
            return TrendingUp;
        default:
            return Lightbulb;
    }
};

const getPriorityDot = (priority: string) => {
    switch (priority) {
        case 'high':
            return 'bg-red-500';
        case 'medium':
            return 'bg-yellow-500';
        case 'low':
            return 'bg-green-500';
        default:
            return 'bg-muted';
    }
};

export function InsightsWidget({ maxItems = 3, className }: InsightsWidgetProps) {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        const fetchInsights = async () => {
            try {
                const response = await insightService.getInsights();
                setInsights(response.results.slice(0, maxItems));
                setTotalCount(response.count);
            } catch (error) {
                console.error('Failed to fetch insights:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, [maxItems]);

    const handleDismiss = async (insightId: string) => {
        try {
            await insightService.dismissInsight(insightId);
            setInsights(prev => prev.filter(i => i.insight_id !== insightId));
            setTotalCount(prev => prev - 1);
        } catch (error) {
            console.error('Failed to dismiss insight:', error);
        }
    };

    if (loading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Lightbulb className="h-5 w-5" />
                        Smart Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (insights.length === 0) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Lightbulb className="h-5 w-5" />
                        Smart Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-6 text-muted-foreground">
                        <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No insights available yet.</p>
                        <p className="text-xs mt-1">We'll generate insights as you use the app.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        Smart Insights
                        {totalCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {totalCount}
                            </Badge>
                        )}
                    </CardTitle>
                    <Link to="/insights">
                        <Button variant="ghost" size="sm" className="gap-1 h-8">
                            View all
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {insights.map((insight) => {
                        const Icon = getInsightIcon(insight.insight_type);
                        return (
                            <div
                                key={insight.insight_id}
                                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                            >
                                <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                                    <Icon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={cn(
                                            'h-2 w-2 rounded-full flex-shrink-0',
                                            getPriorityDot(insight.priority)
                                        )} />
                                        <h4 className="text-sm font-medium truncate">
                                            {insight.title}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {insight.description}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={() => handleDismiss(insight.insight_id)}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {totalCount > maxItems && (
                    <Link to="/insights" className="block mt-4">
                        <Button variant="outline" className="w-full" size="sm">
                            View {totalCount - maxItems} more insights
                        </Button>
                    </Link>
                )}
            </CardContent>
        </Card>
    );
}
