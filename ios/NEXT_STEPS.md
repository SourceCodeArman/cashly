# 📱 Adding Files to Your Xcode Project

I've created all the networking and authentication code! Now you need to add these files to your Xcode project.

## Step 1: Add All New Files to Xcode

### Option A: Drag and Drop (Easiest)

1. Open **Finder** and navigate to:
   ```
   /Users/armanghevondyan/Desktop/vibe-coding/cashly/ios/Cashly
   ```

2. In **Xcode**, look at the Project Navigator (left sidebar)

3. **Drag the following folders** from Finder into the Xcode `Cashly` folder:
   - `Core/` folder (contains Config, Network, Auth, Storage subdirectories)
   - `Models/` folder
   - `Views/` folder

4. When the dialog appears:
   - ✅ **Check** "Copy items if needed"
   - ✅ **Check** "Create groups"
   - ✅ Make sure "Cashly" target is selected
   - Click **Finish**

### Option B: Add Files Menu

1. Right-click the `Cashly` folder in Xcode Project Navigator
2. Select **"Add Files to Cashly..."**
3. Navigate to `/Users/armanghevondyan/Desktop/vibe-coding/cashly/ios/Cashly`
4. Select `Core`, `Models`, and `Views` folders
5. Options:
   - ✅ Check "Copy items if needed"
   - ✅ Select "Create groups"
   - ✅ Add to "Cashly" target
6. Click **Add**

---

## Step 2: Update CashlyApp.swift

Replace the content of `Cashly/Cashly/CashlyApp.swift` with:

```swift
import SwiftUI

@main
struct CashlyApp: App {
    @StateObject private var authManager = AuthManager.shared
    
    var body: some Scene {
        WindowGroup {
            if authManager.isAuthenticated {
                MainTabView()
                    .environmentObject(authManager)
            } else {
                LoginView()
                    .environmentObject(authManager)
            }
        }
    }
}
```

---

## Step 3: Configure Backend URL for iOS Simulator

The iOS Simulator can't access `localhost` the same way as your browser. You need to find your Mac's local IP address:

1. Open Terminal
2. Run: `ipconfig getifaddr en0`
3. Copy the IP address (e.g., `192.168.1.10`)

### Update the Backend Django Settings

1. Open `/Users/armanghevondyan/Desktop/vibe-coding/cashly/backend/config/settings/base.py`
2. Find `CORS_ALLOWED_ORIGINS` and add your IP:
   ```python
   CORS_ALLOWED_ORIGINS = [
       "http://localhost:3000",
       "http://localhost:3001",
       "http://192.168.1.10:8000",  # Add your Mac's IP here
   ]
   ```

3. Also update `ALLOWED_HOSTS`:
   ```python
   ALLOWED_HOSTS = ['localhost', '127.0.0.1', '192.168.1.10']  # Add your IP
   ```

### Update iOS App Configuration

1. Open `Cashly/Core/Config/AppConfig.swift` in Xcode
2. Replace the localhost line with:
   ```swift
   return "http://192.168.1.10:8000"  // Use YOUR Mac's IP
   ```

---

## Step 4: Build and Test! 🚀

1. Make sure your Django backend is still running:
   ```bash
   cd /Users/armanghevondyan/Desktop/vibe-coding/cashly/backend
   docker-compose up
   ```

2. In Xcode, press `Cmd + B` to build

3. If build succeeds, press `Cmd + R` to run

4. The app should launch showing the login screen

5. **Test the login** with your test credentials:
   - Email: `armanghev747@gmail.com` (or your test user)
   - Password: (your test password)

---

## What You Now Have

✅ **Full API Integration**: iOS app connects to Django backend  
✅ **Authentication**: Real login/register flows  
✅ **Secure Storage**: JWT tokens stored in Keychain  
✅ **Error Handling**: Proper error messages from API  
✅ **Token Management**: Automatic token refresh support  
✅ **MFA Ready**: Infrastructure for 2FA verification  

---

## Troubleshooting

### Build Errors

**"Cannot find 'AuthManager' in scope"**
- Make sure you added the `Core/` folder to the Xcode project
- Check that all `.swift` files have the Cashly target selected

**"No such module 'SwiftUI'"**
- Clean build folder: `Cmd + Shift + K`
- Rebuild: `Cmd + B`

### Runtime Errors

**"Failed to connect to localhost:8000"**
- Use your Mac's IP address instead of localhost in `AppConfig.swift`
- Make sure backend is running
- Check CORS settings in Django

**"Unauthorized" error**
- Check that the backend URL is correct
- Verify Django is running on the IP you specified
- Check backend logs for errors

---

## Next Steps

Once login is working:

1. **Test Registration**: Try creating a new account
2. **Add Dashboard Data**: Fetch real data from backend
3. **Implement Accounts Screen**: Connect Plaid, show bank accounts
4. **Build Transactions List**: Display transaction history

Need help? Let me know what error you're seeing!
