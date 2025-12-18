import SwiftUI

// MARK: - Combination Mode Enum
enum CombinationMode: String {
  case and = "AND"
  case or = "OR"
}

struct AddCategoryView: View {
  @Environment(\.dismiss) private var dismiss

  @State private var name = ""
  @State private var type = "expense"
  @State private var selectedIcon = "tag"
  @State private var selectedColor = "#FF9800"
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var showIconPicker = false
  @State private var showRulesPicker = false
  @State private var pendingRules: [CategoryRule] = []
  @State private var rulesCombinationMode: CombinationMode = .or

  var onCategoryCreated: (() -> Void)?

  private let categoryTypes = ["expense", "income"]

  private let presetColors = [
    "#FF9800", "#2196F3", "#E91E63", "#4CAF50", "#9C27B0",
    "#FFC107", "#00BCD4", "#F44336", "#3F51B5", "#9E9E9E",
  ]

  private let availableIcons = [
    // Food & Dining
    ("fork.knife", "Food"),
    ("cart.fill", "Groceries"),
    ("cup.and.saucer.fill", "Coffee"),

    // Transportation
    ("car.fill", "Car"),
    ("fuelpump.fill", "Gas"),
    ("bus.fill", "Transit"),
    ("airplane", "Travel"),

    // Shopping & Lifestyle
    ("bag.fill", "Shopping"),
    ("tshirt.fill", "Clothing"),
    ("gift.fill", "Gift"),

    // Home & Bills
    ("house.fill", "Home"),
    ("bolt.fill", "Utilities"),
    ("wifi", "Internet"),

    // Health & Education
    ("heart.fill", "Health"),
    ("cross.fill", "Medical"),
    ("graduationcap.fill", "Education"),
    ("book.fill", "Books"),

    // Finance
    ("dollarsign.circle.fill", "Income"),
    ("banknote.fill", "Salary"),
    ("chart.line.uptrend.xyaxis", "Investment"),
    ("briefcase.fill", "Work"),

    // Entertainment
    ("tv.fill", "Entertainment"),
    ("film.fill", "Movies"),
    ("music.note", "Music"),
    ("gamecontroller.fill", "Games"),
    ("dumbbell.fill", "Fitness"),

    // Other
    ("sparkles", "Other"),
    ("star.fill", "Favorite"),
    ("tag.fill", "General"),
  ]

  // Computed property to get the display name of the selected icon
  private var selectedIconName: String {
    availableIcons.first(where: { $0.0 == selectedIcon })?.1 ?? "Choose Icon"
  }

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background
          .ignoresSafeArea()

