import Foundation
import Security

class KeychainManager {
    static let shared = KeychainManager()
    
    private init() {}
    
    // MARK: - Save
    
    func save(_ data: Data, for key: String) -> Bool {
        // Delete any existing item
        delete(key)
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func save(_ string: String, for key: String) -> Bool {
        guard let data = string.data(using: .utf8) else { return false }
        return save(data, for: key)
    }
    
    // MARK: - Retrieve
    
    func retrieve(_ key: String) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }
    
    func retrieveString(_ key: String) -> String? {
        guard let data = retrieve(key) else { return nil }
        return String(data: data, encoding: .utf8)
    }
    
    // MARK: - Delete
    
    @discardableResult
    func delete(_ key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
    
    // MARK: - Clear All
    
    func clearAll() {
        let secClasses = [
            kSecClassGenericPassword,
            kSecClassInternetPassword,
            kSecClassCertificate,
            kSecClassKey,
            kSecClassIdentity
        ]
        
        for secClass in secClasses {
            let query: [String: Any] = [kSecClass as String: secClass]
            SecItemDelete(query as CFDictionary)
        }
    }
}

// MARK: - Token Storage Extensions

extension KeychainManager {
    var accessToken: String? {
        get { retrieveString(AppConfig.KeychainKeys.accessToken) }
        set {
            if let token = newValue {
                save(token, for: AppConfig.KeychainKeys.accessToken)
            } else {
                delete(AppConfig.KeychainKeys.accessToken)
            }
        }
    }
    
    var refreshToken: String? {
        get { retrieveString(AppConfig.KeychainKeys.refreshToken) }
        set {
            if let token = newValue {
                save(token, for: AppConfig.KeychainKeys.refreshToken)
            } else {
                delete(AppConfig.KeychainKeys.refreshToken)
            }
        }
    }
    
    func clearTokens() {
        accessToken = nil
        refreshToken = nil
    }
}
