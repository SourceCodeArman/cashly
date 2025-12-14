import SwiftUI

struct AccountDetailView: View {
  let account: Account
  let onSync: () -> Void
  let onDisconnect: () -> Void

  @Environment(\.dismiss) private var dismiss
  @State private var selectedTab = 0

  var body: some View {
    ZStack {
      AppTheme.background.ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Button("Close") {
            dismiss()
          }
          .foregroundStyle(AppTheme.primary)

          Spacer()

          Text("Account Details")
            .font(.headline)
            .foregroundStyle(.primary)

          Spacer()

          Menu {
            Button(action: onSync) {
              Label("Sync Now", systemImage: "arrow.triangle.2.circlepath")
            }

            Button(
              role: .destructive,
              action: {
                dismiss()
                onDisconnect()
              }
            ) {
              Label("Disconnect", systemImage: "xmark.circle")
            }
          } label: {
            Image(systemName: "ellipsis.circle")
              .font(.system(size: 20))
              .foregroundStyle(AppTheme.primary)
          }
        }
        .padding()
        .background(AppTheme.background)

        // Custom Tab Bar
        HStack(spacing: 0) {
          TabButton(title: "Overview", icon: "info.circle", isSelected: selectedTab == 0) {
            selectedTab = 0
          }
          TabButton(
            title: "Transactions", icon: "list.bullet.rectangle", isSelected: selectedTab == 1
          ) {
            selectedTab = 1
          }
          TabButton(title: "Goals", icon: "target", isSelected: selectedTab == 2) {
            selectedTab = 2
          }
        }
        .padding(.horizontal)
        .padding(.bottom)
        .background(AppTheme.background)

        Divider()

        // Tab Content
        TabView(selection: $selectedTab) {
          OverviewTab(account: account)
            .tag(0)

          TransactionsTab(accountId: account.id)
            .tag(1)

          GoalsTab(accountId: account.id)
            .tag(2)
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
      }
    }
  }
}

// MARK: - Tab Button
struct TabButton: View {
  let title: String
  let icon: String
  let isSelected: Bool
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      VStack(spacing: 4) {
        Image(systemName: icon)
          .font(.system(size: 16))
        Text(title)
          .font(.caption)
      }
      .frame(maxWidth: .infinity)
      .padding(.vertical, 8)
      .foregroundStyle(isSelected ? AppTheme.primary : AppTheme.secondaryText)
      .background(isSelected ? AppTheme.primary.opacity(0.1) : Color.clear)
      .cornerRadius(8)
    }
  }
}

// MARK: - Overview Tab
struct OverviewTab: View {
  let account: Account

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        // Balance Card
        VStack(alignment: .leading, spacing: 8) {
          Text("Current Balance")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          Text(account.formattedBalance)
            .font(.system(size: 36, weight: .bold))
            .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(
          LinearGradient(
            colors: [AppTheme.primary.opacity(0.1), AppTheme.primary.opacity(0.05)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
        )
        .cornerRadius(12)

        Divider()

        // Account Information
        VStack(alignment: .leading, spacing: 16) {
          InfoRow(label: "Institution", value: account.institutionName, icon: "building.columns")
          InfoRow(
            label: "Account Type", value: account.accountType.displayName,
            icon: account.accountType.icon)
          InfoRow(label: "Account Number", value: account.formattedAccountNumber, icon: "number")
          InfoRow(label: "Currency", value: account.currency, icon: "dollarsign.circle")

          if let lastSynced = account.lastSyncedAt {
            InfoRow(
              label: "Last Synced",
              value: formatDate(lastSynced),
              icon: "clock"
            )
          }

          InfoRow(
            label: "Connected",
            value: formatDate(account.createdAt),
            icon: "calendar"
          )
        }

        if let errorMessage = account.errorMessage {
          Divider()

          VStack(alignment: .leading, spacing: 8) {
            Label("Error", systemImage: "exclamationmark.triangle")
              .font(.subheadline)
              .fontWeight(.medium)
              .foregroundStyle(AppTheme.warning)

            Text(errorMessage)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          .padding()
          .background(AppTheme.warning.opacity(0.1))
          .cornerRadius(8)
        }
      }
      .padding()
    }
  }

  private func formatDate(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .short
    return formatter.string(from: date)
  }
}

struct InfoRow: View {
  let label: String
  let value: String
  let icon: String

