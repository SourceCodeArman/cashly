import SwiftUI
import UIKit

@main
struct CashlyApp: App {
  @StateObject private var authManager = AuthManager.shared

  @AppStorage("isDarkMode") private var isDarkMode = true

  var body: some Scene {
    WindowGroup {
      if authManager.isAuthenticated {
        MainContainerView()
          .environmentObject(authManager)
          .preferredColorScheme(isDarkMode ? .dark : .light)
      } else {
        LoginView()
          .environmentObject(authManager)
          .preferredColorScheme(isDarkMode ? .dark : .light)
      }
    }
  }
}
