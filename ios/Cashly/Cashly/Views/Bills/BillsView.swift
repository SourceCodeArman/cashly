import SwiftUI

struct BillsView: View {
  @State private var bills: [Bill] = []
  @State private var isLoading = false

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Bills")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
          Spacer()
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 16)

        List {
          if isLoading && bills.isEmpty {
            BillListSkeleton()
          } else if bills.isEmpty {
            EmptyStateView(
              icon: "doc.text.fill",
              title: "No Bills",
              message: "You don't have any upcoming bills."
            )
          } else {
            ForEach(bills) { bill in
              BillRow(bill: bill)
                .listRowBackground(AppTheme.card)
            }
          }
        }
        .listStyle(.plain)
        .refreshable {
          await loadBills()
        }
        .scrollContentBackground(.hidden)
      }
    }
    .task {
      if bills.isEmpty {
        await loadBills()
      }
    }
  }

  private func loadBills() async {
    isLoading = true
    do {
      bills = try await BillService.shared.getUpcomingBills()
    } catch {
      print("Error loading bills: \(error)")
    }
    isLoading = false
  }
}

struct BillRow: View {
  let bill: Bill

  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 4) {
        Text(bill.name)
          .font(.headline)
        Text("Due \(bill.dueDate)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer()

      VStack(alignment: .trailing, spacing: 4) {
        Text(bill.amountValue, format: .currency(code: "USD"))
          .fontWeight(.bold)

        if bill.isPaidValue {
          Text("Paid")
            .font(.caption)
            .foregroundStyle(AppTheme.success)
            .fontWeight(.medium)
        } else {
          Text(bill.isAutoPay ? "Auto Pay" : "Due Soon")
            .font(.caption)
            .foregroundStyle(bill.isAutoPay ? AppTheme.primary : AppTheme.warning)
        }
      }
    }
    .padding(.vertical, 4)
  }
}

#Preview {
  BillsView()
}
