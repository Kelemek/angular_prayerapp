# Capacitor Integration Complete! 🎉

Your Angular Prayer App is now ready to run on iOS and Android as native apps.

## What Was Added

### Dependencies
- `@capacitor/core` - Core Capacitor framework
- `@capacitor/cli` - Command-line tools  
- `@capacitor/ios` - iOS native wrapper
- `@capacitor/android` - Android native wrapper
- `@capacitor/push-notifications` - Push notification support

### Native Projects Created
- `ios/` - Full Xcode project ready to build
- `android/` - Full Android Studio project ready to build

### Angular Services
- `src/app/services/capacitor.service.ts` - Handles Capacitor initialization and push notifications
- `src/app/services/push-notification.service.ts` - Manages device tokens and backend integration

### Backend Infrastructure
- `supabase/functions/send-push-notification/` - Edge function for sending push notifications
- `docs/migrations/device_tokens_schema.sql` - Database schema for storing device tokens

### Configuration
- `capacitor.config.ts` - Capacitor configuration pointing to your built Angular app

### Documentation
- [CAPACITOR_SETUP.md](CAPACITOR_SETUP.md) - Complete detailed setup guide
- [CAPACITOR_QUICKSTART.md](CAPACITOR_QUICKSTART.md) - Quick start reference  
- [CAPACITOR_BACKEND_SETUP.md](CAPACITOR_BACKEND_SETUP.md) - Backend setup checklist

## What's Ready Now

✅ **Your Angular app can run on iOS and Android**
- All existing code works unchanged
- No refactoring needed
- localStorage caching works the same
- Supabase queries work the same

✅ **Push notifications framework ready**
- Permissions handled automatically
- Device tokens collected
- Notification listeners configured
- Android notification channels created

✅ **iOS and Android projects created**
- Ready to open in Xcode (iOS)
- Ready to open in Android Studio (Android)
- All dependencies configured

## Quick Start

### 1. Test on Your Device

**iOS:**
```bash
npx cap open ios
# In Xcode: Select device → Press Play
```

**Android:**
```bash
npx cap open android  
# In Android Studio: Select device → Press Play
```

### 2. Check the Logs

Look for `"Initializing Capacitor on..."` in device logs to confirm it loaded.

### 3. Next: Backend Setup

To actually send push notifications, you need to:

1. Run the database migrations (device_tokens, push_notification_log, receive_push, receive_push default false, etc.) — see Phase 1 in the backend setup
2. Set up Firebase for Android (FCM)
3. Set up Apple Push Notifications (APNs) for iOS
4. Deploy the `send-push-notification` Edge Function and set secrets
5. (Optional) Show device count in admin; the app already sends push to requesters when prayers/updates are approved

See [CAPACITOR_BACKEND_SETUP.md](CAPACITOR_BACKEND_SETUP.md) for step-by-step instructions.

## Development Workflow

```bash
# After code changes:
npm run build && npx cap sync

# Open in Xcode (iOS development)
npx cap open ios

# Open in Android Studio (Android development)  
npx cap open android

# Build and run from the IDE (using Play button)
```

### Dev vs production backend

The app talks to Supabase using the URL in Angular's **environment** files. Which one is used depends on the **build configuration**, not Capacitor itself.

| Goal | Command | Supabase used |
|------|---------|----------------|
| **Dev backend** (e.g. `jcdhajfqtzipltvfslhu.supabase.co`) | `npm run cap:dev` | `src/environments/environment.ts` |
| **Production backend** (e.g. `eqiafsygvfaifhoaewxi.supabase.co`) | `npm run cap:prod` or `npm run build && npx cap sync` | `src/environments/environment.prod.ts` |

So to point the native app at your **dev** site: run **`npm run cap:dev`**, then open and run in Xcode or Android Studio. To switch back to production, run **`npm run cap:prod`** and rebuild in the IDE.

## Key Points

- **Your Angular code doesn't change** - Everything is backward compatible
- **localStorage works** - All your caching continues to work
- **Supabase works** - All queries and real-time subscriptions work
- **Same domain/CORS** - Running locally, no CORS issues
- **Native features** - Can add camera, contacts, etc. via Capacitor plugins later
- **Push vs email preferences** - `is_active` controls **email** (mass notifications). **Push** is controlled by `receive_push`, which is set to `true` only when the user installs the app and a device token is registered; they can turn it off in Settings. When an admin approves a prayer or update, the requester/author gets a push notification if they have push enabled.
- **Personal prayer reminders (Settings)** - Users can choose clock hours for optional hourly “nudge” reminders; **push** uses the same device token path when `receive_push` is on. Scheduling is via Supabase `pg_cron` (see [SETUP.md](../SETUP.md)). See also [CHANGELOG.md](../CHANGELOG.md) (*Prayer reminders (hourly nudges)*) and [DEVELOPMENT.md](../DEVELOPMENT.md) (*User hourly prayer reminders*).

