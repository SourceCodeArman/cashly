/**
 * Transactions hook
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import type { Transaction, TransactionFilters } from '@/types/transaction.types'
import { toast } from 'sonner'

export function useTransactions(filters?: TransactionFilters) {
  const queryClient = useQueryClient()

  // Get transactions
  const {
    data: transactionsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const response = await transactionService.getTransactions(filters)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch transactions')
    },
    staleTime: 30000, // 30 seconds
  })

  // Calculate pagination info
  const pageSize = 20 // Default page size from backend
  const currentPage = filters?.page || 1
  const totalCount = transactionsData?.count || 0
  const totalPages = Math.ceil(totalCount / pageSize) || 1

  // Navigate to page
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      // This will be handled by updating filters in the component
      return page
    }
    return currentPage
  }

  // Get transaction by ID
  const useTransaction = (transactionId: string) => {
    return useQuery({
      queryKey: ['transactions', transactionId],
      queryFn: async () => {
        const response = await transactionService.getTransaction(transactionId)
        if (response.status === 'success' && response.data) {
          return response.data
        }
        throw new Error(response.message || 'Failed to fetch transaction')
      },
      enabled: !!transactionId,
    })
  }

  // Categorize transaction mutation
  const categorizeMutation = useMutation({
    mutationFn: async ({ transactionId, categoryId }: { transactionId: string; categoryId: string }) => {
      const response = await transactionService.categorizeTransaction(transactionId, categoryId)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to categorize transaction')
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.setQueryData(['transactions', data.transaction_id], data)
      toast.success('Transaction categorized')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to categorize transaction')
    },
  })

  // Get transaction stats
  const { data: stats } = useQuery({
    queryKey: ['transactions', 'stats'],
    queryFn: async () => {
      const response = await transactionService.getTransactionStats()
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch transaction stats')
    },
    staleTime: 60000, // 1 minute
  })

  return {
    transactions: transactionsData?.results || [],
    pagination: {
      count: transactionsData?.count || 0,
      next: transactionsData?.next,
      previous: transactionsData?.previous,
      currentPage,
      totalPages,
      pageSize,
    },
    isLoading,
    error,
    refetch,
    useTransaction,
    categorizeTransaction: categorizeMutation.mutate,
    isCategorizing: categorizeMutation.isPending,
    stats,
    goToPage,
  }
}

