import Foundation
import SwiftUI

// MARK: - Dashboard Response
// MARK: - Dashboard Response
struct DashboardResponse: Decodable {
  let status: String
  let data: DashboardData
}

struct TotalBalanceData: Codable {
  let totalBalance: Double
  let totalInvestment: Double
  let totalDebt: Double
  let accountCount: Int
  // CodingKeys removed to rely on keyDecodingStrategy = .convertFromSnakeCase
}

struct DashboardData: Codable {
  private let balanceData: TotalBalanceData
  let totalIncome: Double
  let totalSpending: Double
  let recentTransactions: [DashboardTransaction]
  let monthlySpending: MonthlySpendingSummary?
  let goalsProgress: [GoalProgress]
  let categorySpending: [CategorySpending]
  let budgetSummary: BudgetSummaryData?
  let netWorth: NetWorthData?

  var totalBalance: Double {
    balanceData.totalBalance
  }

  var totalDebt: Double {
    balanceData.totalDebt
  }

  enum CodingKeys: String, CodingKey {
    case balanceData = "totalBalance"  // Match converted camelCase key
    case totalIncome
    case totalSpending
    case recentTransactions
    case monthlySpending
    case goalsProgress
    case categorySpending
    case budgetSummary
    case netWorth
  }
}
// MARK: - Transaction
struct DashboardTransaction: Codable, Identifiable {
  let id: String
  let merchantName: String?
  let description: String?
  let amount: String
  let formattedAmount: String
  let date: String
  let type: String
  let category: TransactionCategory?
  let account: TransactionAccount?
  let createdAt: String
  let updatedAt: String
  let isRecurring: Bool
  let isTransfer: Bool
  let userModified: Bool
  let notes: String?
  let tags: [String]

  var displayName: String {
    merchantName ?? description ?? "Unknown"
  }

  var amountValue: Double {
    Double(amount) ?? 0.0
  }

  func toTransaction() -> Transaction {
    return Transaction(
      id: id,
      merchantName: merchantName,
      description: description,
      amount: amount,
      formattedAmount: formattedAmount,
      date: date,
      type: type,
      category: category,
      account: nil,  // Dashboard transaction might not have full account details or uses a lightweight version
      status: "posted",
      isRecurring: isRecurring,
      notes: notes,
      tags: tags,
      location: nil,
      splits: nil,
      receipts: nil,
      accountName: nil,
      accountNumber: nil,
      accountType: nil
    )
  }
}
struct TransactionCategory: Codable {
  let id: String
  let name: String
  let type: String
  let icon: String?
  let color: String?
  let isSystemCategory: Bool

  var safeIcon: String {
    (icon ?? "").asSafeSFIcon
  }
}
struct TransactionAccount: Codable {
  let id: String
  let name: String
  let institutionName: String
  let accountType: String
  let maskedAccountNumber: String
  let isActive: Bool
}
// MARK: - Monthly Spending
struct MonthlySpendingSummary: Codable {
  let month: Int
  let year: Int
  let totalExpenses: Double
  let transactionCount: Int
  let byCategory: [CategoryBreakdown]
}
struct CategoryBreakdown: Codable, Identifiable {
  let categoryId: String?
  let categoryName: String
  let total: Double
  let count: Int

  var id: String { categoryId ?? categoryName }
}
// MARK: - Goal Progress
struct GoalProgress: Codable, Identifiable {
  let goalId: String
  let name: String
  let targetAmount: LenientDouble
  let currentAmount: LenientDouble
  let progressPercentage: LenientDouble?
  let deadline: String?
  let isOnTrack: Bool?
  let daysRemaining: Int?
  let isCompleted: Bool
  let completedAt: String?
  let goalType: String?
  let inferredCategoryId: String?
  let inferredCategoryName: String?

  var id: String { goalId }

  var targetAmountValue: Double { targetAmount.value }
  var currentAmountValue: Double { currentAmount.value }
  var progressPercentageValue: Double { progressPercentage?.value ?? 0.0 }

  var progress: Double {
    if targetAmountValue == 0 { return 0 }
    return currentAmountValue / targetAmountValue
  }
}
// MARK: - Category Spending
struct CategorySpending: Codable, Identifiable {
  let categoryId: String?
  let categoryName: String
  let amount: Double
  let color: String

  var id: String { categoryId ?? categoryName }
}

