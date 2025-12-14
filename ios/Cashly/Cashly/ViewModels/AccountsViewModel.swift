import Combine
import Foundation
import SwiftUI

@MainActor
class AccountsViewModel: ObservableObject {
  @Published var accounts: [Account] = []
  @Published var isLoading: Bool = false
  @Published var errorMessage: String?
  @Published var syncingAccountIds: Set<String> = []
  @Published var selectedAccount: Account?

  private let accountService = AccountService.shared

  func loadAccounts(forceRefresh: Bool = false) async {
    if !forceRefresh && !accounts.isEmpty {
      return
    }
    isLoading = true
    errorMessage = nil

    do {
      accounts = try await accountService.getAccounts(forceRefresh: forceRefresh)
    } catch {
      if let apiError = error as? APIError {
        errorMessage = apiError.errorDescription
      } else {
        errorMessage = error.localizedDescription
      }
    }

    isLoading = false
  }

  func syncAccount(accountId: String) async {
    syncingAccountIds.insert(accountId)

    do {
      let updatedAccount = try await accountService.syncAccount(accountId: accountId)

      // Update account in list
      if let index = accounts.firstIndex(where: { $0.id == accountId }) {
        accounts[index] = updatedAccount
      }

      // Update selected account if it's the one being synced
      if selectedAccount?.id == accountId {
        selectedAccount = updatedAccount
      }
    } catch {
      if let apiError = error as? APIError {
        errorMessage = apiError.errorDescription
      } else {
        errorMessage = "Failed to sync account: \(error.localizedDescription)"
      }
    }

    syncingAccountIds.remove(accountId)
  }

  func syncAllAccounts() async {
    let accountIds = accounts.map { $0.id }
    syncingAccountIds = Set(accountIds)

    await withTaskGroup(of: Void.self) { group in
      for accountId in accountIds {
        group.addTask {
          do {
            _ = try await self.accountService.syncAccount(accountId: accountId)
          } catch {
            // Errors are handled individually
          }
        }
      }
    }

    // Reload all accounts after sync
    await loadAccounts()
    syncingAccountIds.removeAll()
  }

  func updateAccountName(accountId: String, customName: String?) async {
    do {
      let updatedAccount = try await accountService.updateAccount(
        accountId: accountId,
        customName: customName
      )

      // Update account in list
      if let index = accounts.firstIndex(where: { $0.id == accountId }) {
        accounts[index] = updatedAccount
      }

      // Update selected account
      if selectedAccount?.id == accountId {
        selectedAccount = updatedAccount
      }
    } catch {
      if let apiError = error as? APIError {
        errorMessage = apiError.errorDescription
      } else {
        errorMessage = "Failed to  update account: \(error.localizedDescription)"
      }
    }
  }

  func disconnectAccount(accountId: String) async {
    do {
      try await accountService.disconnectAccount(accountId: accountId)

      // Remove from list
      accounts.removeAll { $0.id == accountId }

      // Clear selected if it was the disconnected account
      if selectedAccount?.id == accountId {
        selectedAccount = nil
      }
    } catch {
      if let apiError = error as? APIError {
        errorMessage = apiError.errorDescription
      } else {
        errorMessage = "Failed to disconnect account: \(error.localizedDescription)"
      }
    }
  }
}