        ScrollView {
          VStack(spacing: 24) {
            // Preview Card
            previewCard

            // Form Fields
            VStack(spacing: 20) {
              nameField
              typeField
              colorField
              iconField
              rulesField
            }
            .padding()
            .background(AppTheme.card)
            .cornerRadius(AppTheme.cornerRadius)
            .padding(.horizontal)

            // Error Message
            if let error = errorMessage {
              Text(error)
                .font(.caption)
                .foregroundStyle(AppTheme.destructive)
                .padding(.horizontal)
            }
          }
          .padding(.vertical)
        }
      }
      .navigationTitle("New Category")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            dismiss()
          }
          .foregroundStyle(AppTheme.secondaryText)
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("Create") {
            Task { await createCategory() }
          }
          .fontWeight(.semibold)
          .foregroundStyle(AppTheme.primary)
          .disabled(name.isEmpty || isLoading)
        }
      }
      .sheet(isPresented: $showIconPicker) {
        IconPickerView(
          selectedIcon: $selectedIcon,
          selectedColor: selectedColor,
          icons: availableIcons
        )
      }
      .sheet(isPresented: $showRulesPicker) {
        RulesPickerView(
          rules: $pendingRules,
          combinationMode: $rulesCombinationMode,
          categoryColor: selectedColor
        )
      }
    }
  }

  // MARK: - Preview Card
  private var previewCard: some View {
    VStack(spacing: 12) {
      Text("Preview")
        .font(.caption)
        .foregroundStyle(AppTheme.secondaryText)

      HStack {
        ZStack {
          Circle()
            .fill(Color(hex: selectedColor).opacity(0.15))
            .frame(width: 50, height: 50)

          Image(systemName: selectedIcon)
            .font(.system(size: 24))
            .foregroundStyle(Color(hex: selectedColor))
        }

        VStack(alignment: .leading, spacing: 4) {
          Text(name.isEmpty ? "Category Name" : name)
            .font(.headline)
            .foregroundStyle(name.isEmpty ? AppTheme.secondaryText : AppTheme.text)

          Text(type.capitalized)
            .font(.caption)
            .foregroundStyle(AppTheme.secondaryText)
        }

        Spacer()
      }
      .padding()
      .background(AppTheme.card)
      .cornerRadius(AppTheme.cornerRadius)
    }
    .padding(.horizontal)
  }

  // MARK: - Name Field
  private var nameField: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Name")
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(AppTheme.text)

      TextField("e.g., Coffee Shops", text: $name)
        .textFieldStyle(.plain)
        .padding()
        .background(AppTheme.background)
        .cornerRadius(10)
    }
  }

  // MARK: - Type Field
  private var typeField: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Type")
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(AppTheme.text)

      HStack(spacing: 12) {
        ForEach(categoryTypes, id: \.self) { categoryType in
          Button {
            type = categoryType
          } label: {
            Text(categoryType.capitalized)
              .font(.subheadline)
              .fontWeight(.medium)
              .foregroundStyle(type == categoryType ? AppTheme.background : AppTheme.text)
              .padding(.horizontal, 20)
              .padding(.vertical, 12)
              .background(
                type == categoryType
                  ? AppTheme.primary
                  : AppTheme.background
              )
              .cornerRadius(10)
          }
        }
        Spacer()
      }
    }
  }

  // MARK: - Color Field
  private var colorField: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Color")
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(AppTheme.text)

      LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 12) {
        ForEach(presetColors, id: \.self) { color in
          Button {
            selectedColor = color
          } label: {
            ZStack {
              Circle()
                .fill(Color(hex: color))
                .frame(width: 44, height: 44)

              if selectedColor == color {
                Image(systemName: "checkmark")
                  .font(.system(size: 16, weight: .bold))
                  .foregroundStyle(.white)
              }
            }
          }
        }
      }
    }
  }

  // MARK: - Icon Field
  private var iconField: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Icon")
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(AppTheme.text)

      Button {
        showIconPicker = true
      } label: {
        HStack {
          ZStack {
            RoundedRectangle(cornerRadius: 10)
              .fill(Color(hex: selectedColor).opacity(0.15))
              .frame(width: 50, height: 50)

            Image(systemName: selectedIcon)
              .font(.system(size: 24))
              .foregroundStyle(Color(hex: selectedColor))
          }

          Text(selectedIconName)
            .font(.subheadline)
            .foregroundStyle(AppTheme.secondaryText)

          Spacer()

          Image(systemName: "chevron.right")
            .font(.system(size: 14))
            .foregroundStyle(AppTheme.secondaryText)
        }
        .padding()
        .background(AppTheme.background)
        .cornerRadius(10)
      }
    }
  }

  // MARK: - Rules Field
  private var rulesField: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Auto-Categorization Rules")
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(AppTheme.text)

      Button {
        showRulesPicker = true
      } label: {
        HStack {
          ZStack {
            RoundedRectangle(cornerRadius: 10)
              .fill(Color(hex: selectedColor).opacity(0.15))
              .frame(width: 50, height: 50)

            Image(systemName: "list.bullet.rectangle")
              .font(.system(size: 24))
              .foregroundStyle(Color(hex: selectedColor))
          }

          VStack(alignment: .leading) {
            Text(pendingRules.isEmpty ? "Add Rules" : "\(pendingRules.count) rule(s)")
              .font(.subheadline)
              .foregroundStyle(AppTheme.secondaryText)
            if !pendingRules.isEmpty {
              Text("Tap to edit")
                .font(.caption2)
                .foregroundStyle(AppTheme.secondaryText.opacity(0.7))
            }
          }

          Spacer()

          Image(systemName: "chevron.right")
            .font(.system(size: 14))
            .foregroundStyle(AppTheme.secondaryText)
        }
        .padding()
        .background(AppTheme.background)
        .cornerRadius(10)
      }
    }
  }

  // MARK: - Create Category
  private func createCategory() async {
    guard !name.isEmpty else { return }

    isLoading = true
    errorMessage = nil

    do {
      // Create the category and get the created category with ID
      let createdCategory = try await CategoryService.shared.createCategory(
        name: name,
        type: type,
        icon: selectedIcon,
        color: selectedColor
      )

      // If there are pending rules, save them now
      if !pendingRules.isEmpty {
        try await CategoryService.shared.updateCategoryRules(
          categoryId: createdCategory.id,
          rules: pendingRules,
          combinationMode: rulesCombinationMode == .and ? "AND" : "OR"
        )
      }

      dismiss()
    } catch {
      errorMessage = "Failed to create category: \(error.localizedDescription)"
      isLoading = false
    }
  }
}

