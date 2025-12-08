import Foundation

actor DashboardService {
    static let shared = DashboardService()
    
    private let client = APIClient.shared
    
    private init() {}
    
    // MARK: - Dashboard Data
    
    func getDashboardData() async throws -> DashboardData {
        try await client.get(endpoint: "/dashboard/dashboard/", requiresAuth: true)
    }
    
    func getNetWorth() async throws -> NetWorthData {
        try await client.get(endpoint: "/dashboard/net-worth/", requiresAuth: true)
    }
    
    func getSpendingTrends(months: Int = 6) async throws -> [TrendsData] {
        try await client.get(endpoint: "/dashboard/trends/?months=\(months)", requiresAuth: true)
    }
}
