# Cashly iOS

Native iOS app built with Swift and SwiftUI.

## Quick Start

1. Open `Cashly.xcodeproj` in Xcode
2. Select a simulator or your device as the target
3. Press `Cmd + R` to build and run

## Requirements

- Xcode 15.0+
- iOS 16.0+
- macOS 13.0+

## Backend Connection

The app connects to the Django backend running at:
- **Development**: `http://localhost:8000`
- **For iOS Simulator**: Use your Mac's local IP address (e.g., `http://192.168.1.x:8000`)

To find your Mac's IP address:
```bash
ipconfig getifaddr en0
```

## Project Structure

```
Cashly/
├── App/              # App entry point and delegation
├── Core/             # Core utilities, networking, and extensions
├── Models/           # Data models (Codable structs)
├── Services/         # Business logic and API interaction
├── ViewModels/       # MVVM view models handling state
├── Views/            # SwiftUI views broken down by feature
├── Components/       # Reusable UI components (Buttons, Cards)
└── Resources/        # Assets, Colors, Fonts
```

## Architecture

The app follows the **MVVM (Model-View-ViewModel)** architectural pattern:

-   **View**: SwiftUI Views that observe ViewModels.
-   **ViewModel**: `ObservableObject` classes that hold state (`@Published`) and handle business logic.
-   **Model**: Simple data structures.
-   **Service**: Singleton classes responsible for networking and data persistence.

## Testing

Unit tests are located in the `CashlyTests` target.

1. Select the `Cashly` scheme.
2. Press `Cmd + U` to run tests.

## Build Configurations

- **Debug**: Development build with verbose logging
- **Release**: Production-ready optimized build

## Dependencies

Managed via Swift Package Manager (SPM):
- Alamofire - Networking
- SwiftyJSON - JSON parsing
- Plaid Link SDK - Bank account linking
- Kingfisher - Image loading
- Lottie - Animations
