import Foundation

enum AppConfig {
    // MARK: - API Configuration
    
    /// Base URL for the Django backend API
    static var apiBaseURL: String {
        #if DEBUG
        // For iOS Simulator, use localhost which maps to the host machine
        return "http://127.0.0.1:8000"
        #else
        // Production URL
        return "https://api.cashly.com"
        #endif
    }
    
    /// API version path
    static let apiVersion = "/api/v1"
    
    /// Full API base URL with version
    static var fullAPIURL: String {
        return apiBaseURL + apiVersion
    }
    
    // MARK: - Networking Configuration
    
    /// Request timeout interval in seconds
    static let requestTimeout: TimeInterval = 30
    
    /// Maximum number of retry attempts for failed requests
    static let maxRetryAttempts = 3
    
    // MARK: - Storage Keys
    
    enum KeychainKeys {
        static let accessToken = "com.cashly.accessToken"
        static let refreshToken = "com.cashly.refreshToken"
        static let userId = "com.cashly.userId"
    }
    
    enum UserDefaultsKeys {
        static let isFirstLaunch = "com.cashly.isFirstLaunch"
        static let prefersDarkMode = "com.cashly.prefersDarkMode"
        static let lastSyncDate = "com.cashly.lastSyncDate"
    }
}
