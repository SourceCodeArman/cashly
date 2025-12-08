import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Layout } from 'react-grid-layout'

export type WidgetType =
    | 'totalBalance'
    | 'totalIncome'
    | 'totalSpending'
    | 'spendingTrend'
    | 'activeGoals'
    | 'recentTransactions'
    | 'budgetProgress'
    | 'sankeyDiagram'
    | 'netWorth'
    | 'recommendations'

export interface WidgetConfig {
    id: WidgetType
    label: string
    isVisible: boolean
    order: number
    colSpan: {
        mobile: number
        tablet: number
        desktop: number
    }
}

interface DashboardState {
    layoutMode: 'grid' | 'list' | 'custom'
    widgets: WidgetConfig[]
    customLayout: Layout[]
    setLayoutMode: (mode: 'grid' | 'list' | 'custom') => void
    toggleWidget: (id: WidgetType) => void
    reorderWidgets: (newOrder: WidgetConfig[]) => void
    setCustomLayout: (layout: Layout[]) => void
    resetDefaults: () => void
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
    {
        id: 'totalBalance',
        label: 'Total Balance',
        isVisible: true,
        order: 0,
        colSpan: { mobile: 1, tablet: 1, desktop: 1 }
    },
    {
        id: 'totalIncome',
        label: 'Total Income',
        isVisible: true,
        order: 1,
        colSpan: { mobile: 1, tablet: 1, desktop: 1 }
    },
    {
        id: 'totalSpending',
        label: 'Total Spending',
        isVisible: true,
        order: 2,
        colSpan: { mobile: 1, tablet: 1, desktop: 1 }
    },
    {
        id: 'spendingTrend',
        label: 'Spending Trend',
        isVisible: true,
        order: 3,
        colSpan: { mobile: 1, tablet: 2, desktop: 2 }
    },
    {
        id: 'activeGoals',
        label: 'Active Goals',
        isVisible: true,
        order: 4,
        colSpan: { mobile: 1, tablet: 1, desktop: 1 }
    },
    {
        id: 'recentTransactions',
        label: 'Recent Transactions',
        isVisible: false,
        order: 5,
        colSpan: { mobile: 1, tablet: 2, desktop: 3 }
    },
    {
        id: 'budgetProgress',
        label: 'Budget Watch',
        isVisible: false, // Hidden by default
        order: 6,
        colSpan: { mobile: 1, tablet: 1, desktop: 1 }
    },
    {
        id: 'sankeyDiagram',
        label: 'Cash Flow',
        isVisible: false, // Hidden by default
        order: 7,
        colSpan: { mobile: 1, tablet: 2, desktop: 2 }
    },
    {
        id: 'netWorth',
        label: 'Net Worth',
        isVisible: false, // Hidden by default
        order: 8,
        colSpan: { mobile: 1, tablet: 1, desktop: 1 }
    },
    {
        id: 'recommendations',
        label: 'Recommendations',
        isVisible: false, // Hidden by default
        order: 9,
        colSpan: { mobile: 1, tablet: 2, desktop: 2 }
    }
]

// Default grid layout for React Grid Layout
const DEFAULT_CUSTOM_LAYOUT: Layout[] = [
    { i: 'totalBalance', x: 0, y: 0, w: 4, h: 2 },
    { i: 'totalIncome', x: 4, y: 0, w: 4, h: 2 },
    { i: 'totalSpending', x: 8, y: 0, w: 4, h: 2 },
    { i: 'spendingTrend', x: 0, y: 2, w: 8, h: 6 },
    { i: 'activeGoals', x: 8, y: 2, w: 4, h: 6 },
    { i: 'recentTransactions', x: 0, y: 8, w: 12, h: 6 },
    { i: 'budgetProgress', x: 0, y: 14, w: 4, h: 6 },
    { i: 'sankeyDiagram', x: 4, y: 14, w: 8, h: 6 },
    { i: 'netWorth', x: 0, y: 20, w: 4, h: 4 },
    { i: 'recommendations', x: 4, y: 20, w: 8, h: 6 }
]

