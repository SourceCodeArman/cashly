import apiClient from './apiClient';
import type {
    DebtAccount,
    DebtCreateData,
    DebtUpdateData,
    DebtPayment,
    DebtPaymentCreateData,
    DebtPayoffStrategy,
    DebtPayoffStrategyCreateData,
    DebtSummary,
    DebtProjection,
    StrategyComparison
} from '../types/debt.types';

export const debtService = {
    // Debt Accounts
    getDebts: async (filters?: { status?: string; debt_type?: string; is_active?: boolean }) => {
        const response = await apiClient.get<{ success: boolean; data: DebtAccount[]; count: number }>('/debts/debts/', { params: filters });
        return response.data;
    },

    getDebt: async (id: string) => {
        const response = await apiClient.get<{ success: boolean; data: DebtAccount }>(`/debts/debts/${id}/`);
        return response.data;
    },

    createDebt: async (data: DebtCreateData) => {
        const response = await apiClient.post<{ success: boolean; message: string; data: DebtAccount }>('/debts/debts/', data);
        return response.data;
    },

    updateDebt: async (id: string, data: DebtUpdateData) => {
        const response = await apiClient.patch<{ success: boolean; message: string; data: DebtAccount }>(`/debts/debts/${id}/`, data);
        return response.data;
    },

    deleteDebt: async (id: string) => {
        const response = await apiClient.delete<{ success: boolean; message: string }>(`/debts/debts/${id}/`);
        return response.data;
    },

    markPaidOff: async (id: string) => {
        const response = await apiClient.post<{ success: boolean; message: string; data: DebtAccount }>(`/debts/debts/${id}/mark-paid-off/`);
        return response.data;
    },

    getProjection: async (id: string, monthlyPayment?: number) => {
        const response = await apiClient.get<{ success: boolean; data: { projection: DebtProjection[]; months_to_payoff: number; total_interest: string } }>(
            `/debts/debts/${id}/projection/`,
            { params: { monthly_payment: monthlyPayment } }
        );
        return response.data;
    },

    // Debt Payments
    getPayments: async (debtId?: string) => {
        const response = await apiClient.get<{ success: boolean; data: DebtPayment[]; count: number }>('/debts/debt-payments/', { params: { debt: debtId } });
        return response.data;
    },

    recordPayment: async (data: DebtPaymentCreateData) => {
        const response = await apiClient.post<{ success: boolean; message: string; data: { payment: DebtPayment; debt: DebtAccount } }>('/debts/debt-payments/', data);
        return response.data;
    },

    // Strategies
    getStrategies: async () => {
        const response = await apiClient.get<{ success: boolean; data: DebtPayoffStrategy[]; count: number }>('/debts/debt-strategies/');
        return response.data;
    },

    createStrategy: async (data: DebtPayoffStrategyCreateData) => {
        const response = await apiClient.post<{ success: boolean; message: string; data: DebtPayoffStrategy }>('/debts/debt-strategies/', data);
        return response.data;
    },

    compareStrategies: async (monthlyBudget: number) => {
        const response = await apiClient.get<{ success: boolean; data: StrategyComparison }>('/debts/debt-strategies/compare/', { params: { monthly_budget: monthlyBudget } });
        return response.data;
    },

    // Summary
    getSummary: async () => {
        const response = await apiClient.get<{ success: boolean; data: DebtSummary }>('/debts/summary/');
        return response.data;
    }
};
