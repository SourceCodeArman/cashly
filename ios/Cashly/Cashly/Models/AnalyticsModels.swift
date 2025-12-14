import Foundation

// MARK: - Analytics Models

struct AnalyticsTrends: Codable, Sendable, Identifiable {
  let month: String
  let amount: Double

  var id: String { month }
}

struct AnalyticsNetWorth: Codable, Sendable {
  let date: String
  let assets: Double
  let liabilities: Double
  let netWorth: Double

  enum CodingKeys: String, CodingKey {
    case date
    case assets
    case liabilities
    case netWorth = "net_worth"
  }
}

struct SpendingPattern: Codable, Sendable {
  let day: String  // Serializer has 'day', 'amount', 'count'
  let amount: Double
  let count: Int

  enum CodingKeys: String, CodingKey {
    case day  // Serializer "day" corresponds to Swift "dayOfWeek" conceptual usage, but serializer uses "day"
    case amount
    case count
  }

  // Helper for UI compatibility if needed
  var dayOfWeek: String { day }
  var averageAmount: Double { amount }  // Approximate or re-map
  var transactionCount: Int { count }
}

// Sankey Data Models
struct SankeyNode: Codable, Identifiable, Sendable {
  let name: String
  let color: String?  // Optional in serializer

  var id: String { name }
}

struct SankeyLink: Codable, Sendable {
  let source: Int
  let target: Int
  let value: Double
}

struct SankeyData: Codable, Sendable {
  let nodes: [SankeyNode]
  let links: [SankeyLink]
}

struct AIRecommendation: Codable, Identifiable, Sendable {
  let id: String
  let title: String
  let description: String
  let type: String  // e.g., "saving", "spending", "investment"
  let priority: String
  let icon: String
  let actionable: Bool
  // metadata ignored for now
}

// MARK: - Monthly Spending Models

struct MonthlySpending: Codable, Sendable, Identifiable {
  let month: String  // "Jan", "Feb", etc.
  let year: Int
  let amount: Double

  var id: String { "\(month)-\(year)" }
}

// MARK: - Weekly Spending Models

struct WeeklySpendingData: Codable, Sendable, Identifiable {
  let weekIndex: Int
  let label: String  // "This Week" or "12/01 - 12/07"
  let days: [DailySpending]

  var id: Int { weekIndex }

  enum CodingKeys: String, CodingKey {
    case weekIndex = "week_index"
    case label
    case days
  }

  // Check if all days have zero spending
  var hasNoData: Bool {
    days.allSatisfy { $0.amount == 0 }
  }
}

struct DailySpending: Codable, Sendable, Identifiable {
  let day: String  // "Sun", "Mon", etc.
  let date: String  // ISO date string
  let amount: Double

  var id: String { date }
}
