import SwiftUI

struct BudgetDetailView: View {
  let budget: BudgetItem
  var onSave: () -> Void  // Callback for refresh
  @State private var associatedTransactions: [Transaction] = []
  @State private var isLoading = false
  @State private var showingEditSheet = false
  @Environment(\.presentationMode) var presentationMode

  var progressColor: Color {
    if budget.percentageValue >= 100.0 { return AppTheme.destructive }
    if budget.percentageValue >= 80.0 { return AppTheme.warning }
    return AppTheme.success
  }

  var body: some View {
    ZStack {
      AppTheme.background.ignoresSafeArea()

      VStack(spacing: 0) {
        // Header
        HStack {
          Button(action: { presentationMode.wrappedValue.dismiss() }) {
            Image(systemName: "arrow.left")
              .font(.system(size: 20, weight: .semibold))
              .foregroundColor(.primary)
          }
          Spacer()
          Text("Budget Detail")
            .font(.headline)
            .fontWeight(.bold)
          Spacer()
          Button(action: { showingEditSheet = true }) {
            Text("Edit")
              .fontWeight(.medium)
              .foregroundColor(AppTheme.primary)
          }
        }
        .padding()

        ScrollView {
          VStack(spacing: 24) {
            // Summary Card
            VStack(spacing: 16) {
              Text(budget.categoryName)
                .font(.title2)
                .fontWeight(.bold)

              HStack(alignment: .bottom, spacing: 4) {
                Text(budget.remainingValue, format: .currency(code: "USD"))
                  .font(.system(size: 34, weight: .bold))
                  .foregroundStyle(budget.remainingValue < 0 ? AppTheme.destructive : AppTheme.text)
                Text("left")
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
                  .padding(.bottom, 6)
              }

              VStack(spacing: 8) {
                GeometryReader { geometry in
                  ZStack(alignment: .leading) {
                    Capsule()
                      .fill(Color(.systemGray5))
                      .frame(height: 12)

                    Capsule()
                      .fill(progressColor)
                      .frame(
                        width: min(
                          geometry.size.width * (budget.percentageValue / 100.0),
                          geometry.size.width), height: 12)
                  }
                }
                .frame(height: 12)

                HStack {
                  Text("\(Int(budget.percentageValue))% used")
                  Spacer()
                  Text(
                    "\(budget.spentValue, format: .currency(code: "USD")) of \(budget.amountValue, format: .currency(code: "USD"))"
                  )
                }
                .font(.caption)
                .foregroundStyle(.secondary)
              }
            }
            .padding(24)
            .background(AppTheme.card)
            .cornerRadius(20)

            // Transactions List
            VStack(alignment: .leading, spacing: 16) {
              Text("Recent Transactions")
                .font(.headline)
                .padding(.horizontal, 4)

              if isLoading {
                ProgressView()
                  .frame(maxWidth: .infinity)
                  .padding()
              } else if associatedTransactions.isEmpty {
                Text("No transactions found for this category")
                  .foregroundStyle(.secondary)
                  .frame(maxWidth: .infinity, alignment: .center)
                  .padding()
              } else {
                LazyVStack(spacing: 0) {
                  ForEach(associatedTransactions) { transaction in
                    TransactionRow(transaction: transaction)
                      .padding(.horizontal, 4)
                    Divider()
                      .padding(.leading, 56)
                  }
                }
                .background(AppTheme.card)
                .cornerRadius(16)
              }
            }
          }
          .padding()
        }
      }
    }
    .navigationBarHidden(true)
    .sheet(isPresented: $showingEditSheet) {
      EditBudgetView(
        budget: budget,
        onSave: {
          onSave()
          presentationMode.wrappedValue.dismiss()
        },
        onDelete: {
          onSave()  // Trigger refresh on delete too
          presentationMode.wrappedValue.dismiss()
        })
    }
    .task {
      await loadTransactions()
    }
  }

  private func loadTransactions() async {
    isLoading = true
    do {
      let allTransactions = try await TransactionService.shared.getTransactions(limit: 100)
      associatedTransactions = allTransactions.filter {
        $0.category?.name == budget.categoryName
      }
    } catch {
      print("Error loading transactions: \(error)")
    }
    isLoading = false
  }
}
