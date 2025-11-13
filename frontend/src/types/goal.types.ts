/**
 * Goal types
 */
export type ContributionRule =
  | { type: 'fixed_monthly' | 'fixed_weekly' | 'fixed_daily'; amount: number; frequency: 'daily' | 'weekly' | 'monthly' }
  | { type: 'percentage_income'; percentage: number; min_amount?: number; max_amount?: number }
  | { type: 'conditional_balance'; threshold: number; operator: 'gt' | 'gte'; amount: number }
  | { type: 'conditional_transaction'; threshold: number; operator: 'gt' | 'gte'; percentage?: number; amount?: number }
  | { type: 'payday'; dates: number[]; amount: number }

export interface SourceAccountRule {
  account_id: string
  rule: ContributionRule
}

export interface ContributionRulesConfig {
  enabled: boolean
  destination_account_id?: string
  source_accounts: SourceAccountRule[]
  general_rule?: ContributionRule
}

export interface ReminderSettings {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly' | 'biweekly'
  channels: ('email' | 'push')[]
  day_of_week?: number // 0-6, Sunday = 0
  time?: string // "HH:MM" format
  message_template?: string
}

export interface Goal {
  goal_id: string
  name: string
  target_amount: string
  formatted_target_amount?: string
  current_amount: string
  formatted_current_amount?: string
  deadline?: string
  monthly_contribution: string
  goal_type: 'emergency_fund' | 'vacation' | 'purchase' | 'debt_payoff' | 'custom'
  is_active: boolean
  is_completed: boolean
  inferred_category_id?: string | null
  inferred_category_name?: string | null
  priority?: number
  completed_at?: string | null
  archived_at?: string | null
  manual_contributions_total?: number
  contributions_count?: number
  /**
   * Prefer server-provided progress if available; otherwise computed client-side
   */
  progress_percentage?: number
  days_remaining?: number | null
  is_on_track?: boolean | null
  created_at: string
  updated_at: string
  // New fields for account linking
  destination_account_id?: string | null
  destination_account_name?: string
  destination_account_type?: 'checking' | 'savings' | 'cash'
  transfer_authorized?: boolean
  initial_balance_synced?: boolean
  is_activation_pending?: boolean
  contribution_rules?: ContributionRulesConfig
  reminder_settings?: ReminderSettings
}

export interface GoalCreateData {
  name: string
  target_amount: number
  deadline?: string
  goal_type?: Goal['goal_type']
  monthly_contribution?: number
  inferred_category_id?: string | null
  destination_account_id?: string | null
  contribution_rules?: ContributionRulesConfig
  reminder_settings?: ReminderSettings
}

export interface Contribution {
  contribution_id: string
  goal_id: string
  amount: string
  formatted_amount?: string
  date: string
  note?: string
  source: 'manual' | 'automatic'
  transaction_id?: string | null
  created_at: string
}

export interface GoalContribution {
  id?: string
  goal_id: string
  amount: number
  date: string
  note?: string
  source?: 'manual' | 'automatic'
}

export interface GoalForecast {
  goal_id: string
  forecast: {
    predicted_completion_date?: string
    months_remaining?: number
    average_monthly_contribution?: number
    message: string
  }
  monthly_recommendation?: number | null
  is_on_track?: boolean | null
  contributions?: {
    manual_total: number
    automatic_total: number
    by_source: Array<{
      source: string
      total: number
      count: number
    }>
  }
}

export interface GoalUpdateData {
  name?: string
  target_amount?: number
  deadline?: string | null
  goal_type?: Goal['goal_type']
  monthly_contribution?: number | null
  inferred_category_id?: string | null
  is_completed?: boolean
  priority?: number
  destination_account_id?: string | null
  contribution_rules?: ContributionRulesConfig
  reminder_settings?: ReminderSettings
}

export interface ContributionCreateData {
  amount: number
  date: string
  note?: string
}

export interface ContributionUpdateData {
  amount?: number
  date?: string
  note?: string
}

