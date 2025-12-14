import SwiftUI

struct GoalsView: View {
  @State private var goals: [GoalProgress] = []
  @State private var isLoading = false

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Goals")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
          Spacer()
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 16)

        ScrollView {
          if isLoading && goals.isEmpty {
            GoalListSkeleton()
          } else if goals.isEmpty {
            EmptyStateView(
              icon: "target",
              title: "No Goals",
              message: "Set up a savings goal to start tracking"
            )
          } else {
            LazyVStack(spacing: 16) {
              ForEach(goals) { goal in
                GoalCard(goal: goal)
              }
            }
            .padding()
          }
        }
        .refreshable {
          await loadGoals()
        }
      }
    }
    .task {
      if goals.isEmpty {
        await loadGoals()
      }
    }
  }

  private func loadGoals() async {
    isLoading = true
    do {
      goals = try await GoalService.shared.getGoals()
    } catch {
      print("Error loading goals: \(error)")
    }
    isLoading = false
  }
}

struct GoalCard: View {
  let goal: GoalProgress

  var progress: Double {
    goal.progress
  }

  var body: some View {
    VStack(spacing: 12) {
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(goal.name)
            .font(.headline)
          if let deadline = goal.deadline {
            Text("Target: \(deadline)")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        VStack(alignment: .trailing, spacing: 4) {
          Text(goal.currentAmountValue, format: .currency(code: "USD"))
            .font(.headline)
            .foregroundStyle(AppTheme.primary)
          Text("of \(goal.targetAmountValue.formatted(.currency(code: "USD")))")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      ProgressView(value: min(progress, 1.0))
        .tint(AppTheme.primary)

      HStack {
        Text("\(Int(progress * 100))% funded")
          .font(.caption)
          .foregroundStyle(.secondary)
        Spacer()
        if let days = goal.daysRemaining {
          Text("\(days) days left")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(12)
    .shadow(color: Color.black.opacity(0.05), radius: 5, y: 2)
  }
}

#Preview {
  GoalsView()
}
