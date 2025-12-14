import SwiftUI

struct DebtsView: View {
  @State private var debts: [Debt] = []
  @State private var isLoading = false
  @State private var showAddDebt = false
  @State private var selectedDebt: Debt?

  var totalDebt: Double {
    debts.reduce(0) { $0 + $1.totalAmountValue }
  }

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Debts")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
          Spacer()

          Button(action: {
            showAddDebt = true
          }) {
            Image(systemName: "plus")
              .font(.system(size: 20))
              .foregroundStyle(AppTheme.primary)
              .padding(8)
              .background(AppTheme.primary.opacity(0.1))
              .clipShape(Circle())
          }
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 16)

        ScrollView {
          if isLoading && debts.isEmpty {
            DebtListSkeleton()
          } else if debts.isEmpty {
            EmptyStateView(
              icon: "creditcard.fill",
              title: "No Debts",
              message: "You are debt free! Or add a debt to track it."
            )
          } else {
            VStack(spacing: 20) {
              // Summary Card
              VStack(spacing: 8) {
                Text("Total Debt")
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
                Text(totalDebt, format: .currency(code: "USD"))
                  .font(.system(size: 36, weight: .bold))
                  .foregroundStyle(.primary)
              }
              .frame(maxWidth: .infinity)
              .padding()
              .background(AppTheme.card)
              .cornerRadius(12)
              .shadow(color: .black.opacity(0.05), radius: 5, y: 2)

              // Debt List
              LazyVStack(spacing: 16) {
                ForEach(debts) { debt in
                  Button(action: {
                    selectedDebt = debt
                  }) {
                    DebtRow(debt: debt)
                  }
                  .buttonStyle(PlainButtonStyle())
                }
              }
            }
            .padding()
          }
        }
        .refreshable {
          await loadDebts()
        }
      }
    }
    .sheet(isPresented: $showAddDebt) {
      AddDebtView()
    }
    .sheet(item: $selectedDebt) { debt in
      DebtDetailView(debt: debt)
    }
    .task {
      if debts.isEmpty {
        await loadDebts()
      }
    }
    .onAppear {
      Task {
        await loadDebts()
      }
    }
  }

  private func loadDebts() async {
    isLoading = true
    do {
      debts = try await DebtService.shared.getDebts()
    } catch {
      print("Error loading debts: \(error)")
    }
    isLoading = false
  }
}

struct DebtRow: View {
  let debt: Debt

  var body: some View {
    VStack(spacing: 12) {
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(debt.name)
            .font(.headline)
          Text(debt.category)
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(Color(.systemGray6))
            .cornerRadius(4)
        }

        Spacer()

        VStack(alignment: .trailing, spacing: 4) {
          Text(debt.totalAmountValue, format: .currency(code: "USD"))
            .font(.headline)
            .fontWeight(.bold)
          Text("\(debt.interestRateValue, specifier: "%.2f")% APR")
            .font(.caption)
            .foregroundStyle(AppTheme.destructive)
        }
      }

      Divider()

      HStack {
        Text("Min Payment")
          .font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
        Text(debt.minimumPaymentValue, format: .currency(code: "USD"))
          .font(.subheadline)
          .fontWeight(.medium)

        Text("due \(formatDate(debt.dueDate))")
          .font(.caption)
          .foregroundStyle(.secondary)
          .padding(.leading, 4)
      }
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(12)
    .shadow(color: Color.black.opacity(0.05), radius: 5, y: 2)
  }

  private func formatDate(_ dateString: String) -> String {
    let input = DateFormatter()
    input.dateFormat = "yyyy-MM-dd"
    if let date = input.date(from: dateString) {
      let output = DateFormatter()
      output.dateFormat = "MMM d"
      return output.string(from: date)
    }
    return dateString
  }
}

#Preview {
  DebtsView()
}
