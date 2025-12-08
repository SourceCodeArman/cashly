import apiClient from './apiClient'
import type { ApiResponse, Transaction, PaginatedResponse, TransactionStats } from '@/types'

export interface TransactionFilters {
  page?: number
  page_size?: number
  limit?: number
  search?: string
  category?: string
  account?: string
  start_date?: string
  end_date?: string
  is_recurring?: boolean
  is_transfer?: boolean
}

export interface DetectedRecurringGroup {
  merchant: string
  normalized_merchant: string
  amount: number
  period_type: string
  interval_days: number
  occurrences: number
  confidence_score: number
  confidence_level: 'possible' | 'confirmed'
  transaction_ids: string[]
  first_date: string
  last_date: string
  account_id: string
  account_name: string
}

export interface DetectRecurringResponse {
  detected: DetectedRecurringGroup[]
  updated_count: number
}

export const transactionService = {
  async listTransactions(
    params?: TransactionFilters
  ): Promise<ApiResponse<PaginatedResponse<Transaction>>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Transaction>>>(
      '/transactions/transactions/',
      { params }
    )
    return response.data
  },

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    const response = await apiClient.get<ApiResponse<Transaction>>(
      `/transactions/transactions/${id}/`
    )
    return response.data
  },

  async categorizeTransaction(
    id: string,
    categoryId: string
  ): Promise<ApiResponse<Transaction>> {
    const response = await apiClient.post<ApiResponse<Transaction>>(
      `/transactions/transactions/${id}/categorize/`,
      { category_id: categoryId }
    )
    return response.data
  },

  async getTransactionStats(): Promise<ApiResponse<TransactionStats>> {
    const response = await apiClient.get<ApiResponse<TransactionStats>>(
      '/transactions/transactions/stats/'
    )
    return response.data
  },

  // Transaction Splits
  async createSplit(data: import('@/types/transaction.types').CreateSplitRequest): Promise<ApiResponse<import('@/types/transaction.types').TransactionSplit>> {
    const response = await apiClient.post<ApiResponse<import('@/types/transaction.types').TransactionSplit>>(
      '/transactions/splits/',
      data
    )
    return response.data
  },

  async bulkCreateSplits(data: import('@/types/transaction.types').BulkCreateSplitsRequest): Promise<ApiResponse<import('@/types/transaction.types').TransactionSplit[]>> {
    const response = await apiClient.post<ApiResponse<import('@/types/transaction.types').TransactionSplit[]>>(
      '/transactions/splits/bulk-create/',
      data
    )
    return response.data
  },

  async deleteSplit(splitId: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/transactions/splits/${splitId}/`
    )
    return response.data
  },

  // Receipts
  async uploadReceipt(transactionId: string, file: File): Promise<ApiResponse<import('@/types/transaction.types').Receipt>> {
    const formData = new FormData()
    formData.append('transaction', transactionId)
    formData.append('file', file)

    const response = await apiClient.post<ApiResponse<import('@/types/transaction.types').Receipt>>(
      '/transactions/receipts/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  async listReceipts(transactionId?: string): Promise<ApiResponse<import('@/types/transaction.types').Receipt[]>> {
    const response = await apiClient.get<ApiResponse<import('@/types/transaction.types').Receipt[]>>(
      '/transactions/receipts/',
      { params: transactionId ? { transaction: transactionId } : {} }
    )
    return response.data
  },

  async deleteReceipt(receiptId: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(
      `/transactions/receipts/${receiptId}/`
    )
    return response.data
  },

  // Recurring Detection
  async detectRecurring(
    minOccurrences = 3,
    lookbackDays = 180
  ): Promise<ApiResponse<DetectRecurringResponse>> {
    const response = await apiClient.post<ApiResponse<DetectRecurringResponse>>(
      '/transactions/transactions/detect-recurring/',
      { min_occurrences: minOccurrences, lookback_days: lookbackDays }
    )
    return response.data
  },

  async markRecurring(transactionId: string, isRecurring: boolean): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/transactions/transactions/${transactionId}/mark-recurring/`,
      { is_recurring: isRecurring }
    )
    return response.data
  },

  async markNonRecurring(transactionIds: string[]): Promise<ApiResponse<{ updated_count: number; transaction_ids: string[] }>> {
    const response = await apiClient.post<ApiResponse<{ updated_count: number; transaction_ids: string[] }>>(
      '/transactions/transactions/mark-non-recurring/',
      { transaction_ids: transactionIds }
    )
    return response.data
  },

  async getSimilarRecurring(transactionId: string): Promise<ApiResponse<Transaction[]>> {
    const response = await apiClient.get<ApiResponse<Transaction[]>>(
      `/transactions/transactions/${transactionId}/similar-recurring/`
    )
    return response.data
  },

  // Transfer Detection
  async detectTransfers(lookbackDays = 30): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>(
      '/transactions/transactions/detect-transfers/',
      { lookback_days: lookbackDays }
    )
    return response.data
  },

  async getPotentialTransferPairs(transactionId: string): Promise<ApiResponse<Transaction[]>> {
    const response = await apiClient.get<ApiResponse<Transaction[]>>(
      `/transactions/transactions/${transactionId}/potential-transfer-pairs/`
    )
    return response.data
  },

  async markTransferPair(transactionId: string, otherTransactionId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>(
      `/transactions/transactions/${transactionId}/mark-transfer-pair/`,
      { other_transaction_id: otherTransactionId }
    )
    return response.data
  },
}

