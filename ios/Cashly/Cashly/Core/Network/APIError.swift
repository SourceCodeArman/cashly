import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case noData
    case decodingError(Error)
    case encodingError(Error)
    case networkError(Error)
    case serverError(statusCode: Int, message: String?)
    case unauthorized
    case forbidden
    case notFound
    case validationError(errors: [String: [String]])
    case unknown(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received from server"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .encodingError(let error):
            return "Failed to encode request: \(error.localizedDescription)"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .serverError(let statusCode, let message):
            return message ?? "Server error (Status: \(statusCode))"
        case .unauthorized:
            return "Unauthorized. Please login again."
        case .forbidden:
            return "Access forbidden"
        case .notFound:
            return "Resource not found"
        case .validationError(let errors):
            let messages = errors.values.flatMap { $0 }
            return messages.joined(separator: "\n")
        case .unknown(let error):
            return "An unexpected error occurred: \(error.localizedDescription)"
        }
    }
}

struct ErrorResponse: Codable {
    let detail: String?
    let errors: [String: [String]]?
    let message: String?
}
