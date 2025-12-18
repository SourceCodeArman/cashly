import SwiftUI

// MARK: - Shimmer Effect
struct ShimmerEffect: ViewModifier {
    @State private var phase: CGFloat = 0
    
    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.clear,
                            Color.white.opacity(0.3),
                            Color.clear
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 2)
                    .offset(x: -geometry.size.width + (geometry.size.width * 2 * phase))
                    .onAppear {
                        withAnimation(
                            Animation.linear(duration: 1.5)
                                .repeatForever(autoreverses: false)
                        ) {
                            phase = 1
                        }
                    }
                }
            )
            .clipped()
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerEffect())
    }
}

// MARK: - Base Skeleton Components

struct SkeletonBox: View {
    var width: CGFloat? = nil
    var height: CGFloat
    var cornerRadius: CGFloat = AppTheme.cornerRadius
    
    var body: some View {
        Rectangle()
            .fill(Color(.systemGray5))
            .frame(width: width, height: height)
            .cornerRadius(cornerRadius)
            .shimmer()
    }
}

struct SkeletonCircle: View {
    var diameter: CGFloat
    
    var body: some View {
        Circle()
            .fill(Color(.systemGray5))
            .frame(width: diameter, height: diameter)
            .shimmer()
    }
}

struct SkeletonLine: View {
    var width: CGFloat? = nil
    var height: CGFloat = 12
    
    var body: some View {
        Rectangle()
            .fill(Color(.systemGray5))
            .frame(width: width, height: height)
            .cornerRadius(6)
            .shimmer()
    }
}

struct SkeletonCard: View {
    var height: CGFloat = 120
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SkeletonLine(width: 120, height: 16)
            SkeletonLine(width: 200, height: 24)
            Spacer()
            SkeletonLine(width: 150, height: 14)
        }
        .padding(AppTheme.padding)
        .frame(height: height)
        .background(AppTheme.card)
        .cornerRadius(AppTheme.cornerRadius)
        .shadow(
            color: Color.black.opacity(0.05),
            radius: 8,
            y: 4
        )
    }
}

// MARK: - List Row Skeletons

struct SkeletonListRow: View {
    var body: some View {
        HStack(spacing: 12) {
            SkeletonCircle(diameter: 40)
            
            VStack(alignment: .leading, spacing: 8) {
                SkeletonLine(width: 150, height: 14)
                SkeletonLine(width: 100, height: 12)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 8) {
                SkeletonLine(width: 80, height: 14)
                SkeletonLine(width: 60, height: 12)
            }
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Dashboard Skeleton

struct DashboardSkeleton: View {
    var body: some View {
        ScrollView {
            VStack(spacing: AppTheme.padding) {
                // Net Worth Card Skeleton
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        SkeletonLine(width: 100, height: 14)
                        Spacer()
                        SkeletonCircle(diameter: 20)
                    }
                    
                    SkeletonLine(width: 180, height: 32)
                    
                    Divider()
                        .padding(.vertical, 4)
                    
                    HStack(spacing: 24) {
                        VStack(alignment: .leading, spacing: 4) {
                            SkeletonLine(width: 60, height: 10)
                            SkeletonLine(width: 90, height: 14)
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            SkeletonLine(width: 80, height: 10)
                            SkeletonLine(width: 90, height: 14)
                        }
                    }
                }
                .padding(AppTheme.padding)
                .background(AppTheme.card)
                .cornerRadius(AppTheme.cornerRadius)
                .shadow(color: Color.black.opacity(0.05), radius: 8, y: 4)
                
                // Quick Access Section Skeleton
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        SkeletonLine(width: 100, height: 16)
                        Spacer()
                        SkeletonCircle(diameter: 20)
                    }
                    
                    LazyVGrid(
                        columns: [
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12),
                        ], spacing: 12
                    ) {
                        ForEach(0..<8) { _ in
                            VStack(spacing: 8) {
                                SkeletonCircle(diameter: 48)
                                SkeletonLine(width: 50, height: 10)
                                    .frame(maxWidth: .infinity)
                            }
                            .padding(.vertical, 8)
                        }
                    }
                }
                .padding(AppTheme.padding)
                .background(AppTheme.card)
                .cornerRadius(AppTheme.cornerRadius)
                .shadow(color: Color.black.opacity(0.05), radius: 8, y: 4)
                
                // Recent Transactions Card Skeleton
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            SkeletonLine(width: 160, height: 16)
                            SkeletonLine(width: 200, height: 10)
                        }
                        Spacer()
                        SkeletonCircle(diameter: 20)
                    }
                    
                    Divider()
                    
                    VStack(spacing: 0) {
                        ForEach(0..<5) { index in
                            SkeletonListRow()
                            if index < 4 {
                                Divider()
                                    .padding(.vertical, 8)
                            }
                        }
                    }
                }
                .padding(AppTheme.padding)
                .background(AppTheme.card)
                .cornerRadius(AppTheme.cornerRadius)
                .shadow(color: Color.black.opacity(0.05), radius: 8, y: 4)
                
                // Category Spending Card Skeleton
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            SkeletonLine(width: 170, height: 16)
                            SkeletonLine(width: 180, height: 10)
                        }
                        Spacer()
                        SkeletonCircle(diameter: 20)
                    }
                    
                    Divider()
                    
                    VStack(spacing: 0) {
                        ForEach(0..<5) { index in
                            HStack(spacing: 12) {
                                SkeletonCircle(diameter: 12)
                                SkeletonLine(width: 120, height: 14)
                                Spacer()
                                SkeletonLine(width: 70, height: 14)
                            }
                            .padding(.vertical, 4)
                            
                            if index < 4 {
                                Divider()
                                    .padding(.vertical, 8)
                            }
                        }
                    }
                }
                .padding(AppTheme.padding)
                .background(AppTheme.card)
                .cornerRadius(AppTheme.cornerRadius)
                .shadow(color: Color.black.opacity(0.05), radius: 8, y: 4)
                
                // Goals Progress Skeleton
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            SkeletonLine(width: 120, height: 16)
                            SkeletonLine(width: 150, height: 10)
                        }
                        Spacer()
                        SkeletonCircle(diameter: 20)
                    }
                    
                    Divider()
                    
                    VStack(spacing: 16) {
                        ForEach(0..<3) { _ in
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    SkeletonLine(width: 100, height: 14)
                                    Spacer()
                                    SkeletonLine(width: 40, height: 10)
                                }
                                
                                SkeletonBox(height: 8, cornerRadius: 4)
                                
                                HStack {
                                    SkeletonLine(width: 60, height: 10)
                                    Spacer()
                                    SkeletonLine(width: 60, height: 10)
                                }
                            }
                        }
                    }
                }
                .padding(AppTheme.padding)
                .background(AppTheme.card)
                .cornerRadius(AppTheme.cornerRadius)
                .shadow(color: Color.black.opacity(0.05), radius: 8, y: 4)
            }
            .padding()
        }
        .background(AppTheme.background)
    }
}

