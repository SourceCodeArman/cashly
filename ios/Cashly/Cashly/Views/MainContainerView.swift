import SwiftUI
import UIKit

struct MainContainerView: View {
  @State private var selectedTab = 0
  @State private var showSideMenu = false
  @EnvironmentObject var authManager: AuthManager

  var body: some View {
    ZStack {
      // Main Content Layer
      VStack(spacing: 0) {
        // Top Navigation Bar
        TopNavBar(isSideMenuOpen: $showSideMenu)

        // Content Area - Using switch instead of TabView to avoid navigation issues
        Group {
          switch selectedTab {
          case 0:
            DashboardView(selectedTab: $selectedTab)
          case 1:
            AccountsView()
          case 2:
            TransactionsView()
          case 3:
            BudgetsView()
          case 4:
            AnalyticsView()
          case 5:
            InsightsView()
          case 6:
            BillsView()
          case 7:
            GoalsView()
          case 8:
            DebtsView()
          case 9:
            SubscriptionView()
          case 10:
            NotificationsView()
          case 11:
            SettingsView()
          case 12:
            ProfileView()
          default:
            DashboardView(selectedTab: $selectedTab)
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      }
      .disabled(showSideMenu)

      // Side Menu Layer
      SideMenuView(
        selectedTab: $selectedTab,
        isSideMenuOpen: $showSideMenu
      )
    }
    .navigationBarHidden(true)
  }
}

#Preview {
  MainContainerView()
    .environmentObject(AuthManager.shared)
}
