import Foundation

struct UserResponse: Decodable {
    let status: String
    let data: User
}

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
    
    enum CodingKeys: String, CodingKey {
        case id
        case email
        case username
        case firstName
        case lastName
        case isSuperuser
        case mfaEnabled
        case createdAt
        case updatedAt
    }
    
    var fullName: String {
        // Always prioritize first and last name if available
        if let first = firstName, !first.isEmpty, let last = lastName, !last.isEmpty {
            return "\(first) \(last)"
        } else if let first = firstName, !first.isEmpty {
            return first
        } else if let last = lastName, !last.isEmpty {
            return last
        } else if let username = username, !username.isEmpty {
            return username
        } else {
            return email
        }
    }
}
