import SwiftUI

struct CategoriesView: View {
  @Environment(\.dismiss) private var dismiss
  @State private var categories: [Category] = []
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var showAddCategory = false
  @State private var selectedCategory: Category?
  @State private var refreshTrigger = 0

  private let service = CategoryService.shared

  var systemCategories: [Category] {
    categories
      .filter { $0.isSystemCategory }
      .sorted { ($0.createdAt ?? Date.distantPast) > ($1.createdAt ?? Date.distantPast) }
  }

  var customCategories: [Category] {
    categories
      .filter { !$0.isSystemCategory }
      .sorted { ($0.createdAt ?? Date.distantPast) > ($1.createdAt ?? Date.distantPast) }
  }

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        ZStack {
          // Centered title
          Text("Categories")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)

          // Left and right buttons
          HStack {
            Button(action: { dismiss() }) {
              Image(systemName: "chevron.left")
                .font(.system(size: 20))
                .foregroundStyle(AppTheme.primary)
                .padding(8)
                .clipShape(Circle())
            }

            Spacer()

            Button(action: { showAddCategory = true }) {
              Image(systemName: "plus")
                .font(.system(size: 20))
                .foregroundStyle(AppTheme.primary)
                .padding(8)
                .clipShape(Circle())
            }
          }
        }
        .padding(.horizontal)
        .padding(.vertical, 16)

        // Content
        ScrollView {
          VStack(spacing: 24) {
            if isLoading {
              CategoryListSkeleton()
            } else if let error = errorMessage {
              ContentUnavailableView(
                "Error", systemImage: "exclamationmark.triangle", description: Text(error))
              Button("Retry") {
                Task { await loadCategories() }
              }
            } else {
              // System Categories
              VStack(alignment: .leading, spacing: 12) {
                Text("Default Categories")
                  .font(AppFont.title3())
                  .foregroundStyle(AppTheme.text)
                  .padding(.horizontal)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 16)], spacing: 16) {
                  ForEach(systemCategories) { category in
                    CategoryCard(category: category)
                  }
                }
                .padding(.horizontal)
              }

              // Custom Categories
              if !customCategories.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                  Text("Custom Categories")
                    .font(AppFont.title3())
                    .foregroundStyle(AppTheme.text)
                    .padding(.horizontal)

                  LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 16)], spacing: 16)
                  {
                    ForEach(customCategories) { category in
                      CategoryCard(category: category)
                        .onTapGesture {
                          selectedCategory = category
                        }
                    }
                  }
                  .padding(.horizontal)
                }
              }
            }
          }
          .padding(.vertical)
        }
        .refreshable {
          await loadCategories(forceRefresh: true)
        }
      }
    }
    .task {
      await loadCategories()
    }
    .task(id: refreshTrigger) {
      if refreshTrigger > 0 {
        await loadCategories(forceRefresh: true)
      }
    }
    .sheet(
      isPresented: $showAddCategory,
      onDismiss: {
        Task { await loadCategories(forceRefresh: true) }
      }
    ) {
      AddCategoryView()
    }
    .sheet(
      item: $selectedCategory,
      onDismiss: {
        // Force refresh to ensure UI updates with latest data
        Task { await loadCategories(forceRefresh: true) }
      }
    ) { category in
      EditCategoryView(category: category)
    }
    .navigationBarBackButtonHidden(true)
  }

  private func loadCategories(forceRefresh: Bool = false) async {
    // Skip loading only if we have data AND not forcing refresh
    if !forceRefresh && !categories.isEmpty {
      return
    }

    isLoading = true
    errorMessage = nil

    do {
      let fetchedCategories = try await service.getCategories(forceRefresh: forceRefresh)
      categories = fetchedCategories
      print("CategoriesView: Loaded \(fetchedCategories.count) categories")
    } catch {
      errorMessage = "Failed to load categories: \(error.localizedDescription)"
      print("Category loading error: \(error)")
    }

    isLoading = false
  }

  private func refreshFromCache() async {
    // Small delay to ensure cache update from updateCategory completes
    try? await Task.sleep(nanoseconds: 100_000_000)  // 100ms

    // Directly fetch from service (will use cache if available)
    do {
      let fetchedCategories = try await service.getCategories(forceRefresh: false)
      // Force state update on main actor
      await MainActor.run {
        categories = fetchedCategories
      }
      print("CategoriesView: Refreshed from cache - \(fetchedCategories.count) categories")
    } catch {
      print("Category cache refresh error: \(error)")
    }
  }
}

struct CategoryCard: View {
  let category: Category

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        ZStack {
          Circle()
            .fill(Color(hex: category.color ?? "#808080").opacity(0.1))
            .frame(width: 40, height: 40)

          Image(systemName: category.safeIcon)
            .foregroundStyle(Color(hex: category.color ?? "#808080"))
            .font(.system(size: 18))
        }
        Spacer()
      }

      VStack(alignment: .leading, spacing: 4) {
        Text(category.name)
          .font(.headline)
          .foregroundStyle(AppTheme.text)

        Text(category.type.capitalized)
          .font(.caption)
          .foregroundStyle(AppTheme.secondaryText)
      }
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(AppTheme.cornerRadius)
    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
  }
}

#Preview {
  CategoriesView()
}
