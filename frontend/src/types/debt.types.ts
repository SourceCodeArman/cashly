export interface DebtAccount {
    debt_id: string;
    name: string;
    debt_type: DebtType;
    current_balance: string;
    original_balance: string;
    interest_rate: string;
    minimum_payment: string;
    due_day: number;
    creditor_name?: string;
    account_number_masked?: string;
    status: DebtStatus;
    opened_date?: string;
    target_payoff_date?: string;
    last_payment_date?: string;
    last_payment_amount?: string;
    notes?: string;
    is_active: boolean;
    monthly_interest: string;
    days_until_due: number;
    next_due_date?: string;
    created_at: string;
    updated_at: string;
}

export type DebtType =
    | 'credit_card'
    | 'personal_loan'
    | 'mortgage'
    | 'auto_loan'
    | 'student_loan'
    | 'other';

export type DebtStatus = 'active' | 'paid_off' | 'closed';

export interface DebtCreateData {
    name: string;
    debt_type: DebtType;
    current_balance: string;
    original_balance: string;
    interest_rate: string;
    minimum_payment: string;
    due_day: number;
    creditor_name?: string;
    account_number_masked?: string;
    opened_date?: string;
    target_payoff_date?: string;
    notes?: string;
    is_active?: boolean;
}

export interface DebtUpdateData extends Partial<DebtCreateData> {
    status?: DebtStatus;
}

export interface DebtPayment {
    payment_id: string;
    debt_id: string;
    debt_name: string;
    amount: string;
    payment_date: string;
    payment_type: PaymentType;
    applied_to_principal: string;
    applied_to_interest: string;
    transaction_id?: string;
    notes?: string;
    created_at: string;
}

export type PaymentType = 'minimum' | 'extra' | 'full';

export interface DebtPaymentCreateData {
    debt: string;
    amount: string;
    payment_date?: string;
    payment_type?: PaymentType;
    transaction?: string;
    notes?: string;
}

export interface DebtPayoffStrategy {
    strategy_id: string;
    strategy_type: StrategyType;
    monthly_budget: string;
    priority_order: string[]; // debt_ids
    target_payoff_date?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export type StrategyType = 'snowball' | 'avalanche' | 'custom';

export interface DebtPayoffStrategyCreateData {
    strategy_type: StrategyType;
    monthly_budget: string;
    priority_order?: string[];
    target_payoff_date?: string;
    is_active?: boolean;
}

export interface DebtProjection {
    month: number;
    date: string;
    balance: string;
    interest: string;
    principal: string;
    payment: string;
    total_paid: string;
}

export interface DebtSummary {
    total_balance: string;
    total_minimum_payments: string;
    average_interest_rate: string;
    debt_count: number;
    total_original_balance: string;
    total_paid_off: string;
}

export interface StrategyComparison {
    snowball: StrategyResult | null;
    avalanche: StrategyResult | null;
    savings: string;
    monthly_budget: string;
    error?: string;
    total_minimum?: string;
}

export interface StrategyResult {
    order: string[];
    months: number;
    total_interest: string;
    total_paid: string;
}
