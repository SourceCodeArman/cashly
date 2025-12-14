import SwiftUI

struct TransactionsView: View {
  @State private var transactions: [Transaction] = []
  @State private var isLoading = false
  @State private var searchText = ""

  @State private var selectedTransaction: Transaction?
  @State private var sortOption: SortOption = .dateDesc

  enum SortOption {
    case dateDesc
    case dateAsc
    case amountDesc
    case amountAsc

    var title: String {
      switch self {
      case .dateDesc: return "Date (Newest First)"
      case .dateAsc: return "Date (Oldest First)"
      case .amountDesc: return "Amount (High to Low)"
      case .amountAsc: return "Amount (Low to High)"
      }
    }
  }

  // Filter State
  @State private var showFilterSheet = false
  @State private var filterCategories: Set<Category> = []
  @State private var filterAccounts: Set<Account> = []
  @State private var filterStartDate: Date?
  @State private var filterEndDate: Date?
  @State private var filterMinAmount: Double?
  @State private var filterMaxAmount: Double?

  var isFilterActive: Bool {
    !filterCategories.isEmpty || !filterAccounts.isEmpty || filterStartDate != nil
      || filterEndDate != nil
      || filterMinAmount != nil || filterMaxAmount != nil
  }

  var filteredTransactions: [Transaction] {
    var result = transactions

    // 1. Search Text
    if !searchText.isEmpty {
      result = result.filter { transaction in
        transaction.displayName.localizedCaseInsensitiveContains(searchText)
          || (transaction.category?.name.localizedCaseInsensitiveContains(searchText) ?? false)
      }
    }

    // 2. Category Filter
    if !filterCategories.isEmpty {
      result = result.filter { transaction in
        guard let category = transaction.category else { return false }
        // Check if transaction category ID is in the selected set
        return filterCategories.contains { $0.id == category.id }
      }
    }

    // 3. Account Filter
    if !filterAccounts.isEmpty {
      result = result.filter { transaction in
        guard let account = transaction.account else { return false }
        // Check if transaction account ID is in the selected set
        return filterAccounts.contains { $0.id == account.id }
      }
    }

    // 4. Date Filter
    if let startDate = filterStartDate {
      result = result.filter { transaction in
        transaction.dateObject >= startDate
      }
    }
    if let endDate = filterEndDate {
      result = result.filter { transaction in
        transaction.dateObject <= endDate
      }
    }

    // 5. Amount Filter
    if let minAmount = filterMinAmount {
      result = result.filter { transaction in
        abs(transaction.amountValue) >= minAmount
      }
    }
    if let maxAmount = filterMaxAmount {
      result = result.filter { transaction in
        abs(transaction.amountValue) <= maxAmount
      }
    }

    // 6. Sorting
    result.sort { t1, t2 in
      switch sortOption {
      case .dateDesc:
        return t1.dateObject > t2.dateObject
      case .dateAsc:
        return t1.dateObject < t2.dateObject
      case .amountDesc:
        return abs(t1.amountValue) > abs(t2.amountValue)
      case .amountAsc:
        return abs(t1.amountValue) < abs(t2.amountValue)
      }
    }

    return result
  }

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Transactions")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
          Spacer()
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 8)

        // Custom Search Bar with Filter
        HStack {
          HStack {
            Image(systemName: "magnifyingglass")
              .foregroundColor(.secondary)
            TextField("Search transactions", text: $searchText)
              .textFieldStyle(.plain)
            if !searchText.isEmpty {
              Button(action: { searchText = "" }) {
                Image(systemName: "xmark.circle.fill")
                  .foregroundColor(.secondary)
              }
            }
          }
          .padding(10)
          .background(AppTheme.card)
          .cornerRadius(10)

          Menu {
            Picker("Sort By", selection: $sortOption) {
              Text("Date (Newest First)").tag(SortOption.dateDesc)
              Text("Date (Oldest First)").tag(SortOption.dateAsc)
              Text("Amount (High to Low)").tag(SortOption.amountDesc)
              Text("Amount (Low to High)").tag(SortOption.amountAsc)
            }
          } label: {
            Image(systemName: "arrow.up.arrow.down.circle")
              .font(.system(size: 24))
              .foregroundColor(AppTheme.primary)
          }

          Button(action: { showFilterSheet = true }) {
            Image(
              systemName: isFilterActive
                ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle"
            )
            .font(.system(size: 24))
            .foregroundColor(isFilterActive ? AppTheme.primary : .secondary)
          }
        }
        .padding(.horizontal)
        .padding(.bottom, 16)

        // Content
        Group {
          if isLoading && transactions.isEmpty {
            TransactionListSkeleton()
              .background(AppTheme.background)
              .scrollContentBackground(.hidden)
          } else if transactions.isEmpty {
            VStack(spacing: 16) {
              Image(systemName: "list.bullet.rectangle")
                .font(.system(size: 48))
                .foregroundStyle(.secondary.opacity(0.5))

              Text("No Transactions")
                .font(.headline)
                .foregroundStyle(.secondary)

              Text("Your transactions will appear here")
                .font(.caption)
                .foregroundStyle(.secondary)

              if isFilterActive {
                Button(action: clearFilters) {
                  Text("Clear Filters")
                    .foregroundColor(AppTheme.primary)
                }
                .padding(.top, 8)
              }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(AppTheme.background)
          } else if filteredTransactions.isEmpty {
            // State where we have transactions but filters matched nothing
            VStack(spacing: 16) {
              Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(.secondary.opacity(0.5))

              Text("No Matches")
                .font(.headline)
                .foregroundStyle(.secondary)

              Text("Try adjusting your filters")
                .font(.caption)
                .foregroundStyle(.secondary)

              Button(action: clearFilters) {
                Text("Clear Filters")
                  .foregroundColor(AppTheme.primary)
              }
              .padding(.top, 8)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(AppTheme.background)
          } else {
            List {
              ForEach(filteredTransactions) { transaction in
                Button(action: {
                  selectedTransaction = transaction
                }) {
                  TransactionRow(transaction: transaction)
                }
                .buttonStyle(PlainButtonStyle())
                .listRowBackground(AppTheme.background)
              }
            }
            .listStyle(.plain)
            .background(AppTheme.background)
            .scrollContentBackground(.hidden)
            .refreshable {
              await reloadTransactions(forceRefresh: true)
            }
          }
        }
      }
    }
    .sheet(item: $selectedTransaction) { transaction in
      TransactionDetailView(transaction: transaction)
    }
    .sheet(
      isPresented: $showFilterSheet,
      onDismiss: {
        // No need to reload from network on dismiss, standard filtering happens automatically
      }
    ) {
      TransactionFilterView(
        selectedCategories: $filterCategories,
        selectedAccounts: $filterAccounts,
        startDate: $filterStartDate,
        endDate: $filterEndDate,
        minAmount: $filterMinAmount,
        maxAmount: $filterMaxAmount,
        transactions: transactions
      )
    }
    .task {
      await reloadTransactions()
    }
  }

  private func clearFilters() {
    filterCategories = []
    filterAccounts = []
    filterStartDate = nil
    filterEndDate = nil
    filterMinAmount = nil
    filterMaxAmount = nil
  }

  private func reloadTransactions(forceRefresh: Bool = false) async {
    if !forceRefresh && !transactions.isEmpty {
      return
    }
    isLoading = true

    do {
      transactions = try await TransactionService.shared.getAllTransactions(
        forceRefresh: forceRefresh)
    } catch {
      print("Error loading transactions: \(error)")
    }
    isLoading = false
  }
}

#Preview {
  TransactionsView()
}
