/**
 * InsightsPage - Dedicated page for viewing and managing insights.
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InsightsList } from '@/components/insights/InsightsList';
import {
    Lightbulb,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    RefreshCw
} from 'lucide-react';
import type { Insight, InsightSummary } from '@/types/insight.types';
import { insightService } from '@/services/insightService';
import { PageHeader } from "@/components/PageHeader"

export default function InsightsPage() {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [summary, setSummary] = useState<InsightSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        console.log('Insights updated:', insights);
    }, [insights]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [insightsResponse, summaryResponse] = await Promise.all([
                insightService.getInsights(),
                insightService.getSummary()
            ]);
            setInsights(insightsResponse.results);
            setSummary(summaryResponse);
        } catch (error) {
            console.error('Failed to fetch insights:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await insightService.generateInsights();
            setInsights(prev => [...response.insights, ...prev]);
            // Refresh summary
            const summaryResponse = await insightService.getSummary();
            setSummary(summaryResponse);
        } catch (error) {
            console.error('Failed to generate insights:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredInsights = activeTab === 'all'
        ? insights
        : insights.filter(i => i.priority === activeTab);

    return (
        <div className="container mx-auto py-6 px-4 max-w-5xl">
            {/* Header */}
            {/* Header */}
            <PageHeader
                title="Smart Insights"
                description="Personalized recommendations based on your financial data"
            >
                <Button onClick={handleGenerate} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Insights
                </Button>
            </PageHeader>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Lightbulb className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary.total}</p>
                                    <p className="text-xs text-muted-foreground">Total Insights</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <TrendingUp className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary.unread}</p>
                                    <p className="text-xs text-muted-foreground">Unread</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-500/10">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{summary.by_priority.high}</p>
                                    <p className="text-xs text-muted-foreground">High Priority</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/10">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">
                                        {summary.by_priority.medium + summary.by_priority.low}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Other</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Insights List with Tabs */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Your Insights</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="all">
                                All ({insights.length})
                            </TabsTrigger>
                            <TabsTrigger value="high" className="text-red-600">
                                High ({insights.filter(i => i.priority === 'high').length})
                            </TabsTrigger>
                            <TabsTrigger value="medium">
                                Medium ({insights.filter(i => i.priority === 'medium').length})
                            </TabsTrigger>
                            <TabsTrigger value="low">
                                Low ({insights.filter(i => i.priority === 'low').length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value={activeTab} className="mt-0">
                            <InsightsList
                                insights={filteredInsights}
                                loading={loading}
                                onRefresh={fetchData}
                                showFilters={true}
                                showEmpty={true}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
