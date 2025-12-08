import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debtService } from '../services/debtService';
import type { DebtCreateData, DebtUpdateData, DebtPaymentCreateData, DebtPayoffStrategyCreateData } from '../types/debt.types';

// Query Keys
export const debtKeys = {
    all: ['debts'] as const,
    lists: () => [...debtKeys.all, 'list'] as const,
    list: (filters: any) => [...debtKeys.lists(), { filters }] as const,
    details: () => [...debtKeys.all, 'detail'] as const,
    detail: (id: string) => [...debtKeys.details(), id] as const,
    payments: (debtId?: string) => [...debtKeys.all, 'payments', { debtId }] as const,
    strategies: () => [...debtKeys.all, 'strategies'] as const,
    summary: () => [...debtKeys.all, 'summary'] as const,
    projections: (id: string) => [...debtKeys.detail(id), 'projection'] as const,
};

// Hooks
export const useDebts = (filters?: { status?: string; debt_type?: string; is_active?: boolean }) => {
    return useQuery({
        queryKey: debtKeys.list(filters),
        queryFn: () => debtService.getDebts(filters),
    });
};

export const useDebt = (id: string) => {
    return useQuery({
        queryKey: debtKeys.detail(id),
        queryFn: () => debtService.getDebt(id),
        enabled: !!id,
    });
};

export const useDebtSummary = () => {
    return useQuery({
        queryKey: debtKeys.summary(),
        queryFn: () => debtService.getSummary(),
    });
};

export const useDebtPayments = (debtId?: string) => {
    return useQuery({
        queryKey: debtKeys.payments(debtId),
        queryFn: () => debtService.getPayments(debtId),
    });
};

export const useDebtProjection = (id: string, monthlyPayment?: number) => {
    return useQuery({
        queryKey: [...debtKeys.projections(id), { monthlyPayment }],
        queryFn: () => debtService.getProjection(id, monthlyPayment),
        enabled: !!id,
    });
};

export const useDebtStrategies = () => {
    return useQuery({
        queryKey: debtKeys.strategies(),
        queryFn: () => debtService.getStrategies(),
    });
};

export const useStrategyComparison = (monthlyBudget: number) => {
    return useQuery({
        queryKey: [...debtKeys.strategies(), 'compare', { monthlyBudget }],
        queryFn: () => debtService.compareStrategies(monthlyBudget),
        enabled: monthlyBudget > 0,
    });
};

// Mutations
export const useCreateDebt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: DebtCreateData) => debtService.createDebt(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: debtKeys.lists() });
            queryClient.invalidateQueries({ queryKey: debtKeys.summary() });
        },
    });
};

export const useUpdateDebt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: DebtUpdateData }) => debtService.updateDebt(id, data),
        onSuccess: (_response, variables) => {
            queryClient.invalidateQueries({ queryKey: debtKeys.lists() });
            queryClient.invalidateQueries({ queryKey: debtKeys.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: debtKeys.summary() });
        },
    });
};

export const useDeleteDebt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => debtService.deleteDebt(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: debtKeys.lists() });
            queryClient.invalidateQueries({ queryKey: debtKeys.summary() });
        },
    });
};

export const useMarkDebtPaidOff = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => debtService.markPaidOff(id),
        onSuccess: (_response, id) => {
            queryClient.invalidateQueries({ queryKey: debtKeys.lists() });
            queryClient.invalidateQueries({ queryKey: debtKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: debtKeys.summary() });
        },
    });
};

export const useRecordDebtPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: DebtPaymentCreateData) => debtService.recordPayment(data),
        onSuccess: (_response, variables) => {
            queryClient.invalidateQueries({ queryKey: debtKeys.lists() });
            queryClient.invalidateQueries({ queryKey: debtKeys.detail(variables.debt) });
            queryClient.invalidateQueries({ queryKey: debtKeys.summary() });
            queryClient.invalidateQueries({ queryKey: debtKeys.payments(variables.debt) });
        },
    });
};

export const useCreateStrategy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: DebtPayoffStrategyCreateData) => debtService.createStrategy(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: debtKeys.strategies() });
        },
    });
};
