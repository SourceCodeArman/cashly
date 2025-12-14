import Combine
import Foundation

actor AccountService {
  static let shared = AccountService()
  private let client = APIClient.shared

  private var cachedAccounts: [Account]?
  private var lastFetchTime: Date?
  private let cacheTimeout: TimeInterval = 300  // 5 minutes

  private init() {}

  // MARK: - Accounts

  func getAccounts(forceRefresh: Bool = false) async throws -> [Account] {
    if !forceRefresh,
      let cached = cachedAccounts,
      let lastTime = lastFetchTime,
      Date().timeIntervalSince(lastTime) < cacheTimeout
    {
      return cached
    }

    do {
      let response: AccountsResponse = try await client.get(
        endpoint: "/accounts/",
        requiresAuth: true
      )
      print("✅ Successfully decoded AccountsResponse with \(response.accounts.count) accounts")
      self.cachedAccounts = response.accounts
      self.lastFetchTime = Date()
      return response.accounts
    } catch let error as DecodingError {
      switch error {
      case .keyNotFound(let key, let context):
        print("❌ Decoding error: keyNotFound - \(key.stringValue)")
        print("   Context: \(context.debugDescription)")
        print(
          "   CodingPath: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
      case .typeMismatch(let type, let context):
        print("❌ Decoding error: typeMismatch - Expected \(type)")
        print("   Context: \(context.debugDescription)")
        print(
          "   CodingPath: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
      case .valueNotFound(let type, let context):
        print("❌ Decoding error: valueNotFound - \(type)")
        print("   Context: \(context.debugDescription)")
        print(
          "   CodingPath: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
      case .dataCorrupted(let context):
        print("❌ Decoding error: dataCorrupted")
        print("   Context: \(context.debugDescription)")
        print(
          "   CodingPath: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
      @unknown default:
        print("❌ Unknown decoding error: \(error)")
      }
      throw error
    } catch {
      print("❌ General error: \(error)")
      throw error
    }
  }

  func getAccount(accountId: String) async throws -> Account {
    let response: AccountResponse = try await client.get(
      endpoint: "/accounts/\(accountId)/",
      requiresAuth: true
    )
    guard let account = response.data else {
      throw ServiceError.dataMissing
    }
    return account
  }

  func updateAccount(accountId: String, customName: String?) async throws -> Account {
    let request = AccountUpdateRequest(customName: customName)
    let response: AccountResponse = try await client.patch(
      endpoint: "/accounts/\(accountId)/",
      body: request,
      requiresAuth: true
    )
    guard let account = response.data else {
      throw ServiceError.dataMissing
    }
    // Invalidate cache
    self.cachedAccounts = nil
    return account
  }

  func syncAccount(accountId: String) async throws -> Account {
    struct EmptyBody: Codable {}
    let response: AccountResponse = try await client.post(
      endpoint: "/accounts/\(accountId)/sync/",
      body: EmptyBody(),
      requiresAuth: true
    )
    guard let account = response.data else {
      throw ServiceError.dataMissing
    }
    // Invalidate cache
    self.cachedAccounts = nil
    return account
  }

  func disconnectAccount(accountId: String) async throws {
    let _: EmptyResponse = try await client.delete(
      endpoint: "/accounts/\(accountId)/disconnect/",
      requiresAuth: true
    )
    // Invalidate cache
    self.cachedAccounts = nil
  }

  // MARK: - Plaid Integration

  func createLinkToken() async throws -> String {
    struct LinkTokenResponse: Decodable {
      let status: String
      let data: LinkTokenData

      struct LinkTokenData: Decodable {
        let linkToken: String
      }
    }

    // Use [String: Any] for empty JSON body since Encodable struct is tricky with empty optional fields
    // But here we can just send empty dict
    let response: LinkTokenResponse = try await client.post(
      endpoint: "/accounts/create-link-token/",
      body: [String: String](),
      requiresAuth: true
    )

    return response.data.linkToken
  }

  func exchangePublicToken(publicToken: String, institutionId: String, institutionName: String?)
    async throws -> [Account]
  {
    struct ExchangeTokenRequest: Encodable {
      let publicToken: String
      let institutionId: String
      let institutionName: String?
    }

    let request = ExchangeTokenRequest(
      publicToken: publicToken,
      institutionId: institutionId,
      institutionName: institutionName
    )

    let response: AccountsResponse = try await client.post(
      endpoint: "/accounts/connect/",
      body: request,
      requiresAuth: true
    )

    // Invalidate cache
    self.cachedAccounts = nil

    return response.accounts
  }
}

enum ServiceError: Error {
  case dataMissing
}

// MARK: - Empty Response
struct EmptyResponse: Decodable {
  let status: String?
  let message: String?
}

// MARK: - Transaction Service
// MARK: - Transaction Service
@MainActor
class TransactionService: ObservableObject {
  static let shared = TransactionService()
  private let client = APIClient.shared

  private var allTransactionsCache: (Date, [Transaction])?
  private let cacheTimeout: TimeInterval = 300  // 5 minutes

  /// Fetches ALL transactions (all pages) and caches them for 5 minutes.
  /// Use this for views that need client-side filtering/sorting on the full dataset.
  func getAllTransactions(forceRefresh: Bool = false) async throws -> [Transaction] {
    // Return cached if valid
    if !forceRefresh,
      let (timestamp, cached) = allTransactionsCache,
      Date().timeIntervalSince(timestamp) < cacheTimeout
    {
      return cached
    }

    // Fetch all pages
    var allTransactions: [Transaction] = []
    let pageSize = 100
    var offset = 0
    var hasMore = true

    while hasMore {
      let page = try await fetchTransactionPage(limit: pageSize, offset: offset)
      allTransactions.append(contentsOf: page)
      hasMore = page.count >= pageSize
      offset += page.count
    }

    // Cache the result
    allTransactionsCache = (Date(), allTransactions)
    return allTransactions
  }

  /// Fetches a single page of transactions from the API
  private func fetchTransactionPage(limit: Int, offset: Int) async throws -> [Transaction] {
    enum TransactionResponse: Decodable {
      case wrapped(Wrapper)
      case paginated(PaginatedTransactions)
      case list([DashboardTransaction])

      init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let wrapper = try? container.decode(Wrapper.self) {
          self = .wrapped(wrapper)
          return
        }
        if let paginated = try? container.decode(PaginatedTransactions.self) {
          self = .paginated(paginated)
          return
        }
        if let list = try? container.decode([DashboardTransaction].self) {
          self = .list(list)
          return
        }
        throw DecodingError.typeMismatch(
          TransactionResponse.self,
          DecodingError.Context(
            codingPath: decoder.codingPath,
            debugDescription: "Expected wrapper, paginated, or list response"))
      }

      var transactions: [DashboardTransaction] {
        switch self {
        case .wrapped(let w): return w.data.transactions
        case .paginated(let p): return p.results
        case .list(let l): return l
        }
      }
    }

    struct Wrapper: Decodable {
      let data: TransactionDataContainer
    }

    enum TransactionDataContainer: Decodable {
      case list([DashboardTransaction])
      case paginated(PaginatedTransactions)

      init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let list = try? container.decode([DashboardTransaction].self) {
          self = .list(list)
        } else if let paginated = try? container.decode(PaginatedTransactions.self) {
          self = .paginated(paginated)
        } else {
          throw DecodingError.typeMismatch(
            TransactionDataContainer.self,
            DecodingError.Context(
              codingPath: decoder.codingPath, debugDescription: "Expected list or paginated data"))
        }
      }

      var transactions: [DashboardTransaction] {
        switch self {
        case .list(let l): return l
        case .paginated(let p): return p.results
        }
      }
    }

    struct PaginatedTransactions: Decodable {
      let results: [DashboardTransaction]
    }

    let endpoint = "/transactions/transactions/?limit=\(limit)&offset=\(offset)"

    do {
      let response: TransactionResponse = try await client.get(
        endpoint: endpoint, requiresAuth: true)
      return response.transactions.map { $0.toTransaction() }
    } catch {
      print("❌ TransactionService Error: \(error)")
      throw error
    }
  }

  /// Fetches a page of transactions - for views that need paginated access
  func getTransactions(
    accountIds: [String]? = nil,
    limit: Int = 50,
    offset: Int = 0,
    forceRefresh: Bool = false
  ) async throws -> [Transaction] {
    var endpoint = "/transactions/transactions/?limit=\(limit)&offset=\(offset)"

    if let accountIds = accountIds, !accountIds.isEmpty {
      let ids = accountIds.joined(separator: ",")
      endpoint += "&account__in=\(ids)"
    }

    enum TransactionResponse: Decodable {
      case wrapped(Wrapper)
      case paginated(PaginatedTransactions)
      case list([DashboardTransaction])

      init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let wrapper = try? container.decode(Wrapper.self) {
          self = .wrapped(wrapper)
          return
        }
        if let paginated = try? container.decode(PaginatedTransactions.self) {
          self = .paginated(paginated)
          return
        }
        if let list = try? container.decode([DashboardTransaction].self) {
          self = .list(list)
          return
        }
        throw DecodingError.typeMismatch(
          TransactionResponse.self,
          DecodingError.Context(
            codingPath: decoder.codingPath,
            debugDescription: "Expected wrapper, paginated, or list response"))
      }

      var transactions: [DashboardTransaction] {
        switch self {
        case .wrapped(let w): return w.data.transactions
        case .paginated(let p): return p.results
        case .list(let l): return l
        }
      }
    }

    struct Wrapper: Decodable {
      let data: TransactionDataContainer
    }

    enum TransactionDataContainer: Decodable {
      case list([DashboardTransaction])
      case paginated(PaginatedTransactions)

      init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let list = try? container.decode([DashboardTransaction].self) {
          self = .list(list)
        } else if let paginated = try? container.decode(PaginatedTransactions.self) {
          self = .paginated(paginated)
        } else {
          throw DecodingError.typeMismatch(
            TransactionDataContainer.self,
            DecodingError.Context(
              codingPath: decoder.codingPath, debugDescription: "Expected list or paginated data"))
        }
      }

      var transactions: [DashboardTransaction] {
        switch self {
        case .list(let l): return l
        case .paginated(let p): return p.results
        }
      }
    }

    struct PaginatedTransactions: Decodable {
      let results: [DashboardTransaction]
    }

    do {
      let response: TransactionResponse = try await client.get(
        endpoint: endpoint, requiresAuth: true)
      return response.transactions.map { $0.toTransaction() }
    } catch {
      print("❌ TransactionService Error: \(error)")
      throw error
    }
  }

  func getTransaction(id: String) async throws -> Transaction {
    let endpoint = "/transactions/transactions/\(id)/"

    struct Wrapper: Decodable {
      let data: Transaction
    }

    do {
      let response: Wrapper = try await client.get(endpoint: endpoint, requiresAuth: true)
      return response.data
    } catch {
      print("❌ TransactionService Error (get one): \(error)")
      throw error
    }
  }
}

