import SwiftUI

struct LoginView: View {
  @EnvironmentObject var authManager: AuthManager
  @State private var email: String = ""
  @State private var password: String = ""

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background.ignoresSafeArea()

        VStack(spacing: 24) {
          // Header
          CashlyHeader()
            .padding(.top, 20)

          Text("Welcome Back")
            .font(.largeTitle)
            .fontWeight(.bold)

          Text("Sign in to continue")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          Spacer()
            .frame(height: 40)

          // Email field
          VStack(alignment: .leading, spacing: 8) {
            Text("Email")
              .font(.subheadline)
              .fontWeight(.medium)

            TextField("Enter your email", text: $email)
              .textContentType(.username)
              .autocapitalization(.none)
              .keyboardType(.emailAddress)
              .submitLabel(.next)
              .padding()
              .background(AppTheme.card)
              .cornerRadius(10)
          }

          // Password field
          VStack(alignment: .leading, spacing: 8) {
            Text("Password")
              .font(.subheadline)
              .fontWeight(.medium)

            SecureField("Enter your password", text: $password)
              .textContentType(.password)
              .submitLabel(.go)
              .onSubmit {
                Task {
                  await authManager.login(email: email, password: password)
                }
              }
              .padding()
              .background(AppTheme.card)
              .cornerRadius(10)
          }

          // Login button
          Button(action: {
            Task {
              await authManager.login(email: email, password: password)
            }
          }) {
            if authManager.isLoading {
              ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                .frame(maxWidth: .infinity)
                .padding()
            } else {
              Text("Sign In")
                .fontWeight(.semibold)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding()
            }
          }
          .background(AppTheme.primary)
          .cornerRadius(12)
          .disabled(authManager.isLoading || email.isEmpty || password.isEmpty)

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
            Text("Don't have an account?")
              .foregroundStyle(.secondary)

            NavigationLink(destination: RegisterView()) {
              Text("Sign Up")
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
}

#Preview {
  LoginView()
    .environmentObject(AuthManager.shared)
}
