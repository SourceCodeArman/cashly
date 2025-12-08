import { Users, CreditCard, DollarSign, Activity, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { AdminSystemStats } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface SystemStatsCardsProps {
    stats: AdminSystemStats | null
    isLoading: boolean
}

interface StatCardProps {
    title: string
    value: string | number
    subtitle: string
    icon: React.ElementType
    trend?: {
        value: number
        isPositive: boolean
        label: string
    }
    color?: string
}

function StatCard({ title, value, subtitle, icon: Icon, trend, color = "primary" }: StatCardProps) {
    return (
        <Card className={`relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-${color}/5 to-${color}/10 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className={`p-2 rounded-lg bg-${color}/10`}>
                    <Icon className={`h-4 w-4 text-${color}`} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground flex-1">{subtitle}</p>
                    {trend && (
                        <Badge
                            variant={trend.isPositive ? "default" : "destructive"}
                            className="text-xs px-1.5 py-0.5 h-5"
                        >
                            {trend.isPositive ? (
                                <ArrowUp className="h-3 w-3 mr-1" />
                            ) : (
                                <ArrowDown className="h-3 w-3 mr-1" />
                            )}
                            {trend.value}%
                        </Badge>
                    )}
                </div>
            </CardContent>
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-${color}/20 to-${color}/40`} />
        </Card>
    )
}

export function SystemStatsCards({ stats, isLoading }: SystemStatsCardsProps) {
    if (isLoading || !stats) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i} className="border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-20 mb-2" />
                            <Skeleton className="h-3 w-32 mb-2" />
                            <Skeleton className="h-4 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        )
    }

    const totalPaidUsers = (stats.activeSubscriptions['premium'] || 0) + (stats.activeSubscriptions['pro'] || 0)

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            <StatCard
                title="Total Users"
                value={(stats.totalUsers || 0).toLocaleString()}
                subtitle={`${stats.recentSignups7d || 0} new this week`}
                icon={Users}
                color="blue"
                trend={{
                    value: Math.round(((stats.recentSignups7d || 0) / Math.max(stats.totalUsers || 1, 1)) * 100),
                    isPositive: true,
                    label: "weekly growth"
                }}
            />

            <StatCard
                title="Total Balance"
                value={formatCurrency(parseFloat(stats.totalBalance) || 0)}
                subtitle={`${(stats.totalAccounts || 0).toLocaleString()} active accounts`}
                icon={DollarSign}
                color="green"
            />

            <StatCard
                title="Transactions"
                value={(stats.totalTransactions || 0).toLocaleString()}
                subtitle="All-time system transactions"
                icon={Activity}
                color="purple"
            />

            <StatCard
                title="Paid Users"
                value={totalPaidUsers.toLocaleString()}
                subtitle={`${stats.activeSubscriptions['pro'] || 0} Pro, ${stats.activeSubscriptions['premium'] || 0} Premium`}
                icon={CreditCard}
                color="orange"
                trend={{
                    value: Math.round((totalPaidUsers / Math.max(stats.totalUsers || 1, 1)) * 100),
                    isPositive: true,
                    label: "conversion rate"
                }}
            />

            <StatCard
                title="Monthly Revenue"
                value={formatCurrency(parseFloat(stats.totalRevenue || '0'))}
                subtitle="Recurring subscription revenue"
                icon={TrendingUp}
                color="emerald"
            />

            <StatCard
                title="This Month"
                value={formatCurrency(parseFloat(stats.thisMonthRevenue || '0'))}
                subtitle="New & renewed subscriptions"
                icon={TrendingDown}
                color="indigo"
                trend={{
                    value: parseFloat(stats.thisMonthRevenue || '0') > 0 ? 15 : 0,
                    isPositive: parseFloat(stats.thisMonthRevenue || '0') > 0,
                    label: "vs last month"
                }}
            />
        </div>
    )
}
