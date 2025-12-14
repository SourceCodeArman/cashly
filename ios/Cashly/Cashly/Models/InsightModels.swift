import Foundation

struct Insight: Codable, Identifiable, Sendable {
    let id: String
    let title: String
    let message: String
    let type: String 
    let priority: String 
    let isRead: Bool
    let createdAt: String
    
    enum CodingKeys: String, CodingKey {
        case id = "insight_id"
        case title
        case message = "description"
        case type = "insight_type"
        case priority
        case isRead = "is_read"
        case createdAt = "created_at"
    }
}

struct InsightSummary: Codable, Sendable {
    let total: Int
    let unread: Int
    let byPriority: PriorityCount
    
    enum CodingKeys: String, CodingKey {
        case total
        case unread
        case byPriority = "by_priority"
    }
}

struct PriorityCount: Codable, Sendable {
    let high: Int
    let medium: Int
    let low: Int
}

struct InsightResponse: Codable, Sendable {
    let results: [Insight]
}
