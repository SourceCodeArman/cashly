import Charts
import SwiftUI

// MARK: - Design System Constants
struct DashboardDesign {
  static let cardCornerRadius: CGFloat = AppTheme.cornerRadius
  static let cardPadding: CGFloat = 16
  static let cardSpacing: CGFloat = 16
  static let shadowRadius: CGFloat = 8
  static let shadowOpacity: Double = 0.05
  static let shadowY: CGFloat = 4
}

struct DashboardView: View {
  @Binding var selectedTab: Int
  @StateObject private var viewModel = DashboardViewModel()

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Dashboard")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
          Spacer()
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 16)

        ScrollView {
          if viewModel.isLoading {
            DashboardSkeleton()
          } else if let error = viewModel.errorMessage {
            ErrorView(message: error) {
              Task {
                await viewModel.loadDashboard()
              }
            }
          } else {
            VStack(spacing: DashboardDesign.cardSpacing) {
              // Total Balance Card
              if let data = viewModel.dashboardData {
                TotalBalanceCard(dashboardData: data)
              }

              // Quick Access Navigation
              QuickAccessSection(selectedTab: $selectedTab)

              // Recent Transactions
              if let transactions = viewModel.dashboardData?.recentTransactions,
                !transactions.isEmpty
              {
                Button(action: { selectedTab = 2 }) {
                  RecentTransactionsCard(transactions: transactions)
                }
                .buttonStyle(PlainButtonStyle())
              }

              // Category Spending
              if let categories = viewModel.dashboardData?.categorySpending,
                !categories.isEmpty
              {
                CategorySpendingCard(categories: categories)
              }

              // Goals Progress
              if let goals = viewModel.dashboardData?.goalsProgress,
                !goals.isEmpty
              {
                Button(action: { selectedTab = 10 }) {
                  GoalsProgressCard(goals: goals)
                }
                .buttonStyle(PlainButtonStyle())
              }
            }
            .padding()
          }
        }
        .refreshable {
          await viewModel.loadDashboard()
        }
      }
    }
    .task {
      await viewModel.loadDashboard()
    }
  }
}

// MARK: - Card Modifier
struct CardStyle: ViewModifier {
  func body(content: Content) -> some View {
    content
      .background(AppTheme.card)
      .cornerRadius(DashboardDesign.cardCornerRadius)
      .shadow(
        color: Color.black.opacity(DashboardDesign.shadowOpacity),
        radius: DashboardDesign.shadowRadius,
        y: DashboardDesign.shadowY
      )
  }
}

extension View {
  func cardStyle() -> some View {
    modifier(CardStyle())
  }
}

// MARK: - Total Balance Card
struct TotalBalanceCard: View {
  let dashboardData: DashboardData

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      // Header with Icon
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text("Total Balance")
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(.secondary)
        }
        Spacer()
        Image(systemName: "dollarsign.circle.fill")
          .font(.system(size: 20))
          .foregroundStyle(AppTheme.primary)
      }

      // Main Value - Total Balance from checking/savings
      Text(dashboardData.totalBalance, format: .currency(code: "USD"))
        .font(.system(size: 32, weight: .bold))
        .foregroundStyle(.primary)

      Divider()
        .padding(.vertical, 4)

      // Income & Debts
      HStack(spacing: 24) {
        VStack(alignment: .leading, spacing: 4) {
          Text("Income")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(dashboardData.totalIncome, format: .currency(code: "USD"))
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(AppTheme.success)
        }

        VStack(alignment: .leading, spacing: 4) {
          Text("Debts")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(dashboardData.totalDebt, format: .currency(code: "USD"))
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(AppTheme.destructive)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(DashboardDesign.cardPadding)
    .cardStyle()
  }
}

// MARK: - Quick Stats Row
struct QuickStatsRow: View {
  let data: DashboardData

