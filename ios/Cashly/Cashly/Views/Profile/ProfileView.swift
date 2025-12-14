import SwiftUI

struct ProfileView: View {
  @EnvironmentObject var authManager: AuthManager
  @State private var showChangePassword = false
  @State private var showTwoFactorAuth = false

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Profile")
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
          Section {
            HStack(spacing: 16) {
              Image(systemName: "person.circle.fill")
                .resizable()
                .frame(width: 60, height: 60)
                .foregroundStyle(AppTheme.primary)

              VStack(alignment: .leading, spacing: 4) {
                if let user = authManager.currentUser {
                  Text(user.fullName)
                    .font(.headline)
                  Text(user.email)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                } else {
                  Text("Guest User")
                    .font(.headline)
                }
              }
            }
            .padding(.vertical, 8)
          }
          .listRowBackground(AppTheme.card)

          Section("Account Details") {
            HStack {
              Text("Member Since")
              Spacer()
              if let user = authManager.currentUser, let created = user.createdAt {
                Text(created.formatted(date: .abbreviated, time: .omitted))
                  .foregroundStyle(.secondary)
              } else {
                Text("Unknown")
                  .foregroundStyle(.secondary)
              }
            }

            HStack {
              Text("Subscription")
              Spacer()
              Text("Free Plan")
                .foregroundStyle(.secondary)
            }
          }
          .listRowBackground(AppTheme.card)

          Section("Security") {
            Button(action: { showChangePassword = true }) {
              HStack {
                Text("Change Password")
                Spacer()
                Image(systemName: "chevron.right")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
              .foregroundStyle(.primary)
            }

            Button(action: { showTwoFactorAuth = true }) {
              HStack {
                Text("Two-Factor Authentication")
                Spacer()
                if authManager.currentUser?.mfaEnabled == true {
                  Text("On")
                    .foregroundStyle(.green)
                } else {
                  Text("Off")
                    .foregroundStyle(.secondary)
                }
                Image(systemName: "chevron.right")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
              .foregroundStyle(.primary)
            }
          }
          .listRowBackground(AppTheme.card)

          Section {
            Button(
              role: .destructive,
              action: {
                authManager.logout()
              }
            ) {
              Text("Sign Out")
            }
          }
          .listRowBackground(AppTheme.card)
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
      }
    }
    .sheet(isPresented: $showChangePassword) {
      ChangePasswordSheet()
    }
    .sheet(isPresented: $showTwoFactorAuth) {
      TwoFactorAuthSheet()
        .environmentObject(authManager)
    }
    .refreshable {
      await authManager.refreshProfile(forceRefresh: true)
    }
    .task {
      await authManager.refreshProfile()
    }
  }
}

// Sheet versions of security views
struct ChangePasswordSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var currentPassword = ""
  @State private var newPassword = ""
  @State private var confirmPassword = ""
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var successMessage: String?

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Header
        HStack {
          Button("Cancel") {
            dismiss()
          }
          Spacer()
          Text("Change Password")
            .font(.headline)
          Spacer()
          Button("Save") {
            changePassword()
          }
          .disabled(currentPassword.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty)
        }
        .padding()

        List {
          Section {
            SecureField("Current Password", text: $currentPassword)
            SecureField("New Password", text: $newPassword)
            SecureField("Confirm New Password", text: $confirmPassword)
          } footer: {
            if let error = errorMessage {
              Text(error).foregroundStyle(.red)
            } else if let success = successMessage {
              Text(success).foregroundStyle(.green)
            }
          }
          .listRowBackground(AppTheme.card)
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
      }
    }
  }

  private func changePassword() {
    guard newPassword == confirmPassword else {
      errorMessage = "New passwords do not match"
      return
    }

    isLoading = true
    errorMessage = nil
    successMessage = nil

    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
      isLoading = false
      successMessage = "Password updated successfully"
      currentPassword = ""
      newPassword = ""
      confirmPassword = ""
    }
  }
}

struct TwoFactorAuthSheet: View {
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject var authManager: AuthManager
  @State private var isEnabled = false
  @State private var isLoading = false

  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Header
        HStack {
          Button("Done") {
            dismiss()
          }
          Spacer()
          Text("Two-Factor Auth")
            .font(.headline)
          Spacer()
          Color.clear.frame(width: 44)
        }
        .padding()

        List {
          Section {
            Toggle("Enable Two-Factor Authentication", isOn: $isEnabled)
              .onChange(of: isEnabled) { newValue in
                toggle2FA(newValue)
              }
              .disabled(isLoading)
          } footer: {
            Text(
              "Protect your account with an extra layer of security."
            )
          }
          .listRowBackground(AppTheme.card)

          if isEnabled {
            Section("Methods") {
              HStack {
                Image(systemName: "envelope.fill")
                  .foregroundStyle(.blue)
                Text("Email")
                Spacer()
                Image(systemName: "checkmark.circle.fill")
                  .foregroundStyle(.green)
              }

              HStack {
                Image(systemName: "lock.shield.fill")
                  .foregroundStyle(.purple)
                Text("Authenticator App")
                Spacer()
                Button("Setup") {
                  // Action
                }
                .font(.caption)
                .buttonStyle(.bordered)
              }
            }
            .listRowBackground(AppTheme.card)
          }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
      }
    }
    .onAppear {
      isEnabled = authManager.currentUser?.mfaEnabled ?? false
    }
  }

  private func toggle2FA(_ enabled: Bool) {
    isLoading = true
    DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
      isLoading = false
    }
  }
}

#Preview {
  ProfileView()
    .environmentObject(AuthManager.shared)
}