// MARK: - Budget Service
@MainActor
class BudgetService: ObservableObject {
  static let shared = BudgetService()
  private let client = APIClient.shared

  private var cachedBudgets: [BudgetItem]?
  private var lastFetchTime: Date?
  private let cacheTimeout: TimeInterval = 300  // 5 minutes

  func getBudgets(forceRefresh: Bool = false) async throws -> [BudgetItem] {
    if !forceRefresh,
      let cached = cachedBudgets,
      let lastTime = lastFetchTime,
      Date().timeIntervalSince(lastTime) < cacheTimeout
    {
      return cached
    }

    // BudgetView returns: { status: "success", data: [...], ... }
    // Path is /budgets/ (single nesting)
    struct BudgetsResponse: Decodable {
      let status: String
      let data: [BudgetItem]
    }

    let response: BudgetsResponse = try await client.get(endpoint: "/budgets/", requiresAuth: true)

    self.cachedBudgets = response.data
    self.lastFetchTime = Date()

    return response.data
  }

  func deleteBudget(id: String) async throws {
    let endpoint = "/budgets/\(id)/"
    guard let url = URL(string: "\(AppConfig.fullAPIURL)\(endpoint)") else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (_, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw URLError(.badServerResponse)
    }

    guard (200...299).contains(httpResponse.statusCode) else {
      print("❌ Delete budget failed with status: \(httpResponse.statusCode)")
      throw URLError(.badServerResponse)
    }
  }

