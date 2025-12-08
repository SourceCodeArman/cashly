/**
 * InsightsList - Displays a filterable list of insights.
 */
import { useState, useEffect } from 'react';
import { InsightCard } from './InsightCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Lightbulb, RefreshCw, Filter, X } from 'lucide-react';
import type { Insight, InsightType, InsightPriority } from '@/types/insight.types';
import { insightService } from '@/services/insightService';
import { cn } from '@/lib/utils';

interface InsightsListProps {
    insights?: Insight[];
    loading?: boolean;
    onRefresh?: () => void;
    showFilters?: boolean;
    showEmpty?: boolean;
    maxItems?: number;
    className?: string;
}

const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
    subscription: 'Subscriptions',
    unusual_spending: 'Unusual Spending',
    merchant_pattern: 'Merchant Patterns',
    savings_opportunity: 'Savings',
    income_analysis: 'Income',
    spending_trend: 'Spending Trends',
    budget_insight: 'Budgets'
};

const PRIORITY_LABELS: Record<InsightPriority, string> = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority'
};

export function InsightsList({
    insights: propInsights,
    loading: propLoading,
    onRefresh,
    showFilters = true,
    showEmpty = true,
    maxItems,
    className
}: InsightsListProps) {
    const [insights, setInsights] = useState<Insight[]>(propInsights || []);
    const [loading, setLoading] = useState(propLoading ?? true);
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [isGenerating, setIsGenerating] = useState(false);

    // Fetch insights if not provided as prop
    useEffect(() => {
        if (propInsights !== undefined) {
            setInsights(propInsights);
            setLoading(false);
            return;
        }

        const fetchInsights = async () => {
            setLoading(true);
            try {
                const response = await insightService.getInsights();
                setInsights(response.results);
            } catch (error) {
                console.error('Failed to fetch insights:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInsights();
    }, [propInsights]);

    // Update loading state from prop
    useEffect(() => {
        if (propLoading !== undefined) {
            setLoading(propLoading);
        }
    }, [propLoading]);

    const handleDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i.insight_id !== insightId));
    };

    const handleRefresh = async () => {
        onRefresh?.();

        if (!onRefresh) {
            setLoading(true);
            try {
                const response = await insightService.getInsights();
                setInsights(response.results);
            } catch (error) {
                console.error('Failed to refresh insights:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const response = await insightService.generateInsights();
            setInsights(prev => [...response.insights, ...prev]);
        } catch (error) {
            console.error('Failed to generate insights:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const clearFilters = () => {
        setTypeFilter('all');
        setPriorityFilter('all');
    };

    // Filter insights
    let filteredInsights = insights;

    if (typeFilter !== 'all') {
        filteredInsights = filteredInsights.filter(i => i.insight_type === typeFilter);
    }

    if (priorityFilter !== 'all') {
        filteredInsights = filteredInsights.filter(i => i.priority === priorityFilter);
    }

    // Limit items if maxItems is set
    const displayInsights = maxItems
        ? filteredInsights.slice(0, maxItems)
        : filteredInsights;

    const hasActiveFilters = typeFilter !== 'all' || priorityFilter !== 'all';

    if (loading) {
        return (
            <div className={cn('space-y-3', className)}>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (showEmpty && insights.length === 0) {
        return (
            <div className={cn('text-center py-12', className)}>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <Lightbulb className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Insights Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    We're analyzing your financial data. Check back soon for personalized insights!
                </p>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Generate Insights
                        </>
                    )}
                </Button>
            </div>
        );
    }

    return (
        <div className={cn('space-y-4', className)}>
            {/* Filters */}
            {showFilters && (
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[160px] h-8">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {Object.entries(INSIGHT_TYPE_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger className="w-[140px] h-8">
                                <SelectValue placeholder="All Priorities" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8"
                                onClick={clearFilters}
                            >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>

                    <div className="ml-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            <RefreshCw className={cn(
                                'h-3.5 w-3.5 mr-1',
                                loading && 'animate-spin'
                            )} />
                            Refresh
                        </Button>
                    </div>
                </div>
            )}

            {/* Insights list */}
            {displayInsights.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <p>No insights match your filters.</p>
                    <Button
                        variant="link"
                        className="mt-2"
                        onClick={clearFilters}
                    >
                        Clear filters
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayInsights.map((insight) => (
                        <InsightCard
                            key={insight.insight_id}
                            insight={insight}
                            onDismiss={handleDismiss}
                        />
                    ))}
                </div>
            )}

            {/* Show more indicator */}
            {maxItems && filteredInsights.length > maxItems && (
                <div className="text-center text-sm text-muted-foreground">
                    Showing {maxItems} of {filteredInsights.length} insights
                </div>
            )}
        </div>
    );
}
