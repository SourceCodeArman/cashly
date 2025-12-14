import Charts
import SwiftUI

struct AnalyticsView: View {
  @StateObject private var viewModel = AnalyticsViewModel()

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Analytics")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
          Spacer()
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 16)

        // Content
        ScrollView {
          VStack(spacing: 20) {
            if viewModel.isLoading {
              AnalyticsChartSkeleton()
            } else if let error = viewModel.errorMessage {
              ContentUnavailableView(
                "Error", systemImage: "exclamationmark.triangle", description: Text(error))
              Button("Retry") {
                Task { await viewModel.loadData() }
              }
            } else {
              // Net Worth Summary Cards
              if let netWorth = viewModel.netWorthSummary {
                NetWorthSummarySection(netWorth: netWorth)
              }

              // Monthly Spending Chart
              MonthlySpendingChartSection(
                spending: viewModel.monthlySpending,
                hasNoData: viewModel.monthlySpendingHasNoData,
                selectedMonthCount: $viewModel.selectedMonthCount,
                monthCountOptions: viewModel.monthCountOptions
              )

              // Weekly Spending Chart
              WeeklySpendingChartSection(
                weekData: viewModel.selectedWeekData,
                hasNoData: viewModel.weeklySpendingHasNoData,
                selectedWeekIndex: $viewModel.selectedWeekIndex,
                allWeeklySpending: viewModel.allWeeklySpending
              )

              // Recommendations
              if !viewModel.recommendations.isEmpty {
                RecommendationsSection(recommendations: viewModel.recommendations)
              }

              // Net Worth History
              if !viewModel.netWorthHistory.isEmpty {
                NetWorthHistorySection(history: viewModel.netWorthHistory)
              }
            }
          }
          .padding(.vertical)
        }
        .refreshable {
          await viewModel.loadData(forceRefresh: true)
        }
      }
    }
    .task {
      await viewModel.loadData()
    }
  }
}

// MARK: - Net Worth Summary Cards
struct NetWorthSummarySection: View {
  let netWorth: NetWorthData

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Net Worth Overview")
        .font(AppFont.title3())
        .foregroundStyle(AppTheme.text)
        .padding(.horizontal)

      HStack(spacing: 12) {
        // Net Worth Card
        NetWorthSummaryCard(
          title: "Net Worth",
          value: netWorth.netWorth,
          icon: "dollarsign.circle.fill",
          color: AppTheme.primary,
          subtitle: "Assets - Liabilities"
        )

        // Assets Card
        NetWorthSummaryCard(
          title: "Assets",
          value: netWorth.assets,
          icon: "wallet.bifold.fill",
          color: AppTheme.success,
          subtitle: "Cash, Investments"
        )

        // Liabilities Card
        NetWorthSummaryCard(
          title: "Liabilities",
          value: netWorth.liabilities,
          icon: "creditcard.fill",
          color: AppTheme.destructive,
          subtitle: "Loans, Credit"
        )
      }
      .padding(.horizontal)
    }
  }
}

struct NetWorthSummaryCard: View {
  let title: String
  let value: Double
  let icon: String
  let color: Color
  let subtitle: String

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Text(title)
          .font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
        Image(systemName: icon)
          .font(.system(size: 14))
          .foregroundStyle(color)
      }

      Text(value, format: .currency(code: "USD"))
        .font(.system(size: 16, weight: .bold))
        .foregroundStyle(color)
        .lineLimit(1)
        .minimumScaleFactor(0.7)

      Text(subtitle)
        .font(.caption2)
        .foregroundStyle(.secondary)
        .lineLimit(1)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(12)
    .background(AppTheme.card)
    .cornerRadius(AppTheme.cornerRadius)
    .shadow(radius: 2)
  }
}

// MARK: - Monthly Spending Chart
struct MonthlySpendingChartSection: View {
  let spending: [MonthlySpending]
  let hasNoData: Bool
  @Binding var selectedMonthCount: Int
  let monthCountOptions: [Int]

