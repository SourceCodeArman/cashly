import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.pie.fill")
                }
                .tag(0)
            
            AccountsView()
                .tabItem {
                    Label("Accounts", systemImage: "building.columns.fill")
                }
                .tag(1)
            
            TransactionsView()
                .tabItem {
                    Label("Transactions", systemImage: "list.bullet.rectangle.fill")
                }
                .tag(2)
            
            BudgetsView()
                .tabItem {
                    Label("Budgets", systemImage: "chart.bar.fill")
                }
                .tag(3)
            
            MoreView()
                .tabItem {
                    Label("More", systemImage: "ellipsis.circle.fill")
                }
                .tag(4)
        }
        .tint(.blue)
    }
}

// MARK: - Placeholder Views

struct AccountsView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "building.columns.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(.green)
                
                Text("Accounts")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Coming soon...")
                    .foregroundStyle(.secondary)
                
                Text("Connect your bank accounts and track balances")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            .navigationTitle("Accounts")
        }
    }
}

struct TransactionsView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "list.bullet.rectangle.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(.purple)
                
                Text("Transactions")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Coming soon...")
                    .foregroundStyle(.secondary)
                
                Text("View and manage all your transactions")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            .navigationTitle("Transactions")
        }
    }
}

struct BudgetsView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "chart.bar.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(.orange)
                
                Text("Budgets")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Coming soon...")
                    .foregroundStyle(.secondary)
                
                Text("Create and track your spending budgets")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
            .navigationTitle("Budgets")
        }
    }
}

struct MoreView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        NavigationStack {
            List {
                Section("Account") {
                    NavigationLink(destination: ProfilePlaceholder()) {
                        Label("Profile", systemImage: "person.fill")
                    }
                    
                    NavigationLink(destination: SettingsPlaceholder()) {
                        Label("Settings", systemImage: "gearshape.fill")
                    }
                }
                
                Section("Features") {
                    NavigationLink(destination: PlaceholderView(title: "Bills")) {
                        Label("Bills", systemImage: "doc.text.fill")
                    }
                    
                    NavigationLink(destination: PlaceholderView(title: "Goals")) {
                        Label("Goals", systemImage: "target")
                    }
                    
                    NavigationLink(destination: PlaceholderView(title: "Debts")) {
                        Label("Debts", systemImage: "creditcard.fill")
                    }
                }
                
                Section {
                    Button(action: {
                        authManager.logout()
                    }) {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}

// MARK: - Helper Views

struct PlaceholderView: View {
    let title: String
    
    var body: some View {
        VStack(spacing: 16) {
            Text(title)
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("Coming soon...")
                .foregroundStyle(.secondary)
        }
        .navigationTitle(title)
    }
}

struct ProfilePlaceholder: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(.blue)
            
            if let user = authManager.currentUser {
                Text(user.fullName)
                    .font(.title)
                    .fontWeight(.bold)
                
                Text(user.email)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            
            Text("Profile settings coming soon...")
                .foregroundStyle(.secondary)
                .padding(.top, 20)
        }
        .navigationTitle("Profile")
    }
}

struct SettingsPlaceholder: View {
    var body: some View {
        List {
            Section("Appearance") {
                HStack {
                    Text("Theme")
                    Spacer()
                    Text("System")
                        .foregroundStyle(.secondary)
                }
            }
            
            Section("About") {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("1.0.0")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Settings")
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthManager.shared)
}
