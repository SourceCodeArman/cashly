import SwiftUI

struct EditBudgetView: View {
  let budget: BudgetItem
  var onSave: () -> Void
  var onDelete: () -> Void
  @Environment(\.presentationMode) var presentationMode

  // State variables for form fields
  @State private var amount: String = ""
  @State private var periodType: String = "monthly"
  @State private var startDate: Date = Date()
  @State private var endDate: Date = Date().addingTimeInterval(30 * 24 * 60 * 60)
  @State private var enableAlerts: Bool = false
  @State private var alertThreshold: Double = 80
  @State private var categoryName: String = ""

  @State private var categories: [Category] = []
  @State private var isLoading = false
  @State private var errorMsg: String?

  // Options
  let periodTypes = ["monthly", "weekly", "yearly", "custom"]

  init(budget: BudgetItem, onSave: @escaping () -> Void, onDelete: @escaping () -> Void) {
    self.budget = budget
    self.onSave = onSave
    self.onDelete = onDelete

    // Initialize State with budget values
    _amount = State(initialValue: String(format: "%.2f", budget.amountValue))
    _periodType = State(initialValue: budget.period)
    _categoryName = State(initialValue: budget.categoryName)

    // Parse dates if available, otherwise defaults
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    if let startStr = budget.startDate, let date = formatter.date(from: startStr) {
      _startDate = State(initialValue: date)
    }
    if let endStr = budget.endDate, let date = formatter.date(from: endStr) {
      _endDate = State(initialValue: date)
    }

    _enableAlerts = State(initialValue: budget.alertsEnabled)
    _alertThreshold = State(initialValue: Double(budget.threshold))
  }

  var body: some View {
    NavigationView {
      Form {
        // Section 1: Budget Amount
        Section(header: Text("Budget Settings")) {
          if categories.isEmpty {
            HStack {
              Text("Category")
              Spacer()
              if isLoading {
                ProgressView()
              } else {
                Text(categoryName.isEmpty ? "Loading..." : categoryName)
                  .foregroundStyle(.secondary)
              }
            }
          } else {
            Picker("Category", selection: $categoryName) {
              ForEach(categories, id: \.id) { category in
                Text(category.name).tag(category.name)
              }
            }
          }

          HStack {
            Text("Budget Amount")
            Spacer()
            TextField("Amount", text: $amount)
              .keyboardType(.decimalPad)
              .multilineTextAlignment(.trailing)
          }
        }

        // Section 2: Period & Dates
        Section(header: Text("Period")) {
          Picker("Period Type", selection: $periodType) {
            ForEach(periodTypes, id: \.self) { type in
              Text(type.capitalized).tag(type)
            }
          }
          .onChange(of: periodType) { newValue in
            updateEndDate(for: newValue)
          }

          DatePicker("Period Start", selection: $startDate, displayedComponents: .date)
            .onChange(of: startDate) { _ in
              if periodType != "custom" {
                updateEndDate(for: periodType)
              }
            }
          DatePicker("Period End", selection: $endDate, displayedComponents: .date)
            .disabled(periodType != "custom")
        }

        // Section 3: Alerts
        Section(header: Text("Alerts")) {
          Toggle("Enable Alerts", isOn: $enableAlerts)

          if enableAlerts {
            VStack(alignment: .leading) {
              Text("Alert Threshold: \(Int(alertThreshold))%")
              Slider(value: $alertThreshold, in: 0...100, step: 5)
            }
          }
        }
        Section {
          Button(role: .destructive) {
            deleteBudget()
          } label: {
            if isLoading {
              ProgressView()
            } else {
              Text("Delete Budget")
            }
          }
        }
      }
      .navigationTitle("Edit Budget")
      .navigationBarItems(
        leading: Button("Cancel") { presentationMode.wrappedValue.dismiss() },
        trailing: Button("Update Budget") { saveBudget() }
          .fontWeight(.bold)
      )
      .alert("Error", isPresented: Binding(get: { errorMsg != nil }, set: { _ in errorMsg = nil }))
      {
        Button("OK", role: .cancel) {}
      } message: {
        Text(errorMsg ?? "")
      }
      .task {
        await loadCategories()
      }
    }
  }

  private func updateEndDate(for type: String) {
    let calendar = Calendar.current
    switch type {
    case "weekly":
      endDate = calendar.date(byAdding: .day, value: 7, to: startDate) ?? startDate
    case "monthly":
      endDate = calendar.date(byAdding: .month, value: 1, to: startDate) ?? startDate
    case "yearly":
      endDate = calendar.date(byAdding: .year, value: 1, to: startDate) ?? startDate
    default:
      break
    }
  }

  private func loadCategories() async {
    do {
      let fetchedCategories = try await CategoryService.shared.getCategories()
      await MainActor.run {
        self.categories = fetchedCategories
        // Ensure current category is in the list or select default if empty
          // Optional: handle category not found
        }
    } catch {
      print("Failed to load categories: \(error)")
      await MainActor.run {
        errorMsg = "Failed to load categories: \(error.localizedDescription)"
      }
    }
  }

  private func saveBudget() {
    guard let doubleAmount = Double(amount) else {
      errorMsg = "Invalid amount"
      return
    }

    isLoading = true
    Task {
      do {
        try await BudgetService.shared.updateBudget(
          id: budget.id,
          amount: doubleAmount,
          periodType: periodType,
          startDate: startDate,
          endDate: endDate,
          enableAlerts: enableAlerts,
          alertThreshold: Int(alertThreshold)
        )
        await MainActor.run {
          onSave()  // Trigger refresh in parent
          presentationMode.wrappedValue.dismiss()
        }
      } catch {
        errorMsg = "Failed to update budget: \(error.localizedDescription)"
      }
      isLoading = false
    }
  }

  private func deleteBudget() {
    isLoading = true
    Task {
      do {
        try await BudgetService.shared.deleteBudget(id: budget.id)
        await MainActor.run {
          onDelete()
          presentationMode.wrappedValue.dismiss()
        }
      } catch {
        errorMsg = "Failed to delete budget: \(error.localizedDescription)"
      }
      isLoading = false
    }
  }
}
