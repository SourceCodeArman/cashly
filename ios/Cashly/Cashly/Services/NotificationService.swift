import Foundation

actor NotificationService {
    static let shared = NotificationService()
    
    private init() {}
    
    func getNotifications() async throws -> [NotificationModel] {
        let endpoint = "\(AppConfig.fullAPIURL)/notifications/"
        guard let url = URL(string: endpoint) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        if let token = KeychainManager.shared.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        // Response format might be { "results": [...] } or just [...]
        // Based on React code `notificationsData?.results || []`, expecting { results: [] }
         struct NotificationResponse: Decodable {
            let results: [NotificationModel]
         }
        
        return try JSONDecoder().decode(NotificationResponse.self, from: data).results
    }
    
    func markAsRead(id: String) async throws {
        let endpoint = "\(AppConfig.fullAPIURL)/notifications/\(id)/read/"
        guard let url = URL(string: endpoint) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let token = KeychainManager.shared.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
    }
    
    func markAllAsRead() async throws {
        let endpoint = "\(AppConfig.fullAPIURL)/notifications/mark-all-read/"
        guard let url = URL(string: endpoint) else { throw URLError(.badURL) }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let token = KeychainManager.shared.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
    }
}
