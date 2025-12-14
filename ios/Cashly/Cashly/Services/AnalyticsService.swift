import Foundation

@MainActor
class AnalyticsService {
  static let shared = AnalyticsService()

  private init() {}

  func getTrends(months: Int = 4) async throws -> [AnalyticsTrends] {
    let endpoint = "\(AppConfig.fullAPIURL)/analytics/trends/?months=\(months)"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    return try JSONDecoder().decode([AnalyticsTrends].self, from: data)
  }

  func getNetWorthHistory() async throws -> [AnalyticsNetWorth] {
    // Note: This endpoint may not exist - return empty array if 404
    let endpoint = "\(AppConfig.fullAPIURL)/dashboard/net-worth-history/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    return try JSONDecoder().decode([AnalyticsNetWorth].self, from: data)
  }

  func getSpendingPatterns(month: Int? = nil, year: Int? = nil) async throws -> [SpendingPattern] {
    var endpoint = "\(AppConfig.fullAPIURL)/dashboard/patterns/"

    // Add query params if provided
    var queryItems: [String] = []
    if let month = month {
      queryItems.append("month=\(month)")
    }
    if let year = year {
      queryItems.append("year=\(year)")
    }
    if !queryItems.isEmpty {
      endpoint += "?" + queryItems.joined(separator: "&")
    }

    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    return try JSONDecoder().decode([SpendingPattern].self, from: data)
  }

  func getSankeyData() async throws -> SankeyData {
    let endpoint = "\(AppConfig.fullAPIURL)/dashboard/sankey/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    return try JSONDecoder().decode(SankeyData.self, from: data)
  }

  func getNetWorth() async throws -> NetWorthData {
    let endpoint = "\(AppConfig.fullAPIURL)/dashboard/net-worth/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    return try decoder.decode(NetWorthData.self, from: data)
  }

  func getRecommendations() async throws -> [AIRecommendation] {
    let endpoint = "\(AppConfig.fullAPIURL)/dashboard/recommendations/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    return try decoder.decode([AIRecommendation].self, from: data)
  }

  func getMonthlySpending() async throws -> [MonthlySpending] {
    let endpoint = "\(AppConfig.fullAPIURL)/analytics/monthly-spending/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    return try JSONDecoder().decode([MonthlySpending].self, from: data)
  }

  func getWeeklySpending() async throws -> [WeeklySpendingData] {
    let endpoint = "\(AppConfig.fullAPIURL)/analytics/weekly-spending/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    return try JSONDecoder().decode([WeeklySpendingData].self, from: data)
  }
}
