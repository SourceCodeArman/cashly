import SwiftUI

struct EditDebtView: View {
    let debt: Debt
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var debtType: String
    @State private var currentBalance: String
    @State private var interestRate: String
    @State private var minimumPayment: String
    @State private var dueDay: String
    @State private var creditorName: String
    @State private var isSubmitting = false
    @State private var errorMessage: String?
    
    init(debt: Debt) {
        self.debt = debt
        _name = State(initialValue: debt.name)
        _debtType = State(initialValue: debt.debtType)
        _currentBalance = State(initialValue: String(format: "%.2f", debt.totalAmountValue))
        _interestRate = State(initialValue: String(format: "%.2f", debt.interestRateValue))
        _minimumPayment = State(initialValue: debt.minimumPaymentValue > 0 ? String(format: "%.2f", debt.minimumPaymentValue) : "")
        
        // Extract due day from next_due_date if available
        if let dueDate = debt.nextDueDate, !dueDate.isEmpty {
            let components = dueDate.split(separator: "-")
            if components.count == 3, let day = Int(components[2]) {
                _dueDay = State(initialValue: String(day))
            } else {
                _dueDay = State(initialValue: "1")
            }
        } else {
            _dueDay = State(initialValue: "1")
        }
        
        _creditorName = State(initialValue: debt.creditorName ?? "")
    }
    
    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Basic Information")) {
                    TextField("Debt Name", text: $name)
                        .textInputAutocapitalization(.words)
                    
                    // Debt type is now editable
                    Picker("Debt Type", selection: $debtType) {
                        Text("Credit Card").tag("credit_card")
                        Text("Personal Loan").tag("personal_loan")
                        Text("Auto Loan").tag("auto_loan")
                        Text("Student Loan").tag("student_loan")
                        Text("Mortgage").tag("mortgage")
                        Text("Other").tag("other")
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
            .navigationTitle("Edit Debt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await submitUpdate()
                        }
                    }
                    .disabled(isSubmitting || !isValid)
                }
            }
        }
    }
    
    private var isValid: Bool {
        !name.isEmpty &&
        !currentBalance.isEmpty &&
        !interestRate.isEmpty &&
        !dueDay.isEmpty &&
        Double(currentBalance) != nil &&
        Double(interestRate) != nil &&
        (minimumPayment.isEmpty || Double(minimumPayment) != nil) &&
        Int(dueDay) != nil &&
        (Int(dueDay) ?? 0) >= 1 &&
        (Int(dueDay) ?? 0) <= 31
    }
    
    private func submitUpdate() async {
        guard isValid else { return }
        
        isSubmitting = true
        errorMessage = nil
        
        do {
            _ = try await DebtService.shared.updateDebt(
                debtId: debt.id,
                name: name,
                debtType: debtType,
                currentBalance: currentBalance,
                interestRate: interestRate,
                minimumPayment: minimumPayment.isEmpty ? nil : minimumPayment,
                dueDay: Int(dueDay) ?? 1,
                creditorName: creditorName.isEmpty ? nil : creditorName
            )
            
            // Success
            dismiss()
        } catch {
            // Log the full error for debugging
            print("❌ Error updating debt: \(error)")
            print("❌ Error details: \(error.localizedDescription)")
            
            // Try to extract a meaningful error message
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? "Failed to update debt. Please try again."
            } else {
                errorMessage = error.localizedDescription
            }
        }
        
        isSubmitting = false
    }
}

#Preview {
    EditDebtView(debt: Debt(
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