// Preset Layouts
export const PRESET_LAYOUTS = {
    default: {
        label: 'Default',
        layout: DEFAULT_CUSTOM_LAYOUT,
        visible: ['totalBalance', 'totalIncome', 'totalSpending', 'spendingTrend', 'activeGoals']
    },
    analytics: {
        label: 'Analytics',
        layout: [
            { i: 'spendingTrend', x: 0, y: 0, w: 8, h: 6 },
            { i: 'budgetProgress', x: 8, y: 0, w: 4, h: 6 },
            { i: 'totalBalance', x: 0, y: 6, w: 4, h: 2 },
            { i: 'totalIncome', x: 4, y: 6, w: 4, h: 2 },
            { i: 'totalSpending', x: 8, y: 6, w: 4, h: 2 },
            { i: 'activeGoals', x: 0, y: 8, w: 6, h: 6 },
            { i: 'recentTransactions', x: 6, y: 8, w: 6, h: 6 }
        ],
        visible: ['spendingTrend', 'budgetProgress', 'totalBalance', 'totalIncome', 'totalSpending']
    },
    simple: {
        label: 'Simple',
        layout: [
            { i: 'totalBalance', x: 0, y: 0, w: 12, h: 2 },
            { i: 'totalIncome', x: 0, y: 2, w: 6, h: 2 },
            { i: 'totalSpending', x: 6, y: 2, w: 6, h: 2 }
        ],
        visible: ['totalBalance', 'totalIncome', 'totalSpending']
    },
    focus: {
        label: 'Focus',
        layout: [
            { i: 'totalBalance', x: 0, y: 0, w: 6, h: 2 },
            { i: 'activeGoals', x: 6, y: 0, w: 6, h: 6 },
            { i: 'budgetProgress', x: 0, y: 2, w: 6, h: 4 }
        ],
        visible: ['totalBalance', 'activeGoals', 'budgetProgress']
    }
}

export type PresetName = keyof typeof PRESET_LAYOUTS

interface DashboardState {
    layoutMode: 'grid' | 'list' | 'custom'
    widgets: WidgetConfig[]
    customLayout: Layout[]
    setLayoutMode: (mode: 'grid' | 'list' | 'custom') => void
    toggleWidget: (id: WidgetType) => void
    reorderWidgets: (newOrder: WidgetConfig[]) => void
    setCustomLayout: (layout: Layout[]) => void
    applyPreset: (name: PresetName) => void
    resetDefaults: () => void
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set) => ({
            layoutMode: 'grid',
            widgets: DEFAULT_WIDGETS,
            customLayout: DEFAULT_CUSTOM_LAYOUT,
            setLayoutMode: (mode) => set({ layoutMode: mode }),
            toggleWidget: (id) =>
                set((state) => ({
                    widgets: state.widgets.map((w) =>
                        w.id === id ? { ...w, isVisible: !w.isVisible } : w
                    ),
                })),
            reorderWidgets: (newOrder) => set({ widgets: newOrder }),
            setCustomLayout: (layout) => set({ customLayout: layout }),
            applyPreset: (name) => {
                const preset = PRESET_LAYOUTS[name]
                if (!preset) return

                set((state) => ({
                    layoutMode: 'custom',
                    customLayout: preset.layout,
                    widgets: state.widgets.map((w) => ({
                        ...w,
                        isVisible: preset.visible.includes(w.id)
                    }))
                }))
            },
            resetDefaults: () => set({
                layoutMode: 'grid',
                widgets: DEFAULT_WIDGETS,
                customLayout: DEFAULT_CUSTOM_LAYOUT
            }),
        }),
        {
            name: 'dashboard-storage',
            version: 1,
            migrate: (persistedState: any, version) => {
                if (version === 0) {
                    const existingWidgets = persistedState.widgets || []
                    // Merge existing widgets with new defaults to ensure all IDs exist
                    const mergedWidgets = DEFAULT_WIDGETS.map(dw => {
                        const existing = existingWidgets.find((ew: any) => ew.id === dw.id)
                        return existing ? existing : dw
                    })

                    return {
                        ...persistedState,
                        widgets: mergedWidgets,
                        customLayout: DEFAULT_CUSTOM_LAYOUT
                    }
                }
                return persistedState as DashboardState
            },
        }
    )
)
