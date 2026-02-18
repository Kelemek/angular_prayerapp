# Capacitor Setup Guide for Prayer App

This guide walks you through setting up and using Capacitor with your Angular Prayer App to run on iOS and Android.

## What Was Installed

1. **@capacitor/core** - Core Capacitor framework
2. **@capacitor/cli** - Command-line tools for Capacitor
3. **@capacitor/ios** - iOS platform support
4. **@capacitor/android** - Android platform support
5. **@capacitor/push-notifications** - Push notification support

## Project Structure

```
angular_prayerapp/
├── android/                          # Android native project (Gradle)
├── ios/                              # iOS native project (Xcode)
├── capacitor.config.ts               # Capacitor configuration
├── src/app/services/
│   └── capacitor.service.ts          # Angular service for Capacitor features
├── dist/prayerapp/browser/           # Built Angular assets
└── [other files...]
```

## Configuration Files

### capacitor.config.ts

The main configuration file that connects your Angular build to the native platforms:

```typescript
const config: CapacitorConfig = {
  appId: 'com.prayerapp.mobile',     // Unique app identifier
  appName: 'Prayer App',              // Display name
  webDir: 'dist/prayerapp/browser'   // Where built Angular assets are located
};
```

## Development Workflow

### 1. Building and Syncing

After making changes to your Angular code:

```bash
# Build Angular app
npm run build

# Sync to native platforms
npx cap sync

# Or do both at once
npm run build && npx cap sync
```

### 2. iOS Development (Xcode)

```bash
# Open iOS project in Xcode
npx cap open ios
```

Then in Xcode:
- Select your development team (Xcode → Preferences → Accounts)
- Choose a connected iPhone or simulator
- Press Play button to build and run

For wireless debugging with a physical device:
1. Connect iPhone via USB cable
2. In Xcode: Window → Devices and Simulators
3. Select your device → "Connect via Network"
4. Disconnect USB cable
5. Device will appear with a globe icon in Xcode

### 3. Android Development (Android Studio)

```bash
# Open Android project in Android Studio
npx cap open android
```

Then in Android Studio:
- Select an emulator or connected Android device
- Press the Play button to build and run

For physical device:
1. Connect Android phone via USB
2. Enable USB debugging (Developer Options)
3. Android Studio will detect it in the device selector

## Key Features

### CapacitorService (src/app/services/capacitor.service.ts)

This service handles all Capacitor integration:

#### Initialization

The service automatically initializes when the app starts:
- Checks if running as native app
- Sets up push notifications
- Creates Android notification channels
- Handles notification permissions

#### Push Notifications

Push notifications are handled automatically, but you need to:

1. **Store push tokens on your backend** - When a device registers, send the token to your backend
2. **Send notifications via your backend** - Use FCM (Android) or APNs (iOS) APIs

```typescript
// Access push token from the service
this.capacitorService.pushToken$.subscribe(token => {
  if (token) {
    console.log('Device token:', token.token);
    // Send to backend to store for this device
  }
});

// Or get it synchronously
const pushToken = this.capacitorService.getPushToken();
```

#### Checking Platform

```typescript
// Check if running as native app
if (this.capacitorService.isNative()) {
  console.log('Running on:', this.capacitorService.getPlatform()); // 'ios' or 'android'
}
```

## Android Setup Requirements

### Prerequisites
- Android Studio (latest version)
- JDK 11+
- Android SDK 30+
- Google Play Services

### First Time Android Build

```bash
# Open Android Studio
npx cap open android

# In Android Studio:
# 1. Wait for Gradle sync to complete
# 2. File → Project Structure → set SDK locations if needed
# 3. Build → Build Bundle(s) / APK(s) → Build APK(s)
# 4. Or connect device and Run
```

### Android Notification Channels

The app automatically creates notification channels:
- **prayers** - Prayer update notifications
- **reminders** - Prayer reminders

These are required for Android 8.0+.

## iOS Setup Requirements

### Prerequisites
- Mac with Xcode 13+
- Apple Developer account (for device testing)
- iOS 14+ device or simulator

### Certificates and Provisioning

For device testing:

1. Open Xcode → Preferences → Accounts
2. Add your Apple ID
3. Select team from dropdown
4. Xcode will automatically manage certificates

### Push Notifications Setup (APNs)

For production push notifications:

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Certificates, IDs & Profiles → Identifiers
3. Select your app ID → Capabilities → Enable Push Notifications
4. Create APNs certificates and upload to backend service

## Push Notifications Implementation

### What's Happening

1. **Device Registration** - App requests notification permissions and registers with push service
2. **Token Generation** - Device receives a unique token (FCM for Android, APNs for iOS)
3. **Token Storage** - Token is stored and sent to backend
4. **Sending** - Backend uses tokens to send notifications

### Backend Integration

You need to:

