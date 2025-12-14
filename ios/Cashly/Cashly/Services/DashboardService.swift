import Foundation

actor DashboardService {
  static let shared = DashboardService()

  private let client = APIClient.shared

  private init() {}

  // MARK: - Dashboard Data

  func getDashboardData() async throws -> DashboardData {
    let response: DashboardResponse = try await client.get(
      endpoint: "/dashboard/dashboard/", requiresAuth: true)
    return response.data
  }

  /// Net worth data is now included in the main dashboard response.
  /// This method is kept for backwards compatibility but should not be used for new code.
  @available(*, deprecated, message: "Use getDashboardData() which now includes net worth data")
  func getNetWorth() async throws -> NetWorthData {
    try await client.get(endpoint: "/dashboard/net-worth/", requiresAuth: true)
  }

  func getSpendingTrends(months: Int = 6) async throws -> [TrendsData] {
    try await client.get(endpoint: "/dashboard/trends/?months=\(months)", requiresAuth: true)
  }
}
