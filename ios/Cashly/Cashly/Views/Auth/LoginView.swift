import SwiftUI
import Supabase
import GoogleSignIn

struct LoginView: View {
  @EnvironmentObject var authManager: AuthManager
  @State private var emailInput: String = ""
  @State private var phoneInput: String = ""
  @State private var password: String = ""
  @State private var isPasswordVisible: Bool = false
  @State private var isEmailLogin: Bool = true
  @State private var selectedCountry: Country = .default

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background.ignoresSafeArea()

        VStack(spacing: 0) {
          Spacer()

          // Main Content
          VStack(alignment: .leading, spacing: 32) {

            // Header
            VStack(alignment: .leading, spacing: 12) {
              Text("Welcome back")
                .font(AppFont.largeTitleSerif())
                .italic()
                .foregroundColor(AppTheme.text)

              Text("Sign in to access your dashboard")
                .font(.subheadline)
                .foregroundColor(AppTheme.text.opacity(0.6))
            }

            // Form
            VStack(spacing: 24) {
              // Email or Phone Input
              VStack(alignment: .leading, spacing: 8) {
                // Tab Labels
                HStack(spacing: 24) {
                  Button(action: { isEmailLogin = true }) {
                    VStack(spacing: 4) {
                      Text("Email")
                        .font(.subheadline)
                        .fontWeight(isEmailLogin ? .semibold : .regular)
                        .foregroundColor(isEmailLogin ? AppTheme.text : AppTheme.secondaryText)
                      
                      if isEmailLogin {
                        Rectangle()
                          .fill(AppTheme.text)
                          .frame(height: 2)
                          .clipShape(Capsule())
                      } else {
                        Rectangle()
                          .fill(Color.clear)
                          .frame(height: 2)
                      }
                    }
                    .fixedSize()
                  }
                  .buttonStyle(.plain)

                  Button(action: { isEmailLogin = false }) {
                    VStack(spacing: 4) {
                      Text("Phone Number")
                        .font(.subheadline)
                        .fontWeight(!isEmailLogin ? .semibold : .regular)
                        .foregroundColor(!isEmailLogin ? AppTheme.text : AppTheme.secondaryText)
                      
                      if !isEmailLogin {
                        Rectangle()
                          .fill(AppTheme.text)
                          .frame(height: 2)
                          .clipShape(Capsule())
                      } else {
                        Rectangle()
                          .fill(Color.clear)
                          .frame(height: 2)
                      }
                    }
                    .fixedSize()
                  }
                  .buttonStyle(.plain)
                }

                // Conditional Input
                HStack(spacing: 12) {
                  if isEmailLogin {
                    TextField("", text: $emailInput, prompt: Text(verbatim: "john@example.com"))
                      .textContentType(.emailAddress)
                      .keyboardType(.emailAddress)
                      .autocapitalization(.none)
                      .frame(height: 24)
                  } else {
                    HStack(spacing: 8) {
                        Menu {
                            ForEach(Country.allCountries) { country in
                                Button(action: {
                                    selectedCountry = country
                                    // Re-format existing number with new country mask
                                    phoneInput = PhoneFormatter.format(phoneNumber: phoneInput, mask: country.formatMask)
                                }) {
                                    Text("\(country.flag) \(country.name) \(country.dialCode)")
                                }
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Text(selectedCountry.flag)
                                    .font(.system(size: 24))
                                Image(systemName: "chevron.down")
                                    .font(.caption)
                                    .foregroundColor(AppTheme.secondaryText)
                            }
                        }
                        
                        Text(selectedCountry.dialCode)
                            .foregroundColor(AppTheme.text)
                            .font(.body)
                        
                        TextField("", text: $phoneInput, prompt: Text(verbatim: "234 555 0123"))
                          .textContentType(.telephoneNumber)
                          .keyboardType(.phonePad)
                          .frame(height: 24)
                          .onChange(of: phoneInput) { newValue in
                              if !isEmailLogin {
                                  let formatted = PhoneFormatter.format(phoneNumber: newValue, mask: selectedCountry.formatMask)
                                  if formatted != newValue {
                                      phoneInput = formatted
                                  }
                              }
                          }
                    }
                  }
                }
                .padding()
                .frame(height: 56) // Consistent height for container
                .background(AppTheme.background)
                .overlay(
                  RoundedRectangle(cornerRadius: 12)
                    .stroke(AppTheme.accent.opacity(0.1), lineWidth: 1)
                )
                .cornerRadius(12)
              }

              // Password Input
              VStack(alignment: .leading, spacing: 8) {
                Text("Password")
                  .font(AppFont.caption())
                  .foregroundColor(AppTheme.secondaryText)

                HStack {
                  if isPasswordVisible {
                    TextField("Your password", text: $password)
                  } else {
                    SecureField("Your password", text: $password)
                  }

                  Button(action: { isPasswordVisible.toggle() }) {
                    Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                      .foregroundColor(AppTheme.secondaryText)
                  }
                }
                .padding()
                .background(AppTheme.background)
                .overlay(
                  RoundedRectangle(cornerRadius: 12)
                    .stroke(AppTheme.accent.opacity(0.1), lineWidth: 1)
                )
                .cornerRadius(12)
              }
            }

            // Login button
            Button(action: {
              Task {
                let loginValue = isEmailLogin ? emailInput : "\(selectedCountry.dialCode)\(phoneInput.components(separatedBy: CharacterSet.decimalDigits.inverted).joined())"
                print("DEBUG: Sending login request for \(loginValue)")
                await authManager.login(login: loginValue, password: password)
              }
            }) {
              ZStack {
                if authManager.isLoading {
                  ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                  Text("Sign In")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(AppTheme.background)
                }
              }
              .frame(maxWidth: .infinity)
              .frame(height: 56)
              .contentShape(Rectangle())  // Ensure entire area is tappable
            }
            .background(AppTheme.primary)
            .cornerRadius(28)  // Full pill shape
            .shadow(color: Color(hex: "1A1A1A").opacity(0.1), radius: 10, y: 4)
            .disabled(authManager.isLoading)

            if let errorMessage = authManager.errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }

            // Or Divider
            HStack {
              Rectangle().fill(AppTheme.text.opacity(0.1)).frame(height: 1)
              Text("OR")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(AppTheme.text.opacity(0.4))
                .padding(.horizontal, 8)
              Rectangle().fill(AppTheme.text.opacity(0.1)).frame(height: 1)
            }
            .padding(.vertical, 8)

            // Google Button
            Button(action: {
              Task {
                do {
                    // 1. Native Google Sign In
                    let googleUser = try await GoogleSignInManager.shared.signIn()
                    
                    guard let idToken = googleUser.idToken?.tokenString else {
                        print("No ID Token found")
                        return
                    }
                    let accessToken = googleUser.accessToken.tokenString
                    
                    // 2. Exchange with Supabase
                    try await SupabaseManager.shared.signInWithGoogle(idToken: idToken, accessToken: accessToken)
                    
                    // 3. AuthManager will listen to Supabase state change and trigger backend login
                } catch {
                    print("Google Sign In Error: \(error)")
                }
              }
            }) {
              HStack(spacing: 12) {
                // Ideally use a Google Asset here
                Text("G") 
                    .font(.system(size: 20, weight: .bold))
                Text("Continue with Google")
                  .font(.system(size: 16, weight: .bold))
                  .foregroundColor(AppTheme.text)
              }
              .frame(maxWidth: .infinity)
              .frame(height: 56)
              .background(AppTheme.background)
              .overlay(
                RoundedRectangle(cornerRadius: 28)
                  .stroke(AppTheme.text.opacity(0.1), lineWidth: 1)
              )
              .cornerRadius(28)
            }

            // Footer
            HStack {
              Spacer()
              Text("Don't have an account?")
                .font(.subheadline)
                .foregroundColor(AppTheme.text.opacity(0.6))

              NavigationLink(destination: RegisterView()) {
                Text("Sign up")
                  .font(.subheadline)
                  .fontWeight(.bold)
                  .foregroundColor(AppTheme.text)
              }
              Spacer()
            }
          }
          .padding(.horizontal, 24)

          Spacer()
        }
      }
      .tint(AppTheme.text)
      .navigationBarHidden(true)
    }
  }
}

#Preview {
  LoginView()
    .environmentObject(AuthManager.shared)
}
