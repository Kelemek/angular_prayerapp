# Capacitor Backend Setup Checklist

This checklist guides you through setting up the backend to support push notifications in your native apps.

## Phase 1: Database Setup

- [ ] **Run the Capacitor database migrations** (in order)
  - **Device tokens and push log:** `supabase/migrations/20260218_capacitor_device_tokens_and_push_log.sql` — creates `device_tokens` and `push_notification_log`, grants, RLS, and policies. The Edge Function uses `service_role` and bypasses RLS. Without this, you get **500 "Failed to retrieve device tokens"** when sending push.
  - **Subscriber push preference:** `supabase/migrations/20260220_email_subscribers_receive_push.sql` — adds `receive_push` to `email_subscribers` (whether the subscriber wants app push notifications).
  - **Admin push preference:** `supabase/migrations/20260221_admin_not_tied_to_is_active.sql` — decouples admin access from `is_active`; `supabase/migrations/20260222_email_subscribers_receive_admin_push.sql` — adds `receive_admin_push` for admin-only push.
  - **receive_push default false:** `supabase/migrations/20260223_receive_push_default_false.sql` — sets default `receive_push = false` and backfills so only subscribers with a device token keep push on. **Push is turned on only when the user installs the app and a device token is registered** (see Phase 5).
  - In Supabase Dashboard → **SQL Editor**, run each file's contents in order, or run `supabase db push` if you use Supabase CLI.

- [ ] **Email vs push preferences (reference)**
  - **`is_active`** — Email only: whether the subscriber receives **mass email** notifications (new/approved prayers, approved updates). Independent of push.
  - **`receive_push`** — App push only: set to `true` automatically when a device token is stored for that user (native app install). Users can turn it off in Settings. Default is `false` for new subscribers.
  - **`receive_admin_push`** — Admin-only: whether admins receive push notifications for admin alerts (e.g. new prayer to review). Not tied to `is_active`.

## Phase 2: Firebase/FCM Setup (for Android)

Firebase uses the **FCM HTTP v1 API** only. The legacy "Server Key" is disabled for new projects. You use a **service account** instead.

