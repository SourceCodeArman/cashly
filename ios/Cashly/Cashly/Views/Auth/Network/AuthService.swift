import Foundation

// MARK: - Request/Response Models

struct LoginRequest: Codable, Sendable {
  let login: String
  let password: String
}

// Wrapped response from Django API
struct WrappedLoginResponse: Codable, Sendable {
  let status: String
  let data: LoginResponseData
  let message: String
}

struct LoginResponseData: Codable, Sendable {
  let access: String?
  let refresh: String?
  let user: User?
  let requiresMfa: Bool?
  let tempToken: String?
  let userId: Int?
}

struct LoginResponse: Codable, Sendable {
  let access: String?
  let refresh: String?
  let user: User?
  let requiresMfa: Bool?
  let tempToken: String?
}

struct RegisterRequest: Codable, Sendable {
  let email: String?
  let phoneNumber: String?
  let password: String
  let passwordConfirm: String
  let firstName: String
  let lastName: String


}

struct WrappedRegisterResponse: Codable, Sendable {
  let status: String
  let data: RegisterResponseData
  let message: String
}

struct RegisterResponseData: Codable, Sendable {
  let id: Int
  let email: String?
}

struct TokenRefreshRequest: Codable, Sendable {
  let refresh: String
}

struct TokenRefreshResponse: Codable, Sendable {
  let access: String
}

struct PasswordResetRequest: Codable, Sendable {
  let email: String
}

struct PasswordResetConfirmRequest: Codable, Sendable {
  let token: String
  let password: String
}

struct MFAVerifyRequest: Codable, Sendable {
  let token: String
  let code: String
}

struct MFASetupResponse: Codable, Sendable {
  let status: String
  let data: MFASetupData
}

struct MFASetupData: Codable, Sendable {
  let secret: String
  let otpauthUrl: String
  
}

struct MFASetupVerifyRequest: Codable, Sendable {
  let secret: String
  let code: String
}

struct GenericSuccessResponse: Codable, Sendable {
  let status: String
  let message: String?
}

// MARK: - Auth Service

actor AuthService {
  static let shared = AuthService()

  private let client = APIClient.shared

  private init() {}

  // MARK: - Authentication

  // MARK: - Authentication

  func login(login: String, password: String) async throws -> LoginResponse {
    let request = LoginRequest(login: login, password: password)
    let wrappedResponse: WrappedLoginResponse = try await client.post(
      endpoint: "/auth/login/",
      body: request,
      requiresAuth: false
    )

    // Extract data from wrapped response
    let data = wrappedResponse.data

    // If success (tokens present), store them
    if let access = data.access, let refresh = data.refresh {
        await MainActor.run {
            KeychainManager.shared.accessToken = access
            KeychainManager.shared.refreshToken = refresh
        }
    }

    // Return unwrapped response
    return LoginResponse(
      access: data.access,
      refresh: data.refresh,
      user: data.user,
      requiresMfa: wrappedResponse.status == "mfa_required",
      tempToken: data.tempToken
    )
  }
  
  func googleLogin(token: String) async throws -> LoginResponse {
      struct GoogleLoginRequest: Codable {
          let access_token: String
      }
      
      let request = GoogleLoginRequest(access_token: token)
      let wrappedResponse: WrappedLoginResponse = try await client.post(
          endpoint: "/auth/google/",
          body: request,
          requiresAuth: false
      )
      
      let data = wrappedResponse.data
      
      if let access = data.access, let refresh = data.refresh {
          await MainActor.run {
              KeychainManager.shared.accessToken = access
              KeychainManager.shared.refreshToken = refresh
          }
      }
      
      return LoginResponse(
          access: data.access,
          refresh: data.refresh,
          user: data.user,
          requiresMfa: wrappedResponse.status == "mfa_required",
          tempToken: data.tempToken
      )
  }

  func register(
    email: String?, phoneNumber: String?, password: String, passwordConfirm: String, firstName: String, lastName: String
  ) async throws {
    let request = RegisterRequest(
      email: email,
      phoneNumber: phoneNumber,
      password: password,
      passwordConfirm: passwordConfirm,
      firstName: firstName,
      lastName: lastName
    )
    let _: WrappedRegisterResponse = try await client.post(
      endpoint: "/auth/register/",
      body: request,
      requiresAuth: false
    )
  }

  func logout() async {
    // Clear tokens from keychain
    await MainActor.run {
        KeychainManager.shared.clearTokens()
    }
  }

  func refreshToken() async throws -> String {
    // Access Keychain on MainActor
    let refreshToken = await MainActor.run {
        KeychainManager.shared.refreshToken
    }
    
    guard let token = refreshToken else {
      throw APIError.unauthorized
    }

    let request = TokenRefreshRequest(refresh: token)
    let response: TokenRefreshResponse = try await client.post(
      endpoint: "/auth/token/refresh/",
      body: request,
      requiresAuth: false
    )

    // Update access token
    await MainActor.run {
        KeychainManager.shared.accessToken = response.access
    }

    return response.access
  }

  // MARK: - Profile

  func getProfile() async throws -> User {
    let response: UserResponse = try await client.get(endpoint: "/auth/profile/")
    print("user:", response)
    return response.data
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

  func verifyMFA(token: String, code: String) async throws -> LoginResponse {
    let request = MFAVerifyRequest(token: token, code: code)
    let wrappedResponse: WrappedLoginResponse = try await client.post(
      endpoint: "/auth/mfa/verify-login/",
      body: request,
      requiresAuth: false
    )
    
    let responseData = wrappedResponse.data

    // Store tokens
    await MainActor.run {
        if let access = responseData.access, let refresh = responseData.refresh {
            KeychainManager.shared.accessToken = access
            KeychainManager.shared.refreshToken = refresh
        }
    }

    return LoginResponse(
        access: responseData.access,
        refresh: responseData.refresh,
        user: responseData.user,
        requiresMfa: wrappedResponse.status == "mfa_required",
        tempToken: responseData.tempToken
    )
  }
  
  func setupMFA() async throws -> MFASetupData {
      let response: MFASetupResponse = try await client.post(endpoint: "/auth/mfa/setup/", body: nil)
      return response.data
  }
  
  func verifyMFASetup(secret: String, code: String) async throws {
      let request = MFASetupVerifyRequest(secret: secret, code: code)
      let _: GenericSuccessResponse = try await client.post(endpoint: "/auth/mfa/verify-setup/", body: request)
  }
  
  func disableMFA() async throws {
      let _: GenericSuccessResponse = try await client.post(endpoint: "/auth/mfa/disable/", body: nil)
  }
}
