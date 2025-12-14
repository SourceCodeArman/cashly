import SwiftUI

struct CategoryRulesView: View {
  @Environment(\.dismiss) private var dismiss

  let category: Category
  var onRulesUpdated: (() -> Void)?

  @State private var rules: [CategoryRule] = []
  @State private var combinationMode: CombinationMode = .or
  @State private var selectedTab = 0
  @State private var isLoading = false
  @State private var isSaving = false
  @State private var isApplying = false
  @State private var errorMessage: String?
  @State private var successMessage: String?

  enum CombinationMode: String {
    case and = "AND"
    case or = "OR"
  }

  var enabledRulesCount: Int {
    rules.filter { $0.enabled }.count
  }

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background
          .ignoresSafeArea()

        VStack(spacing: 0) {
          // Tab Picker
          Picker("Tab", selection: $selectedTab) {
            Text("Custom Rules").tag(0)
            Text("✨ Presets").tag(1)
          }
          .pickerStyle(.segmented)
          .padding()

          if selectedTab == 0 {
            customRulesTab
          } else {
            presetsTab
          }
        }
      }
      .navigationTitle("Manage Rules")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            dismiss()
          }
          .foregroundStyle(AppTheme.secondaryText)
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("Save") {
            Task { await saveRules() }
          }
          .fontWeight(.semibold)
          .foregroundStyle(AppTheme.primary)
          .disabled(isSaving || rules.isEmpty)
        }
      }
      .alert(
        "Success",
        isPresented: .init(
          get: { successMessage != nil },
          set: { if !$0 { successMessage = nil } }
        )
      ) {
        Button("OK") { successMessage = nil }
      } message: {
        Text(successMessage ?? "")
      }
      .onAppear {
        // Load rules from the passed category object - no need to refetch!
        if let existingRules = category.rules {
          rules = existingRules
          print("CategoryRulesView: Loaded \(existingRules.count) rules from category object")
        } else {
          print("CategoryRulesView: No rules found in category object, will fetch from backend")
        }

        // Load combination mode from category
        if let combination = category.rulesCombination {
          combinationMode = combination.lowercased() == "and" ? .and : .or
          print("CategoryRulesView: Loaded combination mode: \(combination)")
        }
      }
      .task {
        // Fallback: If rules are nil (e.g., decoding error), fetch from backend
        if category.rules == nil {
          print("CategoryRulesView: Fetching category from backend as fallback")
          do {
            let categories = try await CategoryService.shared.getCategories(forceRefresh: true)
            if let freshCategory = categories.first(where: { $0.id == category.id }),
               let fetchedRules = freshCategory.rules {
              rules = fetchedRules
              print("CategoryRulesView: Loaded \(fetchedRules.count) rules from backend (fallback)")
            }
          } catch {
            print("CategoryRulesView: Failed to fetch category: \(error)")
          }
        }
      }
    }
  }

  // MARK: - Custom Rules Tab
  private var customRulesTab: some View {
    ScrollView {
      VStack(spacing: 20) {
        // Combination Mode
        combinationModeSelector

        // Rules List
        if rules.isEmpty {
          emptyRulesState
        } else {
          VStack(spacing: 12) {
            ForEach(rules) { rule in
              RuleCard(
                rule: rule,
                onUpdate: { updatedRule in
                  if let index = rules.firstIndex(where: { $0.id == updatedRule.id }) {
                    rules[index] = updatedRule
                  }
                },
                onDelete: {
                  rules.removeAll { $0.id == rule.id }
                })
            }
          }
        }

        // Add Rule Button
        Button {
          withAnimation {
            rules.append(CategoryRule())
          }
        } label: {
          HStack {
            Image(systemName: "plus.circle.fill")
            Text("Add Rule")
          }
          .font(.subheadline)
          .fontWeight(.medium)
          .foregroundStyle(AppTheme.primary)
          .padding()
          .frame(maxWidth: .infinity)
          .background(AppTheme.primary.opacity(0.1))
          .cornerRadius(AppTheme.cornerRadius)
        }

        // Apply Rules Button
        if enabledRulesCount > 0 {
          Button {
            Task { await applyRules() }
          } label: {
            HStack {
              if isApplying {
                ProgressView()
                  .tint(.white)
              } else {
                Image(systemName: "play.fill")
              }
              Text("Apply to Transactions")
            }
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(.white)
            .padding()
            .frame(maxWidth: .infinity)
            .background(AppTheme.accent)
            .cornerRadius(AppTheme.cornerRadius)
          }
          .disabled(isApplying)
        }

        // Error Message
        if let error = errorMessage {
          Text(error)
            .font(.caption)
            .foregroundStyle(AppTheme.destructive)
        }
      }
      .padding()
    }
  }

  // MARK: - Presets Tab
  private var presetsTab: some View {
    ScrollView {
      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        ForEach(RulePresets.all) { preset in
          PresetCard(preset: preset, categoryColor: category.color ?? "#808080") {
            // Add preset rules to the list
            withAnimation {
              rules.append(
                contentsOf: preset.rules.map { rule in
                  CategoryRule(
                    field: rule.field,
                    operator: rule.operator,
                    value: rule.value
                  )
                })
              selectedTab = 0  // Switch to custom rules tab
            }
          }
        }
      }
      .padding()
    }
  }

  // MARK: - Combination Mode Selector
  private var combinationModeSelector: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Match Condition")
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(AppTheme.text)

      HStack(spacing: 12) {
        Button {
          combinationMode = .or
        } label: {
          HStack(spacing: 8) {
            Image(systemName: combinationMode == .or ? "checkmark.circle.fill" : "circle")
              .foregroundStyle(combinationMode == .or ? AppTheme.primary : AppTheme.secondaryText)
            VStack(alignment: .leading, spacing: 2) {
              Text("Match **any rule** (OR)")
                .font(.caption)
              Text("Broader matching")
                .font(.caption2)
                .foregroundStyle(AppTheme.secondaryText)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(12)
          .background(combinationMode == .or ? AppTheme.primary.opacity(0.1) : AppTheme.background)
          .cornerRadius(8)
        }
        .foregroundStyle(AppTheme.text)

        Button {
          combinationMode = .and
        } label: {
          HStack(spacing: 8) {
            Image(systemName: combinationMode == .and ? "checkmark.circle.fill" : "circle")
              .foregroundStyle(combinationMode == .and ? AppTheme.primary : AppTheme.secondaryText)
            VStack(alignment: .leading, spacing: 2) {
              Text("Match **all rules** (AND)")
                .font(.caption)
              Text("Stricter matching")
                .font(.caption2)
                .foregroundStyle(AppTheme.secondaryText)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding(12)
          .background(combinationMode == .and ? AppTheme.primary.opacity(0.1) : AppTheme.background)
          .cornerRadius(8)
        }
        .foregroundStyle(AppTheme.text)
      }
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(AppTheme.cornerRadius)
  }

  // MARK: - Empty State
  private var emptyRulesState: some View {
    VStack(spacing: 12) {
      Image(systemName: "doc.text.magnifyingglass")
        .font(.system(size: 40))
        .foregroundStyle(AppTheme.secondaryText)

      Text("No rules defined yet")
        .font(.headline)
        .foregroundStyle(AppTheme.text)

      Text("Click \"Add Rule\" or choose from presets")
        .font(.caption)
        .foregroundStyle(AppTheme.secondaryText)
    }
    .padding(40)
    .frame(maxWidth: .infinity)
    .background(
      RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
        .stroke(style: StrokeStyle(lineWidth: 1, dash: [5]))
        .foregroundStyle(AppTheme.secondaryText.opacity(0.5))
    )
  }

  // MARK: - Save Rules
  private func saveRules() async {
    isSaving = true
    errorMessage = nil

    do {
      try await CategoryService.shared.updateCategoryRules(
        categoryId: category.id,
        rules: rules,  // Send all rules (enabled and disabled)
        combinationMode: combinationMode == .and ? "AND" : "OR"
      )
      onRulesUpdated?()
      dismiss()
    } catch {
      errorMessage = "Failed to save rules: \(error.localizedDescription)"
    }

    isSaving = false
  }

  // MARK: - Apply Rules
  private func applyRules() async {
    isApplying = true
    errorMessage = nil

    do {
      // First save the rules
      try await CategoryService.shared.updateCategoryRules(
        categoryId: category.id,
        rules: rules.filter { $0.enabled }
      )
      // Then apply them
      let result = try await CategoryService.shared.applyCategoryRules(categoryId: category.id)
      successMessage = result
    } catch {
      errorMessage = "Failed to apply rules: \(error.localizedDescription)"
    }

    isApplying = false
  }
}

// MARK: - Rule Card
struct RuleCard: View {
  let rule: CategoryRule
  let onUpdate: (CategoryRule) -> Void
  let onDelete: () -> Void

  @State private var localRule: CategoryRule

  init(
    rule: CategoryRule, onUpdate: @escaping (CategoryRule) -> Void, onDelete: @escaping () -> Void
  ) {
    self.rule = rule
    self.onUpdate = onUpdate
    self.onDelete = onDelete
    self._localRule = State(initialValue: rule)
  }

  var body: some View {
    VStack(spacing: 12) {
      // Enable/Delete Header
      HStack {
        Toggle("", isOn: $localRule.enabled)
          .labelsHidden()
          .tint(AppTheme.primary)
          .onChange(of: localRule.enabled) { _, _ in
            onUpdate(localRule)
          }

        Text(localRule.enabled ? "Enabled" : "Disabled")
          .font(.caption)
          .foregroundStyle(AppTheme.secondaryText)

        Spacer()

        Button {
          onDelete()
        } label: {
          Image(systemName: "trash")
            .foregroundStyle(AppTheme.destructive)
        }
      }

      // Field Picker
      VStack(alignment: .leading, spacing: 4) {
        Text("Field")
          .font(.caption)
          .foregroundStyle(AppTheme.secondaryText)

        Menu {
          ForEach(RuleField.allCases, id: \.self) { field in
            Button(field.displayName) {
              localRule.field = field
              if !RuleOperator.operatorsForField(field).contains(localRule.operator) {
                localRule.operator = RuleOperator.operatorsForField(field).first ?? .contains
              }
              onUpdate(localRule)
            }
          }
        } label: {
          HStack {
            Text(localRule.field.displayName)
              .foregroundStyle(AppTheme.text)
            Spacer()
            Image(systemName: "chevron.down")
              .foregroundStyle(AppTheme.secondaryText)
          }
          .padding(10)
          .background(AppTheme.background)
          .cornerRadius(8)
        }
      }

      // Operator Picker
      VStack(alignment: .leading, spacing: 4) {
        Text("Operator")
          .font(.caption)
          .foregroundStyle(AppTheme.secondaryText)

        Menu {
          ForEach(RuleOperator.operatorsForField(localRule.field), id: \.self) { op in
            Button(op.displayName) {
              localRule.operator = op
              onUpdate(localRule)
            }
          }
        } label: {
          HStack {
            Text(localRule.operator.displayName)
              .foregroundStyle(AppTheme.text)
            Spacer()
            Image(systemName: "chevron.down")
              .foregroundStyle(AppTheme.secondaryText)
          }
          .padding(10)
          .background(AppTheme.background)
          .cornerRadius(8)
        }
      }

      // Value Input
      VStack(alignment: .leading, spacing: 4) {
        Text("Value")
          .font(.caption)
          .foregroundStyle(AppTheme.secondaryText)

        TextField(
          localRule.field == .amount ? "100.00" : "e.g., Starbucks",
          text: $localRule.value
        )
        .keyboardType(localRule.field == .amount ? .decimalPad : .default)
        .textFieldStyle(.plain)
        .padding(10)
        .background(AppTheme.background)
        .cornerRadius(8)
        .onChange(of: localRule.value) { _, _ in
          onUpdate(localRule)
        }
      }
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(AppTheme.cornerRadius)
    .opacity(localRule.enabled ? 1 : 0.6)
  }
}

// MARK: - Preset Card
struct PresetCard: View {
  let preset: RulePreset
  let categoryColor: String
  let onTap: () -> Void

  var body: some View {
    Button(action: onTap) {
      VStack(alignment: .leading, spacing: 8) {
        HStack {
          ZStack {
            RoundedRectangle(cornerRadius: 8)
              .fill(Color(hex: categoryColor).opacity(0.15))
              .frame(width: 36, height: 36)

            Image(systemName: preset.icon)
              .font(.system(size: 16))
              .foregroundStyle(Color(hex: categoryColor))
          }

          Spacer()
        }

        Text(preset.name)
          .font(.subheadline)
          .fontWeight(.medium)
          .foregroundStyle(AppTheme.text)
          .lineLimit(1)

        Text(preset.description)
          .font(.caption2)
          .foregroundStyle(AppTheme.secondaryText)
          .lineLimit(2)
          .multilineTextAlignment(.leading)

        Text("\(preset.rules.count) rules")
          .font(.caption2)
          .foregroundStyle(AppTheme.secondaryText)
      }
      .padding()
      .frame(maxWidth: .infinity, alignment: .leading)
      .background(AppTheme.card)
      .cornerRadius(AppTheme.cornerRadius)
    }
  }
}

// Preview removed - Category uses custom decoder
