import Foundation

struct Category: Codable, Identifiable, Sendable, Hashable {
  let id: String
  let name: String
  let type: String
  let icon: String?
  let color: String?
  let isSystemCategory: Bool
  let rules: [CategoryRule]?
  let rulesCombination: String?
  let createdAt: Date?

  enum CodingKeys: String, CodingKey {
    case id
    case name
    case type
    case icon
    case color
    case isSystemCategory = "is_system_category"
    case rules
    case rulesCombination = "rules_combination"
    case createdAt
  }

  // Custom decoder to handle rules being either an array or empty object {}
  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decode(String.self, forKey: .id)
    name = try container.decode(String.self, forKey: .name)
    type = try container.decode(String.self, forKey: .type)
    icon = try container.decodeIfPresent(String.self, forKey: .icon)
    color = try container.decodeIfPresent(String.self, forKey: .color)
    isSystemCategory = try container.decode(Bool.self, forKey: .isSystemCategory)
    rulesCombination = try container.decodeIfPresent(String.self, forKey: .rulesCombination)
    createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)

    // Handle rules - backend returns {} for empty instead of []
    if let rulesArray = try? container.decode([CategoryRule].self, forKey: .rules) {
      rules = rulesArray.isEmpty ? nil : rulesArray
      print("Category decoder: Successfully decoded \(rulesArray.count) rules")
    } else {
      // If decoding as array fails (e.g., it's {}), set to nil
      rules = nil

      // Try to decode to see the actual error
      do {
        let _ = try container.decode([CategoryRule].self, forKey: .rules)
      } catch {
        print("Category decoder: Failed to decode rules: \(error)")
      }
    }
  }

  // Explicit memberwise initializer for cache updates
  init(
    id: String,
    name: String,
    type: String,
    icon: String?,
    color: String?,
    isSystemCategory: Bool,
    rules: [CategoryRule]?,
    rulesCombination: String?,
    createdAt: Date? = nil
  ) {
    self.id = id
    self.name = name
    self.type = type
    self.icon = icon
    self.color = color
    self.isSystemCategory = isSystemCategory
    self.rules = rules
    self.rulesCombination = rulesCombination
    self.createdAt = createdAt
  }

  // Helper to ensure valid SF Symbol
  var safeIcon: String {
    return (icon ?? "").asSafeSFIcon
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: Category, rhs: Category) -> Bool {
    return lhs.id == rhs.id
  }
}

// MARK: - Rule Field Enum (must be before CategoryRule)
enum RuleField: String, Codable, CaseIterable, Sendable {
  case merchantName = "merchant_name"
  case description = "description"
  case amount = "amount"

  var displayName: String {
    switch self {
    case .merchantName: return "Merchant Name"
    case .description: return "Description"
    case .amount: return "Amount"
    }
  }
}

// MARK: - Rule Operator Enum (must be before CategoryRule)
enum RuleOperator: String, Codable, CaseIterable, Sendable {
  case contains = "contains"
  case equals = "equals"
  case startsWith = "starts_with"
  case endsWith = "ends_with"
  case greaterThan = "greater_than"
  case lessThan = "less_than"

  var displayName: String {
    switch self {
    case .contains: return "contains"
    case .equals: return "equals"
    case .startsWith: return "starts with"
    case .endsWith: return "ends with"
    case .greaterThan: return "greater than"
    case .lessThan: return "less than"
    }
  }

  static func operatorsForField(_ field: RuleField) -> [RuleOperator] {
    switch field {
    case .merchantName, .description:
      return [.contains, .equals, .startsWith, .endsWith]
    case .amount:
      return [.equals, .greaterThan, .lessThan]
    }
  }
}

// MARK: - Category Rule
struct CategoryRule: Codable, Identifiable, Sendable {
  var id: String
  var field: RuleField
  var `operator`: RuleOperator
  var value: String
  var enabled: Bool

