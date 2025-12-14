import SwiftUI

struct InsightsView: View {
  @State private var insights: [Insight] = []
  @State private var summary: InsightSummary?
  @State private var isLoading = false
  @State private var isGenerating = false

  private let service = InsightService.shared

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Smart Insights")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
          Spacer()

          Button(action: {
            Task { await generateInsights() }
          }) {
            if isGenerating {
              ProgressView()
                .tint(AppTheme.primary)
            } else {
              Image(systemName: "arrow.clockwise")
                .font(.system(size: 20))
                .foregroundStyle(AppTheme.primary)
                .padding(8)
                .background(AppTheme.primary.opacity(0.1))
                .clipShape(Circle())
            }
          }
          .disabled(isGenerating)
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 16)

        // Content
        ScrollView {
          VStack(spacing: 20) {
            // Summary Cards
            if let summary = summary {
              HStack(spacing: 12) {
                SummaryCard(
                  title: "Total", value: "\(summary.total)", icon: "lightbulb",
                  color: AppTheme.primary)
                SummaryCard(
                  title: "High Priority", value: "\(summary.byPriority.high)",
                  icon: "exclamationmark.triangle", color: AppTheme.destructive)
              }
            }

            // Insights List
            if isLoading && insights.isEmpty {
              InsightListSkeleton()
            } else if insights.isEmpty {
              ContentUnavailableView(
                "No Insights Yet", systemImage: "lightbulb.slash",
                description: Text("Generate insights to get started"))
            } else {
              ForEach(insights) { insight in
                InsightCard(insight: insight)
              }
            }
          }
          .padding()
        }
        .refreshable {
          await loadData(forceRefresh: true)
        }
      }
    }
    .task {
      await loadData()
    }
  }

  private func loadData(forceRefresh: Bool = false) async {
    if !forceRefresh && !insights.isEmpty {
      return
    }
    isLoading = true
    do {
      async let insightsTask = service.getInsights()
      async let summaryTask = service.getSummary()
      let (newInsights, newSummary) = try await (insightsTask, summaryTask)
      self.insights = newInsights
      self.summary = newSummary
    } catch {
      print("Error loading insights: \(error)")
    }
    isLoading = false
  }

  private func generateInsights() async {
    isGenerating = true
    try? await service.generateInsights()
    await loadData()
    isGenerating = false
  }
}

struct SummaryCard: View {
  let title: String
  let value: String
  let icon: String
  let color: Color

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack {
        Image(systemName: icon)
          .foregroundStyle(color)
          .font(.title2)
        Spacer()
        Text(value)
          .font(.title)
          .fontWeight(.bold)
          .foregroundStyle(AppTheme.text)
      }
      Text(title)
        .font(.caption)
        .foregroundStyle(AppTheme.secondaryText)
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(AppTheme.cornerRadius)
    .shadow(color: Color.black.opacity(0.05), radius: 5)
  }
}

struct InsightCard: View {
  let insight: Insight

  var priorityColor: Color {
    switch insight.priority {
    case "high": return AppTheme.destructive
    case "medium": return AppTheme.warning
    case "low": return AppTheme.success
    default: return AppTheme.secondaryText
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        Text(insight.title)
          .font(.headline)
          .foregroundStyle(AppTheme.text)
        Spacer()
        Text(insight.priority.capitalized)
          .font(.caption)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(priorityColor.opacity(0.1))
          .foregroundStyle(priorityColor)
          .cornerRadius(8)
      }

      Text(insight.message)
        .font(.subheadline)
        .foregroundStyle(AppTheme.secondaryText)
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(AppTheme.cornerRadius)
    .shadow(color: Color.black.opacity(0.05), radius: 5)
    .overlay(
      RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
        .stroke(priorityColor.opacity(0.3), lineWidth: 1)
    )
  }
}

#Preview {
  InsightsView()
}
