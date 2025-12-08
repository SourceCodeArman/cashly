import { useDashboard } from '@/hooks/useDashboard'
import { useTransactions } from '@/hooks/useTransactions'
import { useDashboardStore } from '@/store/dashboardStore'
import type { WidgetType } from '@/store/dashboardStore'
import { DashboardCustomizer } from '@/components/dashboard/DashboardCustomizer'
import { CustomDashboardLayout } from '@/components/dashboard/CustomDashboardLayout'
import { TotalBalanceWidget } from '@/components/dashboard/widgets/TotalBalanceWidget'
import { TotalIncomeWidget } from '@/components/dashboard/widgets/TotalIncomeWidget'
import { TotalSpendingWidget } from '@/components/dashboard/widgets/TotalSpendingWidget'
import { SpendingTrendWidget } from '@/components/dashboard/widgets/SpendingTrendWidget'
import { ActiveGoalsWidget } from '@/components/dashboard/widgets/ActiveGoalsWidget'
import { RecentTransactionsWidget } from '@/components/dashboard/widgets/RecentTransactionsWidget'
import { BudgetProgressWidget } from '@/components/dashboard/widgets/BudgetProgressWidget'
import { SankeyWidget } from '@/components/dashboard/widgets/SankeyWidget'
import { NetWorthWidget } from '@/components/dashboard/widgets/NetWorthWidget'
import { RecommendationsWidget } from '@/components/dashboard/widgets/RecommendationsWidget'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function Dashboard() {
  const { data: dashboardData, isLoading: isDashboardLoading } = useDashboard()
  const { data: transactionsData, isLoading: isTransactionsLoading } = useTransactions({ limit: 5 })
  const { layoutMode, widgets } = useDashboardStore()

  const isLoading = isDashboardLoading || isTransactionsLoading

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-border shadow-soft">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderWidget = (type: WidgetType) => {
    switch (type) {
      case 'totalBalance':
        return <TotalBalanceWidget amount={dashboardData?.totalBalance || '0'} />
      case 'totalIncome':
        return <TotalIncomeWidget amount={dashboardData?.totalIncome || '0'} />
      case 'totalSpending':
        return <TotalSpendingWidget amount={dashboardData?.totalSpending || '0'} />
      case 'spendingTrend':
        return <SpendingTrendWidget
          data={dashboardData?.spendingTrend || []}
          className={layoutMode !== 'custom' ? "h-[400px]" : undefined}
        />
      case 'activeGoals':
        return <ActiveGoalsWidget goals={dashboardData?.activeGoals || []} />
      case 'recentTransactions':
        return <RecentTransactionsWidget transactions={transactionsData?.results || []} />
      case 'budgetProgress':
        return <BudgetProgressWidget />
      case 'sankeyDiagram':
        return <SankeyWidget className={layoutMode !== 'custom' ? "h-[400px]" : undefined} />
      case 'netWorth':
        return <NetWorthWidget />
      case 'recommendations':
        return <RecommendationsWidget />
      default:
        return null
    }
  }

  const visibleWidgets = widgets.filter((w) => w.isVisible)

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your financial status and spending patterns
          </p>
        </div>
        <DashboardCustomizer />
      </div>

      {/* Custom Layout */}
      {layoutMode === 'custom' ? (
        <CustomDashboardLayout renderWidget={renderWidget} />
      ) : (
        /* Standard Grid/List Layout */
        <div
          className={`grid gap-6 ${layoutMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
            }`}
        >
          {visibleWidgets.map((widget) => (
            <div
              key={widget.id}
              className={`${layoutMode === 'grid'
                ? `col-span-1 ${widget.colSpan.tablet > 1 ? `sm:col-span-${widget.colSpan.tablet}` : ''
                } ${widget.colSpan.desktop > 1 ? `lg:col-span-${widget.colSpan.desktop}` : ''}`
                : 'col-span-1'
                }`}
            >
              {renderWidget(widget.id)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