  init(
    id: String = UUID().uuidString, field: RuleField = .merchantName,
    operator: RuleOperator = .contains, value: String = "", enabled: Bool = true
  ) {
    self.id = id
    self.field = field
    self.operator = `operator`
    self.value = value
    self.enabled = enabled
  }

  enum CodingKeys: String, CodingKey {
    case field
    case `operator`
    case value
    case enabled
  }

  // Custom decoder to handle missing fields from backend
  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)

    // Generate an id since backend doesn't send it
    id = UUID().uuidString
    field = try container.decode(RuleField.self, forKey: .field)
    `operator` = try container.decode(RuleOperator.self, forKey: .operator)
    value = try container.decode(String.self, forKey: .value)
    // Default enabled to true if not present in JSON
    enabled = (try? container.decode(Bool.self, forKey: .enabled)) ?? true
  }
}

struct CreateCategoryRequest: Codable, Sendable {
  let name: String
  let type: String
  let icon: String
}

extension String {
  var asSafeSFIcon: String {
    // Map of backend icon names to SF Symbols
    let iconMap: [String: String] = [
      "utensils": "fork.knife",
      "car": "car.fill",
      "home": "house.fill",
      "shopping-cart": "cart.fill",
      "heart": "heart.fill",
      "sparkles": "sparkles",
      "briefcase": "briefcase.fill",
      "trending-up": "chart.line.uptrend.xyaxis",
      "dollar-sign": "dollarsign.circle.fill",
      "zap": "bolt.fill",
      "film": "film.fill",
      "book": "book.fill",
      "laptop": "laptopcomputer",
      "tag": "tag.fill",
      "other": "shippingbox.fill",
      "general": "tag.fill",
    ]

    let normalized = self.lowercased()
      .replacingOccurrences(of: "-", with: "_")
      .replacingOccurrences(of: " ", with: "_")

    if let mapped = iconMap[normalized] {
      return mapped
    }

    if normalized.contains("food") || normalized.contains("eat") { return "fork.knife" }
    if normalized.contains("shop") || normalized.contains("store") { return "bag.fill" }
    if normalized.contains("pay") || normalized.contains("bill") { return "bill.fill" }
    if normalized.contains("car") || normalized.contains("auto") { return "car.fill" }
    if normalized.contains("tech") || normalized.contains("digital") { return "desktopcomputer" }
    if normalized.contains("sport") || normalized.contains("fit") { return "dumbbell.fill" }

    if self.contains(".") {
      return self
    }

    return "tag.fill"
  }
}

// MARK: - Rule Preset
struct RulePreset: Identifiable, Sendable {
  let id: String
  let name: String
  let description: String
  let category: String
  let icon: String
  let rules: [CategoryRule]
}

