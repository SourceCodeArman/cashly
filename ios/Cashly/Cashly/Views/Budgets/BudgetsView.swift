import SwiftUI

struct BudgetsView: View {
  @State private var budgets: [BudgetItem] = []
  @State private var isLoading = false
  @State private var selectedBudget: BudgetItem?
  @State private var showingAddBudget = false

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Budgets")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
          Spacer()

          Button(action: {
            showingAddBudget = true
          }) {
            Image(systemName: "plus.circle.fill")
              .font(.system(size: 24))
              .foregroundStyle(AppTheme.primary)
          }
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 16)

        // Content
        ScrollView {
          if isLoading && budgets.isEmpty {
            BudgetListSkeleton()
          } else if budgets.isEmpty {
            EmptyStateView(
              icon: "chart.bar.fill",
              title: "No Budgets",
              message: "Create a budget to start tracking your spending"
            )
          } else {
            LazyVStack(spacing: 16) {
              ForEach(budgets) { budget in
                Button(action: {
                  selectedBudget = budget
                }) {
                  BudgetRow(budget: budget)
                }
                .buttonStyle(PlainButtonStyle())
              }
            }
            .padding()
          }
        }
        .refreshable {
          await loadBudgets(forceRefresh: true)
        }
      }
    }
    .sheet(item: $selectedBudget) { budget in
      BudgetDetailView(
        budget: budget,
        onSave: {
          Task {
            await loadBudgets(forceRefresh: true)
            // Note: DetailView dismisses itself, so we don't need to manually clear selectedBudget here immediately,
            // but we want to make sure the view is refreshed.
          }
        })
    }
    .sheet(isPresented: $showingAddBudget) {
      AddBudgetView(onSave: {
        Task {
          await loadBudgets(forceRefresh: true)
        }
      })
    }
    .task {
      if budgets.isEmpty {
        await loadBudgets()
      }
    }
  }

  private func loadBudgets(forceRefresh: Bool = false) async {
    isLoading = true
    do {
      budgets = try await BudgetService.shared.getBudgets(forceRefresh: forceRefresh)
    } catch {
      print("Error loading budgets: \(error)")
    }
    isLoading = false
  }
}

struct BudgetRow: View {
  let budget: BudgetItem

  var progressColor: Color {
    if budget.percentageValue >= 100.0 { return AppTheme.destructive }
    if budget.percentageValue >= 80.0 { return AppTheme.warning }
    return AppTheme.success
  }

  var body: some View {
    VStack(spacing: 12) {
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(budget.categoryName)
            .font(.headline)
          Text("\(Int(budget.percentageValue))% used")
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        VStack(alignment: .trailing, spacing: 4) {
          Text(budget.remainingValue, format: .currency(code: "USD"))
            .font(.headline)
            .foregroundStyle(budget.remainingValue < 0 ? AppTheme.destructive : AppTheme.text)
          Text("left of \(budget.amountValue.formatted(.currency(code: "USD")))")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          Capsule()
            .fill(Color(.systemGray5))
            .frame(height: 8)

          Capsule()
            .fill(progressColor)
            .frame(
              width: min(
                geometry.size.width * (budget.percentageValue / 100.0), geometry.size.width),
              height: 8)
        }
      }
      .frame(height: 8)
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(12)
    .shadow(color: Color.black.opacity(0.05), radius: 5, y: 2)
  }
}

#Preview {
  BudgetsView()
}
