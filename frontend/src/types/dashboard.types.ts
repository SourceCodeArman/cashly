/**
 * Dashboard types
 */
export interface DashboardData {
  account_balance: {
    total_balance: number
    total_investment: number
    total_debt: number
    account_count: number
    accounts: Array<{
      account_id: string
      institution_name: string
      custom_name?: string | null
      account_type: string
      account_number_masked?: string
      balance: number
    }>
  }
  recent_transactions: Array<{
    transaction_id: string
    merchant_name: string
    amount: number
    formatted_amount: string
    date: string
    category_name?: string
    account_name: string
  }>
  monthly_spending: {
    month: number
    year: number
    total_expenses: number
    transaction_count: number
    by_category: Array<{
      category_id?: string
      category_name: string
      total: number
      count: number
    }>
  }
  goals: Array<{
    goal_id: string
    name: string
    target_amount: number
    current_amount: number
    progress_percentage: number
    deadline?: string
    is_on_track?: boolean | null
    days_remaining?: number | null
    is_completed?: boolean
    completed_at?: string | null
    archived_at?: string | null
    goal_type?: string
    inferred_category_id?: string | null
    inferred_category_name?: string | null
    manual_contributions_total?: number
    contributions_count?: number
    contributions?: {
      manual_total: number
      automatic_total: number
      total: number
      count: number
      by_source: Array<{
        source: string
        total: number
        count: number
      }>
    }
  }>
  category_chart_data: Array<{
    category_id?: string
    category_name: string
    amount: number
    color: string
  }>
}

