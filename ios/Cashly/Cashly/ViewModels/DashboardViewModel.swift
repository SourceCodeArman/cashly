import Combine
import Foundation

@MainActor
class DashboardViewModel: ObservableObject {
  @Published var dashboardData: DashboardData?
  @Published var isLoading: Bool = false
  @Published var errorMessage: String?

  private let dashboardService = DashboardService.shared

  /// Net worth data is now included in the dashboard response
  var netWorth: NetWorthData? {
    dashboardData?.netWorth
  }

  func loadDashboard(forceRefresh: Bool = false) async {
    // Skip if data is already loaded and not forcing refresh
    if !forceRefresh, dashboardData != nil {
      return
    }

    isLoading = true
    errorMessage = nil

    do {
      // Single API call now includes net worth data
      self.dashboardData = try await dashboardService.getDashboardData()
      self.errorMessage = nil
    } catch {
      if let apiError = error as? APIError {
        self.errorMessage = apiError.errorDescription
      } else {
        self.errorMessage = error.localizedDescription
      }
    }

    isLoading = false
  }
}
