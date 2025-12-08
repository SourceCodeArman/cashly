# 🚀 Quick Setup Guide - Creating Your Xcode Project

Follow these steps to create your Cashly iOS project in Xcode.

## Step 1: Open Xcode

1. Open **Xcode** from your Applications folder (or press `Cmd + Space` and type "Xcode")
2. You should see the Xcode welcome screen

## Step 2: Create New Project

1. Click **"Create New Project"** (or File → New → Project)
2. Select **iOS** at the top
3. Choose **App** template
4. Click **Next**

## Step 3: Configure Project Settings

Fill in the following details:

| Setting | Value |
|---------|-------|
| **Product Name** | `Cashly` |
| **Team** | Select your team (or "None") |
| **Organization Identifier** | `com.cashly` (or your own) |
| **Bundle Identifier** | Will auto-fill as `com.cashly.Cashly` |
| **Interface** | **SwiftUI** ⚠️ Important! |
| **Language** | **Swift** |
| **Storage** | Core Data ❌ **UNCHECK THIS** |
| **Include Tests** | ✅ Check both boxes |

Click **Next**

## Step 4: Save Location

1. Navigate to: `/Users/armanghevondyan/Desktop/vibe-coding/cashly/ios`
2. **IMPORTANT**: UNCHECK "Create Git repository" (we already have one)
3. Click **Create**

## Step 5: Replace Template Files

Xcode will create a project with some default files. We need to replace them with the files I've already created:

1. In Xcode's left sidebar (Project Navigator), you should see:
   ```
   Cashly
   ├── CashlyApp.swift
   ├── ContentView.swift
   └── Assets.xcassets
   ```

2. **Delete the default files**:
   - Right-click `ContentView.swift` → Delete → Move to Trash
   
3. **Add our files**:
   - Right-click the `Cashly` folder in Xcode
   - Select "Add Files to Cashly..."
   - Navigate to `/Users/armanghevondyan/Desktop/vibe-coding/cashly/ios/Cashly`
   - Select ALL the folders and files we created:
     - `Core/`
     - `Views/`
     - `CashlyApp.swift`
     - `ContentView.swift`
   - Make sure **"Copy items if needed"** is UNCHECKED
   - Make sure **"Create groups"** is selected
   - Click **Add**

## Step 6: Update CashlyApp.swift

1. In Xcode, click on the original `CashlyApp.swift` at the root of the project
2. Replace its entire contents with the file from `ios/Cashly/CashlyApp.swift`
   - Or delete it and the imported one will take over

## Step 7: Configure Project Settings

1. Click on the **Cashly** project (blue icon) at the top of the Project Navigator
2. Select the **Cashly** target (under TARGETS)
3. Go to **General** tab:
   - **Minimum Deployments**: iOS 16.0
   - **Supported Destinations**: iPhone only (for now)

## Step 8: Build and Run! 🎉

1. Select a simulator from the top bar (e.g., "iPhone 15 Pro")
2. Press `Cmd + R` (or click the Play button)
3. The app should build and launch!

You should see the login screen with:
- Cashly logo
- Email and password fields
- Sign in button

---

## What You've Created

Your iOS project now has:

✅ **Authentication Flow**: Login screen with basic UI  
✅ **Main Navigation**: Tab bar with 5 sections (Dashboard, Accounts, Transactions, Budgets, More)  
✅ **State Management**: `AuthManager` for handling authentication  
✅ **MVVM Architecture**: Proper separation of concerns  
✅ **SwiftUI Views**: Modern, declarative UI  

---

## Next Steps

After the project runs successfully:

1. **Add API Integration**: Connect to your Django backend
2. **Add Dependencies**: Alamofire, Plaid SDK, etc.
3. **Build Features**: Implement actual functionality for each tab
4. **Test on Device**: Run on physical iPhone

---

## Troubleshooting

### "No such module 'SwiftUI'"
- Make sure you selected **SwiftUI** as the interface (not Storyboard)

### Build errors about missing files
- Make sure you added all the files from the `ios/Cashly` folder
- Check that `Core/` and `Views/` folders are properly added

### Can't find the ios folder
- Open Finder and navigate to: `/Users/armanghevondyan/Desktop/vibe-coding/cashly/ios`

---

**Need help?** Let me know what step you're stuck on!
