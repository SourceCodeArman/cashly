import Combine
import Foundation

@MainActor
class AuthManager: ObservableObject {
  static let shared = AuthManager()

  @Published var isAuthenticated: Bool = false
  @Published var currentUser: User?
  @Published var isLoading: Bool = false
  @Published var errorMessage: String?

  private let authService = AuthService.shared

  private init() {
    // Check if user has valid token on init
    checkAuthStatus()
  }

  func checkAuthStatus() {
    // Check if we have a valid access token
    if KeychainManager.shared.accessToken != nil {
      // Verify token by fetching profile
      Task {
        await refreshProfile(forceRefresh: true)
      }
    } else {
      isAuthenticated = false
    }
  }

  func refreshProfile(forceRefresh: Bool = false) async {
    if !forceRefresh && currentUser != nil {
      return
    }

    do {
      let user = try await authService.getProfile()
      self.currentUser = user
      self.isAuthenticated = true
    } catch {
      // If refresh fails during active session, deciding whether to logout is tricky.
      // safely ignoring for refresh, but checkAuth handles errors by clearing tokens.
      // For manual refresh we might just want to show error or do nothing if token is still valid but network failed.
      // But if token is invalid (401), authService usually throws.
      print("Error refreshing profile: \(error)")
    }
  }

  func login(email: String, password: String) async {
    isLoading = true
    errorMessage = nil

    do {
      let response = try await authService.login(email: email, password: password)

      // Check if MFA is required
      if response.requiresMfa == true {
        // TODO: Navigate to MFA screen
        errorMessage = "MFA verification required"
        isLoading = false
        return
      }

      // Login successful
      self.currentUser = response.user
      self.isAuthenticated = true
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

  func register(
    email: String, username: String, password: String, firstName: String, lastName: String
  ) async {
    isLoading = true
    errorMessage = nil

    do {
      let response = try await authService.register(
        email: email,
        username: username,
        password: password,
        firstName: firstName,
        lastName: lastName
      )

      self.currentUser = response.user
      self.isAuthenticated = true
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

  func logout() {
    Task {
      await authService.logout()
      await MainActor.run {
        self.isAuthenticated = false
        self.currentUser = nil
      }
    }
  }
}
