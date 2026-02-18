# Capacitor Backend Setup Checklist

This checklist guides you through setting up the backend to support push notifications in your native apps.

## Phase 1: Database Setup

- [ ] **Create device_tokens table**
  - Run SQL from `docs/migrations/device_tokens_schema.sql` in Supabase
  - This stores device tokens for each platform (iOS/Android)
  
- [ ] **Create push_notification_log table** (optional but recommended)
  - Also in `docs/migrations/device_tokens_schema.sql`
  - Helps track which notifications were sent and any failures

## Phase 2: Firebase/FCM Setup (for Android)

- [ ] **Create Firebase Project**
  - Go to [Firebase Console](https://console.firebase.google.com)
  - Click "Add project"
  - Name: "Prayer App" (or similar)
  - Select region
  - Wait for project creation

- [ ] **Get Firebase Server Key**
  - In Firebase Console → Project Settings → Cloud Messaging tab
  - Copy "Server Key" 
  - ⚠️ Keep this secret! Don't commit to git.

- [ ] **Set Android package name**
  - Firebase Console → Project Settings → General
  - Add "com.prayerapp.mobile" as Android package name

- [ ] **Register Firebase with Android app**
  - Firebase Console → Your App → Android
  - Download google-services.json
  - You may need to add this to Android project later
  - (Capacitor may handle this automatically)

## Phase 3: APNs Setup (for iOS)

- [ ] **Create Apple Developer Account**
  - Go to [developer.apple.com](https://developer.apple.com)
  - $99/year individual membership

- [ ] **Enable Push Notifications for your App ID**
  - Developer.apple.com → Certificates, IDs & Profiles
  - Create new App ID: `com.prayerapp.mobile`
  - Enable "Push Notifications" capability

- [ ] **Create APNs Certificates**
  - In Apple Developer → Certificates
  - Create new "Apple Push Notification service SSL (Sandbox)"
  - Create new "Apple Push Notification service SSL (Production)"
  - Download both

- [ ] **Create Provisioning Profiles**
  - In Apple Developer → Profiles
  - Create development provisioning profile linked to your App ID
  - Create production provisioning profile
  - Download both

- [ ] **Upload Certificates to Backend**
  - Convert .cer files to .p8 format
  - Store securely (Firebase, OneSignal, or your backend)

## Phase 4: Supabase Edge Function

- [ ] **Create send-push-notification function**
  - Copy `supabase/functions/send-push-notification/index.ts`
  - Deploy: `supabase functions deploy send-push-notification`

- [ ] **Set FCM Server Key as secret**
  ```bash
  supabase secrets set FCM_SERVER_KEY "your_firebase_server_key"
  ```

- [ ] **Update function with your Firebase Project ID**
  - In `index.ts`, find `YOUR_PROJECT_ID`
  - Replace with actual ID from Firebase Console

- [ ] **Test function**
  - Go to Supabase Dashboard → Functions
  - Click "send-push-notification"
  - Use "Test" to send test notification

## Phase 5: Backend Token Storage

- [ ] **Update user profile/admin to show device tokens**
  - Optional: Add UI to admin panel to see user's devices
  - Query: `SELECT token, platform FROM device_tokens WHERE user_email = $1`

- [ ] **Automatic token cleanup**
  - Consider periodic cleanup of old tokens (30+ days unused)
  - Run periodically: 
  ```sql
  DELETE FROM device_tokens 
  WHERE last_seen_at < NOW() - INTERVAL '30 days'
  ```

## Phase 6: Send Notifications from Admin

- [ ] **Update admin send email flow**
  - When sending email to subscribers, also send push notification
  - Check if device tokens exist for user
  - Call `send-push-notification` edge function
  - Example:
  ```typescript
  // After sending email
  if (deviceTokens.length > 0) {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        emails: [userEmail],
        title: 'New Prayer Update',
        body: 'A prayer you follow has been updated',
        data: {
          type: 'prayer_update',
          prayerId: prayer.id
        }
      }
    });
  }
  ```

- [ ] **Add notification type dropdown**
  - Email only
  - Email + Push notification
  - Push notification only
  - Let admins choose per message

## Phase 7: Testing

- [ ] **Test on iOS**
  - Build and run via Xcode
  - Check that device token is logged
  - Verify token appears in `device_tokens` table
  - Send test notification from Supabase
  - Check if notification appears on device

- [ ] **Test on Android**
  - Build and run via Android Studio
  - Check that device token is logged
  - Verify token appears in `device_tokens` table
  - Send test notification from Supabase
  - Check if notification appears on device

- [ ] **Test notification handling**
  - Notification appears in foreground ✓
  - Notification appears in background ✓
  - Tapping notification navigates correctly ✓
  - Data payload is accessible ✓

## Phase 8: Production Preparation

- [ ] **Set up APNs Production Certificate**
  - Create "Production SSL Certificate" in Apple Developer
  - Will need this when publishing to App Store

- [ ] **Verify FCM production setup**
  - Firebase production credentials ready
  - Test with real Firebase project (not sandbox)

- [ ] **Update capacitor.config.ts**
  - Ensure appId matches iOS Bundle ID and Android package name

- [ ] **Create app icons**
  - iOS: 1024x1024 PNG in Xcode Assets
  - Android: Multiple sizes in res/mipmap/

- [ ] **Create splash screen**
  - iOS: In Xcode LaunchScreen.storyboard
  - Android: In res/drawable/ and AndroidManifest.xml

- [ ] **Test on real devices**
  - iOS: On actual iPhone (not simulator)
  - Android: On actual Android phone (not emulator)

## Phase 9: App Store Submission

- [ ] **iOS**
  - Create App ID in App Store Connect
  - Build in Xcode: Product → Archive
  - Upload via Xcode or Transporter
  - Fill out app information
  - Submit for review

- [ ] **Android**
  - Create app listing in Google Play Console
  - Build signed APK: `npx cap build android`
  - Upload to Google Play Console
  - Fill out app information
  - Submit for review

## Phase 10: Monitor & Maintain

- [ ] **Set up error logging**
  - Monitor `push_notification_log` table
  - Check for failed deliveries
  - Review Firebase Console for errors

- [ ] **Clean up old tokens**
  - Run periodic cleanup job
  - Remove tokens from uninstalled apps

- [ ] **Update when needed**
  - Changes to Angular code: `npm run build && npx cap sync`
  - Changes to native code (iOS/Android): rebuild in Xcode/Android Studio
  - Changes to Edge Function: `supabase functions deploy send-push-notification`

## Troubleshooting Checklist

**Device token not appearing**
- [ ] Check that notification permission was granted
- [ ] Check browser console for "Push token received"
- [ ] Check database: `SELECT * FROM device_tokens;`
- [ ] Rebuild: `npm run build && npx cap sync`

**Push notification not arriving**
- [ ] Check `push_notification_log` table
- [ ] Verify FCM/APNs credentials are correct
- [ ] Check Firebase Console → Cloud Messaging
- [ ] Check Apple Developer → APNs certificates
- [ ] Review function logs in Supabase

**Notification not showing on device**
- [ ] Ensure app has notification permissions
- [ ] Check platform (iOS/Android) in device_tokens
- [ ] Review device logs in Xcode/Android Studio
- [ ] Test with simple message first

**Function deployment fails**
- [ ] Check `supabase functions deploy --help`
- [ ] Verify you're in project root
- [ ] Check FCM_SERVER_KEY secret is set: `supabase secrets list`
- [ ] Review function logs: `supabase functions download send-push-notification`

## Support Resources

- [Capacitor Push Notifications Docs](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification service](https://developer.apple.com/documentation/usernotifications)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Next: Update Admin Interface

Once backend is working, update your admin panel to:
1. Show notification sending options alongside email
2. Display device count for each subscriber
3. View notification delivery logs
4. Send test notifications

See the example in `src/app/services/push-notification.service.ts` for integration patterns.
