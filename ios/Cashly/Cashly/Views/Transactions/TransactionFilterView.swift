import Combine
import SwiftUI

@MainActor
class TransactionFilterViewModel: ObservableObject {
  @Published var categories: [Category] = []
  @Published var accounts: [Account] = []

  @Published var selectedCategories: Set<Category> = []
  @Published var selectedAccounts: Set<Account> = []
  @Published var startDate: Date = Date()
  @Published var endDate: Date = Date()
  @Published var minAmount: String = ""
  @Published var maxAmount: String = ""
  @Published var isDateEnabled: Bool = false

  private var hasLoadedCategoriesAndAccounts = false

  func loadData(
    initialCategories: Set<Category>,
    initialAccounts: Set<Account>,
    initialStartDate: Date?,
    initialEndDate: Date?,
    initialMinAmount: Double?,
    initialMaxAmount: Double?,
    transactionDateRange: (oldest: Date, newest: Date)?
  ) {
    self.selectedCategories = initialCategories
    self.selectedAccounts = initialAccounts

    // Debug logging
    print("🔍 TransactionFilterView loadData called")
    print("🔍 transactionDateRange: \(String(describing: transactionDateRange))")
    print("🔍 initialStartDate: \(String(describing: initialStartDate))")
    print("🔍 initialEndDate: \(String(describing: initialEndDate))")

    // Set date values - prioritize explicit filters, then transaction range, then fallback
    if let start = initialStartDate {
      self.startDate = start
      self.isDateEnabled = true
      print("🔍 Using initialStartDate: \(start)")
    } else if let range = transactionDateRange {
      // Default to oldest transaction date
      self.startDate = range.oldest
      print("🔍 Using range.oldest: \(range.oldest)")
    } else {
      let components = Calendar.current.dateComponents([.year, .month], from: Date())
      self.startDate = Calendar.current.date(from: components) ?? Date()
      print("🔍 Using fallback startDate (start of month): \(self.startDate)")
    }

    if let end = initialEndDate {
      self.endDate = end
      print("🔍 Using initialEndDate: \(end)")
    } else if let range = transactionDateRange {
      // Default to newest transaction date
      self.endDate = range.newest
      print("🔍 Using range.newest: \(range.newest)")
    } else {
      self.endDate = Date()
      print("🔍 Using fallback endDate (today): \(self.endDate)")
    }

    if let min = initialMinAmount {
      self.minAmount = String(format: "%.2f", min)
    } else {
      self.minAmount = ""
    }

    if let max = initialMaxAmount {
      self.maxAmount = String(format: "%.2f", max)
    } else {
      self.maxAmount = ""
    }

    // Only load categories and accounts once
    guard !hasLoadedCategoriesAndAccounts else { return }
    hasLoadedCategoriesAndAccounts = true

    Task {
      do {
        self.categories = try await CategoryService.shared.getCategories()
        self.accounts = try await AccountService.shared.getAccounts()
      } catch {
        print("Error loading filter data: \(error)")
      }
    }
  }
}

struct TransactionFilterView: View {
  @Binding var selectedCategories: Set<Category>
  @Binding var selectedAccounts: Set<Account>
  @Binding var startDate: Date?
  @Binding var endDate: Date?
  @Binding var minAmount: Double?
  @Binding var maxAmount: Double?
  var transactions: [Transaction]  // Pass transactions to compute date range
  @Environment(\.dismiss) var dismiss

  @StateObject private var viewModel = TransactionFilterViewModel()

  /// Compute date range from transactions
  private var transactionDateRange: (oldest: Date, newest: Date)? {
    guard !transactions.isEmpty else { return nil }
    let dates = transactions.map { $0.dateObject }
    guard let oldest = dates.min(), let newest = dates.max() else { return nil }
    return (oldest, newest)
  }

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background
          .ignoresSafeArea()

