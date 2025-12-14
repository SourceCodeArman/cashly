import Combine
import Foundation

@MainActor
class AnalyticsViewModel: ObservableObject {
  // Monthly spending data (12 months from API)
  @Published var allMonthlySpending: [MonthlySpending] = []
  @Published var selectedMonthCount: Int = 3  // Default to 3 months

  // Weekly spending data (4 weeks from API)
  @Published var allWeeklySpending: [WeeklySpendingData] = []
  @Published var selectedWeekIndex: Int = 0  // 0 = current week

  // Other analytics data
  @Published var netWorthHistory: [AnalyticsNetWorth] = []
  @Published var sankeyData: SankeyData?
  @Published var netWorthSummary: NetWorthData?
  @Published var recommendations: [AIRecommendation] = []

  @Published var isLoading = false
  @Published var errorMessage: String?

  // MARK: - Computed Properties

  // Filtered monthly spending based on selection
  var monthlySpending: [MonthlySpending] {
    Array(allMonthlySpending.suffix(selectedMonthCount))
  }

  // Check if all monthly spending is zero
  var monthlySpendingHasNoData: Bool {
    monthlySpending.allSatisfy { $0.amount == 0 }
  }

  // Get selected week's data
  var selectedWeekData: WeeklySpendingData? {
    guard selectedWeekIndex < allWeeklySpending.count else { return nil }
    return allWeeklySpending[selectedWeekIndex]
  }

  // Check if selected week has no spending
  var weeklySpendingHasNoData: Bool {
    selectedWeekData?.hasNoData ?? true
  }

  // Month count options for picker
  let monthCountOptions = [3, 6, 9, 12]

  private let service = AnalyticsService.shared

  // MARK: - Data Loading

  func loadData(forceRefresh: Bool = false) async {
    if !forceRefresh && !allMonthlySpending.isEmpty && netWorthSummary != nil {
      return
    }
    isLoading = true
    errorMessage = nil

    await withTaskGroup(of: Void.self) { group in
      group.addTask { await self.fetchMonthlySpending() }
      group.addTask { await self.fetchWeeklySpending() }
      group.addTask { await self.fetchNetWorth() }
      group.addTask { await self.fetchNetWorthSummary() }
      group.addTask { await self.fetchSankey() }
      group.addTask { await self.fetchRecommendations() }
    }

    isLoading = false
  }

  // MARK: - Fetch Methods

  private func fetchMonthlySpending() async {
    do {
      let data = try await service.getMonthlySpending()
      self.allMonthlySpending = data
    } catch {
      print("Error fetching monthly spending: \(error)")
    }
  }

  private func fetchWeeklySpending() async {
    do {
      let data = try await service.getWeeklySpending()
      self.allWeeklySpending = data
    } catch {
      print("Error fetching weekly spending: \(error)")
    }
  }

  private func fetchNetWorth() async {
    do {
      let data = try await service.getNetWorthHistory()
      self.netWorthHistory = data
    } catch {
      print("Error fetching net worth history: \(error)")
    }
  }

  private func fetchNetWorthSummary() async {
    do {
      let data = try await service.getNetWorth()
      self.netWorthSummary = data
    } catch {
      print("Error fetching net worth summary: \(error)")
    }
  }

  private func fetchSankey() async {
    do {
      let data = try await service.getSankeyData()
      self.sankeyData = data
    } catch {
      print("Error fetching sankey: \(error)")
      self.sankeyData = nil
    }
  }

  private func fetchRecommendations() async {
    do {
      let data = try await service.getRecommendations()
      self.recommendations = data
    } catch {
      print("Error fetching recommendations: \(error)")
    }
  }
}
