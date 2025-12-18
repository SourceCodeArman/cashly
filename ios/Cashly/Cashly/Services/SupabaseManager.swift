import Foundation
import Supabase

class SupabaseManager {
    static let shared = SupabaseManager()
    
    // Replace with your actual Supabase URL and Anon Key
    // Ideally these should come from a secure config or Info.plist
    private let supabaseUrl = URL(string: "https://yeohuydyvpfhhaukltqz.supabase.co")!
    private let supabaseKey = "sb_publishable_PZVpej2JD3vY0l2Z1hExTA_n9l5RJuT" // User needs to replace this
    
    let client: SupabaseClient
    
    private init() {
        self.client = SupabaseClient(supabaseURL: supabaseUrl, supabaseKey: supabaseKey)
    }
    
    // MARK: - Native Google Sign-In with Supabase
    
    // Exchanges Google Native tokens for a Supabase session
    func signInWithGoogle(idToken: String, accessToken: String) async throws {
        try await client.auth.signInWithIdToken(
            credentials: .init(
                provider: .google,
                idToken: idToken,
                accessToken: accessToken
            )
        )
    }
    
    func handle(url: URL) {
        // Handle deep link callback
        Task {
            try? await client.auth.session(from: url)
        }
    }
    
    func getCurrentSession() async throws -> Session? {
        return try await client.auth.session
    }
    
    func signOut() async throws {
        try await client.auth.signOut()
    }
}
