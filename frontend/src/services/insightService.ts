/**
 * Service for interacting with the Insights API.
 */
import api from './apiClient';
import type {
    Insight,
    InsightSummary,
    InsightFeedback,
    InsightFeedbackCreate,
    InsightGenerateResponse
} from '../types/insight.types';

interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface InsightFilters {
    type?: string;
    priority?: string;
    include_dismissed?: boolean;
}

export const insightService = {
    /**
     * Get all insights for the current user.
     */
    getInsights: async (filters?: InsightFilters): Promise<PaginatedResponse<Insight>> => {
        const params = new URLSearchParams();
        if (filters?.type) params.append('type', filters.type);
        if (filters?.priority) params.append('priority', filters.priority);
        if (filters?.include_dismissed) params.append('include_dismissed', 'true');

        const response = await api.get(`/insights/?${params.toString()}`);
        return response.data;
    },

    /**
     * Get a single insight by ID.
     */
    getInsight: async (insightId: string): Promise<Insight> => {
        const response = await api.get(`/insights/${insightId}/`);
        return response.data;
    },

    /**
     * Get insights summary (counts by priority and type).
     */
    getSummary: async (): Promise<InsightSummary> => {
        const response = await api.get('/insights/summary/');
        return response.data;
    },

    /**
     * Dismiss an insight.
     */
    dismissInsight: async (insightId: string): Promise<{ status: string }> => {
        const response = await api.post(`/insights/${insightId}/dismiss/`);
        return response.data;
    },

    /**
     * Mark an insight as read.
     */
    markAsRead: async (insightId: string): Promise<{ status: string }> => {
        const response = await api.post(`/insights/${insightId}/mark_read/`);
        return response.data;
    },

    /**
     * Dismiss all insights.
     */
    dismissAll: async (): Promise<{ status: string; count: number }> => {
        const response = await api.post('/insights/dismiss_all/');
        return response.data;
    },

    /**
     * Manually trigger insight generation.
     */
    generateInsights: async (): Promise<InsightGenerateResponse> => {
        const response = await api.post('/insights/generate/');
        return response.data;
    },

    /**
     * Submit feedback for an insight.
     */
    submitFeedback: async (
        insightId: string,
        feedback: InsightFeedbackCreate
    ): Promise<InsightFeedback> => {
        const response = await api.post(`/insights/${insightId}/feedback/`, feedback);
        return response.data;
    },

    /**
     * Get feedback for an insight (if exists).
     */
    getFeedback: async (insightId: string): Promise<InsightFeedback | null> => {
        try {
            const response = await api.get(`/insights/${insightId}/feedback/`);
            return response.data;
        } catch {
            return null;
        }
    }
};
