import Combine
import LinkKit
import SwiftUI

struct AccountsView: View {
  @StateObject private var viewModel = AccountsViewModel()
  @StateObject private var plaidManager = PlaidManager()
  @State private var showingDisconnectAlert = false
  @State private var accountToDisconnect: Account?

  // Grid layout: Single column
  private let columns = [
    GridItem(.flexible(), spacing: 16)
  ]

  var body: some View {

    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Accounts")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)

          Spacer()

          Menu {
            Button(action: {
              plaidManager.presentLink()
            }) {
              Label("Connect Account", systemImage: "plus")
            }

            Button(action: {
              Task {
                await viewModel.syncAllAccounts()
              }
            }) {
              Label("Sync All", systemImage: "arrow.triangle.2.circlepath")
            }
          } label: {
            Image(systemName: "ellipsis.circle")
              .font(.system(size: 24))
              .foregroundStyle(AppTheme.primary)
          }
        }
        .padding(.horizontal)
        .padding(.bottom, 16)
        .padding(.top, 16) // Add some top padding below the top nav bar

        // Content
        if viewModel.isLoading && viewModel.accounts.isEmpty {
          AccountListSkeleton()
        } else if let error = viewModel.errorMessage, viewModel.accounts.isEmpty {
          ContentUnavailableView {
            Label("Connection Error", systemImage: "wifi.slash")
          } description: {
            Text(error)
          } actions: {
            Button("Try Again") {
              Task {
                await viewModel.loadAccounts()
              }
            }
          }
        } else if viewModel.accounts.isEmpty {
          EmptyAccountsView(plaidManager: plaidManager)
        } else {
          ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
              ForEach(viewModel.accounts) { account in
                AccountCard(
                  account: account,
                  isSyncing: viewModel.syncingAccountIds.contains(account.id),
                  onTap: {
                    viewModel.selectedAccount = account
                  },
                  onSync: {
                    Task {
                      await viewModel.syncAccount(accountId: account.id)
                    }
                  },
                  onDisconnect: {
                    accountToDisconnect = account
                    showingDisconnectAlert = true
                  }
                )
              }
            }
            .padding()
          }
          .refreshable {
            await viewModel.loadAccounts(forceRefresh: true)
          }
        }
      }
    }
    .confirmationDialog(
      "Disconnect Account?",
      isPresented: $showingDisconnectAlert,
      titleVisibility: .visible
    ) {
      Button("Disconnect", role: .destructive) {
        if let account = accountToDisconnect {
          Task {
            await viewModel.disconnectAccount(accountId: account.id)
          }
        }
      }
      Button("Cancel", role: .cancel) {}
    } message: {
      if let account = accountToDisconnect {
        Text(
          "Are you sure you want to disconnect \(account.institutionName)? This action cannot be undone."
        )
      }
    }
    .task {
      if viewModel.accounts.isEmpty {
        await viewModel.loadAccounts()
      }
    }
    .sheet(item: $viewModel.selectedAccount) { account in
      AccountDetailView(
        account: account,
        onSync: {
          Task {
            await viewModel.syncAccount(accountId: account.id)
          }
        },
        onDisconnect: {
          self.accountToDisconnect = account
          self.showingDisconnectAlert = true
          viewModel.selectedAccount = nil  // Close sheet
        }
      )
    }
    // Plaid Link Presentation
    .fullScreenCover(item: $plaidManager.linkHandlerWrapper) { wrapper in
      LinkController(handler: wrapper.handler)
        .edgesIgnoringSafeArea(.all)
    }
    .onChange(of: plaidManager.linkHandlerWrapper) { newWrapper in
      if newWrapper == nil {
        // Refresh accounts after successful link
        Task {
          await viewModel.loadAccounts()
        }
      }
    }
    .onChange(of: plaidManager.error as? NSError) { error in
      if let error = error {
        print("Plaid Error: \(error)")
      }
    }
  }
}

// MARK: - Link Handler Wrapper
struct LinkHandlerWrapper: Identifiable, Equatable {
  let id = UUID()
  let handler: Handler

  static func == (lhs: LinkHandlerWrapper, rhs: LinkHandlerWrapper) -> Bool {
    return lhs.id == rhs.id
  }
}

// MARK: - Link Controller
struct LinkController: UIViewControllerRepresentable {
  let handler: Handler

  func makeUIViewController(context: Context) -> LinkPresenterViewController {
    return LinkPresenterViewController(handler: handler)
  }

  func updateUIViewController(_ uiViewController: LinkPresenterViewController, context: Context) {
    // No update logic needed as the handler is constant for this presentation
  }

  class LinkPresenterViewController: UIViewController {
    let handler: Handler
    var hasPresented = false

    init(handler: Handler) {
      self.handler = handler
      super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
      fatalError("init(coder:) has not been implemented")
    }

    override func viewDidAppear(_ animated: Bool) {
      super.viewDidAppear(animated)

      if !hasPresented {
        hasPresented = true
        handler.open(presentUsing: .viewController(self))
      }
    }
  }
}

// MARK: - Account Card
struct AccountCard: View {
  let account: Account
  let isSyncing: Bool
  let onTap: () -> Void
  let onSync: () -> Void
  let onDisconnect: () -> Void

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      // Header
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(account.displayName)
            .font(.headline)
            .foregroundStyle(.primary)
            .lineLimit(1)

