import Combine
import Foundation
import Supabase // Added Import

@MainActor
class AuthManager: ObservableObject {
  static let shared = AuthManager()
  
  // MARK: - Published Properties
  @Published var isAuthenticated: Bool = false
  @Published var currentUser: User?
  @Published var isLoading: Bool = false
  @Published var errorMessage: String?
  @Published var requiresMFA: Bool = false
  private var tempToken: String?

  private let authService = AuthService.shared

  private init() {
    // Check if user has valid token on init
    checkAuthStatus()
    
    // Listen for Supabase Auth Changes
    Task {
        for await _ in SupabaseManager.shared.client.auth.authStateChanges {
             if let session = try? await SupabaseManager.shared.getCurrentSession() {
                 await self.handleGoogleLogin(token: session.accessToken)
             }
        }
    }
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
  
  func handleGoogleLogin(token: String) async {
      // Avoid double loading if already authenticated via Supabase? 
      // Actually Supabase listener might fire often.
      // Ideally we check if we are already authenticated in OUR system.
      if isAuthenticated { return }
      
      isLoading = true
      errorMessage = nil
      
      do {
         let response = try await authService.googleLogin(token: token)
         self.currentUser = response.user
         self.isAuthenticated = true
         self.errorMessage = nil
         
         // Sign out of Supabase to clean up
         try? await SupabaseManager.shared.signOut()
         
      } catch {
         self.errorMessage = error.localizedDescription
         try? await SupabaseManager.shared.signOut()
      }
      
      isLoading = false
  }

  func login(login: String, password: String) async {
    isLoading = true
    errorMessage = nil

    do {
      let response = try await authService.login(login: login, password: password)

      // Check if MFA is required
      if response.requiresMfa == true {
        self.tempToken = response.tempToken
        self.requiresMFA = true
        self.isLoading = false
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
  
  func verifyLoginMFA(code: String) async {
      guard let token = tempToken else {
          errorMessage = "Session expired. Please login again."
          return
      }
      
      isLoading = true
      errorMessage = nil
      
      do {
          let response = try await authService.verifyMFA(token: token, code: code)
          
          if let user = response.user {
              self.currentUser = user
              self.isAuthenticated = true
          } else {
              // Fallback: fetch profile if user object is missing in response
              await refreshProfile(forceRefresh: true)
          }
          
          self.requiresMFA = false
          self.tempToken = nil
      } catch {
          self.errorMessage = error.localizedDescription
      }
      
      isLoading = false
  }

  func register(
    email: String?, phoneNumber: String?, password: String, firstName: String, lastName: String
  ) async {
    isLoading = true
    errorMessage = nil

    do {
      try await authService.register(
        email: email,
        phoneNumber: phoneNumber,
        password: password,
        passwordConfirm: password, // We assume validation passed
        firstName: firstName,
        lastName: lastName
      )

      // We do not set currentUser here because registration does not return tokens/user session.
      // The RegisterView will trigger login automatically on success.
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
  
  func setupMFA() async throws -> MFASetupData {
      return try await authService.setupMFA()
  }
  
  func enableMFA(secret: String, code: String) async throws {
      try await authService.verifyMFASetup(secret: secret, code: code)
      // Refresh profile to update mfa_enabled status
      await refreshProfile(forceRefresh: true)
  }
  
  func disableMFA() async throws {
      try await authService.disableMFA()
      // Refresh profile to update mfa_enabled status
      await refreshProfile(forceRefresh: true)
  }
  
  func changePassword(old: String, new: String) async throws {
      try await authService.changePassword(oldPassword: old, newPassword: new)
  }

  func logout() {
    Task {
      await authService.logout()
      await MainActor.run {
        self.isAuthenticated = false
        self.requiresMFA = false
        self.currentUser = nil
        self.tempToken = nil
      }
    }
  }
}