// MARK: - Rules Picker View (simplified for category creation)
struct RulesPickerView: View {
  @Environment(\.dismiss) private var dismiss
  @Binding var rules: [CategoryRule]
  @Binding var combinationMode: CombinationMode
  let categoryColor: String

  @State private var localRules: [CategoryRule] = []
  @State private var localCombinationMode: CombinationMode = .or
  @State private var selectedTab = 0

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background
          .ignoresSafeArea()

        VStack(spacing: 0) {
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
      .navigationTitle("Category Rules")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Cancel") {
            dismiss()
          }
          .foregroundStyle(AppTheme.secondaryText)
        }

        ToolbarItem(placement: .confirmationAction) {
          Button("Done") {
            rules = localRules
            combinationMode = localCombinationMode
            dismiss()
          }
          .fontWeight(.semibold)
          .foregroundStyle(AppTheme.primary)
        }
      }
      .onAppear {
        localRules = rules
        localCombinationMode = combinationMode
      }
    }
  }

  private var customRulesTab: some View {
    ScrollView {
      VStack(spacing: 20) {
        // Combination Mode Selector
        combinationModeSelector

        // Rules List
        if localRules.isEmpty {
          VStack(spacing: 12) {
            Image(systemName: "doc.text.magnifyingglass")
              .font(.system(size: 40))
              .foregroundStyle(AppTheme.secondaryText)
            Text("No rules added")
              .font(.headline)
              .foregroundStyle(AppTheme.text)
            Text("Add rules or choose from presets")
              .font(.caption)
              .foregroundStyle(AppTheme.secondaryText)
          }
          .padding(40)
        } else {
          VStack(spacing: 12) {
            ForEach(localRules) { rule in
              RuleCard(
                rule: rule,
                onUpdate: { updatedRule in
                  if let index = localRules.firstIndex(where: { $0.id == updatedRule.id }) {
                    localRules[index] = updatedRule
                  }
                },
                onDelete: {
                  localRules.removeAll { $0.id == rule.id }
                })
            }
          }
        }

        // Add Rule Button
        Button {
          withAnimation {
            localRules.append(CategoryRule())
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
      }
      .padding()
    }
  }

  private var combinationModeSelector: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Match Condition")
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(AppTheme.text)

      HStack(spacing: 12) {
        Button {
          localCombinationMode = .or
        } label: {
          HStack(spacing: 8) {
            Image(systemName: localCombinationMode == .or ? "checkmark.circle.fill" : "circle")
              .foregroundStyle(
                localCombinationMode == .or ? AppTheme.primary : AppTheme.secondaryText)
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
          .background(
            localCombinationMode == .or ? AppTheme.primary.opacity(0.1) : AppTheme.background
          )
          .cornerRadius(8)
        }
        .foregroundStyle(AppTheme.text)

        Button {
          localCombinationMode = .and
        } label: {
          HStack(spacing: 8) {
            Image(systemName: localCombinationMode == .and ? "checkmark.circle.fill" : "circle")
              .foregroundStyle(
                localCombinationMode == .and ? AppTheme.primary : AppTheme.secondaryText)
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
          .background(
            localCombinationMode == .and ? AppTheme.primary.opacity(0.1) : AppTheme.background
          )
          .cornerRadius(8)
        }
        .foregroundStyle(AppTheme.text)
      }
    }
  }

  private var presetsTab: some View {
    ScrollView {
      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        ForEach(RulePresets.all) { preset in
          Button {
            localRules.append(
              contentsOf: preset.rules.map { rule in
                CategoryRule(field: rule.field, operator: rule.operator, value: rule.value)
              })
            selectedTab = 0
          } label: {
            VStack(alignment: .leading, spacing: 8) {
              Image(systemName: preset.icon)
                .font(.system(size: 20))
                .foregroundStyle(Color(hex: categoryColor))
              Text(preset.name)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(AppTheme.text)
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
      .padding()
    }
  }
}

// MARK: - Simple Rule Row
struct SimpleRuleRow: View {
  let rule: CategoryRule
  let color: String
  let onDelete: () -> Void

  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 4) {
        Text(rule.field.displayName)
          .font(.caption)
          .foregroundStyle(AppTheme.secondaryText)
        Text("\(rule.operator.displayName) \"\(rule.value)\"")
          .font(.subheadline)
          .foregroundStyle(AppTheme.text)
      }
      Spacer()
      Button {
        onDelete()
      } label: {
        Image(systemName: "xmark.circle.fill")
          .foregroundStyle(AppTheme.secondaryText)
      }
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(AppTheme.cornerRadius)
  }
}

// MARK: - Icon Picker View
struct IconPickerView: View {
  @Environment(\.dismiss) private var dismiss
  @Binding var selectedIcon: String
  let selectedColor: String
  let icons: [(String, String)]

  @State private var searchText = ""

  var filteredIcons: [(String, String)] {
    if searchText.isEmpty {
      return icons
    }
    return icons.filter { $0.1.localizedCaseInsensitiveContains(searchText) }
  }

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background
          .ignoresSafeArea()

        VStack(spacing: 0) {
          // Search Bar
          HStack {
            Image(systemName: "magnifyingglass")
              .foregroundStyle(AppTheme.secondaryText)

            TextField("Search icons...", text: $searchText)
              .textFieldStyle(.plain)
          }
          .padding()
          .background(AppTheme.card)
          .cornerRadius(10)
          .padding()

          // Icons Grid
          ScrollView {
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 5), spacing: 16) {
              ForEach(filteredIcons, id: \.0) { icon in
                Button {
                  selectedIcon = icon.0
                  dismiss()
                } label: {
                  VStack(spacing: 8) {
                    ZStack {
                      Circle()
                        .fill(
                          selectedIcon == icon.0
                            ? Color(hex: selectedColor)
                            : Color(hex: selectedColor).opacity(0.15)
                        )
                        .frame(width: 50, height: 50)

                      Image(systemName: icon.0)
                        .font(.system(size: 22))
                        .foregroundStyle(
                          selectedIcon == icon.0
                            ? AppTheme.background
                            : Color(hex: selectedColor)
                        )
                    }

                    Text(icon.1)
                      .font(.caption2)
                      .foregroundStyle(AppTheme.secondaryText)
                      .lineLimit(1)
                  }
                }
              }
            }
            .padding()
          }
        }
      }
      .navigationTitle("Choose Icon")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Done") {
            dismiss()
          }
          .foregroundStyle(AppTheme.primary)
        }
      }
    }
  }
}

#Preview {
  AddCategoryView()
}
