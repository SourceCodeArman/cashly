/**
 * InsightCard - Displays a single insight with actions.
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    X,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Lightbulb,
    DollarSign,
    RefreshCw,
    Wallet,
    ThumbsUp,
    ThumbsDown,
    ChevronDown,
    ChevronUp,
    Calendar,
    Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Insight, InsightType, InsightPriority } from '@/types/insight.types';
import { insightService } from '@/services/insightService';

interface InsightCardProps {
    insight: Insight;
    onDismiss?: (insightId: string) => void;
    onFeedback?: (insightId: string, isHelpful: boolean) => void;
    showFeedback?: boolean;
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
            return TrendingUp;
        case 'spending_trend':
            return TrendingDown;
        case 'budget_insight':
            return Lightbulb;
        default:
            return Lightbulb;
    }
};

const getPriorityColor = (priority: InsightPriority) => {
    switch (priority) {
        case 'high':
            return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'medium':
            return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        case 'low':
            return 'bg-green-500/10 text-green-500 border-green-500/20';
        default:
            return 'bg-muted text-muted-foreground';
    }
};

const getIconBackgroundColor = (type: InsightType) => {
    switch (type) {
        case 'subscription':
            return 'bg-blue-500/10 text-blue-500';
        case 'unusual_spending':
            return 'bg-red-500/10 text-red-500';
        case 'merchant_pattern':
            return 'bg-purple-500/10 text-purple-500';
        case 'savings_opportunity':
            return 'bg-green-500/10 text-green-500';
        case 'income_analysis':
            return 'bg-emerald-500/10 text-emerald-500';
        case 'spending_trend':
            return 'bg-orange-500/10 text-orange-500';
        case 'budget_insight':
            return 'bg-amber-500/10 text-amber-500';
        default:
            return 'bg-muted text-muted-foreground';
    }
};

const getInsightTypeLabel = (type: InsightType) => {
    switch (type) {
        case 'subscription':
            return 'Subscription Pattern';
        case 'unusual_spending':
            return 'Unusual Spending';
        case 'merchant_pattern':
            return 'Merchant Pattern';
        case 'savings_opportunity':
            return 'Savings Opportunity';
        case 'income_analysis':
            return 'Income Analysis';
        case 'spending_trend':
            return 'Spending Trend';
        case 'budget_insight':
            return 'Budget Insight';
        default:
            return 'Insight';
    }
};

const formatMetadataValue = (key: string, value: unknown): string => {
    if (typeof value === 'number') {
        if (key.includes('amount') || key.includes('spent') || key.includes('savings') || key.includes('avg')) {
            return `$${value.toFixed(2)}`;
        }
        if (key.includes('percentage') || key.includes('pct')) {
            return `${value.toFixed(1)}%`;
        }
        return value.toString();
    }
    if (typeof value === 'string') {
        return value;
    }
    return JSON.stringify(value);
};



// Type for subscription metadata items
interface SubscriptionItem {
    merchant: string;
    amount: number;
    frequency: string;
    category: string;
    occurrences: number;
}

// Type guard for subscription metadata
const isSubscriptionArray = (value: unknown): value is SubscriptionItem[] => {
    return Array.isArray(value) && value.every(item =>
        typeof item === 'object' &&
        item !== null &&
        'merchant' in item &&
        'amount' in item
    );
};

export function InsightCard({
    insight,
    onDismiss,
    onFeedback,
    showFeedback = true,
    className
}: InsightCardProps) {
    const [isDismissing, setIsDismissing] = useState(false);
    const [hasGivenFeedback, setHasGivenFeedback] = useState(false);
    const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const Icon = getInsightIcon(insight.insight_type);

    const handleDismiss = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDismissing(true);
        try {
            await insightService.dismissInsight(insight.insight_id);
            onDismiss?.(insight.insight_id);
        } catch (error) {
            console.error('Failed to dismiss insight:', error);
        } finally {
            setIsDismissing(false);
        }
    };

    const handleFeedback = async (isHelpful: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await insightService.submitFeedback(insight.insight_id, { is_helpful: isHelpful });
            setHasGivenFeedback(true);
            setFeedbackGiven(isHelpful);
            onFeedback?.(insight.insight_id, isHelpful);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        }
    };

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
        // Mark as read when expanded
        if (!insight.is_read && !isExpanded) {
            insightService.markAsRead(insight.insight_id).catch(console.error);
        }
    };

    // Get displayable metadata (filter out complex objects and arrays)
    const displayableMetadata = Object.entries(insight.metadata || {}).filter(
        ([_key, value]) =>
            typeof value !== 'object' ||
            (Array.isArray(value) && value.length <= 5)
    );

    const formattedDate = new Date(insight.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <Card
            className={cn(
                'relative group transition-all duration-200 hover:shadow-md cursor-pointer',
                !insight.is_read && 'ring-2 ring-primary/20',
                isExpanded && 'ring-2 ring-primary/30',
                className
            )}
            onClick={toggleExpand}
        >
            <CardContent className="p-4">
                <div className="flex gap-3">
                    {/* Icon - fixed height with self-start */}
                    <div className={cn(
                        'flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center self-start',
                        getIconBackgroundColor(insight.insight_type)
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-semibold leading-tight">
                                {insight.title}
                            </h4>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Badge
                                    variant="outline"
                                    className={cn('text-xs', getPriorityColor(insight.priority))}
                                >
                                    {insight.priority}
                                </Badge>
                                {!insight.is_read && (
                                    <span className="h-2 w-2 rounded-full bg-primary" />
                                )}
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {insight.description}
                        </p>

                        {/* Click to expand hint */}
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                            )}
                            <span>{isExpanded ? 'Less details' : 'More details'}</span>
                        </div>

                        {/* Expanded details section */}
                        {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-border space-y-3" onClick={e => e.stopPropagation()}>
                                {/* Type and Date */}
                                <div className="flex flex-wrap gap-4 text-xs">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Info className="h-3.5 w-3.5" />
                                        <span>{getInsightTypeLabel(insight.insight_type)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>{formattedDate}</span>
                                    </div>
                                </div>

                                {/* Subscriptions list for subscription insights */}
                                {insight.insight_type === 'subscription' && isSubscriptionArray(insight.metadata?.subscriptions) && (
                                    <div className="bg-muted/50 rounded-lg p-3">
                                        <h5 className="text-xs font-medium text-muted-foreground mb-3">Your Subscriptions</h5>
                                        <div className="space-y-2">
                                            {insight.metadata.subscriptions.map((sub, index) => (
                                                <div key={index} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{sub.merchant}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {sub.category} • {sub.frequency}
                                                        </p>
                                                    </div>
                                                    <div className="text-right ml-3">
                                                        <p className="text-sm font-semibold">${sub.amount.toFixed(2)}</p>
                                                        <p className="text-xs text-muted-foreground">/{sub.frequency === 'monthly' ? 'mo' : 'wk'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {typeof insight.metadata.total_monthly === 'number' && (
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                                                <span className="text-sm font-medium">Total Monthly</span>
                                                <span className="text-sm font-bold">${insight.metadata.total_monthly.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Metadata for non-subscription insights */}
                                {insight.insight_type !== 'subscription' && displayableMetadata.length > 0 && (
                                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                        <h5 className="text-xs font-medium text-muted-foreground mb-2">Details</h5>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            {displayableMetadata.map(([key, value], idx) => {
                                                // Skip arrays and certain keys
                                                if (Array.isArray(value)) return null;

                                                const formattedValue = formatMetadataValue(key, value);
                                                return (
                                                    <div key={idx} className="text-sm">
                                                        <span className="ml-1 font-medium">
                                                            {formattedValue}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Feedback buttons */}
                                {showFeedback && !hasGivenFeedback && (
                                    <div className="flex items-center gap-2 pt-2">
                                        <span className="text-xs text-muted-foreground mr-1">Was this helpful?</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-3 gap-1"
                                            onClick={(e) => handleFeedback(true, e)}
                                        >
                                            <ThumbsUp className="h-3.5 w-3.5" />
                                            Yes
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-3 gap-1"
                                            onClick={(e) => handleFeedback(false, e)}
                                        >
                                            <ThumbsDown className="h-3.5 w-3.5" />
                                            No
                                        </Button>
                                    </div>
                                )}

                                {hasGivenFeedback && (
                                    <div className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
                                        {feedbackGiven ? (
                                            <>
                                                <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
                                                <span>Thanks for the feedback!</span>
                                            </>
                                        ) : (
                                            <>
                                                <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span>We'll improve our insights</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Dismiss button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-start"
                        onClick={handleDismiss}
                        disabled={isDismissing}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Dismiss</span>
                    </Button>
                </div >
            </CardContent >
        </Card >
    );
}

