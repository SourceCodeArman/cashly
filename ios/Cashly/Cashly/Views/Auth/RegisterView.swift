import SwiftUI
import Supabase
import GoogleSignIn

struct RegisterView: View {
  @EnvironmentObject var authManager: AuthManager
  @Environment(\.dismiss) var dismiss

  @State private var email = ""
  @State private var phoneNumber = ""
  @State private var password = ""
  @State private var confirmPassword = ""
  @State private var firstName = ""
  @State private var lastName = ""

  @State private var isPasswordVisible: Bool = false
  @State private var isConfirmPasswordVisible: Bool = false
  @State private var isEmailRegistration: Bool = true
  @State private var selectedCountry: Country = .default

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background.ignoresSafeArea()

        GeometryReader { geometry in
          ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {
              Spacer()

              VStack(alignment: .leading, spacing: 32) {

                // Header
                VStack(alignment: .leading, spacing: 12) {
                  Text("Create an Account")
                    .font(AppFont.largeTitleSerif())
                    .italic()
                    .foregroundColor(AppTheme.text)

                  Text("Start your journey to financial freedom")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.text.opacity(0.6))
                }

                // Form
                VStack(spacing: 24) {
                  // Name Fields
                  HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                      Text("First Name")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(AppTheme.text)

                      HStack(spacing: 12) {
                        Image(systemName: "person")
                          .foregroundColor(AppTheme.secondaryText)
                          .frame(width: 24)

                        ZStack(alignment: .leading) {
                          if firstName.isEmpty {
                            Text("John")
                              .foregroundColor(AppTheme.secondaryText)
                          }
                          TextField("", text: $firstName)
                            .textContentType(.givenName)
                            .submitLabel(.next)
                        }
                      }
                      .padding(.vertical, 12)

                      Divider()
                    }

                    VStack(alignment: .leading, spacing: 8) {
                      Text("Last Name")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(AppTheme.text)

                      HStack(spacing: 12) {
                        Image(systemName: "person")
                          .foregroundColor(AppTheme.secondaryText)
                          .frame(width: 24)

                        ZStack(alignment: .leading) {
                          if lastName.isEmpty {
                            Text("Doe")
                              .foregroundColor(AppTheme.secondaryText)
                          }
                          TextField("", text: $lastName)
                            .textContentType(.familyName)
                            .submitLabel(.next)
                        }
                      }
                      .padding(.vertical, 12)

                      Divider()
                    }
                  }





                  // Email or Phone Tab
                  VStack(alignment: .leading, spacing: 8) {
                    // Tab Labels
                    HStack(spacing: 24) {
                      Button(action: { isEmailRegistration = true }) {
                        VStack(spacing: 4) {
                          Text("Email")
                            .font(.subheadline)
                            .fontWeight(isEmailRegistration ? .semibold : .regular)
                            .foregroundColor(isEmailRegistration ? AppTheme.text : AppTheme.secondaryText)
                          
                          if isEmailRegistration {
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

                      Button(action: { isEmailRegistration = false }) {
                        VStack(spacing: 4) {
                          Text("Phone Number")
                            .font(.subheadline)
                            .fontWeight(!isEmailRegistration ? .semibold : .regular)
                            .foregroundColor(!isEmailRegistration ? AppTheme.text : AppTheme.secondaryText)
                          
                          if !isEmailRegistration {
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
                  // Conditional Input
                  if isEmailRegistration {
                    TextField("", text: $email, prompt: Text(verbatim: "john@example.com"))
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
                                    phoneNumber = PhoneFormatter.format(phoneNumber: phoneNumber, mask: country.formatMask)
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
                        
                        TextField("", text: $phoneNumber, prompt: Text(verbatim: "234 555 0123"))
                          .textContentType(.telephoneNumber)
                          .keyboardType(.phonePad)
                          .frame(height: 24)
                          .onChange(of: phoneNumber) { newValue in
                              if !isEmailRegistration {
                                  let formatted = PhoneFormatter.format(phoneNumber: newValue, mask: selectedCountry.formatMask)
                                  if formatted != newValue {
                                      phoneNumber = formatted
                                  }
                              }
                          }
                    }
                  }
                }
                .padding(.vertical, 12)
                .frame(height: 56) // Consistent height
                
                Divider()

                  // Password field
                  VStack(alignment: .leading, spacing: 8) {
                    HStack {
                      Text("Password")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(AppTheme.text)
                      Spacer()
                    }

                    HStack(spacing: 12) {
                      Image(systemName: "lock")
                        .foregroundColor(AppTheme.secondaryText)
                        .frame(width: 24)

                      ZStack(alignment: .trailing) {
                        ZStack(alignment: .leading) {
                          if password.isEmpty {
                            Text("••••••••")
                              .foregroundColor(AppTheme.secondaryText)
                          }
                          if isPasswordVisible {
                            TextField("", text: $password)
                              .textContentType(.newPassword)
                          } else {
                            SecureField("", text: $password)
                              .textContentType(.newPassword)
                          }
                        }
                        
                        Button(action: {
                          isPasswordVisible.toggle()
                        }) {
                          Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                            .foregroundColor(AppTheme.text.opacity(0.4))
                        }
                      }
                    }
                    .padding(.vertical, 12)
                    
                    Divider()
                  }

                  // Confirm Password field
                  VStack(alignment: .leading, spacing: 8) {
                    HStack {
                      Text("Confirm Password")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(AppTheme.text)
                      Spacer()
                    }

                    HStack(spacing: 12) {
                      Image(systemName: "lock")
                        .foregroundColor(AppTheme.secondaryText)
                        .frame(width: 24)

                      ZStack(alignment: .trailing) {
                        ZStack(alignment: .leading) {
                          if confirmPassword.isEmpty {
                            Text("••••••••")
                              .foregroundColor(AppTheme.secondaryText)
                          }
                          if isConfirmPasswordVisible {
                            TextField("", text: $confirmPassword)
                              .textContentType(.newPassword)
                          } else {
                            SecureField("", text: $confirmPassword)
                              .textContentType(.newPassword)
                          }
                        }
                          
                        Button(action: {
                          isConfirmPasswordVisible.toggle()
                        }) {
                          Image(systemName: isConfirmPasswordVisible ? "eye.slash" : "eye")
                            .foregroundColor(AppTheme.text.opacity(0.4))
                        }
                      }
                    }
                    .padding(.vertical, 12)
                    
                    Divider()
                  }
                }

                // Register button
                Button(action: {
                  Task {
                    // Validation: Ensure at least one contact method is provided
                    if email.isEmpty && phoneNumber.isEmpty {
                        // TODO: Show error "Please provide either an email or a phone number."
                        return
                    }

                    let finalPhone = phoneNumber.isEmpty ? nil : "\(selectedCountry.dialCode)\(phoneNumber.components(separatedBy: CharacterSet.decimalDigits.inverted).joined())"

                    await authManager.register(
                      email: email.isEmpty ? nil : email,
                      phoneNumber: finalPhone,
                      password: password,
                      firstName: firstName,
                      lastName: lastName
                    )

                    // If registration is successful, automatically login
                    if !authManager.isLoading && authManager.errorMessage == nil {
                       let loginValue = !email.isEmpty ? email : finalPhone ?? ""
                       await authManager.login(login: loginValue, password: password)
                    }
                  }
                }) {
                  ZStack {
                    if authManager.isLoading {
                      ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                      Text("Create Account")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(AppTheme.background)
                    }
                  }
                  .frame(maxWidth: .infinity)
                  .frame(height: 56)
                  .contentShape(Rectangle())
                }
                .background(AppTheme.primary)
                .cornerRadius(28)  // Full pill shape
                .shadow(color: Color(hex: "1A1A1A").opacity(0.1), radius: 10, y: 4)
                .disabled(!isValid || authManager.isLoading)

                // Error message
                if let errorMessage = authManager.errorMessage {
                  Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(AppTheme.destructive)
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
                  Text("Already have an account?")
                    .font(.subheadline)
                    .foregroundColor(AppTheme.text.opacity(0.6))

                  Button(action: {
                    dismiss()
                  }) {
                    Text("Sign in")
                      .font(.subheadline)
                      .fontWeight(.bold)
                      .foregroundColor(AppTheme.text)
                  }
                  Spacer()
                }
                .padding(.bottom, 24)
              }
              .padding(.horizontal, 24)

              Spacer()
            }
            .frame(minHeight: geometry.size.height)
          }
        }
      }
      .tint(AppTheme.text)
      .navigationBarHidden(true)
    }
  }

  var isValid: Bool {
    (!email.isEmpty || !phoneNumber.isEmpty) && !password.isEmpty && !firstName.isEmpty
      && !lastName.isEmpty
      && password == confirmPassword
  }
}

#Preview {
  RegisterView()
    .environmentObject(AuthManager.shared)
}
