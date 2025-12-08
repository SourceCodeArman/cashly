import Foundation
import Combine

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
                do {
                    let user = try await authService.getProfile()
                    self.currentUser = user
                    self.isAuthenticated = true
                } catch {
                    // Token is invalid, clear it
                    KeychainManager.shared.clearTokens()
                    self.isAuthenticated = false
                }
            }
        } else {
            isAuthenticated = false
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
    
    func register(email: String, password: String, firstName: String, lastName: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await authService.register(
                email: email,
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
