import { QueryClient } from '@tanstack/react-query'
import type { TransactionFilters } from '@/services/transactionService'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

// Query key factories for consistent caching
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  accounts: ['accounts'] as const,
  account: (id: string) => ['accounts', id] as const,
  transactions: (filters?: TransactionFilters) => ['transactions', filters] as const,
  transaction: (id: string) => ['transactions', id] as const,
  transactionStats: ['transaction-stats'] as const,
  categories: ['categories'] as const,
  category: (id: string) => ['categories', id] as const,
  goals: ['goals'] as const,
  goal: (id: string) => ['goals', id] as const,
  budgets: ['budgets'] as const,
  budget: (id: string) => ['budgets', id] as const,
  budgetUsageSummary: ['budgets', 'usage-summary'] as const,
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread'] as const,
  subscriptions: ['subscriptions'] as const,
  subscription: (id: string) => ['subscriptions', id] as const,
  subscriptionConfig: ['subscription-config'] as const,
  profile: ['profile'] as const,
}

