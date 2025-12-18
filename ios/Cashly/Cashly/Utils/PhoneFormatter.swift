import Foundation

struct PhoneFormatter {
    static func format(phoneNumber: String, mask: String = "(XXX) XXX-XXXX", shouldFormat: Bool = true) -> String {
        guard shouldFormat else { return phoneNumber }
        
        // Remove non-numeric characters
        let cleaned = phoneNumber.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        
        var result = ""
        var index = cleaned.startIndex
        
        for ch in mask {
            if index == cleaned.endIndex {
                break
            }
            if ch == "X" {
                result.append(cleaned[index])
                index = cleaned.index(after: index)
            } else {
                result.append(ch)
            }
        }
        return result
    }
}
