export type BillFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Bill {
    billId: string
    name: string
    categoryId?: string
    categoryName?: string
    amount: string
    frequency: BillFrequency
    dueDay: number
    nextDueDate: string
    lastPaidDate?: string
    isAutopay: boolean
    payee?: string
    accountId?: string
    accountName?: string
    notes?: string
    reminderDays: number
    reminderEnabled: boolean
    isActive: boolean
    daysUntilDue: number
    isOverdue: boolean
    createdAt: string
    updatedAt: string
}

export interface CreateBillForm {
    name: string
    category?: string
    amount: number
    frequency: BillFrequency
    dueDay: number
    nextDueDate: string
    isAutopay: boolean
    payee?: string
    account?: string
    notes?: string
    reminderDays: number
    reminderEnabled: boolean
    isActive: boolean
}

export interface BillPayment {
    paymentId: string
    billId: string
    billName: string
    amount: string
    paymentDate: string
    transactionId?: string
    notes?: string
    createdAt: string
}

export interface CreateBillPaymentForm {
    bill: string
    amount: number
    paymentDate: string
    transaction?: string
    notes?: string
}

export interface BillSummary {
    totalMonthly: number
    totalOverdue: number
    nextDue: Bill | null
    overdueCount: number
}
