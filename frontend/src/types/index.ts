// User types
export * from './bill.types'
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  isAdmin: boolean
  isSuperuser: boolean
  subscription?: Subscription
  createdAt?: string
  updatedAt?: string
  mfaEnabled?: boolean
}

// Account types
export interface Account {
  id: string
  name?: string
  institutionName: string
  accountType: string
  balance: string
  maskedAccountNumber?: string
  plaidAccountId?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

// Transaction types
export interface Transaction {
  id: string
  account?: Account | string
  amount: string
  formattedAmount?: string
  date: string
  merchantName?: string
  description?: string
  category?: Category | null
  type: 'income' | 'expense' | 'transfer'
  createdAt?: string
  updatedAt?: string
  notes?: string | null
  isRecurring?: boolean
  isTransfer?: boolean
  userModified?: boolean
  tags?: string[]
}

// Category types
export interface CategoryRule {
  id?: string
  field: 'merchant_name' | 'description' | 'amount'
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than'
  value: string
  enabled?: boolean
}

export interface Category {
  id: string
  name: string
  icon?: string
  color?: string
  type: 'income' | 'expense' | 'transfer'
  isSystemCategory: boolean
  parentCategoryName?: string
  parent_category?: Category | null
  subcategories?: Category[]
  rules?: CategoryRule[]
  rulesCombination?: 'AND' | 'OR'
  createdAt?: string
  updatedAt?: string
}

// Goal types
export interface Goal {
  id: string
  name: string
  targetAmount: string
  currentAmount: string
  deadline?: string
  goalType: string
  isActive: boolean
  isCompleted?: boolean
  progress?: number
  createdAt?: string
  updatedAt?: string
}

// Notification types
export interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  updatedAt?: string
}

export interface NotificationPreferences {
  email_transaction: boolean
  email_goal: boolean
  email_budget: boolean
  email_account: boolean
  email_system: boolean
  push_transaction: boolean
  push_goal: boolean
  push_budget: boolean
  push_account: boolean
  push_system: boolean
}

export interface PasswordChangeData {
  old_password: string
  new_password: string
  new_password_confirm: string
}

// Subscription types
export type SubscriptionPlan = 'free' | 'premium' | 'pro' | 'enterprise'
export type BillingCycle = 'monthly' | 'annual'

export interface SubscriptionBillingCycle {
  id: BillingCycle
  price: number
  priceDisplay: string
  priceId: string
  currency: string
}

export interface Subscription {
  subscriptionId: string
  plan: SubscriptionPlan
  billingCycle: BillingCycle
  status: string
  customerId?: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  trialStart?: string
  trialEnd?: string
  cancelAtPeriodEnd: boolean
  createdAt?: string
  updatedAt?: string
  pendingPlan?: SubscriptionPlan
  pendingBillingCycle?: BillingCycle
  pendingRequestedAt?: string
}

export interface SubscriptionTier {
  id: SubscriptionPlan
  name: string
  description: string
  price: number
  priceDisplay: string
  priceId: string
  currency: string
  features: string[]
  badge?: string | null
  highlight?: string | null
  billingCycles: SubscriptionBillingCycle[]
}

