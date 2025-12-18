import Foundation

struct UserResponse: Decodable {
    let status: String
    let data: User
}

struct User: Codable, Identifiable {
    let id: Int
    let email: String?
    let phoneNumber: String?
    let firstName: String?
    let lastName: String?
    let isSuperuser: Bool?
    let mfaEnabled: Bool?
    let createdAt: Date?
    let updatedAt: Date?
    
    var fullName: String {
        // Always prioritize first and last name if available
        if let first = firstName, !first.isEmpty, let last = lastName, !last.isEmpty {
            return "\(first) \(last)"
        } else if let first = firstName, !first.isEmpty {
            return first
        } else if let last = lastName, !last.isEmpty {
            return last
        } else if let email = email, !email.isEmpty {
            return email
        } else if let phone = phoneNumber, !phone.isEmpty {
            return phone
        } else {
            return "User \(id)"
        }
    }
}
