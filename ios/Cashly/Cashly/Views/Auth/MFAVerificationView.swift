import SwiftUI

struct MFAVerificationView: View {
  @EnvironmentObject var authManager: AuthManager
  @State private var code: String = ""
  
  var body: some View {
    ZStack(alignment: .top) {
      AppTheme.background.ignoresSafeArea()
      
      ScrollView {
        VStack(spacing: 24) {
          // Icon
          Image(systemName: "lock.shield.fill")
            .font(.system(size: 60))
            .foregroundStyle(AppTheme.primary)
            .padding(.bottom, 20)
          
          // Header
          VStack(spacing: 12) {
            Text("Two-Factor Authentication")
              .font(.title2)
              .fontWeight(.bold)
              .foregroundStyle(AppTheme.text)
            
            Text("Enter the 6-digit code from your authenticator app.")
              .font(.body)
              .foregroundStyle(AppTheme.secondaryText)
              .multilineTextAlignment(.center)
          }
          
          // Input
          VStack(spacing: 16) {
            TextField("000000", text: $code)
              .font(.system(size: 24, weight: .bold, design: .monospaced))
              .multilineTextAlignment(.center)
              .keyboardType(.numberPad)
              .textContentType(.oneTimeCode)
              .padding()
              .background(AppTheme.card)
              .cornerRadius(12)
              .overlay(
                RoundedRectangle(cornerRadius: 12)
                  .stroke(AppTheme.primary.opacity(0.1), lineWidth: 1)
              )
              .foregroundStyle(AppTheme.text)
              .frame(maxWidth: 240)
              .onChange(of: code) { _, newValue in
                  if newValue.count > 6 {
                      code = String(newValue.prefix(6))
                  }
              }
            
            if let error = authManager.errorMessage {
              Text(error)
                .font(.caption)
                .foregroundColor(.red)
                .multilineTextAlignment(.center)
            }
          }
          
          // Verify Button
          Button(action: verify) {
            if authManager.isLoading {
              ProgressView()
                .tint(AppTheme.background)
            } else {
              Text("Verify")
                .font(.headline)
                .fontWeight(.semibold)
            }
          }
          .frame(maxWidth: .infinity)
          .padding()
          .background(AppTheme.primary)
          .foregroundColor(AppTheme.background)
          .cornerRadius(12)
          .disabled(code.count < 6 || authManager.isLoading)
          
          // Cancel Button
          Button("Cancel") {
            authManager.logout()
          }
          .foregroundStyle(AppTheme.secondaryText)
          .padding(.top)
          
          Spacer()
        }
        .padding(32)
        .padding(.top, 40) // Add some top padding for visual balance
      }
    }
  }
  
  private func verify() {
    Task {
      await authManager.verifyLoginMFA(code: code)
    }
  }
}

#Preview {
    MFAVerificationView()
        .environmentObject(AuthManager.shared)
}
