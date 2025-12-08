import api from './apiClient';
import type { SankeyData, TrendData, NetWorthData, PatternData, Recommendation } from '../types/analytics.types';

export const analyticsService = {
    getDashboardData: async () => {
        const response = await api.get('/analytics/dashboard/');
        return response.data;
    },

    getSankeyData: async (startDate?: string, endDate?: string): Promise<SankeyData> => {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        const response = await api.get(`/analytics/sankey/?${params.toString()}`);
        return response.data;
    },

    getTrends: async (months: number = 6): Promise<TrendData[]> => {
        const response = await api.get(`/analytics/trends/?months=${months}`);
        return response.data;
    },

    getNetWorth: async (): Promise<NetWorthData> => {
        const response = await api.get('/analytics/net-worth/');
        return response.data;
    },

    getPatterns: async (month?: number, year?: number): Promise<PatternData[]> => {
        const params = new URLSearchParams();
        if (month) params.append('month', month.toString());
        if (year) params.append('year', year.toString());

        const response = await api.get(`/analytics/patterns/?${params.toString()}`);
        return response.data;
    },

    getRecommendations: async (): Promise<Recommendation[]> => {
        const response = await api.get('/analytics/recommendations/');
        return response.data;
    }
};
