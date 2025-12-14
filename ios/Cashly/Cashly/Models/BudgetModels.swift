import Foundation

// MARK: - Budget Summary
struct BudgetSummaryData: Codable {
  let totalBudgeted: Double
  let totalSpent: Double
  let budgets: [BudgetItem]
}

struct BudgetItem: Codable, Identifiable {
  let budgetId: String
  let categoryName: String
  let amount: LenientDouble
  // Usage is nested in the 'list' response
  let usage: BudgetUsage?

  // Enhanced fields
  let periodType: String?
  let startDate: String?
  let endDate: String?
  let enableAlerts: Bool?
  let alertThreshold: LenientInt?

  var id: String { budgetId }

  struct BudgetUsage: Codable {
    let spent: LenientDouble
    let remaining: LenientDouble
    let percentageUsed: LenientDouble
  }

  // Helper accessors that proxy to the nested usage object
  var amountValue: Double { amount.value }
  var spentValue: Double { usage?.spent.value ?? 0.0 }
  var remainingValue: Double { usage?.remaining.value ?? 0.0 }
  // Backend usage.percentage_used maps to 'percentage' concept
  var percentageValue: Double { usage?.percentageUsed.value ?? 0.0 }

  // Helpers for new fields
  var period: String { periodType ?? "monthly" }
  var alertsEnabled: Bool { enableAlerts ?? false }
  var threshold: Int { alertThreshold?.value ?? 80 }
}

// Helper struct to handle String or Int decoding
struct LenientInt: Codable {
  let value: Int

  init(value: Int) {
    self.value = value
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if let intVal = try? container.decode(Int.self) {
      value = intVal
    } else if let stringVal = try? container.decode(String.self) {
      value = Int(stringVal) ?? 0
    } else if let doubleVal = try? container.decode(Double.self) {
      value = Int(doubleVal)
    } else {
      value = 0
    }
  }
}
