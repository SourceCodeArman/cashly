import SwiftUI

struct RegisterView: View {
  @EnvironmentObject var authManager: AuthManager
  @Environment(\.dismiss) var dismiss

  @State private var email = ""
  @State private var username = ""
  @State private var password = ""
  @State private var confirmPassword = ""
  @State private var firstName = ""
  @State private var lastName = ""

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background.ignoresSafeArea()

        VStack {
          // Header
          CashlyHeader()
            .padding(.top, 24)

          Text("Create Account")
            .font(.largeTitle)
            .fontWeight(.bold)

          Text("Join Cashly to master your finances")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          Spacer()
            .frame(height: 40)

          VStack(spacing: 16) {
            // Form Fields
            HStack(spacing: 16) {
              VStack(alignment: .leading, spacing: 8) {
                Text("First Name")
                  .font(.subheadline)
                  .fontWeight(.medium)

                TextField("Enter first name", text: $firstName)
                  .textContentType(.givenName)
                  .submitLabel(.next)
                  .padding()
                  .background(AppTheme.card)
                  .cornerRadius(10)
              }

              VStack(alignment: .leading, spacing: 8) {
                Text("Last Name")
                  .font(.subheadline)
                  .fontWeight(.medium)

                TextField("Enter last name", text: $lastName)
                  .textContentType(.familyName)
                  .submitLabel(.next)
                  .padding()
                  .background(AppTheme.card)
                  .cornerRadius(10)
              }
            }

            VStack(alignment: .leading, spacing: 8) {
              Text("Email")
                .font(.subheadline)
                .fontWeight(.medium)

              TextField("Enter your email", text: $email)
                .textContentType(.emailAddress)
                .submitLabel(.next)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)
                .padding()
                .background(AppTheme.card)
                .cornerRadius(10)
            }

            VStack(alignment: .leading, spacing: 8) {
              Text("Username")
                .font(.subheadline)
                .fontWeight(.medium)

              TextField("Enter your username", text: $username)
                .textContentType(.username)
                .submitLabel(.next)
                .autocapitalization(.none)
                .padding()
                .background(AppTheme.card)
                .cornerRadius(10)
            }

            VStack(alignment: .leading, spacing: 8) {
              Text("Password")
                .font(.subheadline)
                .fontWeight(.medium)

              SecureField("Enter your password", text: $password)
                .textContentType(.newPassword)
                .submitLabel(.next)
                .padding()
                .background(AppTheme.card)
                .cornerRadius(10)
            }

            VStack(alignment: .leading, spacing: 8) {
              Text("Confirm Password")
                .font(.subheadline)
                .fontWeight(.medium)

              SecureField("Confirm your password", text: $confirmPassword)
                .textContentType(.newPassword)
                .submitLabel(.go)
                .onSubmit {
                  Task {
                    if isValid {
                      await authManager.register(
                        email: email,
                        username: username,
                        password: password,
                        firstName: firstName,
                        lastName: lastName
                      )
                    }
                  }
                }
                .padding()
                .background(AppTheme.card)
                .cornerRadius(10)
            }

            // Error Message
            if let errorMessage = authManager.errorMessage {
              Text(errorMessage)
                .font(.caption)
                .foregroundStyle(AppTheme.destructive)
                .multilineTextAlignment(.center)
            }

            // Register Button
            Button(action: {
              Task {
                if password == confirmPassword {
                  await authManager.register(
                    email: email,
                    username: username,
                    password: password,
                    firstName: firstName,
                    lastName: lastName
                  )
                }
              }
            }) {
              if authManager.isLoading {
                ProgressView()
                  .progressViewStyle(CircularProgressViewStyle(tint: .white))
                  .frame(maxWidth: .infinity)
                  .padding()
              } else {
                Text("Sign Up")
                  .fontWeight(.semibold)
                  .foregroundColor(.white)
                  .frame(maxWidth: .infinity)
                  .padding()
              }
            }
            .background(AppTheme.primary)
            .cornerRadius(12)
            .disabled(!isValid || authManager.isLoading)
          }

          // Error message
          if let errorMessage = authManager.errorMessage {
            Text(errorMessage)
              .font(.caption)
              .foregroundStyle(AppTheme.destructive)
              .multilineTextAlignment(.center)
          }

          Spacer()

          // Register link
          HStack {
            Text("Already have an account?")
              .foregroundStyle(.secondary)

            NavigationLink(destination: LoginView()) {
              Text("Sign In")
                .fontWeight(.semibold)
                .foregroundStyle(AppTheme.primary)
            }
          }
          .font(.subheadline)
          .padding(.bottom, 40)
        }
        .padding(.horizontal, 24)
      }
      .navigationBarHidden(true)
    }
  }

  var isValid: Bool {
    !email.isEmpty && !username.isEmpty && !password.isEmpty && !firstName.isEmpty
      && !lastName.isEmpty
      && password == confirmPassword
  }
}

#Preview {
  LoginView()
    .environmentObject(AuthManager.shared)
}
