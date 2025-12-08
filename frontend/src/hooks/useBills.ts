import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billService } from '@/services/billService'
import { toast } from 'sonner'
import type { ApiResponse, Bill, CreateBillForm, CreateBillPaymentForm, BillPayment } from '@/types'

// Define query keys locally since we can't access queryClient.ts
export const billQueryKeys = {
    all: ['bills'] as const,
    lists: () => [...billQueryKeys.all, 'list'] as const,
    list: (filters: string) => [...billQueryKeys.lists(), { filters }] as const,
    details: () => [...billQueryKeys.all, 'detail'] as const,
    detail: (id: string) => [...billQueryKeys.details(), id] as const,
    upcoming: (days: number) => [...billQueryKeys.all, 'upcoming', { days }] as const,
    overdue: () => [...billQueryKeys.all, 'overdue'] as const,
    payments: (billId?: string) => [...billQueryKeys.all, 'payments', { billId }] as const,
}

export function useBills(filters?: { is_active?: boolean, is_overdue?: boolean }) {
    return useQuery({
        queryKey: billQueryKeys.list(JSON.stringify(filters)),
        queryFn: () => billService.listBills(filters),
    })
}

export function useBill(id: string) {
    return useQuery({
        queryKey: billQueryKeys.detail(id),
        queryFn: async () => {
            const response = await billService.getBill(id)
            if (response.status === 'success' && response.data) {
                return response.data
            }
            throw new Error(response.message || 'Failed to fetch bill')
        },
        enabled: !!id,
    })
}

export function useCreateBill() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateBillForm) => billService.createBill(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billQueryKeys.lists() })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.upcoming(7) })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.overdue() })
            toast.success('Bill created successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create bill')
        },
    })
}

export function useUpdateBill() {
    const queryClient = useQueryClient()

    return useMutation<ApiResponse<Bill>, Error, { id: string; data: Partial<CreateBillForm> }>({
        mutationFn: ({ id, data }) => billService.updateBill(id, data),
        onSuccess: (_response, variables) => {
            queryClient.invalidateQueries({ queryKey: billQueryKeys.lists() })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.detail(variables.id) })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.upcoming(7) })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.overdue() })
            toast.success('Bill updated successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update bill')
        },
    })
}

export function useDeleteBill() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => billService.deleteBill(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: billQueryKeys.lists() })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.upcoming(7) })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.overdue() })
            toast.success('Bill deleted successfully')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete bill')
        },
    })
}

export function useMarkBillAsPaid() {
    const queryClient = useQueryClient()

    return useMutation<ApiResponse<{ bill: Bill, payment: BillPayment }>, Error, { id: string; data: CreateBillPaymentForm }>({
        mutationFn: ({ id, data }) => billService.markAsPaid(id, data),
        onSuccess: (_response, variables) => {
            queryClient.invalidateQueries({ queryKey: billQueryKeys.lists() })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.detail(variables.id) })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.upcoming(7) })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.overdue() })
            queryClient.invalidateQueries({ queryKey: billQueryKeys.payments(variables.id) })
            toast.success('Bill marked as paid')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to mark bill as paid')
        },
    })
}

export function useUpcomingBills(days: number = 7) {
    return useQuery({
        queryKey: billQueryKeys.upcoming(days),
        queryFn: () => billService.getUpcomingBills(days),
    })
}

export function useOverdueBills() {
    return useQuery({
        queryKey: billQueryKeys.overdue(),
        queryFn: billService.getOverdueBills,
    })
}

export function useBillPayments(billId?: string) {
    return useQuery({
        queryKey: billQueryKeys.payments(billId),
        queryFn: () => billService.getPaymentHistory(billId),
    })
}
