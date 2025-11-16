/**
 * Transaction types
 */
export interface Transaction {
  transaction_id: string
  account: string
  user: string
  amount: string
  formatted_amount?: string
  date: string
  merchant_name: string
  description?: string
  category?: string
  category_name?: string
  subcategory?: string
  tags?: string[]
  notes?: string
  is_recurring: boolean
  is_transfer: boolean
  plaid_transaction_id?: string
  location?: {
    latitude?: number
    longitude?: number
    address?: string
    city?: string
    region?: string
    postal_code?: string
    country?: string
  }
  account_name?: string
  created_at: string
  updated_at: string
  user_modified: boolean
}

export interface TransactionFilters {
  date_from?: string
  date_to?: string
  category?: string
  account?: string
  amount_min?: number
  amount_max?: number
  is_recurring?: boolean
  is_transfer?: boolean
  search?: string
  page?: number
  page_size?: number
  ordering?: string
}

export interface TransactionStats {
  total_count: number
  expense_count: number
  income_count: number
  expense_total: number
  income_total: number
  net: number
}