  var body: some View {
    HStack {
      Label(label, systemImage: icon)
        .font(.subheadline)
        .foregroundStyle(.secondary)

      Spacer()

      Text(value)
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(.primary)
    }
  }
}

// MARK: - Transactions Tab
struct TransactionsTab: View {
  let accountId: String
  @State private var transactions: [Transaction] = []
  @State private var isLoading = false
  @State private var selectedTransaction: Transaction?

  var body: some View {
    ScrollView {
      LazyVStack(spacing: 0) {
        if isLoading {
          ProgressView()
            .padding()
        } else if transactions.isEmpty {
          VStack(spacing: 12) {
            Image(systemName: "list.bullet.rectangle")
              .font(.system(size: 48))
              .foregroundStyle(.secondary.opacity(0.5))

            Text("No Transactions Yet")
              .font(.headline)
              .foregroundStyle(.secondary)
          }
          .padding()
          .frame(height: 200)
        } else {
          ForEach(transactions) { transaction in
            Button(action: {
              selectedTransaction = transaction
            }) {
              TransactionRow(transaction: transaction)
            }
            .buttonStyle(PlainButtonStyle())

            Divider()
              .padding(.leading, 56)
          }
        }
      }
      .padding(.top)
    }
    .refreshable {
      await loadTransactions(forceRefresh: true)
    }
    .task {
      await loadTransactions()
    }
    .sheet(item: $selectedTransaction) { transaction in
      TransactionDetailView(transaction: transaction)
    }
  }

  private func loadTransactions(forceRefresh: Bool = false) async {
    isLoading = true
    do {
      transactions = try await TransactionService.shared.getTransactions(
        accountIds: [accountId],
        forceRefresh: forceRefresh
      )
    } catch {
      print("Error loading transactions: \(error)")
    }
    isLoading = false
  }
}

// MARK: - Goals Tab
struct GoalsTab: View {
  let accountId: String
  @State private var isLoading = false

  var body: some View {
    ScrollView {
      VStack(spacing: 16) {
        if isLoading {
          ProgressView()
            .padding()
        } else {
          // TODO: Fetch and display goals linked to this account
          VStack(spacing: 12) {
            Image(systemName: "target")
              .font(.system(size: 48))
              .foregroundStyle(.secondary.opacity(0.5))

            Text("Goals Coming Soon")
              .font(.headline)
              .foregroundStyle(.secondary)

            Text("Savings goals linked to this account will be displayed here")
              .font(.caption)
              .foregroundStyle(.secondary)
              .multilineTextAlignment(.center)
          }
          .padding()
          .frame(maxHeight: .infinity)
        }
      }
      .padding()
    }
    .background(AppTheme.background)
    .scrollContentBackground(.hidden)
  }
}

#Preview {
  AccountDetailView(
    account: Account(
      id: "123",
      institutionName: "Chase Bank",
      customName: "My Checking",
      accountType: .checking,
      maskedAccountNumber: "1234",
      balance: "5432.10",
      currency: "USD",
      isActive: true,
      createdAt: Date(),
      updatedAt: Date(),
      lastSyncedAt: Date(),
      plaidAccountId: nil,
      plaidItemId: nil,
      plaidInstitutionId: nil,
      plaidProducts: nil,
      webhookUrl: nil,
      errorCode: nil,
      errorMessage: nil
    ),
    onSync: {},
    onDisconnect: {}
  )
}

struct TransactionRow: View {
  let transaction: Transaction

  var body: some View {
    HStack(spacing: 12) {
      // Icon
      ZStack {
        Circle()
          .fill(Color(hex: transaction.category?.color ?? "#808080").opacity(0.1))
          .frame(width: 40, height: 40)

        Image(systemName: transaction.category?.safeIcon ?? "cart")
          .font(.system(size: 18))
          .foregroundStyle(Color(hex: transaction.category?.color ?? "#808080"))
      }

      // Details
      VStack(alignment: .leading, spacing: 4) {
        Text(transaction.displayName)
          .font(.subheadline)
          .fontWeight(.medium)
          .foregroundStyle(.primary)

        Text(transaction.date)
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer()

      // Amount
      Text(transaction.formattedAmount ?? "\(transaction.amount)")
        .font(.subheadline)
        .fontWeight(.bold)
        .foregroundStyle(transaction.type == "income" ? AppTheme.success : AppTheme.text)
    }
    .padding(.vertical, 4)
    .contentShape(Rectangle())
  }
}