          Text(account.formattedAccountNumber)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        Image(systemName: account.accountType.icon)
          .font(.system(size: 20))
          .foregroundStyle(AppTheme.primary)
      }

      // Balance
      Text(account.formattedBalance)
        .font(.title2)
        .fontWeight(.bold)
        .foregroundStyle(.primary)

      Divider()

      // Account Info
      HStack {
        Label(account.accountType.displayName, systemImage: "")
          .font(.caption)
          .foregroundStyle(.secondary)

        Spacer()

        if account.isActive {
          Text("Active")
            .font(.caption2)
            .fontWeight(.semibold)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(AppTheme.success.opacity(0.15))
            .foregroundStyle(AppTheme.success)
            .cornerRadius(4)
        } else {
          Text("Inactive")
            .font(.caption2)
            .fontWeight(.semibold)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(AppTheme.secondaryText.opacity(0.15))
            .foregroundStyle(AppTheme.secondaryText)
            .cornerRadius(4)
        }
      }

      // Actions
      HStack(spacing: 8) {
        Button(action: onSync) {
          if isSyncing {
            HStack(spacing: 4) {
              ProgressView()
                .scaleEffect(0.7)
              Text("Syncing")
                .font(.caption)
            }
          } else {
            HStack(spacing: 4) {
              Image(systemName: "arrow.triangle.2.circlepath")
                .font(.caption)
              Text("Sync")
                .font(.caption)
            }
          }
        }
        .buttonStyle(.bordered)
        .controlSize(.small)
        .disabled(isSyncing)

        Spacer()

        Button(action: onDisconnect) {
          Image(systemName: "xmark.circle")
            .font(.system(size: 16))
        }
        .buttonStyle(.borderless)
        .foregroundStyle(AppTheme.destructive)
      }
    }
    .padding(AppTheme.padding)
    .cardStyle()
    .contentShape(Rectangle())
    .onTapGesture {
      onTap()
    }
  }
}

// MARK: - Empty State
struct EmptyAccountsView: View {
  @ObservedObject var plaidManager: PlaidManager

  var body: some View {
    VStack(spacing: 24) {
      Image(systemName: "building.columns.circle.fill")
        .font(.system(size: 80))
        .foregroundStyle(.secondary)
        .padding(.bottom, 8)

      VStack(spacing: 8) {
        Text("No Accounts Connected")
          .font(.title2)
          .fontWeight(.bold)

        Text("Connect your bank accounts to track your net worth and spending automatically.")
          .font(.subheadline)
          .foregroundStyle(.secondary)
          .multilineTextAlignment(.center)
          .padding(.horizontal, 32)
      }

      Button(action: {
        plaidManager.presentLink()
      }) {
        if plaidManager.isLoading {
          ProgressView()
            .tint(.white)
        } else {
          HStack {
            Image(systemName: "plus.circle.fill")
            Text("Connect Account")
          }
        }
      }
      .font(.headline)
      .foregroundStyle(.white)
      .frame(height: 50)
      .frame(maxWidth: .infinity)
      .background(AppTheme.primary)
      .clipShape(RoundedRectangle(cornerRadius: 12))
      .padding(.horizontal, 32)
      .padding(.top, 8)
      .disabled(plaidManager.isLoading)
    }
    .padding()
  }
}

// MARK: - Plaid Manager
@MainActor
class PlaidManager: NSObject, ObservableObject {
  @Published var isPresentingLink = false
  @Published var linkHandlerWrapper: LinkHandlerWrapper?
  @Published var isLoading = false
  @Published var error: Error?

  private let accountService = AccountService.shared

  // Callback closures
  var onSuccess: (() -> Void)?
  var onFailure: ((Error) -> Void)?

  override init() {
    super.init()
  }

  func presentLink() {
    Task {
      isLoading = true
      do {
        // 1. Fetch Link Token from Backend
        let linkToken = try await accountService.createLinkToken()

        // 2. Create Configuration
        var linkConfiguration = LinkTokenConfiguration(token: linkToken) { [weak self] success in
          self?.handleSuccess(success)
        }

        linkConfiguration.onExit = { [weak self] exit in
          self?.handleExit(exit)
        }

        // 3. Create Handler
        let result = Plaid.create(linkConfiguration)

        switch result {
        case .failure(let error):
          print("Unable to create Plaid handler: \(error)")
          self.error = error
          self.onFailure?(error)
        case .success(let handler):
          self.linkHandlerWrapper = LinkHandlerWrapper(handler: handler)
          self.isPresentingLink = true
        }

      } catch {
        print("Error creating link token: \(error)")
        self.error = error
        self.onFailure?(error)
      }
      isLoading = false
    }
  }

  private func handleSuccess(_ success: LinkSuccess) {
    Task {
      do {
        print("Plaid Link Success: \(success)")

        // Exchange public token for access token via backend
        _ = try await accountService.exchangePublicToken(
          publicToken: success.publicToken,
          institutionId: success.metadata.institution.id,
          institutionName: success.metadata.institution.name
        )

        // Notify success
        self.onSuccess?()
        self.linkHandlerWrapper = nil
        self.isPresentingLink = false

      } catch {
        print("Error exchanging public token: \(error)")
        self.error = error
        self.onFailure?(error)
        self.linkHandlerWrapper = nil
        self.isPresentingLink = false
      }
    }
  }

  private func handleExit(_ exit: LinkExit) {
    if let error = exit.error {
      print("Plaid Link Exited with Error: \(error)")
      self.error = error
      self.onFailure?(error)
    } else {
      print("Plaid Link Exited by User")
    }
    self.linkHandlerWrapper = nil
    self.isPresentingLink = false
  }
}

#Preview {
  AccountsView()
}
