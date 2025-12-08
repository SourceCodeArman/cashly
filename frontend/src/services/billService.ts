import apiClient from './apiClient'
import type {
    ApiResponse,
    Bill,
    CreateBillForm,
    BillPayment,
    CreateBillPaymentForm
} from '@/types'

// Helper to normalize backend response to frontend type
const normalizeBill = (data: any): Bill => ({
    billId: data.bill_id,
    name: data.name,
    categoryId: data.category_id,
    categoryName: data.category_name,
    amount: data.amount,
    frequency: data.frequency,
    dueDay: data.due_day,
    nextDueDate: data.next_due_date,
    lastPaidDate: data.last_paid_date,
    isAutopay: data.is_autopay,
    payee: data.payee,
    accountId: data.account_id,
    accountName: data.account_name,
    notes: data.notes,
    reminderDays: data.reminder_days,
    reminderEnabled: data.reminder_enabled,
    isActive: data.is_active,
    daysUntilDue: data.days_until_due,
    isOverdue: data.is_overdue,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
})

const normalizePayment = (data: any): BillPayment => ({
    paymentId: data.payment_id,
    billId: data.bill_id,
    billName: data.bill_name,
    amount: data.amount,
    paymentDate: data.payment_date,
    transactionId: data.transaction_id,
    notes: data.notes,
    createdAt: data.created_at,
})

export const billService = {
    async listBills(params?: { is_active?: boolean, is_overdue?: boolean }): Promise<Bill[]> {
        const response = await apiClient.get<ApiResponse<any[]>>('/bills/bills/', { params })
        return (response.data.data || []).map(normalizeBill)
    },

    async getBill(id: string): Promise<ApiResponse<Bill>> {
        const response = await apiClient.get<ApiResponse<any>>(`/bills/bills/${id}/`)
        if (response.data.data) {
            return {
                ...response.data,
                data: normalizeBill(response.data.data)
            }
        }
        return response.data
    },

    async createBill(data: CreateBillForm): Promise<ApiResponse<Bill>> {
        const payload = {
            name: data.name,
            category: data.category,
            amount: data.amount,
            frequency: data.frequency,
            due_day: data.dueDay,
            next_due_date: data.nextDueDate,
            is_autopay: data.isAutopay,
            payee: data.payee,
            account: data.account,
            notes: data.notes,
            reminder_days: data.reminderDays,
            reminder_enabled: data.reminderEnabled,
            is_active: data.isActive,
        }
        const response = await apiClient.post<ApiResponse<any>>('/bills/bills/', payload)
        if (response.data.data) {
            return {
                ...response.data,
                data: normalizeBill(response.data.data)
            }
        }
        return response.data
    },

    async updateBill(id: string, data: Partial<CreateBillForm>): Promise<ApiResponse<Bill>> {
        const payload: any = { ...data }
        if (data.dueDay !== undefined) payload.due_day = data.dueDay
        if (data.nextDueDate !== undefined) payload.next_due_date = data.nextDueDate
        if (data.isAutopay !== undefined) payload.is_autopay = data.isAutopay
        if (data.reminderDays !== undefined) payload.reminder_days = data.reminderDays
        if (data.reminderEnabled !== undefined) payload.reminder_enabled = data.reminderEnabled
        if (data.isActive !== undefined) payload.is_active = data.isActive

        const response = await apiClient.patch<ApiResponse<any>>(`/bills/bills/${id}/`, payload)
        if (response.data.data) {
            return {
                ...response.data,
                data: normalizeBill(response.data.data)
            }
        }
        return response.data
    },

    async deleteBill(id: string): Promise<ApiResponse<null>> {
        const response = await apiClient.delete<ApiResponse<null>>(`/bills/bills/${id}/`)
        return response.data
    },

    async markAsPaid(id: string, data: CreateBillPaymentForm): Promise<ApiResponse<{ bill: Bill, payment: BillPayment }>> {
        const payload = {
            amount: data.amount,
            payment_date: data.paymentDate,
            transaction: data.transaction,
            notes: data.notes,
        }
        const response = await apiClient.post<ApiResponse<any>>(`/bills/bills/${id}/mark-as-paid/`, payload)
        if (response.data.data) {
            return {
                ...response.data,
                data: {
                    bill: normalizeBill(response.data.data.bill),
                    payment: normalizePayment(response.data.data.payment),
                }
            }
        }
        return response.data as any
    },

    async getUpcomingBills(days: number = 7): Promise<Bill[]> {
        const response = await apiClient.get<ApiResponse<any[]>>('/bills/bills/upcoming/', { params: { days } })
        return (response.data.data || []).map(normalizeBill)
    },

    async getOverdueBills(): Promise<Bill[]> {
        const response = await apiClient.get<ApiResponse<any[]>>('/bills/bills/overdue/')
        return (response.data.data || []).map(normalizeBill)
    },

    async getPaymentHistory(billId?: string): Promise<BillPayment[]> {
        const params = billId ? { bill: billId } : {}
        const response = await apiClient.get<ApiResponse<any[]>>('/bills/bill-payments/', { params })
        return (response.data.data || []).map(normalizePayment)
    }
}