// Helper struct to handle String or Double decoding
struct LenientDouble: Codable {
  let value: Double

  // Convenience initializer for creating instances in code
  init(value: Double) {
    self.value = value
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if let doubleVal = try? container.decode(Double.self) {
      value = doubleVal
    } else if let stringVal = try? container.decode(String.self) {
      value = Double(stringVal) ?? 0.0
    } else {
      value = 0.0
    }
  }
}
// MARK: - Trends Data
struct TrendsData: Codable, Identifiable {
  let month: String
  let amount: Double

  var id: String { month }
}
// MARK: - Net Worth
struct NetWorthData: Codable {
  let netWorth: Double
  let assets: Double
  let liabilities: Double
  // CodingKeys removed to rely on keyDecodingStrategy = .convertFromSnakeCase
}

// MARK: - Transaction Model
struct Transaction: Codable, Identifiable {
  let id: String
  let merchantName: String?
  let description: String?
  let amount: String
  let formattedAmount: String?
  let date: String
  let type: String
  let category: TransactionCategory?
  let account: TransactionAccount?
  let status: String?
  let isRecurring: Bool
  let notes: String?
  let tags: [String]?
  let location: TransactionLocation?
  let splits: [TransactionSplit]?
  let receipts: [TransactionReceipt]?
  let accountName: String?
  let accountNumber: String?
  let accountType: String?

  var displayName: String {
    merchantName ?? description ?? "Unknown Transaction"
  }

  var dateObject: Date {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.date(from: date) ?? Date()
  }

  var amountValue: Double {
    Double(amount) ?? 0.0
  }
}

struct TransactionLocation: Codable {
  let address: String?
  let city: String?
  let region: String?
  let postalCode: String?
  let country: String?
  let lat: Double?
  let lon: Double?
}

struct TransactionSplit: Codable, Identifiable {
  let splitId: String
  let categoryName: String?
  let categoryIcon: String?
  let categoryColor: String?
  let amount: String
  let description: String?

  var safeCategoryIcon: String {
    (categoryIcon ?? "").asSafeSFIcon
  }

  var id: String { splitId }

  var amountValue: Double {
    Double(amount) ?? 0.0
  }
}

struct TransactionReceipt: Codable, Identifiable {
  let receiptId: String
  let fileUrl: String?
  let fileName: String?
  let uploadedAt: String?

  var id: String { receiptId }
}

// MARK: - Bill
struct Bill: Codable, Identifiable {
  let billId: String
  let name: String
  let amount: LenientDouble
  let nextDueDate: String?  // Mapped from snake_case 'next_due_date'
  let isPaid: Bool?  // Might be missing in some responses, make optional
  let isAutopay: Bool  // 'is_autopay' -> 'isAutopay'

  var id: String { billId }
  var amountValue: Double { amount.value }

  // Virtual property to satisfy UI expecting 'dueDate'
  var dueDate: String {
    nextDueDate ?? ""
  }

  var isPaidValue: Bool {
    isPaid ?? false
  }

  // Map isAutoPay logic
  var isAutoPay: Bool {
    isAutopay
  }

  var dateObject: Date {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.date(from: dueDate) ?? Date()
  }
}

// MARK: - Debt
struct Debt: Codable, Identifiable {
  let debtId: String
  let name: String
  let debtType: String
  let currentBalance: LenientDouble
  let interestRate: LenientDouble
  let minimumPayment: LenientDouble?
  let nextDueDate: String?
  let creditorName: String?
  let accountNumberMasked: String?
  let status: String
  let isSynced: Bool?  // New field to indicate if from Plaid

  var id: String { debtId }
  var totalAmountValue: Double { currentBalance.value }
  var interestRateValue: Double { interestRate.value }
  var minimumPaymentValue: Double { minimumPayment?.value ?? 0.0 }

  // UI expects 'category', map to 'debtType'
  var category: String {
    switch debtType {
    case "credit_card":
      return "Credit Card"
    case "personal_loan":
      return "Personal Loan"
    case "auto_loan":
      return "Auto Loan"
    case "student_loan":
      return "Student Loan"
    case "mortgage":
      return "Mortgage"
    case "loan":
      return "Loan"
    default:
      return debtType.capitalized
    }
  }

  // UI expects 'dueDate'
  var dueDate: String {
    nextDueDate ?? ""
  }
}
