import SwiftUI
import UIKit

// MARK: - App Theme
extension Color {
  init(hex: String) {
    let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int: UInt64 = 0
    Scanner(string: hex).scanHexInt64(&int)
    let a: UInt64
    let r: UInt64
    let g: UInt64
    let b: UInt64
    switch hex.count {
    case 3:  // RGB (12-bit)
      (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
    case 6:  // RGB (24-bit)
      (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
    case 8:  // ARGB (32-bit)
      (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
    default:
      (a, r, g, b) = (1, 1, 1, 0)
    }

    self.init(
      .sRGB,
      red: Double(r) / 255,
      green: Double(g) / 255,
      blue: Double(b) / 255,
      opacity: Double(a) / 255
    )
  }
}

struct AppTheme {
  // Helper to create dynamic UIColor -> Color
  private static func dynamicColor(light: String, dark: String) -> Color {
    let lightColor = UIColor(Color(hex: light))
    let darkColor = UIColor(Color(hex: dark))

    let dynamic = UIColor { traitCollection in
      return traitCollection.userInterfaceStyle == .dark ? darkColor : lightColor
    }
    return Color(dynamic)
  }

  // MARK: - Core Colors
  // MARK: - Core Colors
  static let primary = dynamicColor(light: "1A1A1A", dark: "FDFCF8")  // Charcoal / Cream
  static let background = dynamicColor(light: "FDFCF8", dark: "1A1A1A")  // Cream / Charcoal
  static let card = dynamicColor(light: "FDFCF8", dark: "212121")
  static let text = dynamicColor(light: "1A1A1A", dark: "FDFCF8")
  static let secondaryText = dynamicColor(light: "6B7280", dark: "9CA3AF")
  static let tabBarBackground = dynamicColor(light: "FDFCF8", dark: "1A1A1A")

  // MARK: - Semantic Colors
  static let accent = dynamicColor(light: "22C38D", dark: "26D89D")  // Green
  static let success = dynamicColor(light: "22C38D", dark: "26D89D")
  static let warning = dynamicColor(light: "F59E0B", dark: "FFB020")
  static let destructive = dynamicColor(light: "EF4444", dark: "F87171")

  // MARK: - UI Constants
  static let cornerRadius: CGFloat = 12
  static let padding: CGFloat = 16

  // MARK: - Gradients
  static var primaryGradient: LinearGradient {
    LinearGradient(
      colors: [primary, primary.opacity(0.8)],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
  }
}

struct AppFont {
  // Helper for custom fonts if we add them later, currently mapping to system design
  static func title1() -> Font { .system(.title, design: .rounded).weight(.bold) }
  static func title2() -> Font { .system(.title2, design: .rounded).weight(.bold) }
  static func title3() -> Font { .system(.title3, design: .rounded).weight(.semibold) }
  static func largeTitleSerif() -> Font { .system(size: 36, weight: .bold, design: .serif) }
  static func body() -> Font { .system(.body, design: .default) }
  static func caption() -> Font { .system(.caption, design: .default) }
}
