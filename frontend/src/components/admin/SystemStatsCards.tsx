import { Users, CreditCard, DollarSign, Activity, TrendingUp, UserPlus, Shield, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AdminSystemStats } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface SystemStatsCardsProps {
    stats: AdminSystemStats | null
    isLoading: boolean
}

export function SystemStatsCards({ stats, isLoading }: SystemStatsCardsProps) {
    if (isLoading || !stats) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="border-border shadow-soft">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <Skeleton className="h-4 w-24" />
                            </CardTitle>
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-20 mb-1" />
                            <Skeleton className="h-3 w-32" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card className="border-border shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{(stats.totalUsers || 0).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        +{stats.recentSignups7d || 0} in last 7 days
                    </p>
                </CardContent>
            </Card>

            <Card className="border-border shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(parseFloat(stats.totalBalance))}</div>
                    <p className="text-xs text-muted-foreground">
                        Across {(stats.totalAccounts || 0).toLocaleString()} accounts
                    </p>
                </CardContent>
            </Card>

            <Card className="border-border shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{(stats.totalTransactions || 0).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        Total system transactions
                    </p>
                </CardContent>
            </Card>

            <Card className="border-border shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {(stats.activeSubscriptions['premium'] || 0) + (stats.activeSubscriptions['pro'] || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {stats.activeSubscriptions['pro'] || 0} Pro, {stats.activeSubscriptions['premium'] || 0} Premium
                    </p>
                </CardContent>
            </Card>

            <Card className="border-border shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(parseFloat(stats.totalRevenue || '0'))}</div>
                    <p className="text-xs text-muted-foreground">
                        Monthly recurring revenue
                    </p>
                </CardContent>
            </Card>

            <Card className="border-border shadow-soft">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">This Month Revenue</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(parseFloat(stats.thisMonthRevenue || '0'))}</div>
                    <p className="text-xs text-muted-foreground">
                        New & renewed subscriptions
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
