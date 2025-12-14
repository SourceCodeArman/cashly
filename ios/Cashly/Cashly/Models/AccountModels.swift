import Foundation

// MARK: - Account Response
struct AccountsResponse: Decodable {
  let status: String?
  let data: [Account]?
  let results: [Account]?

  var accounts: [Account] {
    return data ?? results ?? []
  }
}

struct AccountResponse: Decodable {
  let status: String?
  let data: Account?

  var account: Account? {
    return data
  }
}

// MARK: - Account Type
enum AccountType: String, Codable {
  case checking
  case savings
  case creditCard = "credit_card"
  case investment

  var displayName: String {
    switch self {
    case .checking: return "Checking"
    case .savings: return "Savings"
    case .creditCard: return "Credit Card"
    case .investment: return "Investment"
    }
  }

  var icon: String {
    switch self {
    case .checking: return "creditcard.fill"
    case .savings: return "banknote.fill"
    case .creditCard: return "creditcard.fill"
    case .investment: return "chart.line.uptrend.xyaxis"
    }
  }
}

// MARK: - Account Model
struct Account: Codable, Identifiable, Hashable {
  let id: String
  let institutionName: String
  let customName: String?
  let accountType: AccountType
  let maskedAccountNumber: String
  let balance: String
  let currency: String
  let isActive: Bool
  let createdAt: Date
  let updatedAt: Date

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: Account, rhs: Account) -> Bool {
    lhs.id == rhs.id
  }
  let lastSyncedAt: Date?
  let plaidAccountId: String?
  let plaidItemId: String?
  let plaidInstitutionId: String?
  let plaidProducts: [String]?
  let webhookUrl: String?
  let errorCode: String?
  let errorMessage: String?

  // Computed properties
  var displayName: String {
    customName ?? institutionName
  }

  var balanceValue: Double {
    Double(balance) ?? 0.0
  }

  var formattedBalance: String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.currencyCode = currency
    return formatter.string(from: NSNumber(value: balanceValue)) ?? balance
  }

  var formattedAccountNumber: String {
    // Format masked number to show last 4 digits
    let digits = maskedAccountNumber.filter { $0.isNumber }
    if digits.count >= 4 {
      let lastFour = String(digits.suffix(4))
      return "••••\(lastFour)"
    }
    return maskedAccountNumber
  }

  enum CodingKeys: String, CodingKey {
    case id = "accountId"
    case institutionName, customName, accountType
    case maskedAccountNumber = "accountNumberMasked"
    case balance, currency, isActive, createdAt, updatedAt, lastSyncedAt
    case plaidAccountId, plaidItemId, plaidInstitutionId, plaidProducts
    case webhookUrl, errorCode, errorMessage
  }
}

// MARK: - Account Update Request
struct AccountUpdateRequest: Codable {
  let customName: String?
}
