import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, Target, AlertCircle } from 'lucide-react';
import type { Recommendation } from '@/types/analytics.types';
import { Badge } from '@/components/ui/badge';

interface RecommendationsListProps {
    recommendations: Recommendation[];
    loading?: boolean;
}

export function RecommendationsList({ recommendations, loading }: RecommendationsListProps) {
    const getIcon = (type: string) => {
        switch (type) {
            case 'trending':
                return TrendingUp;
            case 'target':
                return Target;
            case 'alert':
                return AlertCircle;
            default:
                return Lightbulb;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'destructive';
            case 'medium':
                return 'default';
            case 'low':
                return 'secondary';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <Card className="animate-pulse">
                <CardHeader>
                    <div className="h-6 w-1/3 bg-muted rounded" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex gap-3">
                                <div className="h-10 w-10 bg-muted rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 bg-muted rounded" />
                                    <div className="h-3 w-full bg-muted rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!recommendations || recommendations.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        Recommendations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No recommendations at this time.</p>
                        <p className="text-sm mt-2">Keep managing your finances and we'll provide personalized insights!</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Recommendations
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recommendations.map((recommendation) => {
                        const Icon = getIcon(recommendation.icon);
                        return (
                            <div key={recommendation.id} className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="p-2 rounded-lg bg-primary/10">
                                        <Icon className="h-4 w-4 text-primary" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="text-sm font-medium">
                                            {recommendation.title}
                                        </h4>
                                        <Badge variant={getPriorityColor(recommendation.priority) as any}>
                                            {recommendation.priority}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {recommendation.description}
                                    </p>
                                    {recommendation.actionable && (
                                        <div className="mt-2 text-xs text-primary">
                                            Actionable
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

