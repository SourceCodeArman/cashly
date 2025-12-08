import Foundation
import Combine

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var dashboardData: DashboardData?
    @Published var netWorth: NetWorthData?
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let dashboardService = DashboardService.shared
    
    func loadDashboard() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Fetch dashboard data and net worth concurrently
            async let dashboardTask = dashboardService.getDashboardData()
            async let netWorthTask = dashboardService.getNetWorth()
            
            let (dashboard, netWorthData) = try await (dashboardTask, netWorthTask)
            
            self.dashboardData = dashboard
            self.netWorth = netWorthData
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
