import SwiftUI
import Charts

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    
    var body: some View {
        NavigationStack {
            ScrollView {
                if viewModel.isLoading {
                    ProgressView("Loading...")
                        .padding(.top, 100)
                } else if let error = viewModel.errorMessage {
                    ErrorView(message: error) {
                        Task {
                            await viewModel.loadDashboard()
                        }
                    }
                } else {
                    VStack(spacing: 20) {
                        // Net Worth Card
                        if let netWorth = viewModel.netWorth {
                            NetWorthCard(netWorth: netWorth)
                        }
                        
                        // Quick Stats
                        if let data = viewModel.dashboardData {
                            QuickStatsRow(data: data)
                        }
                        
                        // Recent Transactions
                        if let transactions = viewModel.dashboardData?.recentTransactions,
                           !transactions.isEmpty {
                            RecentTransactionsCard(transactions: transactions)
                        }
                        
                        // Category Spending
                        if let categories = viewModel.dashboardData?.categorySpending,
                           !categories.isEmpty {
                            CategorySpendingCard(categories: categories)
                        }
                        
                        // Goals Progress
                        if let goals = viewModel.dashboardData?.goalsProgress,
                           !goals.isEmpty {
                            GoalsProgressCard(goals: goals)
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Dashboard")
            .refreshable {
                await viewModel.loadDashboard()
            }
        }
        .task {
            await viewModel.loadDashboard()
        }
    }
}

// MARK: - Net Worth Card

struct NetWorthCard: View {
    let netWorth: NetWorthData
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Net Worth")
                .font(.headline)
                .foregroundStyle(.secondary)
            
            Text(netWorth.netWorth, format: .currency(code: "USD"))
                .font(.system(size: 36, weight: .bold))
            
            HStack(spacing: 24) {
                VStack(alignment: .leading) {
                    Text("Assets")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(netWorth.assets, format: .currency(code: "USD"))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.green)
                }
                
                VStack(alignment: .leading) {
                    Text("Liabilities")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(netWorth.liabilities, format: .currency(code: "USD"))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.red)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
}

// MARK: - Quick Stats Row

struct QuickStatsRow: View {
    let data: DashboardData
    
    var body: some View {
        HStack(spacing: 12) {
            StatCard(
                title: "Balance",
                value: data.totalBalance,
                color: .blue
            )
            
            StatCard(
                title: "Income",
                value: data.totalIncome,
                color: .green
            )
            
            StatCard(
                title: "Spending",
                value: data.totalSpending,
                color: .red
            )
        }
    }
}

struct StatCard: View {
    let title: String
    let value: Double
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            
            Text(value, format: .currency(code: "USD"))
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

// MARK: - Recent Transactions

struct RecentTransactionsCard: View {
    let transactions: [DashboardTransaction]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Transactions")
                .font(.headline)
            
            ForEach(transactions.prefix(5)) { transaction in
                TransactionRow(transaction: transaction)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
}

struct TransactionRow: View {
    let transaction: DashboardTransaction
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(transaction.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                if let category = transaction.category {
                    Text(category.name)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer()
            
            Text(transaction.amountValue, format: .currency(code: "USD"))
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(transaction.amountValue < 0 ? .red : .green)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Category Spending

struct CategorySpendingCard: View {
    let categories: [CategorySpending]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Spending by Category")
                .font(.headline)
            
            ForEach(categories.prefix(5)) { category in
                CategoryRow(category: category)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
}

struct CategoryRow: View {
    let category: CategorySpending
    
    var body: some View {
        HStack {
            Text(category.categoryName)
                .font(.subheadline)
            
            Spacer()
            
            Text(category.amount, format: .currency(code: "USD"))
                .font(.subheadline)
                .fontWeight(.semibold)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Goals Progress

struct GoalsProgressCard: View {
    let goals: [GoalProgress]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Goals Progress")
                .font(.headline)
            
            ForEach(goals.prefix(3)) { goal in
                GoalRow(goal: goal)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
}

struct GoalRow: View {
    let goal: GoalProgress
    
    var progress: Double {
        goal.currentAmount / goal.targetAmount
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(goal.name)
                    .font(.subheadline)
                
                Spacer()
                
                Text("\(Int(progress * 100))%")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            
            ProgressView(value: progress)
                .tint(.green)
            
            HStack {
                Text(goal.currentAmount, format: .currency(code: "USD"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
                
                Spacer()
                
                Text(goal.targetAmount, format: .currency(code: "USD"))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Error View

struct ErrorView: View {
    let message: String
    let retry: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(.orange)
            
            Text("Error")
                .font(.title2)
                .fontWeight(.bold)
            
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Button(action: retry) {
                Text("Try Again")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .cornerRadius(10)
            }
        }
        .padding()
    }
}

#Preview {
    DashboardView()
}
