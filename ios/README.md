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
├── App/              # App entry point
├── Core/             # Core utilities (networking, storage)
├── Models/           # Data models
├── Services/         # Business logic
├── ViewModels/       # MVVM view models
├── Views/            # SwiftUI views
├── Components/       # Reusable UI components
└── Resources/        # Assets, fonts, etc.
```

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
