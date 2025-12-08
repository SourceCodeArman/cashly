import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PremiumGuardProps {
    children: ReactNode;
    hasAccess: boolean;
    loading?: boolean;
    title?: string;
    description?: string;
}

export function PremiumGuard({
    children,
    hasAccess,
    loading = false,
    title = "Advanced Analytics",
    description = "Unlock powerful visualizations and insights to better understand your financial health. Upgrade to Pro or Premium to access these features."
}: PremiumGuardProps) {
    const navigate = useNavigate();

    return (
        <div className="relative">
            {/* Content - Blurred if no access */}
            <div className={!hasAccess && !loading ? 'blur-sm pointer-events-none select-none' : ''}>
                {children}
            </div>

            {/* Overlay */}
            {!loading && !hasAccess && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] z-10">
                    <Card className="max-w-md mx-4 shadow-lg border-primary/20">
                        <CardContent className="flex flex-col items-center justify-center text-center space-y-6 p-8">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Lock className="w-6 h-6 text-primary" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold">{title}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                            <div className="flex gap-3 w-full justify-center">
                                <Button onClick={() => navigate('/subscription')} className="w-full sm:w-auto">
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Upgrade to View
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
