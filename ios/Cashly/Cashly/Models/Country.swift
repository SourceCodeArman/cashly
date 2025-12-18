import Foundation

struct Country: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let isoCode: String
    let dialCode: String
    let flag: String
    let formatMask: String
    
    static let allCountries: [Country] = [
        Country(name: "United States", isoCode: "US", dialCode: "+1", flag: "🇺🇸", formatMask: "(XXX) XXX-XXXX"),
        Country(name: "Canada", isoCode: "CA", dialCode: "+1", flag: "🇨🇦", formatMask: "(XXX) XXX-XXXX"),
        Country(name: "United Kingdom", isoCode: "GB", dialCode: "+44", flag: "🇬🇧", formatMask: "XXXX XXXXXX"),
        Country(name: "Australia", isoCode: "AU", dialCode: "+61", flag: "🇦🇺", formatMask: "XXXX XXX XXX"),
        Country(name: "Germany", isoCode: "DE", dialCode: "+49", flag: "🇩🇪", formatMask: "XXXX XXXXXXX"),
        Country(name: "France", isoCode: "FR", dialCode: "+33", flag: "🇫🇷", formatMask: "X XX XX XX XX"),
        Country(name: "India", isoCode: "IN", dialCode: "+91", flag: "🇮🇳", formatMask: "XXXXX-XXXXX"),
        Country(name: "Japan", isoCode: "JP", dialCode: "+81", flag: "🇯🇵", formatMask: "XX-XXXX-XXXX"),
        Country(name: "China", isoCode: "CN", dialCode: "+86", flag: "🇨🇳", formatMask: "XXX-XXXX-XXXX"),
        Country(name: "Brazil", isoCode: "BR", dialCode: "+55", flag: "🇧🇷", formatMask: "XX XXXXX-XXXX")
    ]
    
    static let `default` = Country(name: "United States", isoCode: "US", dialCode: "+1", flag: "🇺🇸", formatMask: "(XXX) XXX-XXXX")
}
