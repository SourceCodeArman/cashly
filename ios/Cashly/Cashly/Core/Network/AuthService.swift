import Foundation

// MARK: - Request/Response Models

struct LoginRequest: Codable {
    let email: String
    let password: String
}

// Wrapped response from Django API
struct WrappedLoginResponse: Codable {
    let status: String
    let data: LoginResponseData
    let message: String
}

struct LoginResponseData: Codable {
    let access: String
    let refresh: String
    let user: User
    let requiresMfa: Bool?
    
    enum CodingKeys: String, CodingKey {
        case access
        case refresh
        case user
        case requiresMfa = "requires_mfa"
    }
}

struct LoginResponse: Codable {
    let access: String
    let refresh: String
    let user: User
    let requiresMfa: Bool?
}

struct RegisterRequest: Codable {
    let email: String
    let password: String
    let firstName: String
    let lastName: String
    
    enum CodingKeys: String, CodingKey {
        case email
        case password
        case firstName = "first_name"
        case lastName = "last_name"
    }
}

struct RegisterResponse: Codable {
    let user: User
    let access: String
    let refresh: String
}

struct TokenRefreshRequest: Codable {
    let refresh: String
}

struct TokenRefreshResponse: Codable {
    let access: String
}

struct PasswordResetRequest: Codable {
    let email: String
}

struct PasswordResetConfirmRequest: Codable {
    let token: String
    let password: String
}

struct MFAVerifyRequest: Codable {
    let token: String
}

// MARK: - Auth Service

actor AuthService {
    static let shared = AuthService()
    
    private let client = APIClient.shared
    
    private init() {}
    
    // MARK: - Authentication
    
    func login(email: String, password: String) async throws -> LoginResponse {
        let request = LoginRequest(email: email, password: password)
        let wrappedResponse: WrappedLoginResponse = try await client.post(
            endpoint: "/auth/login/",
            body: request,
            requiresAuth: false
        )
        
        // Extract data from wrapped response
        let data = wrappedResponse.data
        
        // Store tokens
        KeychainManager.shared.accessToken = data.access
        KeychainManager.shared.refreshToken = data.refresh
        
        // Return unwrapped response
        return LoginResponse(
            access: data.access,
            refresh: data.refresh,
            user: data.user,
            requiresMfa: data.requiresMfa
        )
    }
    
    func register(email: String, password: String, firstName: String, lastName: String) async throws -> RegisterResponse {
        let request = RegisterRequest(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName
        )
        let response: RegisterResponse = try await client.post(
            endpoint: "/auth/register/",
            body: request,
            requiresAuth: false
        )
        
        // Store tokens
        KeychainManager.shared.accessToken = response.access
        KeychainManager.shared.refreshToken = response.refresh
        
        return response
    }
    
    func logout() {
        // Clear tokens from keychain
        KeychainManager.shared.clearTokens()
    }
    
    func refreshToken() async throws -> String {
        guard let refreshToken = KeychainManager.shared.refreshToken else {
            throw APIError.unauthorized
        }
        
        let request = TokenRefreshRequest(refresh: refreshToken)
        let response: TokenRefreshResponse = try await client.post(
            endpoint: "/auth/token/refresh/",
            body: request,
            requiresAuth: false
        )
        
        // Update access token
        KeychainManager.shared.accessToken = response.access
        
        return response.access
    }
    
    // MARK: - Profile
    
    func getProfile() async throws -> User {
        try await client.get(endpoint: "/auth/profile/")
    }
    
    func updateProfile(firstName: String?, lastName: String?) async throws -> User {
        struct UpdateRequest: Codable {
            let firstName: String?
            let lastName: String?
        }
        
        let request = UpdateRequest(firstName: firstName, lastName: lastName)
        return try await client.patch(endpoint: "/auth/profile/", body: request)
    }
    
    // MARK: - Password Management
    
    func resetPassword(email: String) async throws {
        let request = PasswordResetRequest(email: email)
        try await client.request(
            endpoint: "/auth/password-reset/",
            method: .post,
            body: request,
            requiresAuth: false
        )
    }
    
    func confirmPasswordReset(token: String, password: String) async throws {
        let request = PasswordResetConfirmRequest(token: token, password: password)
        try await client.request(
            endpoint: "/auth/password-reset/confirm/",
            method: .post,
            body: request,
            requiresAuth: false
        )
    }
    
    func changePassword(oldPassword: String, newPassword: String) async throws {
        struct ChangePasswordRequest: Codable {
            let oldPassword: String
            let newPassword: String
        }
        
        let request = ChangePasswordRequest(oldPassword: oldPassword, newPassword: newPassword)
        try await client.request(
            endpoint: "/auth/password-change/",
            method: .post,
            body: request
        )
    }
    
    // MARK: - MFA
    
    func verifyMFA(token: String) async throws -> LoginResponse {
        let request = MFAVerifyRequest(token: token)
        let response: LoginResponse = try await client.post(
            endpoint: "/auth/mfa/verify-login/",
            body: request,
            requiresAuth: false
        )
        
        // Store tokens
        KeychainManager.shared.accessToken = response.access
        KeychainManager.shared.refreshToken = response.refresh
        
        return response
    }
}