// MARK: - Transaction List Skeleton

struct TransactionListSkeleton: View {
    var rowCount: Int = 6
    
    var body: some View {
        List {
            ForEach(0..<rowCount, id: \.self) { _ in
                SkeletonListRow()
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Budget List Skeleton

struct BudgetListSkeleton: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(0..<5) { _ in
                    VStack(spacing: 12) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                SkeletonLine(width: 120, height: 16)
                                SkeletonLine(width: 80, height: 12)
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 4) {
                                SkeletonLine(width: 90, height: 16)
                                SkeletonLine(width: 120, height: 12)
                            }
                        }
                        
                        SkeletonBox(height: 8, cornerRadius: 4)
                    }
                    .padding(AppTheme.padding)
                    .background(AppTheme.card)
                    .cornerRadius(AppTheme.cornerRadius)
                    .shadow(color: Color.black.opacity(0.05), radius: 8, y: 4)
                }
            }
            .padding()
        }
    }
}

// MARK: - Analytics Chart Skeleton

struct AnalyticsChartSkeleton: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                ForEach(0..<3) { _ in
                    VStack(alignment: .leading, spacing: 12) {
                        SkeletonLine(width: 150, height: 18)
                            .padding(.horizontal)
                        
                        SkeletonBox(height: 200)
                            .padding(.horizontal)
                    }
                }
            }
            .padding(.vertical)
        }
    }
}

// MARK: - Account Card Skeleton

struct AccountCardSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header: Name/Number Left, Icon Right
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    SkeletonLine(width: 120, height: 16)
                    SkeletonLine(width: 80, height: 12)
                }
                Spacer()
                SkeletonCircle(diameter: 20)
            }
            
            // Balance
            SkeletonLine(width: 160, height: 28)
                .padding(.vertical, 4)
            
            Divider()
            
            // Info Row
            HStack {
                SkeletonLine(width: 100, height: 12)
                Spacer()
                SkeletonBox(width: 60, height: 20, cornerRadius: 4)
            }
            
            // Actions
            HStack(spacing: 8) {
                SkeletonBox(width: 80, height: 28, cornerRadius: 8)
                Spacer()
                SkeletonCircle(diameter: 16)
            }
        }
        .padding(AppTheme.padding)
        .background(AppTheme.card)
        .cornerRadius(AppTheme.cornerRadius)
        .shadow(
            color: Color.black.opacity(0.05),
            radius: 8,
            y: 4
        )
    }
}

// MARK: - Bill List Skeleton

struct BillListSkeleton: View {
    var body: some View {
        List {
            ForEach(0..<5, id: \.self) { _ in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        SkeletonLine(width: 140, height: 16)
                        SkeletonLine(width: 100, height: 12)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        SkeletonLine(width: 80, height: 16)
                        SkeletonLine(width: 60, height: 12)
                    }
                }
                .padding(.vertical, 4)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden) // Ensure the list background itself is hidden
    }
}

