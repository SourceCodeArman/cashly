import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { TrendsChart } from '@/components/analytics/TrendsChart';
import { NetWorthCard } from '@/components/analytics/NetWorthCard';
import { PatternsChart } from '@/components/analytics/PatternsChart';
import { SankeyDiagram } from '@/components/analytics/SankeyDiagram';
import { RecommendationsList } from '@/components/analytics/RecommendationsList';
import { analyticsService } from '@/services/analyticsService';
import { format, subDays } from 'date-fns';
import { useSubscriptions } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { PageHeader } from "@/components/PageHeader"

import { PremiumGuard } from '@/components/common/PremiumGuard';
import { Download } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    exportTrendsToCSV,
    exportPatternsToCSV,
    exportNetWorthToCSV,
    exportAllAnalyticsToCSV
} from '@/utils/csvExport';
import { toast } from 'sonner';

export default function Analytics() {
    // Check subscription status
    const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptions();
    const activeSubscription = subscriptions?.find(sub => sub.status === 'active' || sub.status === 'trialing');
    const hasProAccess = activeSubscription?.plan === 'pro' || activeSubscription?.plan === 'premium';

    // Debug logging
    console.log('Subscriptions:', subscriptions);
    console.log('Active Subscription:', activeSubscription);
    console.log('Has Pro Access:', hasProAccess);
    console.log('Subscriptions Loading:', subscriptionsLoading);


    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: subDays(new Date(), 30),
        to: new Date()
    });

    const { data: sankeyData, isLoading: sankeyLoading } = useQuery({
        queryKey: ['sankey', dateRange.from, dateRange.to],
        queryFn: () => analyticsService.getSankeyData(
            format(dateRange.from, 'yyyy-MM-dd'),
            format(dateRange.to, 'yyyy-MM-dd')
        ),
        enabled: hasProAccess && !subscriptionsLoading, // Only fetch if user has pro access
    });

    const { data: trendsData, isLoading: trendsLoading } = useQuery({
        queryKey: ['trends'],
        queryFn: () => analyticsService.getTrends(6),
        enabled: hasProAccess && !subscriptionsLoading,
    });

    const { data: netWorthData, isLoading: netWorthLoading } = useQuery({
        queryKey: ['netWorth'],
        queryFn: analyticsService.getNetWorth,
        enabled: hasProAccess && !subscriptionsLoading,
    });

    const { data: patternsData, isLoading: patternsLoading } = useQuery({
        queryKey: ['patterns', dateRange.from, dateRange.to],
        queryFn: () => analyticsService.getPatterns(
            dateRange.from.getMonth() + 1,
            dateRange.from.getFullYear()
        ),
        enabled: hasProAccess && !subscriptionsLoading,
    });

    const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery({
        queryKey: ['recommendations'],
        queryFn: () => analyticsService.getRecommendations(),
        enabled: hasProAccess && !subscriptionsLoading,
    });

    const handlePresetRange = (days: number) => {
        setDateRange({
            from: subDays(new Date(), days),
            to: new Date()
        });
    };

    // Demo data for free tier users
    const demoSankeyData = {
        nodes: [
            { name: "Cash Flow", color: "#8b5cf6" },
            { name: "Salary", color: "#10b981" },
            { name: "Freelance Income", color: "#059669" },
            { name: "Rent & Housing", color: "#ef4444" },
            { name: "Groceries & Food", color: "#f59e0b" },
            { name: "Transportation", color: "#8b5cf6" },
            { name: "Entertainment", color: "#ec4899" },
            { name: "Savings", color: "#22c55e" }
        ],
        links: [
            { source: 1, target: 0, value: 5000 },
            { source: 2, target: 0, value: 1500 },
            { source: 0, target: 3, value: 2000 },
            { source: 0, target: 4, value: 800 },
            { source: 0, target: 5, value: 400 },
            { source: 0, target: 6, value: 300 },
            { source: 0, target: 7, value: 3000 }
        ]
    };

    const demoNetWorthData = {
        net_worth: 125000,
        assets: 150000,
        liabilities: 25000
    };

    const demoTrendsData = [
        { month: '2024-01', amount: 4200 },
        { month: '2024-02', amount: 3800 },
        { month: '2024-03', amount: 4500 },
        { month: '2024-04', amount: 4100 },
        { month: '2024-05', amount: 3900 },
        { month: '2024-06', amount: 4300 }
    ];

    const demoPatternsData = [
        { day: 'Sunday', amount: 850, count: 12 },
        { day: 'Monday', amount: 320, count: 5 },
        { day: 'Tuesday', amount: 450, count: 8 },
        { day: 'Wednesday', amount: 280, count: 4 },
        { day: 'Thursday', amount: 560, count: 7 },
        { day: 'Friday', amount: 920, count: 15 },
        { day: 'Saturday', amount: 1200, count: 18 }
    ];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Analytics"
                description="Visualize your financial data and spending patterns"
            >
                {hasProAccess && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                                if (trendsData) {
                                    exportTrendsToCSV(trendsData);
                                    toast.success('Trends exported to CSV');
                                }
                            }}>
                                Export Trends
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                if (patternsData) {
                                    exportPatternsToCSV(patternsData);
                                    toast.success('Patterns exported to CSV');
                                }
                            }}>
                                Export Patterns
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                if (netWorthData) {
                                    exportNetWorthToCSV(netWorthData);
                                    toast.success('Net Worth exported to CSV');
                                }
                            }}>
                                Export Net Worth
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                                if (trendsData && patternsData && netWorthData) {
                                    exportAllAnalyticsToCSV(trendsData, patternsData, netWorthData);
                                    toast.success('All analytics exported to CSV');
                                }
                            }}>
                                Export All
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </PageHeader>

            {/* Premium Analytics Section */}
            <PremiumGuard
                hasAccess={hasProAccess}
                loading={subscriptionsLoading}
                title="Advanced Analytics"
                description="Unlock Net Worth tracking, Spending Trends, and Pattern analysis. Upgrade to Pro to see your data."
            >
                <div className="space-y-6">
                    {/* Net Worth Card */}
                    <NetWorthCard
                        data={hasProAccess ? (netWorthData || null) : demoNetWorthData}
                        loading={hasProAccess ? netWorthLoading : false}
                    />

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Trends Chart */}
                        <TrendsChart
                            data={hasProAccess ? (trendsData || []) : demoTrendsData}
                            loading={hasProAccess ? trendsLoading : false}
                        />

                        {/* Patterns Chart */}
                        <PatternsChart
                            data={hasProAccess ? (patternsData || []) : demoPatternsData}
                            loading={hasProAccess ? patternsLoading : false}
                        />
                    </div>

                    {/* Recommendations */}
                    <RecommendationsList
                        recommendations={hasProAccess ? (recommendationsData || []) : []}
                        loading={hasProAccess ? recommendationsLoading : false}
                    />
                </div>
            </PremiumGuard>

            {/* Date Range Selector */}
            <Card>
                <CardHeader>
                    <CardTitle>Date Range</CardTitle>
                    <CardDescription>Select a time period to analyze</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            onClick={() => handlePresetRange(7)}
                        >
                            Last 7 Days
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handlePresetRange(30)}
                        >
                            Last 30 Days
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handlePresetRange(90)}
                        >
                            Last 3 Months
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handlePresetRange(365)}
                        >
                            Last Year
                        </Button>

                        <div className="flex gap-2 items-center">
                            <DatePicker
                                value={format(dateRange.from, 'yyyy-MM-dd')}
                                onChange={(value) => value && setDateRange({ ...dateRange, from: new Date(value) })}
                                placeholder="Start date"
                            />
                            <span className="text-muted-foreground">to</span>
                            <DatePicker
                                value={format(dateRange.to, 'yyyy-MM-dd')}
                                onChange={(value) => value && setDateRange({ ...dateRange, to: new Date(value) })}
                                placeholder="End date"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Sankey Diagram with Subscription Overlay */}
            <PremiumGuard
                hasAccess={hasProAccess}
                loading={subscriptionsLoading}
                title="Cash Flow Visualization"
                description="Visualize how money flows through your accounts with Sankey diagrams."
            >
                <SankeyDiagram
                    data={hasProAccess ? (sankeyData || null) : demoSankeyData}
                    loading={hasProAccess ? sankeyLoading : false}
                />
            </PremiumGuard>
        </div>
    );
}
