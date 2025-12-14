import MapKit
import SwiftUI

struct TransactionDetailView: View {
  let transaction: Transaction
  @State private var detailedTransaction: Transaction?
  @State private var isLoading = false
  @Environment(\.dismiss) private var dismiss

  var displayTransaction: Transaction {
    detailedTransaction ?? transaction
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 24) {
        // Header Amount
        VStack(spacing: 8) {
          Text(displayTransaction.formattedAmount ?? "$\(displayTransaction.amount)")
            .font(.system(size: 40, weight: .bold))
            .foregroundStyle(
              displayTransaction.type == "income" ? AppTheme.success : AppTheme.destructive)

          Text(displayTransaction.dateObject.formatted(date: .long, time: .omitted))
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        .padding(.top, 20)

        // Merchant / Map
        VStack(spacing: 0) {
          if let lat = displayTransaction.location?.lat, let lon = displayTransaction.location?.lon
          {
            Map(
              coordinateRegion: .constant(
                MKCoordinateRegion(
                  center: CLLocationCoordinate2D(latitude: lat, longitude: lon),
                  span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                ))
            )
            .frame(height: 150)
            .clipShape(
              UnevenRoundedRectangle(
                topLeadingRadius: 12, bottomLeadingRadius: 0, bottomTrailingRadius: 0,
                topTrailingRadius: 12))
          }

          HStack {
            VStack(alignment: .leading, spacing: 4) {
              Text(displayTransaction.merchantName ?? "Unknown Merchant")
                .font(.headline)
              if let address = displayTransaction.location?.address {
                Text(address)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
            Spacer()

            // Category Icon
            if let category = displayTransaction.category {
              Image(systemName: category.safeIcon)
                .font(.title2)
                .foregroundColor(Color(hex: category.color ?? "#000000"))
                .padding(10)
                .background(Color(hex: category.color ?? "#000000").opacity(0.1))
                .clipShape(Circle())
            }
          }
          .padding()
          .background(AppTheme.card)
          .clipShape(
            UnevenRoundedRectangle(
              topLeadingRadius: displayTransaction.location?.lat != nil ? 0 : 12,
              bottomLeadingRadius: 12,
              bottomTrailingRadius: 12,
              topTrailingRadius: displayTransaction.location?.lat != nil ? 0 : 12
            ))
        }
        .shadow(color: .black.opacity(0.05), radius: 10, y: 5)
        .padding(.horizontal)

        // Details Grid
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
          DetailCard(
            title: "Account", value: displayTransaction.accountName ?? "Unknown",
            icon: "creditcard.fill")
          DetailCard(
            title: "Category", value: displayTransaction.category?.name ?? "Uncategorized",
            icon: "tag.fill")

          if let splits = displayTransaction.splits, !splits.isEmpty {
            DetailCard(
              title: "Splits", value: "\(splits.count) Categories", icon: "arrow.triangle.branch")
          }

          if displayTransaction.isRecurring {
            DetailCard(title: "Recurring", value: "Yes", icon: "arrow.clockwise")
          }
        }
        .padding(.horizontal)

        // Splits List
        if let splits = displayTransaction.splits, !splits.isEmpty {
          VStack(alignment: .leading, spacing: 12) {
            Text("Splits")
              .font(.headline)
              .padding(.horizontal)

            ForEach(splits) { split in
              HStack {
                Image(systemName: split.safeCategoryIcon)
                  .foregroundStyle(Color(hex: split.categoryColor ?? "#888888"))
                  .frame(width: 24)

                VStack(alignment: .leading) {
                  Text(split.categoryName ?? "Uncategorized")
                    .font(.subheadline)
                    .fontWeight(.medium)
                  if let desc = split.description, !desc.isEmpty {
                    Text(desc)
                      .font(.caption)
                      .foregroundStyle(.secondary)
                  }
                }

                Spacer()
                Text("$\(split.amount)")
                  .font(.subheadline)
              }
              .padding()
              .background(AppTheme.card)
              .cornerRadius(12)
              .padding(.horizontal)
            }
          }
        }

        // Notes & Tags
        if let notes = displayTransaction.notes, !notes.isEmpty {
          VStack(alignment: .leading, spacing: 8) {
            Text("Notes")
              .font(.headline)
              .padding(.horizontal)

            Text(notes)
              .foregroundStyle(.secondary)
              .padding()
              .frame(maxWidth: .infinity, alignment: .leading)
              .background(AppTheme.card)
              .cornerRadius(12)
              .padding(.horizontal)
          }
        }

        // Tags
        if let tags = displayTransaction.tags, !tags.isEmpty {
          VStack(alignment: .leading, spacing: 8) {
            Text("Tags")
              .font(.headline)
              .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
              HStack {
                ForEach(tags, id: \.self) { tag in
                  Text("#\(tag)")
                    .font(.caption)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(AppTheme.primary.opacity(0.1))
                    .foregroundStyle(AppTheme.primary)
                    .cornerRadius(20)
                }
              }
              .padding(.horizontal)
            }
          }
        }

        // Receipts
        if let receipts = displayTransaction.receipts, !receipts.isEmpty {
          VStack(alignment: .leading, spacing: 12) {
            Text("Receipts")
              .font(.headline)
              .padding(.horizontal)

            ForEach(receipts) { receipt in
              Link(destination: URL(string: receipt.fileUrl ?? "")!) {
                HStack {
                  Image(systemName: "doc.text.fill")
                    .foregroundStyle(AppTheme.primary)
                  Text(receipt.fileName ?? "Receipt")
                    .foregroundStyle(.primary)
                  Spacer()
                  Image(systemName: "arrow.up.right.square")
                    .foregroundStyle(.secondary)
                }
                .padding()
                .background(AppTheme.card)
                .cornerRadius(12)
              }
              .padding(.horizontal)
            }
          }
        }

      }
      .padding(.bottom, 40)
    }
    .background(AppTheme.background)
    .navigationTitle("Transaction")
    .navigationBarTitleDisplayMode(.inline)
    .task {
      await loadDetails()
    }
  }

  private func loadDetails() async {
    isLoading = true
    do {
      detailedTransaction = try await TransactionService.shared.getTransaction(id: transaction.id)
    } catch {
      print("Error loading transaction details: \(error)")
    }
    isLoading = false
  }
}

struct DetailCard: View {
  let title: String
  let value: String
  let icon: String

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(AppTheme.primary)

      VStack(alignment: .leading, spacing: 4) {
        Text(title)
          .font(.caption)
          .foregroundStyle(.secondary)
        Text(value)
          .font(.subheadline)
          .fontWeight(.semibold)
          .foregroundStyle(.primary)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding()
    .background(AppTheme.card)
    .cornerRadius(12)
    .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
  }
}

// Add these extension if they don't exist in helper files,
// usually Color(hex:) is needed.
// Assuming checking for it will be done next.
