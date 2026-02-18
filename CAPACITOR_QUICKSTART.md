# Quick Start: Running Your Prayer App on iOS & Android

## What's Ready

✅ Capacitor framework installed
✅ iOS and Android projects created  
✅ Push notifications configured
✅ Angular build synced to native platforms
✅ CapacitorService for handling push notifications
✅ PushNotificationService for backend integration

## Next Steps

### 1. Build and Sync (Do this whenever you change code)

```bash
# Build Angular app
npm run build

# Sync to iOS and Android
npx cap sync

# Or combine both:
npm run build && npx cap sync
```

### 2. Test on iOS (Xcode)

```bash
# Open in Xcode
npx cap open ios
```

Then:
1. Select your iPhone or simulator from the device dropdown
2. Press the Play button to build and run
3. Click through the notification permission popup

**Wireless Debugging (Connect iPhone without USB):**
1. Connect iPhone via USB initially
2. In Xcode: Window → Devices and Simulators
3. Select your device → "Connect via Network"  
4. Disconnect USB - now it will connect wirelessly

### 3. Test on Android (Android Studio)

```bash
# Open in Android Studio
npx cap open android
```

Then:
1. Select an emulator or connected device
2. Press the Play button to build and run
3. Grant notification permission when prompted

### 4. Check Logs

**iOS Logs:**
- In Xcode: View → Debug Area → Show Debug Area (⌘⇧Y)
- Look for "Initializing Capacitor" messages

**Android Logs:**
- In Android Studio: View → Tool Windows → Logcat
- Filter by "prayerapp"

## Development Workflow

```bash
# 1. Make changes to your Angular code
# 2. Build and sync
npm run build && npx cap sync

# 3. Open IDE
npx cap open ios   # or npx cap open android

# 4. Build and run from IDE (Play button)

# 5. View logs and test features
```

## Key Files

- `capacitor.config.ts` - Main configuration
- `src/app/services/capacitor.service.ts` - Push notification handling
- `src/app/services/push-notification.service.ts` - Backend token storage
- `ios/App/` - Xcode project
- `android/app/` - Android Studio project
- `CAPACITOR_SETUP.md` - Full detailed guide

## Testing Push Notifications

Right now, push notifications require backend setup. For testing:

1. **Get device token:**
   - Check browser console for "Push token received: ..."
   - This is logged when app first runs

2. **Backend setup needed:**
   - Create `device_tokens` table in Supabase (see docs/migrations/device_tokens_schema.sql)
   - Create Supabase Edge Function to send via FCM (see supabase/functions/send-push-notification/)
   - Set up Firebase Cloud Messaging account

3. **Send test notification:**
   ```typescript
   // Once backend is ready
   const result = await supabase.functions.invoke('send-push-notification', {
     body: {
       emails: ['user@example.com'],
       title: 'Test',
       body: 'Testing push notifications',
       data: { type: 'test' }
     }
   });
   ```

## Troubleshooting

**"Could not find the web assets directory"**
```bash
npm run build && npx cap sync
```

**Build fails in Xcode**
- Product → Clean Build Folder
- Delete `ios/Pods` and `ios/Podfile.lock`
- Product → Build

**Build fails in Android Studio**
- File → Invalidate Caches
- Build → Clean Project
- Build → Rebuild Project

**Notifications not showing**
- Check that permissions were granted
- Look at service logs (Xcode/Android Studio)
- Verify `CapacitorService` initialized (see logs)

## What Happens When You Build

1. **npm run build** - Compiles Angular to `dist/prayerapp/browser/`
2. **npx cap sync** - Copies web files to native apps:
   - iOS: `ios/App/App/public/`
   - Android: `android/app/src/main/assets/public/`
3. **Native build** - Xcode/Android Studio wraps the web app in a native shell
4. **Result** - Your Angular app runs as a real native app with access to:
   - Push notifications
   - Device camera, contacts, files
   - Local storage (preserved)
   - All Supabase queries work the same

## Next: Add Backend for Notifications

To actually send push notifications, you need:

1. **Set up Supabase edge function** (see `supabase/functions/send-push-notification/index.ts`)
2. **Create device_tokens table** (see `docs/migrations/device_tokens_schema.sql`)
3. **Configure Firebase** (for Android) or APNs (for iOS)
4. **Update admin interface** to send notifications to users

See `CAPACITOR_SETUP.md` for complete details.

## Resources

- [Capacitor Docs](https://capacitorjs.com)
- [Xcode Documentation](https://developer.apple.com/xcode/)
- [Android Studio Guide](https://developer.android.com/studio/intro)
- Your local guides: `CAPACITOR_SETUP.md`
