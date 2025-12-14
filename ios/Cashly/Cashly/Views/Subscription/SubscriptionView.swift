import SwiftUI

struct SubscriptionView: View {
  var body: some View {
    ZStack {
      AppTheme.background
        .ignoresSafeArea()

      VStack(spacing: 0) {
        // Custom Header
        HStack {
          Text("Subscription")
            .font(.largeTitle)
            .fontWeight(.bold)
            .foregroundStyle(.primary)
          Spacer()
        }
        .padding(.horizontal)
        .padding(.top, 16)
        .padding(.bottom, 16)

        ScrollView {
          VStack(spacing: 24) {
            // Header for Plan Info
            VStack(spacing: 8) {
              Text("Upgrade to Pro")
                .font(AppFont.title1())
                .foregroundStyle(AppTheme.text)
              Text("Unlock financial freedom")
                .font(.subheadline)
                .foregroundStyle(AppTheme.secondaryText)
            }
            .padding(.top)

            // Plans
            VStack(spacing: 16) {
              PlanCard(
                name: "Free", price: "$0", features: ["Basic Tracking", "3 Attached Accounts"],
                isCurrent: true)
              PlanCard(
                name: "Pro", price: "$12.99",
                features: ["Unlimited Accounts", "AI Insights", "Advanced Analytics"],
                isCurrent: false, isPopular: true)
              PlanCard(
                name: "Premium", price: "$19.99",
                features: ["Dedicated Advisor", "Tax Optimization", "Priority Support"],
                isCurrent: false)
            }
          }
          .padding()
        }
      }
    }
  }
}

struct PlanCard: View {
  let name: String
  let price: String
  let features: [String]
  let isCurrent: Bool
  var isPopular: Bool = false

  var body: some View {
    VStack(spacing: 16) {
      if isPopular {
        Text("MOST POPULAR")
          .font(.caption)
          .fontWeight(.bold)
          .foregroundStyle(.white)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(AppTheme.primary)
          .cornerRadius(8)
      }

      Text(name)
        .font(.title2)
        .fontWeight(.bold)
        .foregroundStyle(AppTheme.text)

      Text(price)
        .font(.largeTitle)
        .fontWeight(.bold)
        .foregroundStyle(AppTheme.primary)
        + Text("/month")
        .font(.caption)
        .foregroundStyle(AppTheme.secondaryText)

      VStack(alignment: .leading, spacing: 8) {
        ForEach(features, id: \.self) { feature in
          HStack {
            Image(systemName: "checkmark.circle.fill")
              .foregroundStyle(AppTheme.success)
            Text(feature)
              .foregroundStyle(AppTheme.secondaryText)
          }
        }
      }

      Button(action: {}) {
        Text(isCurrent ? "Current Plan" : "Upgrade")
          .fontWeight(.bold)
          .frame(maxWidth: .infinity)
          .padding()
          .background(isCurrent ? AppTheme.secondaryText.opacity(0.1) : AppTheme.primary)
          .foregroundStyle(isCurrent ? AppTheme.text : .white)
          .cornerRadius(AppTheme.cornerRadius)
      }
      .disabled(isCurrent)
    }
    .padding()
    .background(AppTheme.card)
    .cornerRadius(AppTheme.cornerRadius)
    .shadow(color: Color.black.opacity(0.05), radius: 10)
    .overlay(
      RoundedRectangle(cornerRadius: AppTheme.cornerRadius)
        .stroke(isPopular ? AppTheme.primary : Color.clear, lineWidth: 2)
    )
  }
}

#Preview {
  SubscriptionView()
}
