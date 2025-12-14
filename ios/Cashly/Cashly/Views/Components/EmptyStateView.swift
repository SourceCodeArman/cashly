import SwiftUI

struct EmptyStateView: View {
  let icon: String
  let title: String
  let message: String

  var body: some View {
    VStack(spacing: 16) {
      Image(systemName: icon)
        .font(.system(size: 48))
        .foregroundStyle(.secondary.opacity(0.5))

      Text(title)
        .font(.headline)
        .foregroundStyle(.secondary)

      Text(message)
        .font(.caption)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
    .padding()
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .padding(.top, 50)
  }
}

struct PlaceholderView: View {
  let title: String

  var body: some View {
    VStack(spacing: 16) {
      Text(title)
        .font(.largeTitle)
        .fontWeight(.bold)

      Text("Coming soon...")
        .foregroundStyle(.secondary)
    }
    .navigationTitle(title)
    .background(AppTheme.background)
  }
}
