import Foundation

actor APIClient {
    static let shared = APIClient()
    
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    private init() {
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = AppConfig.requestTimeout
        configuration.timeoutIntervalForResource = AppConfig.requestTimeout
        self.session = URLSession(configuration: configuration)
        
        // Configure JSON decoder for dates
        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        // Configure JSON encoder for dates
        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }
    
    // MARK: - HTTP Methods
    
    enum HTTPMethod: String {
        case get = "GET"
        case post = "POST"
        case put = "PUT"
        case patch = "PATCH"
        case delete = "DELETE"
    }
    
    // MARK: - Request Building
    
    private func buildRequest(
        endpoint: String,
        method: HTTPMethod,
        body: Data? = nil,
        requiresAuth: Bool = true
    ) throws -> URLRequest {
        guard let url = URL(string: AppConfig.fullAPIURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
        // Add authorization header if required
        if requiresAuth {
            if let accessToken = KeychainManager.shared.accessToken {
                request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
            }
        }
        
        // Add body if present
        if let body = body {
            request.httpBody = body
        }
        
        return request
    }
    
    // MARK: - Core Request Method
    
    func request<T: Decodable>(
        endpoint: String,
        method: HTTPMethod = .get,
        body: Encodable? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        // Encode body if present
        let bodyData: Data?
        if let body = body {
            do {
                bodyData = try encoder.encode(body)
            } catch {
                throw APIError.encodingError(error)
            }
        } else {
            bodyData = nil
        }
        
        // Build request
        let request = try buildRequest(
            endpoint: endpoint,
            method: method,
            body: bodyData,
            requiresAuth: requiresAuth
        )
        
        // Execute request
        do {
            let (data, response) = try await session.data(for: request)
            
            // Check HTTP response
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown(NSError(domain: "APIClient", code: -1))
            }
            
            // Handle status codes
            switch httpResponse.statusCode {
            case 200...299:
                // Success - decode response
                do {
                    return try decoder.decode(T.self, from: data)
                } catch {
                    print("Decoding error: \(error)")
                    print("Response data: \(String(data: data, encoding: .utf8) ?? "nil")")
                    throw APIError.decodingError(error)
                }
                
            case 401:
                // Unauthorized - try to refresh token
                if requiresAuth {
                    // TODO: Implement token refresh logic
                    KeychainManager.shared.clearTokens()
                }
                throw APIError.unauthorized
                
            case 403:
                throw APIError.forbidden
                
            case 404:
                throw APIError.notFound
                
            case 400...499:
                // Client error - try to parse error message
                if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                    if let errors = errorResponse.errors {
                        throw APIError.validationError(errors: errors)
                    } else if let message = errorResponse.detail ?? errorResponse.message {
                        throw APIError.serverError(statusCode: httpResponse.statusCode, message: message)
                    }
                }
                throw APIError.serverError(statusCode: httpResponse.statusCode, message: nil)
                
            case 500...599:
                // Server error
                throw APIError.serverError(statusCode: httpResponse.statusCode, message: "Server error")
                
            default:
                throw APIError.unknown(NSError(domain: "APIClient", code: httpResponse.statusCode))
            }
            
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
    
    // MARK: - Convenience Methods
    
    func get<T: Decodable>(endpoint: String, requiresAuth: Bool = true) async throws -> T {
        try await request(endpoint: endpoint, method: .get, requiresAuth: requiresAuth)
    }
    
    func post<T: Decodable>(endpoint: String, body: Encodable?, requiresAuth: Bool = true) async throws -> T {
        try await request(endpoint: endpoint, method: .post, body: body, requiresAuth: requiresAuth)
    }
    
    func put<T: Decodable>(endpoint: String, body: Encodable?, requiresAuth: Bool = true) async throws -> T {
        try await request(endpoint: endpoint, method: .put, body: body, requiresAuth: requiresAuth)
    }
    
    func patch<T: Decodable>(endpoint: String, body: Encodable?, requiresAuth: Bool = true) async throws -> T {
        try await request(endpoint: endpoint, method: .patch, body: body, requiresAuth: requiresAuth)
    }
    
    func delete<T: Decodable>(endpoint: String, requiresAuth: Bool = true) async throws -> T {
        try await request(endpoint: endpoint, method: .delete, requiresAuth: requiresAuth)
    }
    
    // For requests that don't return data
    func request(
        endpoint: String,
        method: HTTPMethod,
        body: Encodable? = nil,
        requiresAuth: Bool = true
    ) async throws {
        struct EmptyResponse: Codable {}
        let _: EmptyResponse = try await request(
            endpoint: endpoint,
            method: method,
            body: body,
            requiresAuth: requiresAuth
        )
    }
}
