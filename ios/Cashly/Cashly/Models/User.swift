import Foundation

struct User: Codable, Identifiable {
    let id: Int
    let email: String
    let username: String?
    let firstName: String?
    let lastName: String?
    let isSuperuser: Bool?
    let mfaEnabled: Bool?
    let createdAt: Date?
    let updatedAt: Date?
    
    var fullName: String {
        if let first = firstName, let last = lastName {
            return "\(first) \(last)"
        } else if let username = username {
            return username
        } else {
            return email
        }
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case username
        case firstName = "first_name"
        case lastName = "last_name"
        case isSuperuser = "is_superuser"
        case mfaEnabled = "mfa_enabled"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