  func updateBudget(
    id: String, amount: Double, periodType: String, startDate: Date?, endDate: Date?,
    enableAlerts: Bool, alertThreshold: Int
  ) async throws {
    struct UpdateBudgetRequest: Encodable {
      let amount: Double
      let periodType: String
      let startDate: String?
      let endDate: String?
      let enableAlerts: Bool
      let alertThreshold: Int

      enum CodingKeys: String, CodingKey {
        case amount
        case periodType = "period_type"
        case startDate = "start_date"
        case endDate = "end_date"
        case enableAlerts = "enable_alerts"
        case alertThreshold = "alert_threshold"
      }
    }

    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"

    let startStr = startDate.map { dateFormatter.string(from: $0) }
    let endStr = endDate.map { dateFormatter.string(from: $0) }

    let request = UpdateBudgetRequest(
      amount: amount,
      periodType: periodType,
      startDate: startStr,
      endDate: endStr,
      enableAlerts: enableAlerts,
      alertThreshold: alertThreshold
    )

    let _: EmptyResponse = try await client.patch(
      endpoint: "/budgets/\(id)/",
      body: request,
      requiresAuth: true
    )
  }

  func createBudget(
    categoryId: String, amount: Double, periodType: String, startDate: Date?, endDate: Date?,
    enableAlerts: Bool, alertThreshold: Int
  ) async throws {
    struct CreateBudgetRequest: Encodable {
      let categoryId: String
      let amount: Double
      let periodType: String
      let startDate: String?
      let endDate: String?
      let enableAlerts: Bool
      let alertThreshold: Int

      enum CodingKeys: String, CodingKey {
        case categoryId = "category"
        case amount
        case periodType = "period_type"
        case startDate = "period_start"
        case endDate = "period_end"
        case enableAlerts = "alerts_enabled"
        case alertThreshold = "alert_threshold"
      }
    }

    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"

    let startStr = startDate.map { dateFormatter.string(from: $0) }
    let endStr = endDate.map { dateFormatter.string(from: $0) }

    let request = CreateBudgetRequest(
      categoryId: categoryId,
      amount: amount,
      periodType: periodType,
      startDate: startStr,
      endDate: endStr,
      enableAlerts: enableAlerts,
      alertThreshold: alertThreshold
    )

    let _: EmptyResponse = try await client.post(
      endpoint: "/budgets/",
      body: request,
      requiresAuth: true
    )
  }
}

