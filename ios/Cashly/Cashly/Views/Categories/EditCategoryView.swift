import SwiftUI

struct EditCategoryView: View {
  @Environment(\.dismiss) private var dismiss

  let category: Category

  @State private var name: String
  @State private var type: String
  @State private var selectedIcon: String
  @State private var selectedColor: String
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var showIconPicker = false
  @State private var showRulesPicker = false
  @State private var showDeleteConfirmation = false

  private let categoryTypes = ["expense", "income"]

  private let presetColors = [
    "#FF9800", "#2196F3", "#E91E63", "#4CAF50", "#9C27B0",
    "#FFC107", "#00BCD4", "#F44336", "#3F51B5", "#9E9E9E",
  ]

  private let availableIcons = [
    ("fork.knife", "Food"), ("cart.fill", "Groceries"), ("cup.and.saucer.fill", "Coffee"),
    ("car.fill", "Car"), ("fuelpump.fill", "Gas"), ("bus.fill", "Transit"), ("airplane", "Travel"),
    ("bag.fill", "Shopping"), ("tshirt.fill", "Clothing"), ("gift.fill", "Gift"),
    ("house.fill", "Home"), ("bolt.fill", "Utilities"), ("wifi", "Internet"),
    ("heart.fill", "Health"), ("cross.fill", "Medical"), ("graduationcap.fill", "Education"),
    ("dollarsign.circle.fill", "Income"), ("banknote.fill", "Salary"),
    ("chart.line.uptrend.xyaxis", "Investment"), ("briefcase.fill", "Work"),
    ("tv.fill", "Entertainment"), ("film.fill", "Movies"), ("music.note", "Music"),
    ("gamecontroller.fill", "Games"), ("dumbbell.fill", "Fitness"),
    ("sparkles", "Other"), ("star.fill", "Favorite"), ("tag.fill", "General"),
  ]

  init(category: Category) {
    self.category = category
    self._name = State(initialValue: category.name)
    self._type = State(initialValue: category.type)
    self._selectedIcon = State(initialValue: category.icon ?? "tag.fill")
    self._selectedColor = State(initialValue: category.color ?? "#FF9800")
  }

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
            previewCard

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

            // Delete Button
            Button {
              showDeleteConfirmation = true
            } label: {
              HStack {
                Image(systemName: "trash")
                Text("Delete Category")
              }
              .font(.subheadline)
              .fontWeight(.medium)
              .foregroundStyle(AppTheme.destructive)
              .padding()
              .frame(maxWidth: .infinity)
              .background(AppTheme.destructive.opacity(0.1))
              .cornerRadius(AppTheme.cornerRadius)
            }
            .padding(.horizontal)

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
      .navigationTitle("Edit Category")
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
            Task { await updateCategory() }
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
        CategoryRulesView(category: category)
      }
      .alert("Delete Category", isPresented: $showDeleteConfirmation) {
        Button("Cancel", role: .cancel) {}
        Button("Delete", role: .destructive) {
          Task { await deleteCategory() }
        }
      } message: {
        Text("Are you sure you want to delete \"\(category.name)\"? This action cannot be undone.")
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
            .foregroundStyle(AppTheme.text)
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

      TextField("Category name", text: $name)
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
              .foregroundStyle(type == categoryType ? .white : AppTheme.text)
              .padding(.horizontal, 20)
              .padding(.vertical, 12)
              .background(type == categoryType ? AppTheme.primary : AppTheme.background)
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
          Text("Manage Rules")
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

  // MARK: - Update Category
  private func updateCategory() async {
    guard !name.isEmpty else { return }
    isLoading = true
    errorMessage = nil

    do {
      try await CategoryService.shared.updateCategory(
        categoryId: category.id,
        name: name,
        type: type,
        icon: selectedIcon,
        color: selectedColor
      )
      // Only dismiss after successful backend response
      dismiss()
    } catch {
      errorMessage = "Failed to update category: \(error.localizedDescription)"
      isLoading = false
    }
  }

  // MARK: - Delete Category
  private func deleteCategory() async {
    // Set loading state to disable UI and show progress
    isLoading = true
    errorMessage = nil

    do {
      // Wait for backend response before taking any action
      try await CategoryService.shared.deleteCategory(categoryId: category.id)

      // Only dismiss if we get a successful 200/204 response
      // The cache has already been updated in CategoryService
      dismiss()
    } catch {
      // Backend returned an error - keep page open and show error
      errorMessage = "Failed to delete category: \(error.localizedDescription)"
      isLoading = false
    }
  }
}
