import SwiftUI

struct DebtDetailView: View {
  @State private var debt: Debt
  @State private var showEditSheet = false
  @State private var showDeleteAlert = false
  @State private var isDeleting = false
  @Environment(\.dismiss) private var dismiss

  init(debt: Debt) {
    _debt = State(initialValue: debt)
  }

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Debt Details")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)

          Spacer()

          // Edit button only for manual debts
          if debt.isSynced != true {
            Button("Edit") {
              showEditSheet = true
            }
            .foregroundStyle(AppTheme.primary)
            .fontWeight(.medium)
          }
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 16)

        ScrollView {
          VStack(spacing: 20) {
            // Header Card with Debt Type and Badge
            VStack(spacing: 12) {
              // Debt Type Icon
              Image(systemName: debtTypeIcon)
                .font(.system(size: 50))
                .foregroundStyle(AppTheme.primary)

              // Debt Name
              Text(debt.name)
                .font(.title2)
                .fontWeight(.bold)

              // Creditor Name (if available)
              if let creditor = debt.creditorName, !creditor.isEmpty {
                Text(creditor)
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
              }

              // Account Number (if available)
              if let accountNumber = debt.accountNumberMasked, !accountNumber.isEmpty {
                Text("****\(accountNumber)")
                  .font(.caption)
                  .foregroundStyle(.secondary)
                  .padding(.horizontal, 12)
                  .padding(.vertical, 4)
                  .background(Color(.systemGray6))
                  .cornerRadius(8)
              }

              // Synced Badge
              if debt.isSynced == true {
                HStack(spacing: 4) {
                  Image(systemName: "checkmark.circle.fill")
                    .font(.caption)
                  Text("Synced from Bank")
                    .font(.caption)
                }
                .foregroundStyle(.green)
                .padding(.horizontal, 12)
                .padding(.vertical, 4)
                .background(Color.green.opacity(0.1))
                .cornerRadius(8)
              }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(AppTheme.card)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)

            // Balance Card
            VStack(spacing: 16) {
              VStack(spacing: 4) {
                Text("CURRENT BALANCE")
                  .font(.caption)
                  .foregroundStyle(.secondary)
                Text(debt.totalAmountValue, format: .currency(code: "USD"))
                  .font(.system(size: 36, weight: .bold))
                  .foregroundStyle(AppTheme.destructive)
              }

              Divider()

              HStack {
                Text("Original Balance")
                  .font(.subheadline)
                  .foregroundStyle(.secondary)
                Spacer()
                // Note: Original balance not in current model, would need backend update
                Text(debt.totalAmountValue, format: .currency(code: "USD"))
                  .font(.subheadline)
                  .fontWeight(.medium)
              }
            }
            .padding()
            .background(AppTheme.card)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)

            // Payment Details Card
            VStack(alignment: .leading, spacing: 16) {
              Text("PAYMENT DETAILS")
                .font(.caption)
                .foregroundStyle(.secondary)

              DetailRow(
                label: "Interest Rate", value: String(format: "%.2f%% APR", debt.interestRateValue),
                valueColor: AppTheme.destructive)

              if let minPayment = debt.minimumPayment, minPayment.value > 0 {
                DetailRow(
                  label: "Minimum Payment", value: minPayment.value, format: .currency(code: "USD"))
              } else {
                DetailRow(label: "Minimum Payment", value: "Not Set")
              }

              if let dueDate = debt.nextDueDate, !dueDate.isEmpty {
                DetailRow(label: "Next Due Date", value: formatDate(dueDate))
              }

              DetailRow(
                label: "Status", value: debt.status.capitalized,
                valueColor: debt.status == "active" ? .green : .secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(AppTheme.card)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)

            // Delete Button (only for manual debts)
            if debt.isSynced != true {
              Button(
                role: .destructive,
                action: {
                  showDeleteAlert = true
                }
              ) {
                HStack {
                  Image(systemName: "trash")
                  Text("Delete Debt")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.red.opacity(0.1))
                .foregroundStyle(.red)
                .cornerRadius(12)
              }
            }
          }
          .padding()
        }
      }
    }
    .sheet(
      isPresented: $showEditSheet,
      onDismiss: {
        // Reload debt after editing
        Task {
          await reloadDebt()
        }
      }
    ) {
      EditDebtView(debt: debt)
    }
    .alert("Delete Debt", isPresented: $showDeleteAlert) {
      Button("Cancel", role: .cancel) {}
      Button("Delete", role: .destructive) {
        Task {
          await deleteDebt()
        }
      }
    } message: {
      Text("Are you sure you want to delete \(debt.name)? This action cannot be undone.")
    }
  }

  private var debtTypeIcon: String {
    switch debt.debtType {
    case "credit_card":
      return "creditcard.fill"
    case "personal_loan", "loan":
      return "dollarsign.circle.fill"
    case "auto_loan":
      return "car.fill"
    case "student_loan":
      return "graduationcap.fill"
    case "mortgage":
      return "house.fill"
    default:
      return "dollarsign.circle.fill"
    }
  }

  private func formatDate(_ dateString: String) -> String {
    let input = DateFormatter()
    input.dateFormat = "yyyy-MM-dd"
    if let date = input.date(from: dateString) {
      let output = DateFormatter()
      output.dateStyle = .medium
      return output.string(from: date)
    }
    return dateString
  }

  private func deleteDebt() async {
    isDeleting = true
    do {
      try await DebtService.shared.deleteDebt(debtId: debt.id)
      // Ensure dismiss happens on main thread
      await MainActor.run {
        dismiss()
      }
    } catch {
      print("❌ Error deleting debt: \(error)")
      print("❌ Error details: \(error.localizedDescription)")
    }
    isDeleting = false
  }

  private func reloadDebt() async {
    print("🔄 Reloading debt with ID: \(debt.id)")
    do {
      let updatedDebt = try await DebtService.shared.getDebt(debtId: debt.id)
      print("✅ Successfully reloaded debt: \(updatedDebt.name)")
      await MainActor.run {
        debt = updatedDebt
      }
    } catch {
      print("❌ Error reloading debt: \(error)")
      print("❌ Error details: \(error.localizedDescription)")
      if let decodingError = error as? DecodingError {
        switch decodingError {
        case .keyNotFound(let key, let context):
          print(
            "❌ Key not found: \(key.stringValue) at path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))"
          )
        case .typeMismatch(let type, let context):
          print(
            "❌ Type mismatch: Expected \(type) at path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))"
          )
        default:
          print("❌ Decoding error: \(decodingError)")
        }
      }
    }
  }
}

// Helper view for detail rows
struct DetailRow: View {
  let label: String
  let value: String
  var valueColor: Color = .primary

  init(label: String, value: String, valueColor: Color = .primary) {
    self.label = label
    self.value = value
    self.valueColor = valueColor
  }

  init(label: String, value: Double, format: FloatingPointFormatStyle<Double>.Currency) {
    self.label = label
    self.value = value.formatted(format)
    self.valueColor = .primary
  }

  var body: some View {
    HStack {
      Text(label)
        .font(.subheadline)
        .foregroundStyle(.secondary)
      Spacer()
      Text(value)
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(valueColor)
    }
  }
}

#Preview {
  NavigationStack {
    DebtDetailView(
      debt: Debt(
        debtId: "1",
        name: "Chase Freedom",
        debtType: "credit_card",
        currentBalance: LenientDouble(value: 5432.19),
        interestRate: LenientDouble(value: 15.99),
        minimumPayment: LenientDouble(value: 125.00),
        nextDueDate: "2025-01-15",
        creditorName: "Chase Bank",
        accountNumberMasked: "1234",
        status: "active",
        isSynced: false
      ))
  }
}