// MARK: - Goal Service
@MainActor
class GoalService: ObservableObject {
  static let shared = GoalService()
  private let client = APIClient.shared

  func getGoals() async throws -> [GoalProgress] {
    // GoalViewSet DOES NOT override list, so it returns standard DRF list/pagination
    // Response is either [...] or { count: ..., results: [...] }
    // Path is /goals/ (single nesting)

    struct PaginatedGoals: Decodable {
      let results: [GoalProgress]
    }

    enum GoalResponse: Decodable {
      case list([GoalProgress])
      case paginated(PaginatedGoals)

      init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let list = try? container.decode([GoalProgress].self) {
          self = .list(list)
        } else if let paginated = try? container.decode(PaginatedGoals.self) {
          self = .paginated(paginated)
        } else {
          throw DecodingError.typeMismatch(
            GoalResponse.self,
            DecodingError.Context(
              codingPath: decoder.codingPath, debugDescription: "Expected list or paginated goals"))
        }
      }

      var goals: [GoalProgress] {
        switch self {
        case .list(let list): return list
        case .paginated(let p): return p.results
        }
      }
    }

    let response: GoalResponse = try await client.get(endpoint: "/goals/", requiresAuth: true)
    return response.goals
  }
}

// MARK: - Bill Service
@MainActor
class BillService: ObservableObject {
  static let shared = BillService()
  private let client = APIClient.shared

