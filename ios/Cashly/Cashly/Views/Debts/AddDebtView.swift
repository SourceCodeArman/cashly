import SwiftUI

struct AddDebtView: View {
  @Environment(\.dismiss) private var dismiss
  @State private var name = ""
  @State private var debtType = "credit_card"
  @State private var currentBalance = ""
  @State private var interestRate = ""
  @State private var minimumPayment = ""
  @State private var dueDay = ""
  @State private var creditorName = ""
  @State private var isSubmitting = false
  @State private var errorMessage: String?

  let debtTypes = [
    ("credit_card", "Credit Card"),
    ("personal_loan", "Personal Loan"),
    ("auto_loan", "Auto Loan"),
    ("student_loan", "Student Loan"),
    ("mortgage", "Mortgage"),
    ("other", "Other"),
  ]

  var body: some View {
    NavigationStack {
      Form {
        Section(header: Text("Basic Information")) {
          TextField("Debt Name", text: $name)
            .textInputAutocapitalization(.words)

          Picker("Debt Type", selection: $debtType) {
            ForEach(debtTypes, id: \.0) { type in
              Text(type.1).tag(type.0)
            }
          }

          TextField("Creditor Name (Optional)", text: $creditorName)
            .textInputAutocapitalization(.words)
        }

        Section(header: Text("Financial Details")) {
          TextField("Current Balance", text: $currentBalance)
            .keyboardType(.decimalPad)
            .textInputAutocapitalization(.never)

          TextField("Interest Rate (%)", text: $interestRate)
            .keyboardType(.decimalPad)
            .textInputAutocapitalization(.never)

          TextField("Minimum Payment (Optional)", text: $minimumPayment)
            .keyboardType(.decimalPad)
            .textInputAutocapitalization(.never)

          TextField("Due Day (1-31)", text: $dueDay)
            .keyboardType(.numberPad)
            .textInputAutocapitalization(.never)
        }

        if let error = errorMessage {
          Section {
            Text(error)
              .foregroundStyle(.red)
              .font(.caption)
          }
        }
      }
      .navigationTitle("Add Debt")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            dismiss()
          }
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("Add") {
            Task {
              await submitDebt()
            }
          }
          .disabled(isSubmitting || !isValid)
        }
      }
    }
  }

  private var isValid: Bool {
    !name.isEmpty && !currentBalance.isEmpty && !interestRate.isEmpty && !dueDay.isEmpty
      && Double(currentBalance) != nil && Double(interestRate) != nil
      && (minimumPayment.isEmpty || Double(minimumPayment) != nil) && Int(dueDay) != nil
      && (Int(dueDay) ?? 0) >= 1 && (Int(dueDay) ?? 0) <= 31
  }

  private func submitDebt() async {
    guard isValid else { return }

    isSubmitting = true
    errorMessage = nil

    // Prepare request body
    struct CreateDebtRequest: Encodable {
      let name: String
      let debtType: String
      let currentBalance: String
      let originalBalance: String
      let interestRate: String
      let minimumPayment: String?
      let dueDay: Int
      let creditorName: String?
      let status: String
      let isActive: Bool

      enum CodingKeys: String, CodingKey {
        case name
        case debtType = "debt_type"
        case currentBalance = "current_balance"
        case originalBalance = "original_balance"
        case interestRate = "interest_rate"
        case minimumPayment = "minimum_payment"
        case dueDay = "due_day"
        case creditorName = "creditor_name"
        case status
        case isActive = "is_active"
      }
    }

    let request = CreateDebtRequest(
      name: name,
      debtType: debtType,
      currentBalance: currentBalance,
      originalBalance: currentBalance,  // Start with same as current
      interestRate: interestRate,
      minimumPayment: minimumPayment.isEmpty ? nil : minimumPayment,
      dueDay: Int(dueDay) ?? 1,
      creditorName: creditorName.isEmpty ? nil : creditorName,
      status: "active",
      isActive: true
    )

    do {
      struct DebtResponse: Decodable {
        let success: Bool
        let message: String?
        let data: Debt?
      }

      let _: DebtResponse = try await APIClient.shared.post(
        endpoint: "/debts/debts/",
        body: request,
        requiresAuth: true
      )

      // Success
      dismiss()
    } catch {
      // Log the full error for debugging
      print("❌ Error adding debt: \(error)")
      print("❌ Error details: \(error.localizedDescription)")

      // Try to extract a meaningful error message
      if let apiError = error as? APIError {
        errorMessage = apiError.errorDescription ?? "Failed to add debt. Please try again."
      } else {
        errorMessage = error.localizedDescription
      }
    }

    isSubmitting = false
  }
}

#Preview {
  AddDebtView()
}