  var body: some View {
    HStack(spacing: 12) {
      StatCard(
        title: "Total Balance",
        value: data.totalBalance,
        icon: "wallet.fill",
        color: AppTheme.primary
      )

      StatCard(
        title: "Income",
        value: data.totalIncome,
        icon: "arrow.up.circle.fill",
        color: AppTheme.success
      )

      StatCard(
        title: "Spending",
        value: data.totalSpending,
        icon: "arrow.down.circle.fill",
        color: AppTheme.destructive
      )
    }
  }
}

struct StatCard: View {
  let title: String
  let value: Double
  let icon: String
  let color: Color

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      // Header with icon
      HStack {
        Text(title)
          .font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
        Image(systemName: icon)
          .font(.system(size: 16))
          .foregroundStyle(color)
      }

      // Value
      Text(value, format: .currency(code: "USD"))
        .font(.title3)
        .fontWeight(.bold)
        .foregroundStyle(.primary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(DashboardDesign.cardPadding)
    .cardStyle()
  }
}

// MARK: - Recent Transactions
struct RecentTransactionsCard: View {
  let transactions: [DashboardTransaction]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      // Header
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text("Recent Transactions")
            .font(.headline)
            .foregroundStyle(.primary)
          Text("Your latest financial activity")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        Spacer()
        Image(systemName: "list.bullet.rectangle")
          .font(.system(size: 20))
          .foregroundStyle(AppTheme.primary)
      }

      Divider()

      // Transactions
      VStack(spacing: 0) {
        ForEach(Array(transactions.prefix(5).enumerated()), id: \.element.id) {
          index, transaction in
          TransactionRow(transaction: transaction.toTransaction())
          if index < min(4, transactions.count - 1) {
            Divider()
              .padding(.vertical, 8)
          }
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(DashboardDesign.cardPadding)
    .cardStyle()
  }
}

// MARK: - Category Spending
struct CategorySpendingCard: View {
  let categories: [CategorySpending]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      // Header
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text("Spending by Category")
            .font(.headline)
            .foregroundStyle(.primary)
          Text("Top spending categories")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        Spacer()
        Image(systemName: "chart.pie.fill")
          .font(.system(size: 20))
          .foregroundStyle(AppTheme.primary)
      }

      Divider()

      // Categories
      VStack(spacing: 0) {
        ForEach(Array(categories.prefix(5).enumerated()), id: \.element.id) { index, category in
          CategoryRow(category: category)
          if index < min(4, categories.count - 1) {
            Divider()
              .padding(.vertical, 8)
          }
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(DashboardDesign.cardPadding)
    .cardStyle()
  }
}

struct CategoryRow: View {
  let category: CategorySpending

  private var categoryColor: Color {
    Color(hex: category.color)
  }

  var body: some View {
    HStack(spacing: 12) {
      Circle()
        .fill(categoryColor)
        .frame(width: 12, height: 12)

      Text(category.categoryName)
        .font(.subheadline)
        .foregroundStyle(.primary)

      Spacer()

      Text(category.amount, format: .currency(code: "USD"))
        .font(.subheadline)
        .fontWeight(.semibold)
        .foregroundStyle(.primary)
    }
    .padding(.vertical, 4)
  }
}

// MARK: - Goals Progress
struct GoalsProgressCard: View {
  let goals: [GoalProgress]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      // Header
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text("Goals Progress")
            .font(.headline)
            .foregroundStyle(.primary)
          Text("Track your savings goals")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        Spacer()
        Image(systemName: "target")
          .font(.system(size: 20))
          .foregroundStyle(AppTheme.primary)
      }

      Divider()

      // Goals
      VStack(spacing: 16) {
        ForEach(goals.prefix(3)) { goal in
          GoalRow(goal: goal)
        }
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(DashboardDesign.cardPadding)
    .cardStyle()
  }
}

struct GoalRow: View {
  let goal: GoalProgress

  var progress: Double {
    // Use the helper property from GoalProgress model which handles safe division
    goal.progress
  }