  func getUpcomingBills() async throws -> [Bill] {
    // BillViewSet has 'upcoming' action: { status: "success", data: [...] }
    // Path is /bills/bills/upcoming/ (double nesting)
    struct BillsResponse: Decodable {
      let status: String
      let data: [Bill]
    }

    let response: BillsResponse = try await client.get(
      endpoint: "/bills/bills/upcoming/", requiresAuth: true)
    return response.data
  }
}

// MARK: - Debt Service
@MainActor
class DebtService: ObservableObject {
  static let shared = DebtService()
  private let client = APIClient.shared

  func getDebts() async throws -> [Debt] {
    // DebtAccountViewSet returns: { success: true, data: [...], count: ... }
    // Path is /debts/debts/ (double nesting)
    struct DebtsResponse: Decodable {
      let success: Bool
      let data: [Debt]
    }

    let response: DebtsResponse = try await client.get(
      endpoint: "/debts/debts/", requiresAuth: true)
    return response.data
  }

  func getDebt(debtId: String) async throws -> Debt {
    struct DebtResponse: Decodable {
      let success: Bool
      let data: Debt
    }

    let response: DebtResponse = try await client.get(
      endpoint: "/debts/debts/\(debtId)/", requiresAuth: true)
    return response.data
  }

  func updateDebt(
    debtId: String, name: String, debtType: String, currentBalance: String, interestRate: String,
    minimumPayment: String?, dueDay: Int, creditorName: String?
  ) async throws -> Debt {
    struct UpdateDebtRequest: Encodable {
      let name: String
      let debtType: String
      let currentBalance: String
      let interestRate: String
      let minimumPayment: String?
      let dueDay: Int
      let creditorName: String?

      enum CodingKeys: String, CodingKey {
        case name
        case debtType = "debt_type"
        case currentBalance = "current_balance"
        case interestRate = "interest_rate"
        case minimumPayment = "minimum_payment"
        case dueDay = "due_day"
        case creditorName = "creditor_name"
      }
    }

    struct DebtResponse: Decodable {
      let success: Bool
      let data: Debt
    }

    let request = UpdateDebtRequest(
      name: name,
      debtType: debtType,
      currentBalance: currentBalance,
      interestRate: interestRate,
      minimumPayment: minimumPayment,
      dueDay: dueDay,
      creditorName: creditorName
    )

    let response: DebtResponse = try await client.patch(
      endpoint: "/debts/debts/\(debtId)/",
      body: request,
      requiresAuth: true
    )
    return response.data
  }

  func deleteDebt(debtId: String) async throws {
    // DELETE returns 204 No Content, so we don't decode a response
    let endpoint = "/debts/debts/\(debtId)/"
    guard let url = URL(string: "\(AppConfig.fullAPIURL)\(endpoint)") else {
      throw URLError(.badURL)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    if let token = KeychainManager.shared.accessToken {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    let (_, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw URLError(.badServerResponse)
    }

    // Accept both 200 and 204 as success
    guard (200...299).contains(httpResponse.statusCode) else {
      throw URLError(.badServerResponse)
    }
  }
}
