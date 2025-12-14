import type { CategoryRule } from '@/types'

export interface RulePreset {
    id: string
    name: string
    description: string
    category: string
    icon: string
    rules: Omit<CategoryRule, 'id' | 'enabled'>[]
}

export const RULE_PRESETS: RulePreset[] = [
    // Food & Dining
    {
        id: 'coffee-shops',
        name: 'Coffee Shops',
        description: 'Starbucks, local cafes, and coffee purchases',
        category: 'Food & Dining',
        icon: 'coffee',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'starbucks' },
            { field: 'merchant_name', operator: 'contains', value: 'coffee' },
            { field: 'merchant_name', operator: 'contains', value: 'cafe' },
        ],
    },
    {
        id: 'fast-food',
        name: 'Fast Food',
        description: 'McDonald\'s, Burger King, Taco Bell, Subway',
        category: 'Food & Dining',
        icon: 'utensils',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'mcdonald' },
            { field: 'merchant_name', operator: 'contains', value: 'burger' },
            { field: 'merchant_name', operator: 'contains', value: 'taco bell' },
            { field: 'merchant_name', operator: 'contains', value: 'subway' },
        ],
    },
    {
        id: 'food-delivery',
        name: 'Food Delivery',
        description: 'DoorDash, Uber Eats, Grubhub, Postmates',
        category: 'Food & Dining',
        icon: 'utensils',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'doordash' },
            { field: 'merchant_name', operator: 'contains', value: 'ubereats' },
            { field: 'merchant_name', operator: 'contains', value: 'grubhub' },
            { field: 'merchant_name', operator: 'contains', value: 'postmates' },
        ],
    },

    // Shopping & Retail
    {
        id: 'amazon',
        name: 'Amazon Purchases',
        description: 'All Amazon.com purchases',
        category: 'Shopping',
        icon: 'shopping-cart',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'amazon' },
        ],
    },
    {
        id: 'groceries',
        name: 'Grocery Stores',
        description: 'Walmart, Target, Whole Foods, Trader Joe\'s',
        category: 'Shopping',
        icon: 'shopping-cart',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'walmart' },
            { field: 'merchant_name', operator: 'contains', value: 'target' },
            { field: 'merchant_name', operator: 'contains', value: 'whole foods' },
            { field: 'merchant_name', operator: 'contains', value: 'trader joe' },
            { field: 'merchant_name', operator: 'contains', value: 'kroger' },
            { field: 'merchant_name', operator: 'contains', value: 'safeway' },
        ],
    },
    {
        id: 'pharmacy',
        name: 'Pharmacy',
        description: 'CVS, Walgreens, Rite Aid',
        category: 'Shopping',
        icon: 'pill',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'cvs' },
            { field: 'merchant_name', operator: 'contains', value: 'walgreens' },
            { field: 'merchant_name', operator: 'contains', value: 'rite aid' },
        ],
    },

    // Transportation
    {
        id: 'rideshare',
        name: 'Rideshare',
        description: 'Uber, Lyft rides',
        category: 'Transportation',
        icon: 'car',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'uber' },
            { field: 'merchant_name', operator: 'contains', value: 'lyft' },
        ],
    },
    {
        id: 'gas-stations',
        name: 'Gas Stations',
        description: 'Shell, Chevron, BP, Exxon, and other gas stations',
        category: 'Transportation',
        icon: 'car',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'shell' },
            { field: 'merchant_name', operator: 'contains', value: 'chevron' },
            { field: 'merchant_name', operator: 'contains', value: 'bp' },
            { field: 'merchant_name', operator: 'contains', value: 'exxon' },
            { field: 'merchant_name', operator: 'contains', value: 'mobil' },
        ],
    },
    {
        id: 'parking',
        name: 'Parking',
        description: 'Parking garages, lots, and meters',
        category: 'Transportation',
        icon: 'car',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'parking' },
            { field: 'merchant_name', operator: 'contains', value: 'park' },
        ],
    },

    // Subscriptions & Entertainment
    {
        id: 'streaming-video',
        name: 'Streaming Video',
        description: 'Netflix, Hulu, Disney+, HBO Max',
        category: 'Entertainment',
        icon: 'film',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'netflix' },
            { field: 'merchant_name', operator: 'contains', value: 'hulu' },
            { field: 'merchant_name', operator: 'contains', value: 'disney' },
            { field: 'merchant_name', operator: 'contains', value: 'hbo' },
            { field: 'merchant_name', operator: 'contains', value: 'prime video' },
        ],
    },
    {
        id: 'streaming-music',
        name: 'Streaming Music',
        description: 'Spotify, Apple Music, YouTube Music',
        category: 'Entertainment',
        icon: 'music',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'spotify' },
            { field: 'merchant_name', operator: 'contains', value: 'apple music' },
            { field: 'merchant_name', operator: 'contains', value: 'youtube music' },
            { field: 'merchant_name', operator: 'contains', value: 'pandora' },
        ],
    },
    {
        id: 'gym-fitness',
        name: 'Gym & Fitness',
        description: 'Gym memberships, fitness centers, yoga studios',
        category: 'Health & Fitness',
        icon: 'dumbbell',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'gym' },
            { field: 'merchant_name', operator: 'contains', value: 'fitness' },
            { field: 'merchant_name', operator: 'contains', value: 'yoga' },
            { field: 'merchant_name', operator: 'contains', value: 'planet fitness' },
            { field: 'merchant_name', operator: 'contains', value: '24 hour' },
        ],
    },

    // Utilities & Services
    {
        id: 'internet-phone',
        name: 'Internet & Phone',
        description: 'Verizon, AT&T, Comcast, Spectrum',
        category: 'Utilities',
        icon: 'wifi',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'verizon' },
            { field: 'merchant_name', operator: 'contains', value: 'at&t' },
            { field: 'merchant_name', operator: 'contains', value: 'comcast' },
            { field: 'merchant_name', operator: 'contains', value: 'spectrum' },
            { field: 'merchant_name', operator: 'contains', value: 't-mobile' },
        ],
    },
    {
        id: 'cloud-storage',
        name: 'Cloud Storage',
        description: 'Dropbox, Google Drive, iCloud',
        category: 'Subscriptions',
        icon: 'smartphone',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'dropbox' },
            { field: 'merchant_name', operator: 'contains', value: 'google drive' },
            { field: 'merchant_name', operator: 'contains', value: 'icloud' },
            { field: 'merchant_name', operator: 'contains', value: 'onedrive' },
        ],
    },
    {
        id: 'software-subscriptions',
        name: 'Software Subscriptions',
        description: 'Adobe, Microsoft 365, Apple services',
        category: 'Subscriptions',
        icon: 'laptop',
        rules: [
            { field: 'merchant_name', operator: 'contains', value: 'adobe' },
            { field: 'merchant_name', operator: 'contains', value: 'microsoft' },
            { field: 'merchant_name', operator: 'contains', value: 'apple.com' },
            { field: 'merchant_name', operator: 'contains', value: 'office 365' },
        ],
    },
]

// Helper function to get presets by category
export function getPresetsByCategory(category: string): RulePreset[] {
    return RULE_PRESETS.filter((preset) => preset.category === category)
}

// Get all unique categories
export function getPresetCategories(): string[] {
    return Array.from(new Set(RULE_PRESETS.map((preset) => preset.category)))
}

// Get a preset by ID
export function getPresetById(id: string): RulePreset | undefined {
    return RULE_PRESETS.find((preset) => preset.id === id)
}
