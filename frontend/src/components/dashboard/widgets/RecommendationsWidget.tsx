import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, Target, AlertCircle } from 'lucide-react';
import { useSubscriptions } from '@/hooks/useSubscription';
import { PremiumGuard } from '@/components/common/PremiumGuard';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/services/analyticsService';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface RecommendationsWidgetProps {
    className?: string;
}

export function RecommendationsWidget({ className }: RecommendationsWidgetProps) {
    const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptions();
    const activeSubscription = subscriptions?.find(sub => sub.status === 'active' || sub.status === 'trialing');
    const hasProAccess = activeSubscription?.plan === 'pro' || activeSubscription?.plan === 'premium';

    const { data: recommendations, isLoading: recommendationsLoading } = useQuery({
        queryKey: ['recommendations'],
        queryFn: () => analyticsService.getRecommendations(),
        enabled: hasProAccess && !subscriptionsLoading,
    });

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

    // Show limited recommendations in widget (3-5)
    const displayRecommendations = recommendations?.slice(0, 5) || [];

    return (
        <PremiumGuard
            hasAccess={hasProAccess}
            loading={subscriptionsLoading}
            title="Smart Recommendations"
            description="Get AI-powered insights and personalized tips. Upgrade to Pro."
        >
            <Card className={className}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        Recommendations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recommendationsLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="h-10 w-10 bg-muted rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-3/4 bg-muted rounded" />
                                        <div className="h-3 w-full bg-muted rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : displayRecommendations.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                            <p className="text-sm">No recommendations at this time.</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                {displayRecommendations.map((recommendation) => {
                                    const Icon = getIcon(recommendation.icon);
                                    return (
                                        <div key={recommendation.id} className="flex gap-3">
                                            <div className="flex-shrink-0 mt-0.5">
                                                <div className="p-2 rounded-lg bg-primary/10">
                                                    <Icon className="h-4 w-4 text-primary" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium mb-1">
                                                    {recommendation.title}
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    {recommendation.description}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {recommendations && recommendations.length > 5 && (
                                <div className="mt-4 pt-4 border-t">
                                    <Link to="/analytics">
                                        <Button variant="outline" size="sm" className="w-full">
                                            View All Recommendations
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </PremiumGuard>
    );
}
