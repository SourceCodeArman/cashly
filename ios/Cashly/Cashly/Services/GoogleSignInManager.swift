import Foundation
import GoogleSignIn
import GoogleSignInSwift

@MainActor
class GoogleSignInManager {
    static let shared = GoogleSignInManager()
    
    private init() {}
    
    func signIn(presenting viewController: UIViewController) async throws -> GIDGoogleUser {
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: viewController)
        return result.user
    }
    
    // For SwiftUI, we might not need this explicitly if we use the button, 
    // but having a programmatic way is useful.
    @MainActor
    func signIn() async throws -> GIDGoogleUser {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            throw GoogleSignInError.noRootViewController
        }
        
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)
        return result.user
    }
    
    func signOut() {
        GIDSignIn.sharedInstance.signOut()
    }
}

enum GoogleSignInError: Error {
    case noRootViewController
}
