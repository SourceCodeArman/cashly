export interface SankeyNode {
    name: string;
    color?: string;
}

export interface SankeyLink {
    source: number;
    target: number;
    value: number;
}

export interface SankeyData {
    nodes: SankeyNode[];
    links: SankeyLink[];
}

export interface TrendData {
    month: string;
    amount: number;
}

export interface NetWorthData {
    net_worth: number;
    assets: number;
    liabilities: number;
}

export interface PatternData {
    day: string;
    amount: number;
    count: number;
}

export interface Recommendation {
    id: string;
    type: 'budget' | 'goal' | 'spending' | 'savings' | 'account';
    icon: 'trending' | 'target' | 'alert' | 'lightbulb';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionable: boolean;
    metadata?: {
        budget_id?: string;
        goal_id?: string;
        category_id?: string;
        account_id?: string;
    };
}
