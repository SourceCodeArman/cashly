import Foundation
// MARK: - Dashboard Response
struct DashboardData: Codable {
    let totalBalance: Double
    let totalIncome: Double
    let totalSpending: Double
    let recentTransactions: [DashboardTransaction]
    let monthlySpending: MonthlySpendingSummary?
    let goalsProgress: [GoalProgress]
    let categorySpending: [CategorySpending]
    let budgetSummary: BudgetSummaryData?
    
    enum CodingKeys: String, CodingKey {
        case totalBalance = "total_balance"
        case totalIncome = "total_income"
        case totalSpending = "total_spending"
        case recentTransactions = "recent_transactions"
        case monthlySpending = "monthly_spending"
        case goalsProgress = "goals_progress"
        case categorySpending = "category_spending"
        case budgetSummary = "budget_summary"
    }
}
// MARK: - Transaction
struct DashboardTransaction: Codable, Identifiable {
    let id: String
    let merchantName: String?
    let description: String?
    let amount: String
    let formattedAmount: String
    let date: String
    let type: String
    let category: TransactionCategory?
    let account: TransactionAccount?
    let createdAt: String
    let updatedAt: String
    let isRecurring: Bool
    let isTransfer: Bool
    let userModified: Bool
    let notes: String?
    let tags: [String]
    
    var displayName: String {
        merchantName ?? description ?? "Unknown"
    }
    
    var amountValue: Double {
        Double(amount) ?? 0.0
    }
}
struct TransactionCategory: Codable {
    let id: String
    let name: String
    let type: String
    let icon: String
    let color: String
    let isSystemCategory: Bool
}
struct TransactionAccount: Codable {
    let id: String
    let name: String
    let institutionName: String
    let accountType: String
    let maskedAccountNumber: String
    let isActive: Bool
}
// MARK: - Monthly Spending
struct MonthlySpendingSummary: Codable {
    let month: Int
    let year: Int
    let totalExpenses: Double
    let transactionCount: Int
    let byCategory: [CategoryBreakdown]
    
    enum CodingKeys: String, CodingKey {
        case month
        case year
        case totalExpenses = "total_expenses"
        case transactionCount = "transaction_count"
        case byCategory = "by_category"
    }
}
struct CategoryBreakdown: Codable, Identifiable {
    let categoryId: String?
    let categoryName: String
    let total: Double
    let count: Int
    
    var id: String { categoryId ?? categoryName }
    
    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case categoryName = "category_name"
        case total
        case count
    }
}
// MARK: - Goal Progress
struct GoalProgress: Codable, Identifiable {
    let goalId: String
    let name: String
    let targetAmount: Double
    let currentAmount: Double
    let progressPercentage: Double?
    let deadline: String?
    let isOnTrack: Bool?
    let daysRemaining: Int?
    let isCompleted: Bool
    let completedAt: String?
    let goalType: String?
    let inferredCategoryId: String?
    let inferredCategoryName: String?
    
    var id: String { goalId }
    
    enum CodingKeys: String, CodingKey {
        case goalId = "goal_id"
        case name
        case targetAmount = "target_amount"
        case currentAmount = "current_amount"
        case progressPercentage = "progress_percentage"
        case deadline
        case isOnTrack = "is_on_track"
        case daysRemaining = "days_remaining"
        case isCompleted = "is_completed"
        case completedAt = "completed_at"
        case goalType = "goal_type"
        case inferredCategoryId = "inferred_category_id"
        case inferredCategoryName = "inferred_category_name"
    }
    
    var progress: Double {
        currentAmount / targetAmount
    }
}
// MARK: - Category Spending
struct CategorySpending: Codable, Identifiable {
    let categoryId: String?
    let categoryName: String
    let amount: Double
    let color: String
    
    var id: String { categoryId ?? categoryName }
    
    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case categoryName = "category_name"
        case amount
        case color
    }
}
// MARK: - Budget Summary
struct BudgetSummaryData: Codable {
    let totalBudgeted: Double
    let totalSpent: Double
    let budgets: [BudgetItem]
    
    enum CodingKeys: String, CodingKey {
        case totalBudgeted = "total_budgeted"
        case totalSpent = "total_spent"
        case budgets
    }
}
struct BudgetItem: Codable, Identifiable {
    let budgetId: String
    let categoryName: String
    let amount: Double
    let spent: Double
    let remaining: Double
    let percentage: Double
    
    var id: String { budgetId }
    
    enum CodingKeys: String, CodingKey {
        case budgetId = "budget_id"
        case categoryName = "category_name"
        case amount
        case spent
        case remaining
        case percentage
    }
}
// MARK: - Trends Data
struct TrendsData: Codable, Identifiable {
    let month: String
    let amount: Double
    
    var id: String { month }
}
// MARK: - Net Worth
struct NetWorthData: Codable {
    let netWorth: Double
    let assets: Double
    let liabilities: Double
    
    enum CodingKeys: String, CodingKey {
        case netWorth = "net_worth"
        case assets
        case liabilities
    }
}
