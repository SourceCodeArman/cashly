import SwiftUI

struct SideMenuView: View {
  @Binding var selectedTab: Int
  @Binding var isSideMenuOpen: Bool
  @EnvironmentObject var authManager: AuthManager

  // Navigation Items
  let menuItems = [
    (icon: "chart.pie.fill", title: "Dashboard", tag: 0),
    (icon: "building.columns.fill", title: "Accounts", tag: 1),
    (icon: "list.bullet.rectangle.fill", title: "Transactions", tag: 2),
    (icon: "chart.bar.fill", title: "Budgets", tag: 3),
    (icon: "chart.xyaxis.line", title: "Analytics", tag: 4),
    (icon: "lightbulb.fill", title: "Smart Insights", tag: 5),
    (icon: "doc.text.fill", title: "Bills", tag: 6),
    (icon: "target", title: "Goals", tag: 7),
    (icon: "creditcard.fill", title: "Debts", tag: 8),
    (icon: "crown.fill", title: "Subscription", tag: 9),
    (icon: "bell.fill", title: "Notifications", tag: 10),
  ]

  var body: some View {
    ZStack {
      if isSideMenuOpen {
        // Dimmed Background
        Color.black.opacity(0.3)
          .ignoresSafeArea()
          .onTapGesture {
            withAnimation(.spring()) {
              isSideMenuOpen = false
            }
          }
          .transition(.opacity)
      }

      HStack(spacing: 0) {
        // Menu Content
        ZStack {
          AppTheme.background
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 32) {
              // Menu Header
              Button(action: {
                selectedTab = 12  // Profile View Tag
                withAnimation(.spring()) {
                  isSideMenuOpen = false
                }
              }) {
                VStack(alignment: .leading, spacing: 12) {
                  if let user = authManager.currentUser {
                    HStack(spacing: 12) {
                      Image(systemName: "person.circle.fill")
                        .resizable()
                        .frame(width: 48, height: 48)
                        .foregroundStyle(AppTheme.primary)

                      VStack(alignment: .leading, spacing: 4) {
                        Text(user.fullName)
                          .font(.headline)
                          .foregroundColor(.primary)
                        Text(user.email)
                          .font(.caption)
                          .foregroundColor(.secondary)
                      }
                    }
                  } else {
                    Text("Menu")
                      .font(.largeTitle)
                      .fontWeight(.bold)
                      .foregroundStyle(.primary)
                  }
                }
              }
              .buttonStyle(PlainButtonStyle())
              .padding(.top, 60)
              .padding(.horizontal)

              // All Navigation Items in One ScrollView
              ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 8) {
                  // Regular menu items
                  ForEach(menuItems, id: \.tag) { item in
                    Button(action: {
                      selectedTab = item.tag
                      withAnimation(.spring()) {
                        isSideMenuOpen = false
                      }
                    }) {
                      HStack(spacing: 16) {
                        Image(systemName: item.icon)
                          .font(.system(size: 20))
                          .frame(width: 24)

                        Text(item.title)
                          .font(.headline)

                        Spacer()
                      }
                      .padding()
                      .background(
                        selectedTab == item.tag
                          ? AppTheme.primary.opacity(0.15)
                          : Color.clear
                      )
                      .cornerRadius(12)
                      .foregroundStyle(
                        selectedTab == item.tag
                          ? AppTheme.primary
                          : .secondary
                      )
                    }
                  }
                  
                  // Divider before footer items
                  Divider()
                    .padding(.vertical, 8)
                  
                  // Settings Button
                  Button(action: {
                    selectedTab = 11  // Settings tag
                    withAnimation(.spring()) {
                      isSideMenuOpen = false
                    }
                  }) {
                    HStack(spacing: 16) {
                      Image(systemName: "gearshape.fill")
                        .font(.system(size: 20))
                        .frame(width: 24)
                      Text("Settings")
                        .font(.headline)
                      Spacer()
                    }
                    .padding()
                    .background(
                      selectedTab == 11
                        ? AppTheme.primary.opacity(0.15)
                        : Color.clear
                    )
                    .cornerRadius(12)
                    .foregroundStyle(
                      selectedTab == 11
                        ? AppTheme.primary
                        : .secondary
                    )
                  }
                  
                  // Sign Out Button
                  Button(action: {
                    authManager.logout()
                  }) {
                    HStack(spacing: 16) {
                      Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 20))
                        .frame(width: 24)
                      Text("Sign Out")
                        .font(.headline)
                      Spacer()
                    }
                    .padding()
                    .foregroundStyle(AppTheme.destructive)
                  }
                  .cornerRadius(12)
                }
                .padding(.horizontal)
                .padding(.bottom, 40)
              }
            }
        }
        .frame(width: 280)
        .offset(x: isSideMenuOpen ? 0 : -280)
        .transition(.move(edge: .leading))

        Spacer()
      }
    }
  }
}

struct TopNavBar: View {
  @Binding var isSideMenuOpen: Bool

  var body: some View {
    HStack {
      // Burger Menu Button (Left)
      Button(action: {
        withAnimation(.spring()) {
          isSideMenuOpen.toggle()
        }
      }) {
        Image(systemName: "line.3.horizontal")
          .font(.system(size: 24))
          .foregroundStyle(.primary)
          .padding(8)
      }

      Spacer()

      // Cashly Header (Right)
      CashlyHeader()
    }
    .padding(.horizontal)
    .padding(.vertical, 12)
    .background(AppTheme.background)
  }
}

struct CashlyHeader: View {
  var body: some View {
    HStack(spacing: 12) {
      Text("Cashly")
        .font(.system(size: 24, weight: .bold))
      Image("AppLogo")
        .resizable()
        .scaledToFit()
        .frame(width: 32, height: 32)
        .cornerRadius(8)
    }
  }
}