  var body: some View {
    VStack(alignment: .leading) {
      HStack {
        Text("Monthly Spending")
          .font(AppFont.title3())
          .foregroundStyle(AppTheme.text)

        Spacer()

        // Month count selector
        Menu {
          ForEach(monthCountOptions, id: \.self) { months in
            Button(action: {
              selectedMonthCount = months
            }) {
              HStack {
                Text("\(months) months")
                if selectedMonthCount == months {
                  Image(systemName: "checkmark")
                }
              }
            }
          }
        } label: {
          HStack(spacing: 4) {
            Text("\(selectedMonthCount)mo")
              .font(.subheadline)
              .fontWeight(.medium)
            Image(systemName: "chevron.down")
              .font(.caption)
          }
          .foregroundStyle(AppTheme.primary)
          .padding(.horizontal, 12)
          .padding(.vertical, 6)
          .background(AppTheme.primary.opacity(0.1))
          .cornerRadius(8)
          .contentShape(Rectangle())
        }
      }
      .padding(.horizontal)

      if hasNoData {
        NoDataView()
          .padding(.horizontal)
      } else {
        Chart(spending) { item in
          BarMark(
            x: .value("Month", item.month),
            y: .value("Amount", item.amount)
          )
          .foregroundStyle(AppTheme.destructive)
        }
        .chartYAxis {
          AxisMarks(position: .leading) { value in
            AxisGridLine()
            AxisValueLabel {
              if let amount = value.as(Double.self) {
                Text("$\(Int(amount))")
              }
            }
          }
        }
        .frame(height: 200)
        .padding()
        .background(AppTheme.card)
        .cornerRadius(AppTheme.cornerRadius)
        .shadow(radius: 2)
        .padding(.horizontal)
      }
    }
  }
}

// MARK: - Weekly Spending Chart
struct WeeklySpendingChartSection: View {
  let weekData: WeeklySpendingData?
  let hasNoData: Bool
  @Binding var selectedWeekIndex: Int
  let allWeeklySpending: [WeeklySpendingData]

  var body: some View {
    VStack(alignment: .leading) {
      HStack {
        Text("Weekly Spending")
          .font(AppFont.title3())
          .foregroundStyle(AppTheme.text)

        Spacer()

        // Week selector popup
        Menu {
          if allWeeklySpending.isEmpty {
            Text("No options available")
          } else {
            ForEach(allWeeklySpending, id: \.weekIndex) { week in
              Button(action: {
                selectedWeekIndex = week.weekIndex
              }) {
                HStack {
                  Text(week.label)
                  if selectedWeekIndex == week.weekIndex {
                    Image(systemName: "checkmark")
                  }
                }
              }
            }
          }
        } label: {
          HStack(spacing: 4) {
            Text(weekData?.label ?? "This Week")
              .font(.subheadline)
              .fontWeight(.medium)
            Image(systemName: "chevron.down")
              .font(.caption)
          }
          .foregroundStyle(AppTheme.primary)
          .padding(.horizontal, 12)
          .padding(.vertical, 6)
          .background(AppTheme.primary.opacity(0.1))
          .cornerRadius(8)
          .contentShape(Rectangle())
        }
      }
      .padding(.horizontal)

      if hasNoData {
        NoDataView()
          .padding(.horizontal)
      } else if let days = weekData?.days {
        Chart(days) { item in
          BarMark(
            x: .value("Day", item.day),
            y: .value("Amount", item.amount)
          )
          .foregroundStyle(AppTheme.warning)
        }
        .chartYAxis {
          AxisMarks(position: .leading) { value in
            AxisGridLine()
            AxisValueLabel {
              if let amount = value.as(Double.self) {
                Text("$\(Int(amount))")
              }
            }
          }
        }
        .frame(height: 200)
        .padding()
        .background(AppTheme.card)
        .cornerRadius(AppTheme.cornerRadius)
        .shadow(radius: 2)
        .padding(.horizontal)
      }
    }
  }
}

