/**
 * Account types
 */
export interface Account {
  account_id: string
  institution_name: string
  custom_name?: string | null
  account_type: 'checking' | 'savings' | 'credit_card' | 'investment'
  account_number_masked: string
  balance: string
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_synced_at?: string
  plaid_item_id?: string
  plaid_institution_id?: string
  plaid_products?: string[]
  webhook_url?: string
  error_code?: string | null
  error_message?: string | null
}

export interface AccountConnectionData {
  public_token: string
  institution_id: string
  institution_name?: string
  selected_account_ids?: string[]
  webhook?: string
}