// MARK: - Goal List Skeleton

struct GoalListSkeleton: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(0..<4) { _ in
                    VStack(spacing: 12) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                SkeletonLine(width: 130, height: 16)
                                SkeletonLine(width: 110, height: 12)
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 4) {
                                SkeletonLine(width: 90, height: 16)
                                SkeletonLine(width: 120, height: 12)
                            }
                        }
                        
                        SkeletonBox(height: 8, cornerRadius: 4)
                        
                        HStack {
                            SkeletonLine(width: 80, height: 10)
                            Spacer()
                            SkeletonLine(width: 70, height: 10)
                        }
                    }
                    .padding(AppTheme.padding)
                    .background(AppTheme.card)
                    .cornerRadius(AppTheme.cornerRadius)
                    .shadow(color: Color.black.opacity(0.05), radius: 8, y: 4)
                }
            }
            .padding()
        }
    }
}

// MARK: - Debt List Skeleton

struct DebtListSkeleton: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Summary Card Skeleton
                VStack(spacing: 8) {
                    SkeletonLine(width: 100, height: 14)
                    SkeletonLine(width: 160, height: 36)
                }
                .frame(maxWidth: .infinity)
                .padding(AppTheme.padding)
                .background(AppTheme.card)
                .cornerRadius(AppTheme.cornerRadius)
                .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
                
                // Debt List
                LazyVStack(spacing: 16) {
                    ForEach(0..<3) { _ in
                        VStack(spacing: 12) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    SkeletonLine(width: 120, height: 16)
                                    SkeletonBox(width: 80, height: 20, cornerRadius: 4)
                                }
                                
                                Spacer()
                                
                                VStack(alignment: .trailing, spacing: 4) {
                                    SkeletonLine(width: 100, height: 16)
                                    SkeletonLine(width: 80, height: 12)
                                }
                            }
                            
                            Divider()
                            
                            HStack {
                                SkeletonLine(width: 90, height: 10)
                                Spacer()
                                SkeletonLine(width: 70, height: 10)
                            }
                        }
                        .padding(AppTheme.padding)
                        .background(AppTheme.card)
                        .cornerRadius(AppTheme.cornerRadius)
                        .shadow(color: Color.black.opacity(0.05), radius: 8, y: 4)
                    }
                }
            }
            .padding()
        }
    }
}

// MARK: - Category List Skeleton

struct CategoryListSkeleton: View {
    var body: some View {
        List {
            ForEach(0..<8, id: \.self) { _ in
                HStack(spacing: 12) {
                    SkeletonCircle(diameter: 12)
                    SkeletonLine(width: 130, height: 14)
                    Spacer()
                    SkeletonCircle(diameter: 20)
                }
                .padding(.vertical, 4)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Insight Card Skeleton

struct InsightListSkeleton: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Summary Cards Skeleton
                HStack(spacing: 12) {
                    ForEach(0..<2) { _ in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                SkeletonCircle(diameter: 24)
                                Spacer()
                                SkeletonLine(width: 40, height: 20) // Value
                            }
                            SkeletonLine(width: 60, height: 12) // Title
                        }
                        .padding(AppTheme.padding)
                        .background(AppTheme.card)
                        .cornerRadius(AppTheme.cornerRadius)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, y: 2)
                    }
                }
                
                // Insights List
                LazyVStack(spacing: 16) {
                    ForEach(0..<4) { _ in
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                SkeletonLine(width: 140, height: 16) // Title
                                Spacer()
                                SkeletonBox(width: 60, height: 20, cornerRadius: 8) // Priority Pill
                            }
                            
                            SkeletonLine(width: 180, height: 14) // Message line 1
                            SkeletonLine(width: 120, height: 14) // Message line 2
                        }
                        .padding(AppTheme.padding)
                        .background(AppTheme.card)
                        .cornerRadius(AppTheme.cornerRadius)
                        .shadow(color: Color.black.opacity(0.05), radius: 8, y: 4)
                    }
                }
            }
            .padding()
        }
    }
}

// MARK: - Notification List Skeleton

struct NotificationListSkeleton: View {
    var body: some View {
        List {
            ForEach(0..<6, id: \.self) { _ in
                HStack(spacing: 12) {
                    SkeletonCircle(diameter: 36)
                    
                    VStack(alignment: .leading, spacing: 6) {
                        SkeletonLine(width: 160, height: 14)
                        SkeletonLine(width: 220, height: 12)
                        SkeletonLine(width: 80, height: 10)
                    }
                    
                    Spacer()
                }
                .padding(.vertical, 4)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Account List Skeleton

struct AccountListSkeleton: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(0..<3) { _ in
                    AccountCardSkeleton()
                }
            }
            .padding()
        }
    }
}