// MARK: - No Data View
struct NoDataView: View {
  var body: some View {
    VStack(spacing: 8) {
      Image(systemName: "chart.bar.xaxis")
        .font(.largeTitle)
        .foregroundStyle(AppTheme.secondaryText)
      Text("No Data")
        .font(.headline)
        .foregroundStyle(AppTheme.secondaryText)
    }
    .frame(height: 200)
    .frame(maxWidth: .infinity)
    .background(AppTheme.card)
    .cornerRadius(AppTheme.cornerRadius)
    .shadow(radius: 2)
  }
}

// MARK: - Recommendations Section
struct RecommendationsSection: View {
  let recommendations: [AIRecommendation]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Image(systemName: "lightbulb.fill")
          .foregroundStyle(AppTheme.warning)
        Text("Recommendations")
          .font(AppFont.title3())
          .foregroundStyle(AppTheme.text)
      }
      .padding(.horizontal)

      VStack(spacing: 0) {
        ForEach(recommendations) { recommendation in
          RecommendationRow(recommendation: recommendation)
          if recommendation.id != recommendations.last?.id {
            Divider()
              .padding(.leading, 52)
          }
        }
      }
      .background(AppTheme.card)
      .cornerRadius(AppTheme.cornerRadius)
      .padding(.horizontal)
    }
  }
}

struct RecommendationRow: View {
  let recommendation: AIRecommendation

  private var iconName: String {
    switch recommendation.icon {
    case "trending":
      return "chart.line.uptrend.xyaxis"
    case "target":
      return "target"
    case "alert":
      return "exclamationmark.triangle.fill"
    default:
      return "lightbulb.fill"
    }
  }

  private var priorityColor: Color {
    switch recommendation.priority {
    case "high":
      return AppTheme.destructive
    case "medium":
      return AppTheme.warning
    default:
      return .secondary
    }
  }

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      ZStack {
        Circle()
          .fill(AppTheme.primary.opacity(0.15))
          .frame(width: 40, height: 40)
        Image(systemName: iconName)
          .font(.system(size: 16))
          .foregroundStyle(AppTheme.primary)
      }

      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text(recommendation.title)
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(.primary)
          Spacer()
          Text(recommendation.priority.capitalized)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(priorityColor)
            .cornerRadius(8)
        }

        Text(recommendation.description)
          .font(.caption)
          .foregroundStyle(.secondary)
          .lineLimit(3)

        if recommendation.actionable {
          Text("Actionable")
            .font(.caption2)
            .foregroundStyle(AppTheme.primary)
            .padding(.top, 2)
        }
      }
    }
    .padding()
  }
}

// MARK: - Net Worth History Section
struct NetWorthHistorySection: View {
  let history: [AnalyticsNetWorth]

  var body: some View {
    VStack(alignment: .leading) {
      Text("Net Worth History")
        .font(AppFont.title3())
        .foregroundStyle(AppTheme.text)
        .padding(.horizontal)

      Chart(history, id: \.date) { item in
        LineMark(
          x: .value("Date", item.date),
          y: .value("Net Worth", item.netWorth)
        )
        .foregroundStyle(AppTheme.primary)
        .interpolationMethod(.catmullRom)

        AreaMark(
          x: .value("Date", item.date),
          y: .value("Net Worth", item.netWorth)
        )
        .foregroundStyle(
          LinearGradient(
            colors: [AppTheme.primary.opacity(0.3), AppTheme.primary.opacity(0.0)],
            startPoint: .top,
            endPoint: .bottom
          )
        )
      }
      .frame(height: 200)
      .padding()
      .background(AppTheme.card)
      .cornerRadius(AppTheme.cornerRadius)
      .shadow(radius: 2)
      .padding(.horizontal)
    }
  }
}

#Preview {
  AnalyticsView()
}