- [ ] **Create Firebase Project**
  - Go to [Firebase Console](https://console.firebase.google.com)
  - Click "Add project"
  - Name: "Prayer App" (or similar)
  - Select region (and skip Google Analytics if you only need FCM)
  - Wait for project creation

- [ ] **Create a service account key (for the Edge Function)**
  - Firebase Console → Project Settings (gear) → **Service accounts** tab
  - Click "Generate new private key"
  - Download the JSON file (e.g. `prayer-app-firebase-adminsdk-xxxxx.json`)
  - ⚠️ Keep this file secret! Do not commit to git. You will put its contents in a Supabase secret.

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

- [ ] **Create APNs key or certificates (so FCM can send to iOS)**
  - **Option A – APNs Key (.p8), recommended:** In Apple Developer → **Keys** → click **+** → name it (e.g. "Prayer App APNs") → enable **Apple Push Notifications service (APNs)** → Continue → Register. Download the **.p8** file **once** (Apple does not let you download it again). Note your **Key ID** and **Team ID**; you'll need them in Firebase.
  - **Option B – Certificates:** In Apple Developer → **Certificates** → create "Apple Push Notification service SSL (Sandbox)" and "Apple Push Notification service SSL (Production)" for your App ID. Download each .cer, add to Keychain, then export as **.p12** (you'll use the .p12 in Firebase, not .cer).

- [ ] **Create Provisioning Profiles**
  - In Apple Developer → Profiles
  - Create development provisioning profile linked to your App ID
  - Create production provisioning profile
  - Download both

- [ ] **Upload APNs credentials to Firebase**
  - Firebase is your delivery backend for both Android and iOS. FCM needs your Apple credentials to send to iPhones.
  - Firebase Console → **Project Settings** (gear) → **Cloud Messaging** tab. You'll see "Firebase Cloud Messaging API (V1)" and possibly "Web configuration" (Web Push certificates). **Ignore Web configuration**—that's for PWA/web push only. **Scroll down** on this same tab until you see **Apple app configuration** (or "iOS app configuration" / "APNs authentication key"). That's where you add iOS credentials. If that section doesn't appear, add an iOS app first: **Project Overview** → **Add app** → **iOS** → enter bundle ID `com.prayerapp.mobile` (you can skip downloading the config file), then go back to **Project Settings** → **Cloud Messaging** and scroll down again.
  - **If you used Option A (.p8):** In Apple app configuration, click **Upload** under "APNs Authentication Key". Upload your **.p8** file and enter your **Key ID** and **Team ID** (from Apple Developer → Keys, and Membership details). Set **Bundle ID** to your app's bundle ID (e.g. `com.prayerapp.mobile`).
  - **If you used Option B (.p12):** Under "APNs Certificates", upload your **Sandbox** and **Production** .p12 files and enter the password you set when exporting.
  - Do not commit .p8 or .p12 files to git; store them only in Firebase and/or a secure secret store.

## Phase 4: Supabase Edge Function

The function sends **Android** via **FCM HTTP v1** (service account) and **iOS** via **APNs** (Apple .p8 key). Capacitor on iOS gives an APNs device token, not an FCM token, so iOS must be sent through Apple's API.

- [ ] **Create send-push-notification function**
  - The function is in `supabase/functions/send-push-notification/index.ts`
  - Deploy: `supabase functions deploy send-push-notification`

- [ ] **Set FCM service account JSON (for Android)**
  - Copy the **entire contents** of your service account JSON file (from Phase 2).
  - Set it as a single secret (the function reads `project_id` and uses the key for OAuth2):
  ```bash
  supabase secrets set FCM_SERVICE_ACCOUNT_JSON '{"type":"service_account","project_id":"your-project-id",...}'
  ```
  - Or from a file (no extra quotes): `supabase secrets set FCM_SERVICE_ACCOUNT_JSON --env-file .env.local` if you have the JSON in a var there. Easiest: paste the full JSON as the value when prompted.
  - No separate Project ID or Server Key is needed; both come from this JSON.

- [ ] **Set APNs secrets (for iOS)**
  - The Edge Function sends iOS notifications via Apple's APNs API using your .p8 key. Set these Supabase secrets (from Phase 3):
  ```bash
  # .p8 key: paste the *contents* of the file, or the base64 key only (no -----BEGIN/END----- lines)
  supabase secrets set APNS_KEY_P8 'MIGHAgEAMBMGByqGSM49...'

  # From Apple Developer → Keys → your APNs key
  supabase secrets set APNS_KEY_ID 'ABC123XYZ'

  # From Apple Developer → Membership
  supabase secrets set APNS_TEAM_ID 'FLM12NG8W1'

  # Optional; defaults to com.prayerapp.mobile
  supabase secrets set APNS_BUNDLE_ID 'com.prayerapp.mobile'

  # Optional; default true. Set to 'false' for production/Archive builds
  supabase secrets set APNS_USE_SANDBOX 'true'
  ```
  - For **APNS_KEY_P8** you can use either (1) the full .p8 file contents (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`), or (2) only the base64 key in between (no headers, no newlines). The function strips PEM headers if present.

- [ ] **Test function**
  - Go to Supabase Dashboard → Functions
  - Click "send-push-notification"
  - Click **Test** (or "Send Request"). In the **Request Body** use **POST** and a JSON body with required `title` and `body`. Example:
  ```json
  {
    "emails": ["your-test-user@example.com"],
    "title": "Test notification",
    "body": "If you see this, the function is working.",
    "data": { "type": "test" }
  }
  ```
  - Replace `your-test-user@example.com` with an email that has a row in `device_tokens` (from running the app on a device). If you have no tokens yet, use `"sendToAll": true` instead of `emails` to confirm the function runs (it will find no tokens and may return 200 with zero sent).
  - Click **Send Request**. A successful call returns 200; the notification appears on devices that have that email in `device_tokens`.

## Phase 5: Backend Token Storage

- [x] **Device token registration sets receive_push (implemented)**
  - When the app stores a device token (`PushNotificationService.storeDeviceToken()`), it also sets `receive_push = true` for that subscriber in `email_subscribers`. Thus push is enabled only when the user has installed the app and registered a device. Users can turn push off later in Settings.

- [ ] **Update user profile/admin to show device tokens** (optional)
  - **Where:** Admin → Email settings → Email Subscribers list (`src/app/components/email-subscribers/email-subscribers.component.ts`).
  - **What to add:** For each subscriber row you can:
    - **Option A – Device count only:** Add a column that shows how many devices (e.g. "2 devices" or "—") by querying `device_tokens` for that subscriber's email. Keeps the table simple.
    - **Option B – Expandable devices:** Add a "Devices" cell with a button (e.g. "0 devices" / "2 devices"); on click, fetch and show a small list: platform (iOS/Android) and optionally last_seen_at. No need to show the raw token.
  - **Query:** For one subscriber: `SELECT id, platform, last_seen_at FROM device_tokens WHERE user_email = $1`. Use the subscriber's `email` as `$1`. For a count only: `SELECT count(*) FROM device_tokens WHERE user_email = $1`.
  - **Implementation:** In the email-subscribers component, either (1) when loading the subscriber list, run a separate query or RPC that returns per-email device counts and merge into the list, or (2) when the user expands/clicks "Devices" for a row, call `supabase.from('device_tokens').select('platform, last_seen_at').eq('user_email', subscriber.email)` and show the result in a small popover or inline section.
  - **Why it's optional:** You can send push notifications without this; it's mainly for admins to see who has the app installed and how many devices.

- [x] **Automatic token cleanup**
  - Implemented via Edge Function `cleanup-device-tokens`, invoked daily by **Supabase `pg_cron`** (migration `20260318120000_schedule_cleanup_device_tokens_cron.sql`, `0 3 * * *` UTC; Vault `project_url` + `service_role_key`). Removes `device_tokens` where `last_seen_at` is older than 30 days (related `push_notification_log` rows removed by CASCADE). Also removes `push_notification_log` rows where `sent_at` is older than 7 days. Deploy with `./scripts/deploy-functions.sh cleanup-device-tokens` or `all`.

## Phase 6: Send Notifications from Admin

- [x] **Automatic push when admin approves (implemented)**
  - When an admin **approves a prayer**, the requester receives a push notification ("Prayer approved" + prayer title) if they have `receive_push` enabled and a device token. Sent via `PushNotificationService.sendPushToEmails()` in `AdminDataService.approvePrayer()`.
  - When an admin **approves an update**, the update author receives a push ("Update approved" + prayer title and snippet) if they have `receive_push` and a device token. Sent in `AdminDataService.approveUpdate()`.
  - Tap handling: `prayer_approved` and `update_approved` notification taps refresh the prayer list (see `app.component.ts` and `capacitor.service.ts`).

- [ ] **Update admin send email flow** (for broadcast emails)
  - When sending email to subscribers, also send push notification using `PushNotificationService.sendPushToSubscribers()` (only to subscribers with `receive_push` true and a device token).
  - Example: see `sendBroadcastNotificationForNewPrayer` and `sendApprovedUpdateEmails` in `AdminDataService`; they call `pushNotification.sendPushToSubscribers({ title, body, data })`.

- [ ] **Add notification type dropdown** (optional)
  - Email only / Email + Push / Push only — let admins choose per message

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
- [ ] **iOS Simulator:** Push is not supported; use a physical iPhone.
- [ ] **iOS AppDelegate:** The app must forward APNs callbacks to Capacitor. In `ios/App/App/AppDelegate.swift` you must have:
  ```swift
  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
  }
  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
  }
  ```
  Without these, the `registration` / `registrationError` events never fire in JS.
- [ ] **iOS real device:** Push entitlement is added via `ios/App/App/App.entitlements` (includes `aps-environment`). If **Push Notifications** does not appear under + Capability (e.g. with some Apple IDs or Xcode versions), the project already has the entitlement file; ensure **Signing & Capabilities** uses it (build setting `CODE_SIGN_ENTITLEMENTS = App/App.entitlements`). For production/Archive builds you may need to switch `aps-environment` in that file from `development` to `production`.
- [ ] **iOS provisioning:** The app's provisioning profile must include push. Use a Development profile that's tied to your App ID with Push Notifications enabled (Apple Developer → Identifiers → your App ID → Push Notifications on).
- [ ] **If Xcode says "Provisioning profile doesn't include the aps-environment entitlement":** Enable Push on the App ID: go to developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → select **com.prayerapp.mobile** (or create it). Under Capabilities, enable **Push Notifications** and Save. Back in Xcode: Product → Clean Build Folder, then build again. If the error remains, in the Developer portal open **Profiles**, find and delete "iOS Team Provisioning Profile: com.prayerapp.mobile" so Xcode can create a new profile that includes push. (Requires a paid Apple Developer Program membership.)
- [ ] Check that notification permission was granted (logs show "receive":"granted").
- [ ] Check for "[Capacitor] Push registration error" in Xcode console—this indicates why native registration failed.
- [ ] Check for "Push token received" in logs (token arrives asynchronously after register()).
- [ ] Check database: `SELECT * FROM device_tokens;`
- [ ] Rebuild: `npm run build && npx cap sync`

**"The registration token is not a valid FCM registration token" (iOS)**
- [ ] On **iOS**, Capacitor gives an **APNs device token**, not an FCM token. The Edge Function sends iOS via **APNs**, not FCM. Set the **APNs secrets** (Phase 4): `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, and optionally `APNS_BUNDLE_ID`, `APNS_USE_SANDBOX`. Then redeploy: `supabase functions deploy send-push-notification`.
- [ ] For development builds use sandbox: `APNS_USE_SANDBOX=true`. For App Store/TestFlight builds use production: `APNS_USE_SANDBOX=false`.

**Push notification not arriving**
- [ ] Check `push_notification_log` table (and the `failureReason` in the function response)
- [ ] **iOS:** APNs secrets set and `APNS_USE_SANDBOX` matches your build (dev vs production)
- [ ] **Android:** FCM service account JSON set; token in DB is from app with same Firebase project
- [ ] Check Firebase Console → Cloud Messaging (Android)
- [ ] Check Apple Developer → APNs key (iOS)
- [ ] Review function logs in Supabase

**Notification not showing on device (but log says "sent")**
- [ ] **iOS – app must be in background or closed:** When the app is in the **foreground**, iOS delivers the push to the app but does **not** show a system banner. Put the app in background (home screen or another app) or close it, then trigger the send again. You should see a banner or see it in Notification Center (swipe down).
- [ ] **Android – app in foreground:** When the app is open, Android often does not show a system heads-up; the app receives the push and shows a toast. **Put the app in background** (home button or switch to another app), then trigger the send again. You should see the notification in the status bar / shade.
- [ ] **Android emulator:** Use an AVD with a **Google Play** system image (not "Google APIs" only). After sending, background the app (home) and wait a few seconds. If it still never appears, try a **physical device**—emulator delivery can be flaky even when the token and log say "sent".
- [ ] **Settings → Notifications:** Open **Settings → Notifications → [Prayer App]** and ensure **Allow Notifications** is on and **Lock Screen**, **Notification Center**, and **Banners** (or Alerts) are enabled.
- [ ] **Do Not Disturb / Focus:** Turn off Do Not Disturb (or ensure the app is allowed in Focus).
- [ ] Ensure app has notification permissions (first launch prompt).
- [ ] Check platform (iOS/Android) in device_tokens; review device logs in Xcode/Android Studio if still nothing.

**"Failed to retrieve device tokens" (500)**
- [ ] Run the full Capacitor migration: Supabase Dashboard → **SQL Editor** → paste contents of `supabase/migrations/20260218_capacitor_device_tokens_and_push_log.sql` → Run (or `supabase db push`). It creates tables, grants, and RLS in one go.
- [ ] In **Table Editor**, confirm `device_tokens` and `push_notification_log` exist.
- [ ] If the tables exist and you still get 500, check the response body for `detail` and `code`, or function logs in Supabase Dashboard → Functions → send-push-notification → Logs.

**Function deployment fails**
- [ ] Check `supabase functions deploy --help`
- [ ] Verify you're in project root
- [ ] Check FCM_SERVICE_ACCOUNT_JSON secret is set: `supabase secrets list`
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