1. **Store device tokens** in your database when received
2. **Send notifications** using Firebase Cloud Messaging (Android) or APNs (iOS)

Example (pseudo-code for Supabase Edge Function):

```typescript
// When user registers device token
await supabase
  .from('device_tokens')
  .insert({
    user_id: currentUserId,
    token: pushToken,
    platform: 'ios' or 'android',
    created_at: now()
  });

// When sending prayer update notification
const tokens = await supabase
  .from('device_tokens')
  .select('token, platform')
  .eq('user_id', targetUserId);

// Send via FCM or APNs
```

### Handling Notifications in App

When a notification arrives, the CapacitorService:

1. **In foreground** - Shows toast notification
2. **In background** - Native notification center shows it
3. **On tap** - Navigates based on notification data

Notification data structure:

```typescript
{
  title: 'Prayer Updated',
  body: 'Your prayer request has been updated',
  data: {
    type: 'prayer_update',        // Type of notification
    prayerId: '123',              // ID of prayer
    updateId: '456',              // ID of update
    // Any other data you want
  }
}
```

## localStorage Caching

Good news: **localStorage works exactly the same in Capacitor apps!**

All your existing caching logic will work without changes:

```typescript
// This works in both web and native apps
localStorage.setItem('prayers_cache', JSON.stringify(prayers));
const cached = JSON.parse(localStorage.getItem('prayers_cache'));
```

localStorage is persisted to device storage on both iOS and Android.

### Performance Note

- Capacitor apps have full local storage available (no 5-10MB web limits)
- Cache can be much larger on mobile
- Consider cleanup strategy for old cache entries

## Supabase Egress and Costs

### Egress Impact

**No change to egress costs!** Capacitor apps still make HTTP requests to Supabase just like web apps.

- Web browser → Supabase: counts as egress
- Native app → Supabase: counts as egress
- Mobile network: same as WiFi from Supabase's perspective

All your Supabase queries have the same cost.

### Supabase Free Tier Compatibility

✅ **Fully compatible!** Capacitor works on the free tier:
- 500 MB database
- 1 GB bandwidth
- 50,000 monthly active users limit
- Real-time subscriptions

No additional Capacitor-specific costs.

## App Distribution

### Option 1: Test on Your Device

```bash
# iOS - through Xcode
npx cap open ios
# Then Run on connected device

# Android - through Android Studio
npx cap open android
# Then Run on connected device
```

### Option 2: App Stores

To distribute through app stores:

**iOS App Store:**
1. Create App ID in Apple Developer
2. Create App Store Connect listing
3. Build in Xcode: Product → Archive
4. Upload via Xcode or Transporter

**Google Play:**
1. Create Google Play Developer account ($25 one-time)
2. Create app listing
3. Create signed APK: `npx cap build android`
4. Upload to Play Console

### Option 3: TestFlight (iOS)

For beta testing before App Store:

1. Create TestFlight listing in App Store Connect
2. Archive build in Xcode
3. Upload to TestFlight
4. Invite testers via email

### Option 4: Direct APK Distribution (Android)

For internal testing without Play Store:

```bash
# Create signed APK
npx cap build android

# Share APK file directly (not recommended for production)
```

## Troubleshooting

### Build Errors

**"Could not find the web assets directory"**
- Run: `npm run build && npx cap sync`

**Xcode build fails**
- Clean build: Xcode → Product → Clean Build Folder
- Then rebuild

**Android Gradle sync fails**
- Update Gradle: Tools → SDK Manager → SDK Tools
- Invalidate cache: File → Invalidate Caches

### Push Notifications Not Working

1. Check permissions - app asks for notification permission on first launch
2. Check logs - Xcode shows iOS logs, Android Studio shows Android logs
3. Verify token is being stored in backend
4. Test via Firebase Console (Android) or Apple Notification Tester (iOS)

### localStorage Not Persisting

1. On iOS/Android, localStorage is persisted to device storage
2. If clearing app data in settings, localStorage is cleared
3. Check `capacitor.config.ts` is correct
4. Rebuild: `npm run build && npx cap sync`

## Next Steps

1. **Update backend** to store device tokens
2. **Implement push notification sending** in Supabase Edge Functions
3. **Add app icons and splash screens** (see below)
4. **Test on device** using Xcode (iOS) or Android Studio (Android)
5. **Submit to app stores** when ready

## Adding App Icons and Splash Screens

### iOS

Place in `ios/App/App/Assets.xcassets/`:
- App icon sizes: 1024x1024px
- Splash screen: in LaunchScreen.storyboard in Xcode

### Android

Place in `android/app/src/main/res/`:
- App icon: `mipmap-*/ic_launcher.png` (multiple densities)
- Splash screen: modify `AndroidManifest.xml`

## Resources

- [Capacitor Docs](https://capacitorjs.com)
- [Capacitor API Reference](https://capacitorjs.com/docs/apis)
- [Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification service (APNs)](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server)