  var progressColor: Color {
    if progress >= 0.75 {
      return AppTheme.success
    } else if progress >= 0.5 {
      return AppTheme.primary
    } else if progress >= 0.25 {
      return AppTheme.warning
    } else {
      return AppTheme.destructive
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text(goal.name)
          .font(.subheadline)
          .fontWeight(.medium)
          .foregroundStyle(.primary)

        Spacer()

        Text("\(Int(progress * 100))%")
          .font(.caption)
          .fontWeight(.semibold)
          .foregroundStyle(.secondary)
      }

      // Progress bar
      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          Rectangle()
            .fill(Color(.systemGray5))
            .frame(height: 8)
            .cornerRadius(4)

          Rectangle()
            .fill(progressColor)
            .frame(width: geometry.size.width * progress, height: 8)
            .cornerRadius(4)
        }
      }
      .frame(height: 8)

      HStack {
        Text(goal.currentAmountValue, format: .currency(code: "USD"))
          .font(.caption)
          .foregroundStyle(.secondary)

        Spacer()

        Text(goal.targetAmountValue, format: .currency(code: "USD"))
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
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

// MARK: - Quick Access Section
struct QuickAccessSection: View {
  @Binding var selectedTab: Int

  let navigationItems: [QuickAccessItem] = [
    QuickAccessItem(
      title: "Analytics", icon: "chart.xyaxis.line", color: AppTheme.primary,
      destinationTab: 4),
    QuickAccessItem(
      title: "Bills", icon: "doc.text.fill", color: AppTheme.warning, destinationTab: 9),
    QuickAccessItem(
      title: "Debts", icon: "creditcard.fill", color: AppTheme.destructive, destinationTab: 11),
    QuickAccessItem(title: "Goals", icon: "target", color: AppTheme.success, destinationTab: 10),
    QuickAccessItem(
      title: "Insights", icon: "lightbulb.fill", color: Color.purple, destinationTab: 5),
    QuickAccessItem(
      title: "Accounts", icon: "building.columns.fill", color: Color.yellow, destinationTab: 1),
    QuickAccessItem(
      title: "Notifications", icon: "bell.fill", color: Color.red, destinationTab: 6),
    QuickAccessItem(
      title: "Settings", icon: "gear", color: Color.orange, destinationTab: 11),
  ]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Text("Quick Access")
          .font(.headline)
          .foregroundStyle(.primary)
        Spacer()
        Image(systemName: "square.grid.2x2")
          .font(.system(size: 20))
          .foregroundStyle(AppTheme.primary)
      }

      LazyVGrid(
        columns: [
          GridItem(.flexible(), spacing: 12),
          GridItem(.flexible(), spacing: 12),
          GridItem(.flexible(), spacing: 12),
          GridItem(.flexible(), spacing: 12),
        ], spacing: 12
      ) {
        ForEach(navigationItems) { item in
          Button(action: {
            selectedTab = item.destinationTab
          }) {
            QuickAccessCard(item: item)
          }
          .buttonStyle(PlainButtonStyle())
        }
      }
    }
    .padding(DashboardDesign.cardPadding)
    .cardStyle()
  }
}

struct QuickAccessCard: View {
  let item: QuickAccessItem

  var body: some View {
    VStack(spacing: 8) {
      ZStack {
        Circle()
          .fill(item.color.opacity(0.15))
          .frame(width: 48, height: 48)

        Image(systemName: item.icon)
          .font(.system(size: 22))
          .foregroundStyle(item.color)
      }

      Text(item.title)
        .font(.caption)
        .fontWeight(.medium)
        .foregroundStyle(.primary)
        .multilineTextAlignment(.center)
        .lineLimit(2)
        .fixedSize(horizontal: false, vertical: true)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 8)
  }
}

struct QuickAccessItem: Identifiable {
  let id = UUID()
  let title: String
  let icon: String
  let color: Color
  let destinationTab: Int
}

#Preview {
  DashboardView(selectedTab: .constant(0))
}
