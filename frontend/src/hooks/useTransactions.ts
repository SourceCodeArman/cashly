import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService, type TransactionFilters } from '@/services/transactionService'
import { queryKeys } from '@/lib/queryClient'
import { toast } from 'sonner'

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: async () => {
      const response = await transactionService.listTransactions(filters)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch transactions')
    },
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: async () => {
      const response = await transactionService.getTransaction(id)
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch transaction')
    },
    enabled: !!id,
  })
}

export function useTransactionStats() {
  return useQuery({
    queryKey: queryKeys.transactionStats,
    queryFn: async () => {
      const response = await transactionService.getTransactionStats()
      if (response.status === 'success' && response.data) {
        return response.data
      }
      throw new Error(response.message || 'Failed to fetch transaction stats')
    },
  })
}

export function useCategorizeTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, categoryId }: { id: string; categoryId: string }) =>
      transactionService.categorizeTransaction(id, categoryId),
    onSuccess: (response, variables) => {
      const transactionId = response.data?.id ?? variables.id
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions() })
      queryClient.invalidateQueries({ queryKey: queryKeys.transaction(transactionId) })
      toast.success('Transaction categorized successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to categorize transaction')
    },
  })
}

