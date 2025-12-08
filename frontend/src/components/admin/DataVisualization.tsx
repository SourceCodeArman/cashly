import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, BarChart3 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// Color palette for charts
const COLORS = {
  primary: '#3b82f6',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  cyan: '#06b6d4',
  emerald: '#10b981',
  orange: '#f97316',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  gray: '#6b7280'
}

const CHART_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.purple,
  COLORS.pink,
  COLORS.indigo,
  COLORS.cyan
]

// Sample data generators (replace with real data)
const generateUserGrowthData = () => [
  { month: 'Jan', users: 1200, newUsers: 120 },
  { month: 'Feb', users: 1350, newUsers: 150 },
  { month: 'Mar', users: 1580, newUsers: 230 },
  { month: 'Apr', users: 1820, newUsers: 240 },
  { month: 'May', users: 2100, newUsers: 280 },
  { month: 'Jun', users: 2450, newUsers: 350 },
  { month: 'Jul', users: 2680, newUsers: 230 },
  { month: 'Aug', users: 2950, newUsers: 270 },
  { month: 'Sep', users: 3200, newUsers: 250 },
  { month: 'Oct', users: 3450, newUsers: 250 },
  { month: 'Nov', users: 3680, newUsers: 230 },
  { month: 'Dec', users: 3920, newUsers: 240 },
]

const generateRevenueData = () => [
  { month: 'Jan', revenue: 12500, subscriptions: 450 },
  { month: 'Feb', revenue: 14200, subscriptions: 480 },
  { month: 'Mar', revenue: 16800, subscriptions: 520 },
  { month: 'Apr', revenue: 19500, subscriptions: 580 },
  { month: 'May', revenue: 22300, subscriptions: 620 },
  { month: 'Jun', revenue: 25800, subscriptions: 680 },
  { month: 'Jul', revenue: 27200, subscriptions: 700 },
  { month: 'Aug', revenue: 28900, subscriptions: 720 },
  { month: 'Sep', revenue: 31200, subscriptions: 750 },
  { month: 'Oct', revenue: 32800, subscriptions: 780 },
  { month: 'Nov', revenue: 34500, subscriptions: 800 },
  { month: 'Dec', revenue: 36800, subscriptions: 820 },
]

const generateTransactionVolumeData = () => [
  { hour: '00', transactions: 45 },
  { hour: '04', transactions: 23 },
  { hour: '08', transactions: 89 },
  { hour: '12', transactions: 156 },
  { hour: '16', transactions: 203 },
  { hour: '20', transactions: 134 },
  { hour: '24', transactions: 67 },
]

const generateSubscriptionTiersData = () => [
  { name: 'Free', value: 2450, percentage: 62.5 },
  { name: 'Pro', value: 1120, percentage: 28.6 },
  { name: 'Premium', value: 350, percentage: 8.9 },
]

const generateTopCategoriesData = () => [
  { category: 'Food & Dining', amount: 12450, transactions: 234 },
  { category: 'Transportation', amount: 8900, transactions: 156 },
  { category: 'Shopping', amount: 6750, transactions: 189 },
  { category: 'Entertainment', amount: 5430, transactions: 98 },
  { category: 'Bills & Utilities', amount: 4560, transactions: 67 },
]

export interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    isPositive: boolean
    label: string
  }
  icon: React.ElementType
  color?: string
}

export function MetricCard({ title, value, change, icon: Icon, color = "primary" }: MetricCardProps) {
  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {change && (
              <div className="flex items-center gap-1 mt-2">
                {change.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={`text-sm font-medium ${change.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {change.value}% {change.label}
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${color}/10`}>
            <Icon className={`h-6 w-6 text-${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function UserGrowthChart() {
  const data = generateUserGrowthData()

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Growth Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="userGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Area
              type="monotone"
              dataKey="users"
              stroke={COLORS.primary}
              fillOpacity={1}
              fill="url(#userGrowth)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function RevenueChart() {
  const data = generateRevenueData()

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Revenue & Subscriptions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis
              yAxisId="revenue"
              orientation="left"
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis
              yAxisId="subscriptions"
              orientation="right"
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value, name) => [
                name === 'revenue' ? formatCurrency(Number(value)) : value,
                name === 'revenue' ? 'Revenue' : 'Subscriptions'
              ]}
            />
            <Bar
              yAxisId="revenue"
              dataKey="revenue"
              fill={COLORS.success}
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="subscriptions"
              type="monotone"
              dataKey="subscriptions"
              stroke={COLORS.primary}
              strokeWidth={3}
              dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function TransactionVolumeChart() {
  const data = generateTransactionVolumeData()

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Transaction Volume (24h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="hour"
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              labelFormatter={(label) => `${label}:00`}
            />
            <Line
              type="monotone"
              dataKey="transactions"
              stroke={COLORS.warning}
              strokeWidth={3}
              dot={{ fill: COLORS.warning, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: COLORS.warning, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function SubscriptionTiersChart() {
  const data = generateSubscriptionTiersData()

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Subscription Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {item.value.toLocaleString()} ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TopCategoriesChart() {
  const data = generateTopCategoriesData()

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Top Spending Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis
              type="category"
              dataKey="category"
              axisLine={false}
              tickLine={false}
              className="text-xs"
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
              formatter={(value) => [formatCurrency(Number(value)), 'Amount']}
            />
            <Bar
              dataKey="amount"
              fill={COLORS.primary}
              radius={[0, 2, 2, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value="3,920"
          change={{ value: 12.5, isPositive: true, label: "vs last month" }}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Monthly Revenue"
          value="$36,800"
          change={{ value: 8.2, isPositive: true, label: "vs last month" }}
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Active Sessions"
          value="1,247"
          change={{ value: -3.1, isPositive: false, label: "vs yesterday" }}
          icon={Activity}
          color="orange"
        />
        <MetricCard
          title="Conversion Rate"
          value="28.6%"
          change={{ value: 5.4, isPositive: true, label: "vs last month" }}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UserGrowthChart />
        <RevenueChart />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <TransactionVolumeChart />
        <SubscriptionTiersChart />
        <TopCategoriesChart />
      </div>
    </div>
  )
}
