import SwiftUI

struct AddBudgetView: View {
  var onSave: () -> Void
  @Environment(\.presentationMode) var presentationMode

  // State variables for form fields
  @State private var amount: String = ""
  @State private var periodType: String = "monthly"
  @State private var startDate: Date = Date()
  @State private var endDate: Date = Date().addingTimeInterval(30 * 24 * 60 * 60)
  @State private var enableAlerts: Bool = false
  @State private var alertThreshold: Double = 80
  @State private var selectedCategoryID: String = ""

  @State private var categories: [Category] = []
  @State private var isLoading = false
  @State private var isSaving = false
  @State private var errorMsg: String?

  // Options
  let periodTypes = ["monthly", "weekly", "yearly", "custom"]

  var body: some View {
    NavigationView {
      Form {
        // Section 1: Budget Amount
        Section(header: Text("Budget Settings")) {
          if categories.isEmpty {
            if isLoading {
              HStack {
                Text("Category")
                Spacer()
                ProgressView()
              }
            } else {
              Text("No categories available")
                .foregroundStyle(.secondary)
            }
          } else {
            Picker("Category", selection: $selectedCategoryID) {
              ForEach(categories, id: \.id) { category in
                Text(category.name).tag(category.id)
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
      }
      .navigationTitle("Add Budget")
      .navigationBarItems(
        leading: Button("Cancel") { presentationMode.wrappedValue.dismiss() },
        trailing: Button("Create") { createBudget() }
          .fontWeight(.bold)
          .disabled(selectedCategoryID.isEmpty || amount.isEmpty || isSaving)
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
      .overlay {
        if isSaving {
          ZStack {
            Color.black.opacity(0.3).ignoresSafeArea()
            ProgressView()
              .padding()
              .background(AppTheme.card)
              .cornerRadius(10)
          }
        }
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
    isLoading = true
    do {
      let fetchedCategories = try await CategoryService.shared.getCategories()
      await MainActor.run {
        self.categories = fetchedCategories
        if let first = categories.first, selectedCategoryID.isEmpty {
          selectedCategoryID = first.id
        }
      }
    } catch {
      print("Failed to load categories: \(error)")
      await MainActor.run {
        errorMsg = "Failed to load categories: \(error.localizedDescription)"
      }
    }
    isLoading = false
  }

  private func createBudget() {
    guard let doubleAmount = Double(amount) else {
      errorMsg = "Invalid amount"
      return
    }

    isSaving = true
    Task {
      do {
        try await BudgetService.shared.createBudget(
          categoryId: selectedCategoryID,
          amount: doubleAmount,
          periodType: periodType,
          startDate: startDate,
          endDate: endDate,
          enableAlerts: enableAlerts,
          alertThreshold: Int(alertThreshold)
        )
        await MainActor.run {
          onSave()
          presentationMode.wrappedValue.dismiss()
        }
      } catch {
        errorMsg = "Failed to create budget: \(error.localizedDescription)"
      }
      isSaving = false
    }
  }
}