// API Response types
export interface ApiResponse<T> {
  status: 'success' | 'error' | 'mfa_required'
  data: T | null
  message?: string
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

export interface CreateGoalForm {
  name: string
  targetAmount: number
  deadline?: string
  goalType?: string
}

export interface CreateCategoryForm {
  name: string
  icon?: string
  color?: string
  type: 'income' | 'expense' | 'transfer'
}

// Budget types
export interface BudgetUsage {
  spent: string
  remaining: string
  percentageUsed: number
  isOverBudget: boolean
  alertThresholdReached: boolean
}

export interface Budget {
  id: string
  categoryId: string
  categoryName: string
  periodType: 'weekly' | 'monthly' | 'yearly' | 'custom'
  amount: string
  periodStart: string
  periodEnd: string
  alertsEnabled: boolean
  alertThreshold: string
  usage?: BudgetUsage
  createdAt?: string
  updatedAt?: string
}

export interface CreateBudgetForm {
  category: string // UUID
  periodType: 'weekly' | 'monthly' | 'yearly' | 'custom'
  amount: number
  periodStart: string
  periodEnd: string
  alertsEnabled?: boolean
  alertThreshold?: number
}

export interface BudgetUsageSummary {
  budgetId: string
  categoryName: string
  amount: string
  spent: string
  remaining: string
  percentageUsed: number
  isOverBudget: boolean
  periodStart: string
  periodEnd: string
}

// Dashboard types
export interface DashboardData {
  totalBalance: string
  totalIncome: string
  totalSpending: string
  spendingTrend?: {
    date: string
    amount: string
  }[]
  activeGoals?: Goal[]
  recentTransactions?: Transaction[]
}

// Transaction stats
export interface TransactionStats {
  totalSpending: string
  totalIncome: string
  totalTransactions: number
  net?: string
}

// Plaid types
export interface PlaidAccount {
  id: string
  name: string
  mask?: string
  type: string
  subtype?: string
}

export interface PlaidLinkTokenResponse {
  link_token: string
}

// Admin types
export interface AdminSystemStats {
  totalUsers: number
  totalAccounts: number
  totalBalance: string
  totalTransactions: number
  activeSubscriptions: Record<string, number>
  recentSignups7d: number
  recentSignups30d: number
  activeUsers7d: number
  activeUsers30d: number
  totalRevenue: string
  thisMonthRevenue: string
}

export interface AdminUserListItem {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  phoneNumber?: string
  subscriptionTier: string
  subscriptionPlan?: string
  subscriptionStatus?: string
  isActive: boolean
  isSuperuser: boolean
  accountCount: number
  transactionCount: number
  totalBalance: string
  createdAt: string
  lastLogin?: string
}

export interface AdminUserDetail {
  id: string
  email: string
  username: string
  firstName: string
  lastName: string
  phoneNumber?: string
  subscriptionTier: string
  subscriptionPlan?: string
  subscriptionStatus?: string
  subscriptionEndDate?: string
  stripeCustomerId?: string
  mfaEnabled: boolean
  tourDone: boolean
  preferences: Record<string, any>
  isActive: boolean
  isSuperuser: boolean
  isStaff: boolean
  accountCount: number
  transactionCount: number
  goalCount: number
  budgetCount: number
  totalBalance: string
  createdAt: string
  updatedAt: string
  lastLogin?: string
}

export interface AdminUserUpdate {
  subscriptionTier?: string
  subscriptionStatus?: string
  subscriptionEndDate?: string
  isActive?: boolean
  phoneNumber?: string
  email?: string
}

export interface AdminAccount {
  accountId: string
  institutionName: string
  customName?: string
  accountType: string
  accountNumberMasked: string
  balance: string
  currency: string
  isActive: boolean
  createdAt: string
  lastSyncedAt?: string
  errorCode?: string
  errorMessage?: string
}

export interface AdminTransaction {
  transactionId: string
  account: string
  accountName: string
  amount: string
  date: string
  merchantName?: string
  description?: string
  category?: string
  categoryName?: string
  transactionType: string
  createdAt: string
}

export interface AdminGoal {
  goalId: string
  name: string
  targetAmount: string
  currentAmount: string
  deadline?: string
  goalType: string
  isActive: boolean
  destinationAccount?: string
  destinationAccountName?: string
  createdAt: string
}

export interface AdminBudget {
  budgetId: string
  category: string
  categoryName: string
  periodType: string
  amount: string
  periodStart: string
  periodEnd: string
  alertsEnabled: boolean
  alertThreshold: string
  createdAt: string
}

// System Health Types
export interface AdminSystemHealth {
  database: {
    status: 'healthy' | 'unhealthy'
    connected: boolean
    version?: string
    size?: string
    connectionCount?: number
    activeConnections?: number
    error?: string
  }
  cache: {
    status: 'healthy' | 'unhealthy'
    connected: boolean
    backend?: string
    error?: string
  }
  celery: {
    status: 'healthy' | 'degraded' | 'unknown'
    workerCount: number
    workers: string[]
    stats?: Record<string, any>
    error?: string
    note?: string
  }
  system: {
    status: 'healthy' | 'unknown'
    cpuPercent?: number
    memory?: {
      totalGb: number
      usedGb: number
      percent: number
    }
    disk?: {
      totalGb: number
      usedGb: number
      percent: number
    }
    uptimeHours?: number
    error?: string
    note?: string
  }
  overallStatus: 'healthy' | 'degraded'
  timestamp: string
}

// Log Types
export interface AdminLogEntry {
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  logger: string
  message: string
  type: 'django' | 'error' | 'security' | 'api'
  raw: string
}

export interface AdminLogsResponse {
  entries: AdminLogEntry[]
  total: number
  limit: number
  offset: number
}

// API Analytics Types
export interface AdminEndpointStats {
  endpoint: string
  method: string
  count: number
  totalTime?: number
  errorCount: number
  lastRequest?: string
  avgResponseTime: number
  errorRate: number
}

export interface AdminHourlyData {
  hour: string
  requests: number
  errors: number
}

export interface AdminMethodDistribution {
  method: string
  count: number
}

export interface AdminAPIAnalytics {
  summary: {
    totalRequests24h: number
    totalRequests7d: number
    totalErrors24h: number
    errorRate: number
    avgResponseTimeMs: number
    requestsPerSecond: number
  }
  hourlyData: AdminHourlyData[]
  endpoints: Record<string, AdminEndpointStats>
  topEndpoints: AdminEndpointStats[]
  statusBreakdown: {
    '2xx': number
    '3xx': number
    '4xx': number
    '5xx': number
  }
  responseTimePercentiles: {
    p50: number
    p75: number
    p90: number
    p95: number
    p99: number
  }
  methodDistribution: AdminMethodDistribution[]
}

// Integration Types
export interface AdminPlaidStats {
  status: 'healthy' | 'degraded' | 'unknown'
  totalAccounts: number
  activeAccounts: number
  accountsWithErrors: number
  errorRatePercent: number
  recentSyncs24h: number
  error?: string
}

export interface AdminStripeStats {
  status: 'healthy' | 'unknown'
  recentEvents24h: number
  processedEvents24h: number
  processingRate: number
  eventTypes: Array<{ event_type: string; count: number }>
  activeSubscriptions: number
  error?: string
}

export interface AdminIntegrationStatus {
  plaid: AdminPlaidStats
  stripe: AdminStripeStats
}

// Database Types
export interface AdminTableInfo {
  name: string
  modelName: string
  appLabel: string
  rowCount: number
  size: string
}

export interface AdminDatabaseStats {
  database: {
    version: string
    size: string
    connectionCount: number
    tableCount: number
  }
  connectionPool: {
    totalConnections: number
    activeConnections: number
    idleConnections: number
  }
  tables: AdminTableInfo[]
  totalTables: number
  totalRows: number
}

// Debug Types
export interface AdminDebugResponse {
  accountId?: string
  message?: string
}

export interface AdminTestEndpoints {
  plaid: {
    status: 'available' | 'error'
    clientIdConfigured: boolean
    secretConfigured: boolean
    environment?: string
    error?: string
  }
  stripe: {
    status: 'available' | 'error'
    secretKeyConfigured: boolean
    publishableKeyConfigured: boolean
    error?: string
  }
}


