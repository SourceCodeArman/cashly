import SwiftUI

struct SettingsView: View {
  @State private var notificationsEnabled = true
  @State private var biometricEnabled = true
  @AppStorage("isDarkMode") private var darkMode = true
  @State private var showChangePassword = false
  @State private var showTwoFactorAuth = false

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background
          .ignoresSafeArea()

        VStack(spacing: 0) {
          // Custom Header
          HStack {
            Text("Settings")
              .font(.largeTitle)
              .fontWeight(.bold)
              .foregroundStyle(.primary)
            Spacer()
          }
          .padding(.horizontal)
          .padding(.top, 16)
          .padding(.bottom, 16)

          // Content
          List {
            Section("Data Management") {
              NavigationLink {
                CategoriesView()
              } label: {
                HStack {
                  Image(systemName: "tag.fill")
                    .foregroundStyle(AppTheme.primary)
                  Text("Manage Categories")
                }
              }
            }
            .listRowBackground(AppTheme.card)

            Section("Preferences") {
              Toggle("Notifications", isOn: $notificationsEnabled)
              Toggle("Dark Mode", isOn: $darkMode)
            }
            .listRowBackground(AppTheme.card)

            Section("Security") {
              Toggle("Face ID / Touch ID", isOn: $biometricEnabled)
            }
            .listRowBackground(AppTheme.card)

            Section("App Info") {
              HStack {
                Text("Version")
                Spacer()
                Text("1.0.0 (Build 42)")
                  .foregroundStyle(.secondary)
              }

              HStack {
                Text("Terms of Service")
                Spacer()
                Image(systemName: "chevron.right")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }

              HStack {
                Text("Privacy Policy")
                Spacer()
                Image(systemName: "chevron.right")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
            .listRowBackground(AppTheme.card)

            Section {
              Button("Clear Cache") {
                // Action
              }
              .foregroundStyle(.orange)
            }
            .listRowBackground(AppTheme.card)
          }
          .listStyle(.insetGrouped)
          .scrollContentBackground(.hidden)
        }
      }
    }
  }
}

#Preview {
  SettingsView()
}
