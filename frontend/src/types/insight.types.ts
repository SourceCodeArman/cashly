/**
 * TypeScript types for the Insights feature.
 */

export type InsightType =
    | 'subscription'
    | 'unusual_spending'
    | 'merchant_pattern'
    | 'savings_opportunity'
    | 'income_analysis'
    | 'spending_trend'
    | 'budget_insight'
    | 'ai_recommendation';

export type InsightPriority = 'high' | 'medium' | 'low';

export interface Insight {
    insight_id: string;
    insight_type: InsightType;
    title: string;
    description: string;
    priority: InsightPriority;
    is_dismissed: boolean;
    is_read: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
    expires_at?: string;
}

export interface InsightSummary {
    total: number;
    unread: number;
    by_priority: {
        high: number;
        medium: number;
        low: number;
    };
    by_type: Record<InsightType, number>;
}

export interface InsightFeedback {
    feedback_id: string;
    insight: string;
    is_helpful: boolean;
    feedback_text?: string;
    created_at: string;
}

export interface InsightFeedbackCreate {
    is_helpful: boolean;
    feedback_text?: string;
}

export interface InsightGenerateResponse {
    status: string;
    count: number;
    insights: Insight[];
}
