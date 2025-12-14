import SwiftUI

struct NotificationsView: View {
  @State private var notifications: [NotificationModel] = []
  @State private var isLoading = false
  @State private var errorMessage: String?

  private let service = NotificationService.shared

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Notifications")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
          Spacer()

          if !notifications.isEmpty {
            Button(action: {
              Task { await markAllAsRead() }
            }) {
              Text("Read All")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(AppTheme.primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(AppTheme.primary.opacity(0.1))
                .clipShape(Capsule())
            }
          }
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 16)

        ScrollView {
          VStack(spacing: 16) {
            if isLoading && notifications.isEmpty {
              NotificationListSkeleton()
            } else if notifications.isEmpty {
              ContentUnavailableView(
                "No Notifications", systemImage: "bell.slash",
                description: Text("You're all caught up!"))
            } else {
              ForEach(notifications) { notification in
                NotificationCard(notification: notification) {
                  Task {
                    await markAsRead(notification.id)
                  }
                }
              }
            }
          }
          .padding()
        }
      }
    }
    .task {
      await loadNotifications()
    }
  }

  private func loadNotifications() async {
    isLoading = true
    do {
      notifications = try await service.getNotifications()
    } catch {
      print("Error: \(error)")
    }
    isLoading = false
  }

  private func markAsRead(_ id: String) async {
    try? await service.markAsRead(id: id)
    await loadNotifications()
  }

  private func markAllAsRead() async {
    try? await service.markAllAsRead()
    await loadNotifications()
  }
}

struct NotificationCard: View {
  let notification: NotificationModel
  let onMarkRead: () -> Void

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Circle()
        .fill(notification.isRead ? AppTheme.secondaryText.opacity(0.1) : AppTheme.primary)
        .frame(width: 8, height: 8)
        .padding(.top, 6)

      VStack(alignment: .leading, spacing: 4) {
        Text(notification.title)
          .font(.headline)
          .foregroundStyle(AppTheme.text)

        Text(notification.message)
          .font(.subheadline)
          .foregroundStyle(AppTheme.secondaryText)

        Text(formatRelativeTime(notification.dateObject))
          .font(.caption)
          .foregroundStyle(AppTheme.secondaryText.opacity(0.8))
      }

      Spacer()

      if !notification.isRead {
        Button(action: onMarkRead) {
          Image(systemName: "checkmark.circle")
            .foregroundStyle(AppTheme.primary)
        }
      }
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(AppTheme.cornerRadius)
    .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    .overlay(
      RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
        .stroke(notification.isRead ? Color.clear : AppTheme.primary.opacity(0.2), lineWidth: 1)
    )
  }

  func formatRelativeTime(_ date: Date) -> String {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .full
    return formatter.localizedString(for: date, relativeTo: Date())
  }
}

#Preview {
  NotificationsView()
}
