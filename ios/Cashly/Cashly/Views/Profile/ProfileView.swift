import SwiftUI

struct ProfileView: View {
  @EnvironmentObject var authManager: AuthManager
  @State private var showChangePassword = false
  @State private var showTwoFactorAuth = false
  @State private var setupData: MFASetupData?
  @State private var isLoading = false
  @State private var errorMessage: String?

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
                   if let email = user.email {
                       Text(email)
                         .font(.caption)
                         .foregroundStyle(.secondary)
                   } else if let phone = user.phoneNumber {
                       Text(phone)
                         .font(.caption)
                         .foregroundStyle(.secondary)
                   }
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
              .contentShape(Rectangle())
            }
            .foregroundStyle(AppTheme.text)

            Toggle("Two-Factor Authentication", isOn: Binding(
                get: { authManager.currentUser?.mfaEnabled ?? false },
                set: { newValue in
                    if newValue {
                        startSetup()
                    } else {
                        disable2FA()
                    }
                }
            ))
            .disabled(isLoading)
            .tint(AppTheme.primary)

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
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
        .environmentObject(authManager)
    }
    .sheet(isPresented: $showTwoFactorAuth) {
      if let data = setupData {
          TwoFactorAuthSheet(setupData: data, isPresented: $showTwoFactorAuth)
            .environmentObject(authManager)
      } else {
          ProgressView()
      }
    }
    .refreshable {
      await authManager.refreshProfile(forceRefresh: true)
    }
    .task {
      await authManager.refreshProfile()
    }
  }

  private func startSetup() {
    isLoading = true
    errorMessage = nil
    
    Task {
        do {
            setupData = try await authManager.setupMFA()
            showTwoFactorAuth = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
  }
  
  private func disable2FA() {
      isLoading = true
      errorMessage = nil
      
      Task {
          do {
              try await authManager.disableMFA()
          } catch {
              errorMessage = error.localizedDescription
          }
          isLoading = false
      }
  }
}

// Sheet versions of security views
struct ChangePasswordSheet: View {
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject var authManager: AuthManager
  @State private var currentPassword = ""
  @State private var newPassword = ""
  @State private var confirmPassword = ""
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var successMessage: String?

  var body: some View {
    ZStack(alignment: .top) { // Align top to match other sheets
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Header
        HStack {
          Button("Cancel") {
            dismiss()
          }
          .foregroundStyle(AppTheme.primary)
          Spacer()
          Text("Change Password")
            .font(.headline)
            .foregroundStyle(AppTheme.text)
          Spacer()
          Button("Save") {
            changePassword()
          }
          .disabled(currentPassword.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty)
          .foregroundStyle(AppTheme.primary)
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

    Task {
        do {
            try await authManager.changePassword(old: currentPassword, new: newPassword)
            successMessage = "Password updated successfully"
            currentPassword = ""
            newPassword = ""
            confirmPassword = ""
            
            // Optional: Dismiss sheet after delay
            try await Task.sleep(nanoseconds: 1 * 1_000_000_000)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
  }
}

struct TwoFactorAuthSheet: View {
  let setupData: MFASetupData
  @Binding var isPresented: Bool
  
  @EnvironmentObject var authManager: AuthManager
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var verificationCode = ""

  var body: some View {
    ZStack(alignment: .top) {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Header
        ZStack {
            Text("Setup 2FA")
                .font(.headline)
                .foregroundStyle(AppTheme.text)
            
            HStack {
                Button("Cancel") {
                    isPresented = false
                }
                .foregroundStyle(AppTheme.primary)
                Spacer()
            }
        }
        .padding()

        GeometryReader { geometry in
            ScrollView {
              VStack(spacing: 24) {
                  Text("Enable Two-Factor Authentication")
                      .font(.title2)
                      .fontWeight(.bold)
                      .foregroundStyle(AppTheme.text)
                  
                  VStack(spacing: 16) {
                      Text("1. Copy this key to your authenticator app:")
                          .font(.subheadline)
                          .foregroundStyle(AppTheme.secondaryText)
                          .frame(maxWidth: .infinity, alignment: .leading)
                      
                      HStack {
                          Text(setupData.secret)
                              .font(.system(.body, design: .monospaced))
                              .foregroundStyle(AppTheme.text)
                          
                          Spacer()
                          
                          Button {
                              UIPasteboard.general.string = setupData.secret
                          } label: {
                              Image(systemName: "doc.on.doc")
                                  .foregroundStyle(AppTheme.primary)
                          }
                      }
                      .padding()
                      .background(AppTheme.card)
                      .cornerRadius(10)
                      
                      Text("2. Enter the code from your app:")
                          .font(.subheadline)
                          .foregroundStyle(AppTheme.secondaryText)
                          .frame(maxWidth: .infinity, alignment: .leading)
                      
                      TextField("Verification Code", text: $verificationCode)
                          .textContentType(.oneTimeCode)
                          .keyboardType(.numberPad)
                          .padding()
                          .background(AppTheme.card)
                          .cornerRadius(10)
                          .foregroundStyle(AppTheme.text)
                          .onChange(of: verificationCode) { _, newValue in
                              if newValue.count > 6 {
                                  verificationCode = String(newValue.prefix(6))
                              }
                          }
                      
                      if let error = errorMessage {
                          Text(error)
                              .font(.caption)
                              .foregroundStyle(.red)
                      }
                      
                      Button(action: verifySetup) {
                          if isLoading {
                              ProgressView()
                                  .tint(AppTheme.background)
                          } else {
                              Text("Verify and Enable")
                                  .fontWeight(.semibold)
                          }
                      }
                      .frame(maxWidth: .infinity)
                      .padding()
                      .background(AppTheme.primary)
                      .foregroundStyle(AppTheme.background)
                      .cornerRadius(10)
                      .disabled(verificationCode.count < 6 || isLoading)
                  }
                  .padding()
                  
                  Spacer()
              }
              .padding()
              .frame(minHeight: geometry.size.height, alignment: .top)
            }
        }
      }
    }
  }
  
  private func verifySetup() {
      isLoading = true
      errorMessage = nil
      
      Task {
          do {
              try await authManager.enableMFA(secret: setupData.secret, code: verificationCode)
              // Success
              isPresented = false
          } catch {
              errorMessage = "Invalid code. Please try again."
          }
          isLoading = false
      }
  }
}

#Preview {
  ProfileView()
    .environmentObject(AuthManager.shared)
}