        Form {
          Section(header: Text("Category")) {
            NavigationLink {
              CategorySelectionView(
                selected: $viewModel.selectedCategories, categories: viewModel.categories)
            } label: {
              HStack {
                Text("Category")
                Spacer()
                if viewModel.selectedCategories.isEmpty {
                  Text("All Categories")
                    .foregroundStyle(.secondary)
                } else {
                  Text("\(viewModel.selectedCategories.count) Selected")
                    .foregroundStyle(.secondary)
                }
              }
            }
            .listRowBackground(AppTheme.card)
          }

          Section(header: Text("Account")) {
            NavigationLink {
              AccountSelectionView(
                selected: $viewModel.selectedAccounts, accounts: viewModel.accounts)
            } label: {
              HStack {
                Text("Account")
                Spacer()
                if viewModel.selectedAccounts.isEmpty {
                  Text("All Accounts")
                    .foregroundStyle(.secondary)
                } else {
                  Text("\(viewModel.selectedAccounts.count) Selected")
                    .foregroundStyle(.secondary)
                }
              }
            }
            .listRowBackground(AppTheme.card)
          }

          Section(header: Text("Date Range")) {
            Toggle("Filter by Date", isOn: $viewModel.isDateEnabled)
              .listRowBackground(AppTheme.card)

            if viewModel.isDateEnabled {
              DatePicker("Start Date", selection: $viewModel.startDate, displayedComponents: .date)
              DatePicker("End Date", selection: $viewModel.endDate, displayedComponents: .date)
            }
          }
          .listRowBackground(AppTheme.card)

          Section(header: Text("Amount Range")) {
            HStack {
              Text("$")
              TextField("Min", text: $viewModel.minAmount)
                .keyboardType(.decimalPad)
              Text("-")
              Text("$")
              TextField("Max", text: $viewModel.maxAmount)
                .keyboardType(.decimalPad)
            }
            .listRowBackground(AppTheme.card)
          }

          Section {
            Button(action: applyFilters) {
              Text("Apply Filters")
                .frame(maxWidth: .infinity)
                .foregroundColor(.white)
            }
            .listRowBackground(AppTheme.primary)

            Button(action: clearFilters) {
              Text("Clear Filters")
                .frame(maxWidth: .infinity)
                .foregroundColor(.red)
            }
            .listRowBackground(AppTheme.card)
          }
          .listRowBackground(AppTheme.card)
        }
        .scrollContentBackground(.hidden)
      }
      .navigationTitle("Filter Transactions")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .navigationBarLeading) {
          Button("Cancel") {
            dismiss()
          }
        }
      }
      .onAppear {
        viewModel.loadData(
          initialCategories: selectedCategories,
          initialAccounts: selectedAccounts,
          initialStartDate: startDate,
          initialEndDate: endDate,
          initialMinAmount: minAmount,
          initialMaxAmount: maxAmount,
          transactionDateRange: transactionDateRange
        )
      }
    }
  }

  private func applyFilters() {
    selectedCategories = viewModel.selectedCategories
    selectedAccounts = viewModel.selectedAccounts

    if viewModel.isDateEnabled {
      startDate = viewModel.startDate
      endDate = viewModel.endDate
    } else {
      startDate = nil
      endDate = nil
    }

    minAmount = Double(viewModel.minAmount)
    maxAmount = Double(viewModel.maxAmount)

    dismiss()
  }

  private func clearFilters() {
    selectedCategories = []
    selectedAccounts = []
    startDate = nil
    endDate = nil
    minAmount = nil
    maxAmount = nil
    dismiss()
  }
}

struct CategorySelectionView: View {
  @Binding var selected: Set<Category>
  let categories: [Category]

  var body: some View {
    ZStack {
      AppTheme.background.ignoresSafeArea()
      List {
        Button {
          selected.removeAll()
        } label: {
          HStack {
            Text("All Categories")
              .foregroundStyle(Color.primary)
            Spacer()
            if selected.isEmpty {
              Image(systemName: "checkmark")
                .foregroundStyle(AppTheme.primary)
            }
          }
        }
        .listRowBackground(AppTheme.card)

        ForEach(categories) { category in
          Button {
            if selected.contains(category) {
              selected.remove(category)
            } else {
              selected.insert(category)
            }
          } label: {
            HStack {
              Image(systemName: category.safeIcon)
                .foregroundStyle(Color.primary)
              Text(category.name)
                .foregroundStyle(Color.primary)
              Spacer()
              if selected.contains(category) {
                Image(systemName: "checkmark")
                  .foregroundStyle(AppTheme.primary)
              }
            }
          }
          .listRowBackground(AppTheme.card)
        }
      }
      .scrollContentBackground(.hidden)
    }
    .navigationTitle("Select Categories")
  }
}

struct AccountSelectionView: View {
  @Binding var selected: Set<Account>
  let accounts: [Account]

  var body: some View {
    ZStack {
      AppTheme.background.ignoresSafeArea()
      List {
        Button {
          selected.removeAll()
        } label: {
          HStack {
            Text("All Accounts")
              .foregroundStyle(Color.primary)
            Spacer()
            if selected.isEmpty {
              Image(systemName: "checkmark")
                .foregroundStyle(AppTheme.primary)
            }
          }
        }
        .listRowBackground(AppTheme.card)

        ForEach(accounts) { account in
          Button {
            if selected.contains(account) {
              selected.remove(account)
            } else {
              selected.insert(account)
            }
          } label: {
            HStack {
              Text(account.displayName)
                .foregroundStyle(Color.primary)
              Spacer()
              if selected.contains(account) {
                Image(systemName: "checkmark")
                  .foregroundStyle(AppTheme.primary)
              }
            }
          }
          .listRowBackground(AppTheme.card)
        }
      }
      .scrollContentBackground(.hidden)
    }
    .navigationTitle("Select Accounts")
  }
}