## File Structure

```
angular_prayerapp/
├── ios/                          # Xcode project
├── android/                       # Android Studio project  
├── capacitor.config.ts           # Capacitor config
├── src/app/services/
│   ├── capacitor.service.ts      # Push notifications
│   └── push-notification.service.ts # Backend integration
├── supabase/functions/
│   └── send-push-notification/   # Edge function for sending
├── docs/
│   ├── Capacitor/
│   │   ├── CAPACITOR_SETUP.md            # Full guide
│   │   ├── CAPACITOR_QUICKSTART.md       # Quick reference
│   │   └── CAPACITOR_BACKEND_SETUP.md    # Checklist
│   └── migrations/
│       └── device_tokens_schema.sql  # Database schema
```

## Testing Checklist

- [ ] Build: `npm run build && npx cap sync`
- [ ] Test on iOS: `npx cap open ios` → Run in Xcode
- [ ] Test on Android: `npx cap open android` → Run in Android Studio
- [ ] Check logs for initialization message
- [ ] Verify app UI displays correctly
- [ ] Test prayer list loads
- [ ] Test navigation works
- [ ] Check localStorage still works

## Common Tasks

### Set the app icon (one place, then sync)

The app icon is defined in **one place** and synced to iOS and Android.

**Source image (use either):**
- `public/apple-touch-icon.png` — cross + "PRAYER" on dark blue (used by default)
- `public/icon-source.jpg` — alternative; copy to `resources/logo.png` (or save as `resources/logo.jpg`) if you prefer it

**To update the icon and sync to both platforms:**

1. Replace the source image (e.g. update `public/apple-touch-icon.png` or `public/icon-source.jpg`).
2. Run:
   ```bash
   npm run cap:icons
   ```
   That copies `public/apple-touch-icon.png` into `resources/logo.png` and generates all iOS and Android (and PWA) icons and splash screens. If you use `icon-source.jpg` instead, copy it to `resources/logo.png` (or `resources/logo.jpg`) and run `npm run cap:icons:generate`.
3. Rebuild in Xcode or Android Studio (no `cap sync` needed for icon-only changes).

Icons and splash screens are generated into `ios/App/App/Assets.xcassets/` and `android/app/src/main/res/` (and `icons/` for PWA). The background color used for the icon matches the dark blue (#1a365d); you can change it by editing the `cap:icons` script in `package.json`.

### Add a new page to the app
1. Create component in `src/app/components/`
2. Add route in `src/app/app.routes.ts`
3. Build: `npm run build && npx cap sync`
4. Rebuild in Xcode/Android Studio

### Deploy new code to app
```bash
npm run build && npx cap sync
# Then rebuild in Xcode/Android Studio
```

### View app logs
- **iOS**: Xcode → View → Debug Area
- **Android**: Android Studio → View → Tool Windows → Logcat

### Simulate network requests
- Both have simulated network conditions in developer settings

### Debug JavaScript
- Both have web inspector capabilities
- Use console.log for debugging

## Troubleshooting

### Scrolling in the Android emulator

**Two-finger trackpad scroll** often does not work in the Android emulator. The emulator does not reliably translate trackpad/mouse wheel events into scroll inside the WebView (this is a known emulator limitation).

**To scroll in the emulator:** use **click-and-drag** — click in the content area, hold, and drag up or down. That simulates a touch swipe and will scroll the app. On a **real Android device**, normal one-finger swipe scrolling works as expected.

See [CAPACITOR_QUICKSTART.md](CAPACITOR_QUICKSTART.md) for other troubleshooting.

## Next Steps

1. **Get Xcode running on iOS**
   - Open `ios/App/App.xcodeproj` in Xcode
   - Follow prompts for certificates
   - Run on simulator or device

2. **Get Android Studio running**
   - Open `android/` folder
   - Wait for Gradle sync
   - Run on emulator or device

3. **Then set up backend** (optional but recommended)
   - Follow [CAPACITOR_BACKEND_SETUP.md](CAPACITOR_BACKEND_SETUP.md)
   - Set up Firebase + APNs
   - Deploy Edge Function
   - Start sending push notifications

## Support

- Capacitor Docs: https://capacitorjs.com
- Xcode Help: Built into Xcode or https://developer.apple.com
- Android Studio Help: Built into Android Studio
- Your local guides: [CAPACITOR_SETUP.md](CAPACITOR_SETUP.md)

## What's Different from a Web App?

Nothing from the user's perspective! Your app works exactly the same, but now it:
- Has native icons and splash screens
- Can be installed from app stores
- Can send push notifications
- Can access device features (if plugins added)
- Has better offline support
- Feels like a native app

But all your code, data, and features are identical.

---

Ready to build for iOS/Android? Start with [CAPACITOR_QUICKSTART.md](CAPACITOR_QUICKSTART.md)! 🚀
