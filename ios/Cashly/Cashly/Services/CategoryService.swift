import Foundation

actor CategoryService {
  static let shared = CategoryService()

  private var cachedCategories: [Category]?
  private var lastFetchTime: Date?
  private let cacheTimeout: TimeInterval = 300  // 5 minutes

  private init() {}

  func getCategories(forceRefresh: Bool = false) async throws -> [Category] {
    if !forceRefresh,
      let cached = cachedCategories,
      let lastTime = lastFetchTime,
      Date().timeIntervalSince(lastTime) < cacheTimeout
    {
      return cached
    }

    // Updated endpoint to verify: /transactions/categories/ not /categories/
    let endpoint = "\(AppConfig.fullAPIURL)/transactions/categories/"
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

    guard let httpResponse = response as? HTTPURLResponse else {
      throw URLError(.badServerResponse)
    }

    print("CategoryService: Status Code: \(httpResponse.statusCode)")
    if let str = String(data: data, encoding: .utf8) {
      // print("CategoryService: Raw Response: \(str)")
    }

    guard httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    // Robust decoding...
    struct Wrapper: Decodable {
      let data: [Category]
    }

    struct Paginated: Decodable {
      let results: [Category]
    }

    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601

    var categories: [Category]

    if let wrapper = try? decoder.decode(Wrapper.self, from: data) {
      print("CategoryService: Decoded as Wrapper")
      categories = wrapper.data
    } else if let paginated = try? decoder.decode(Paginated.self, from: data) {
      print("CategoryService: Decoded as Paginated")
      categories = paginated.results
    } else if let list = try? decoder.decode([Category].self, from: data) {
      print("CategoryService: Decoded as List")
      categories = list
    } else {
      print("CategoryService: Failed to decode")
      throw DecodingError.typeMismatch(
        [Category].self,
        .init(codingPath: [], debugDescription: "Expected wrapper, paginated, or list response"))
    }

    self.cachedCategories = categories
    self.lastFetchTime = Date()
    return categories
  }

  func createCategory(name: String, type: String, icon: String, color: String) async throws
    -> Category
  {
    let endpoint = "\(AppConfig.fullAPIURL)/transactions/categories/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let body: [String: Any] = [
      "name": name,
      "type": type,
      "icon": icon,
      "color": color,
    ]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw URLError(.badServerResponse)
    }

    print("CategoryService createCategory: Status Code: \(httpResponse.statusCode)")
    if let str = String(data: data, encoding: .utf8) {
      print("CategoryService createCategory: Response: \(str)")
    }

    guard httpResponse.statusCode == 201 || httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    // Decode the created category from response
    // Backend returns: {"status":"success","data":{...},"message":"..."}
    struct CreateCategoryResponse: Decodable {
      let status: String
      let data: CategoryData
      let message: String

      struct CategoryData: Decodable {
        let id: String?
        let name: String
        let type: String
        let icon: String
        let color: String
        let parent_category: String?
        let is_system_category: Bool?
      }
    }

    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    let apiResponse = try decoder.decode(CreateCategoryResponse.self, from: data)

    // Construct the Category from the response data
    let createdCategory = Category(
      id: apiResponse.data.id ?? UUID().uuidString,  // Generate ID if missing
      name: apiResponse.data.name,
      type: apiResponse.data.type,
      icon: apiResponse.data.icon,
      color: apiResponse.data.color,
      isSystemCategory: apiResponse.data.is_system_category ?? false,
      rules: nil,
      rulesCombination: nil
    )

    // Invalidate cache so next fetch gets fresh data
    self.cachedCategories = nil
    self.lastFetchTime = nil

    return createdCategory
  }

  func updateCategoryRules(
    categoryId: String, rules: [CategoryRule], combinationMode: String = "OR"
  ) async throws {
    let endpoint = "\(AppConfig.fullAPIURL)/transactions/categories/\(categoryId)/rules/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    // Convert rules to backend format
    let rulesData = rules.map { rule -> [String: Any] in
      return [
        "field": rule.field.rawValue,
        "operator": rule.operator.rawValue,
        "value": rule.value,
        "enabled": rule.enabled,
      ]
    }

    let body: [String: Any] = [
      "rules": rulesData,
      "rules_combination": combinationMode,
    ]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw URLError(.badServerResponse)
    }

    print("CategoryService updateRules: Status Code: \(httpResponse.statusCode)")
    if let str = String(data: data, encoding: .utf8) {
      print("CategoryService updateRules: Response: \(str)")
    }

    guard httpResponse.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }

    // Update the rules in the cache for this specific category
    if var cached = self.cachedCategories {
      if let index = cached.firstIndex(where: { $0.id == categoryId }) {
        let oldCategory = cached[index]
        let updatedCategory = Category(
          id: oldCategory.id,
          name: oldCategory.name,
          type: oldCategory.type,
          icon: oldCategory.icon,
          color: oldCategory.color,
          isSystemCategory: oldCategory.isSystemCategory,
          rules: rules.isEmpty ? nil : rules,
          rulesCombination: combinationMode
        )
        cached[index] = updatedCategory
        self.cachedCategories = cached
        print(
          "CategoryService: Updated rules in cache for category \(categoryId) - \(rules.count) rules"
        )
      } else {
        print("CategoryService: Category \(categoryId) not found in cache, invalidating")
        self.cachedCategories = nil
        self.lastFetchTime = nil
      }
    } else {
      print("CategoryService: No cache to update")
    }
  }

  func applyCategoryRules(categoryId: String) async throws -> String {
    let endpoint = "\(AppConfig.fullAPIURL)/transactions/categories/\(categoryId)/apply-rules/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw URLError(.badServerResponse)
    }

    print("CategoryService applyRules: Status Code: \(httpResponse.statusCode)")

    guard httpResponse.statusCode == 200 else {
      if let str = String(data: data, encoding: .utf8) {
        print("CategoryService applyRules Error: \(str)")
      }
      throw URLError(.badServerResponse)
    }

    // Parse response to get message
    if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let message = json["message"] as? String
    {
      return message
    }

    return "Rules applied successfully"
  }

  func updateCategory(categoryId: String, name: String, type: String, icon: String, color: String)
    async throws
  {
    let endpoint = "\(AppConfig.fullAPIURL)/transactions/categories/\(categoryId)/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let body: [String: Any] = [
      "name": name,
      "type": type,
      "icon": icon,
      "color": color,
    ]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw URLError(.badServerResponse)
    }

    print("CategoryService updateCategory: Status Code: \(httpResponse.statusCode)")

    guard httpResponse.statusCode == 200 else {
      if let str = String(data: data, encoding: .utf8) {
        print("CategoryService updateCategory Error: \(str)")
      }
      throw URLError(.badServerResponse)
    }

    // Decode the updated category from response
    // Backend returns: {"status":"success","data":{...},"message":"..."}
    struct UpdateCategoryResponse: Decodable {
      let status: String
      let data: Category
      let message: String
    }

    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    
    if let str = String(data: data, encoding: .utf8) {
      print("CategoryService updateCategory: Response: \(str)")
    }
    
    let apiResponse = try decoder.decode(UpdateCategoryResponse.self, from: data)
    let updatedCategory = apiResponse.data

    // Update the category in the cache
    if var cached = self.cachedCategories {
      if let index = cached.firstIndex(where: { $0.id == categoryId }) {
        cached[index] = updatedCategory
        self.cachedCategories = cached
        print("CategoryService: Updated category in cache - \(updatedCategory.name)")
      } else {
        print("CategoryService: Category \(categoryId) not found in cache, invalidating")
        self.cachedCategories = nil
        self.lastFetchTime = nil
      }
    } else {
      print("CategoryService: No cache to update")
    }
  }

  func deleteCategory(categoryId: String) async throws {
    let endpoint = "\(AppConfig.fullAPIURL)/transactions/categories/\(categoryId)/"
    guard let url = URL(string: endpoint) else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw URLError(.badServerResponse)
    }

    print("CategoryService deleteCategory: Status Code: \(httpResponse.statusCode)")

    guard httpResponse.statusCode == 204 || httpResponse.statusCode == 200 else {
      if let str = String(data: data, encoding: .utf8) {
        print("CategoryService deleteCategory Error: \(str)")
      }
      throw URLError(.badServerResponse)
    }

    // Remove the deleted category from cache instead of invalidating entire cache
    if var cached = self.cachedCategories {
      cached.removeAll { $0.id == categoryId }
      self.cachedCategories = cached
      print(
        "CategoryService: Removed category \(categoryId) from cache. Remaining: \(cached.count)")
    }
  }
}