// MARK: - Preset Constants
enum RulePresets {
  static let all: [RulePreset] = [
    RulePreset(
      id: "coffee-shops",
      name: "Coffee Shops",
      description: "Starbucks, local cafes, and coffee purchases",
      category: "Food & Dining",
      icon: "cup.and.saucer.fill",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "starbucks"),
        CategoryRule(field: .merchantName, operator: .contains, value: "coffee"),
        CategoryRule(field: .merchantName, operator: .contains, value: "cafe"),
      ]
    ),
    RulePreset(
      id: "fast-food",
      name: "Fast Food",
      description: "McDonald's, Burger King, Taco Bell, Subway",
      category: "Food & Dining",
      icon: "fork.knife",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "mcdonald"),
        CategoryRule(field: .merchantName, operator: .contains, value: "burger"),
        CategoryRule(field: .merchantName, operator: .contains, value: "taco bell"),
        CategoryRule(field: .merchantName, operator: .contains, value: "subway"),
      ]
    ),
    RulePreset(
      id: "food-delivery",
      name: "Food Delivery",
      description: "DoorDash, Uber Eats, Grubhub",
      category: "Food & Dining",
      icon: "bag.fill",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "doordash"),
        CategoryRule(field: .merchantName, operator: .contains, value: "ubereats"),
        CategoryRule(field: .merchantName, operator: .contains, value: "grubhub"),
      ]
    ),
    RulePreset(
      id: "amazon",
      name: "Amazon Purchases",
      description: "All Amazon.com purchases",
      category: "Shopping",
      icon: "cart.fill",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "amazon")
      ]
    ),
    RulePreset(
      id: "groceries",
      name: "Grocery Stores",
      description: "Walmart, Target, Whole Foods",
      category: "Shopping",
      icon: "cart.fill",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "walmart"),
        CategoryRule(field: .merchantName, operator: .contains, value: "target"),
        CategoryRule(field: .merchantName, operator: .contains, value: "whole foods"),
        CategoryRule(field: .merchantName, operator: .contains, value: "trader joe"),
      ]
    ),
    RulePreset(
      id: "rideshare",
      name: "Rideshare",
      description: "Uber, Lyft rides",
      category: "Transportation",
      icon: "car.fill",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "uber"),
        CategoryRule(field: .merchantName, operator: .contains, value: "lyft"),
      ]
    ),
    RulePreset(
      id: "gas-stations",
      name: "Gas Stations",
      description: "Shell, Chevron, BP, Exxon",
      category: "Transportation",
      icon: "fuelpump.fill",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "shell"),
        CategoryRule(field: .merchantName, operator: .contains, value: "chevron"),
        CategoryRule(field: .merchantName, operator: .contains, value: "exxon"),
        CategoryRule(field: .merchantName, operator: .contains, value: "bp"),
      ]
    ),
    RulePreset(
      id: "streaming-video",
      name: "Streaming Video",
      description: "Netflix, Hulu, Disney+, HBO",
      category: "Entertainment",
      icon: "tv.fill",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "netflix"),
        CategoryRule(field: .merchantName, operator: .contains, value: "hulu"),
        CategoryRule(field: .merchantName, operator: .contains, value: "disney"),
        CategoryRule(field: .merchantName, operator: .contains, value: "hbo"),
      ]
    ),
    RulePreset(
      id: "streaming-music",
      name: "Streaming Music",
      description: "Spotify, Apple Music, YouTube Music",
      category: "Entertainment",
      icon: "music.note",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "spotify"),
        CategoryRule(field: .merchantName, operator: .contains, value: "apple music"),
        CategoryRule(field: .merchantName, operator: .contains, value: "youtube music"),
      ]
    ),
    RulePreset(
      id: "gym-fitness",
      name: "Gym & Fitness",
      description: "Gym memberships, fitness centers",
      category: "Health & Fitness",
      icon: "dumbbell.fill",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "gym"),
        CategoryRule(field: .merchantName, operator: .contains, value: "fitness"),
        CategoryRule(field: .merchantName, operator: .contains, value: "yoga"),
      ]
    ),
    RulePreset(
      id: "internet-phone",
      name: "Internet & Phone",
      description: "Verizon, AT&T, Comcast",
      category: "Utilities",
      icon: "wifi",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "verizon"),
        CategoryRule(field: .merchantName, operator: .contains, value: "at&t"),
        CategoryRule(field: .merchantName, operator: .contains, value: "comcast"),
        CategoryRule(field: .merchantName, operator: .contains, value: "t-mobile"),
      ]
    ),
    RulePreset(
      id: "software",
      name: "Software Subscriptions",
      description: "Adobe, Microsoft 365, Apple services",
      category: "Subscriptions",
      icon: "laptopcomputer",
      rules: [
        CategoryRule(field: .merchantName, operator: .contains, value: "adobe"),
        CategoryRule(field: .merchantName, operator: .contains, value: "microsoft"),
        CategoryRule(field: .merchantName, operator: .contains, value: "apple.com"),
      ]
    ),
  ]
}
