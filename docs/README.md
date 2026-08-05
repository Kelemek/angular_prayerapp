# Prayer App Documentation

Complete documentation for the Cross Pointe Church Prayer Management System.

## Quick Navigation

- **[CHANGELOG.md](CHANGELOG.md)** - Project history and major milestones
- **[SETUP.md](SETUP.md)** - Installation, configuration, and deployment
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Architecture, testing, development, timezone handling, and component documentation
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solutions to common issues
- **[Capacitor (iOS/Android)](Capacitor/)** - Native app build, push notifications, and backend setup ([CAPACITOR_GETTING_STARTED.md](Capacitor/CAPACITOR_GETTING_STARTED.md), [CAPACITOR_BACKEND_SETUP.md](Capacitor/CAPACITOR_BACKEND_SETUP.md))

---

## 📋 What This App Does

A comprehensive prayer request management and Scripture memorization system for Cross Pointe Church built with:
- **Frontend**: Angular 22 with standalone components
- **Mobile**: Capacitor 8.4 (iOS/Android native apps)
- **Backend**: Supabase (PostgreSQL, Edge Functions)
- **Auth**: Supabase Auth with email verification (MFA email-code flow for subscribers)
- **Email**: Microsoft 365 Graph API
- **Sync**: Planning Center integration
- **Testing**: Vitest with 6,280+ unit tests; Playwright for E2E

## 🎯 Core Capabilities

### Prayer
- ✅ Submit prayer requests (public, requires approval)
- ✅ Add prayer updates (logged-in users)
- ✅ Email notifications (configurable)
- ✅ Admin approval workflow
- ✅ **Admin Settings UI**: Under Admin → Settings, collapsible sections use aligned card headers and consistent padding/shadows; when a section is collapsed, the **whole card** is clickable (pointer cursor).
- ✅ **Prayer Editor: Find subscriber** (Admin → Tools, **Create New Prayer**): Search **`email_subscribers`** by name or email (minimal columns, capped rows, debounced) and pick a row to fill requester fields ([DEVELOPMENT.md](DEVELOPMENT.md#prayer-editor-find-subscriber-create-prayer)).
- ✅ **Prayer Editor search** (Admin → Tools): Text search includes **prayer update bodies** as well as prayer fields; queries are **debounced** with a short **minimum character** threshold before hitting the API. The main prayer list uses the same update-content matching when the user filters by text ([DEVELOPMENT.md — Prayer Editor search](DEVELOPMENT.md#prayer-editor-search-admin-tools)).
- ✅ Real-time updates via Supabase
- ✅ Prayer timer & printable lists
- ✅ Personal prayers (private user prayers)
- ✅ **Prayer Encouragement (Pray For)**: Users can click “Pray For” on community prayers; requesters and admins see how many people have prayed (configurable cooldown; admin toggle and cooldown hours in Admin settings). In **Settings**, **Prayer encouragement on cards** lets each user show or hide the Pray For control and the praying-count chip on cards for their own account (stored on `email_subscribers`; defaults on).
- ✅ Planning Center contact lookup
- ✅ Planning Center members list mapping (filter prayers by list members)
- ✅ Badge indicators (unread prayers/prompts)

### Memorize Scripture
- ✅ **Memorize tab**: Personal scripture memorization — add passages, **Bible Books** lists, or admin-curated **Recommended** verses by category
- ✅ **Translations**: ESV (Crossway) plus **KJV, NASB, LSB, NIV, NLT, CSB** via API.Bible; **Listen** is ESV-only ([DEVELOPMENT.md — Memorize](DEVELOPMENT.md#memorize-esv--apibible))
- ✅ **Practice modes**: Type, Initials, Word, Reorder; **Recite** (beta, admin-enabled) records audio and compares via OpenAI Whisper
- ✅ **Mastery groups**: Learning / Practicing / Mastered from completed practice sessions
- ✅ **Strict practice mode** (Settings): No auto-reveal after wrong answers; **Next round** hidden until the current round is error-free
- ✅ **Verse preview**: Hover (desktop) or long-press (mobile) on verse cards for passage text without opening practice
- ✅ **Memorization reminders** (Settings): Nudges in 15-minute steps, separate from prayer reminders; email and/or push; deep link `?filter=memorize`
- ✅ **Admin**: Memorize Recommendations (categories + verses), Recite mode toggle and usage, site-wide mastery analytics

### User experience
- ✅ Theme system (light/dark)
- ✅ **Text size** (Settings): Users can choose Default, Larger, or Largest text; preference is saved and applied app-wide for easier reading.
- ✅ **Prayer reminders** (Settings): Optional nudges at chosen clock times in **15-minute** steps (device time zone); email and/or push depending on **Email subscription** and push registration. Separate from community prayer-update reminders. In-app Help: **Prayer reminders** topic + **App Settings** subsection.
- ✅ **Per-prayer reminders**: Once / daily / weekly reminders on a specific prayer (community, personal, or Members) from the bell on the card; same 15-minute slots and email/push channels.
- ✅ **Push notifications** (native app): Prayer updates, hourly reminders, memorization nudges, and admin alerts when enabled
- ✅ **Delete account** (Settings): Users can remove their account; verification dialog offers to keep prayers (so they stay lifted up) or delete account and all their prayers, then sign out
- ✅ **Send Feedback** (Settings): GitHub issue submission with Suggestion / Feature Request / Bug Report tiles
- ✅ **Info page** (`/info`) – Public landing/overview with app icon, CTAs (Web App, App Store, Android), and interactive feature preview (filters, modals)

## 🚀 Getting Started

### For Users
- View prayers at [Cross Pointe Prayer App](https://prayers.crosspointe.church)
- Submit new requests
- Configure your email preferences
- Use on mobile (iOS/Android native apps or web)

### For Developers
1. Clone repo and run `npm install`
2. Copy `.env.example` to `.env.local`
3. Configure Supabase credentials
4. Run `npm start` for local development
5. Run `npm test` for unit tests

### For Deployment
See [SETUP.md - Deployment section](SETUP.md#deployment)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page components (home, info, admin, login, etc)
│   ├── services/         # Business logic services
│   ├── guards/           # Route guards
│   ├── types/            # TypeScript types
│   ├── lib/              # App-specific libraries (e.g. memorization)
│   └── app.routes.ts     # Route definitions
├── environments/         # Environment configs
├── lib/                  # Shared utilities
├── styles.css            # Global styles
└── main.ts              # App entry point
```

---

## 🔑 Key Concepts

### Prayer States
- **Pending**: Awaiting admin approval
- **Approved**: Visible to all users
- **Denied**: Rejected by admin (user notified via email)
- **Answered**: Prayer was answered (user marks it)

### User Roles
- **Anonymous**: Can submit prayer requests only
- **Authenticated**: Can submit, update, manage prayers
- **Admin**: Can approve/deny, manage settings

### Email and Push Notifications
- **Email:** Built on Microsoft 365 Graph API; queue-based processing; HTML templates; subscriber management. **`is_active`** on `email_subscribers` controls whether a user receives **mass email** (new/approved prayers, updates). Turning off "email notifications" only stops those bulk emails; direct emails (e.g. your prayer approved/denied) still go out.
- **Push (native app):** Controlled by **`receive_push`** on `email_subscribers`. Push is set to `true` only when the user installs the app and a device token is registered; default is `false`. Admins have a separate **`receive_admin_push`** for admin alerts. See [Capacitor docs](Capacitor/CAPACITOR_BACKEND_SETUP.md) for setup. When an admin approves a prayer or update, the requester/author receives a push notification if they have push enabled.
- **Personal prayer reminders (Settings):** Users can schedule **personal** “nudge” times in **15-minute** steps (device time zone). Delivery uses **email** when mass email is on and/or **push** when the device is registered. The trigger runs in **Supabase** (`pg_cron` every 15 minutes + Vault); see [CHANGELOG](CHANGELOG.md) (*Reminders — 15-minute slots*), [SETUP.md](SETUP.md) (User hourly prayer reminders), and [DEVELOPMENT.md](DEVELOPMENT.md) (*User hourly prayer reminders*). These are not the same as automated **community** prayer-update reminders configured by admins.
- **Per-prayer reminders:** Users can attach once/daily/weekly reminders to a specific prayer from the card bell; delivery is a separate Edge Function on the same `*/15` schedule.
- **Memorization hourly reminders (Settings):** Same scheduling pattern as prayer reminders but for the Memorize tab; template keys `user_hourly_memorization_reminder` / spotlight variant; deep link `?filter=memorize`. See [CHANGELOG](CHANGELOG.md) (*Memorization reminders*).

### Prayer Encouragement (Pray For)
When enabled by an admin, community prayer cards show a **“Pray For”** button. Users can tap it to record that they prayed for that request; the count is shown to the person who submitted the prayer and to admins (who clicked is anonymous). A **cooldown** (configurable in Admin → Prayer Encouragement, 1–168 hours) limits how often the same user can click Pray For on the same prayer. Community-wide settings are stored in **`admin_settings`** (`prayer_encouragement_enabled`, `prayer_encouragement_cooldown_hours`) and cached in the app.

**Per-user card UI:** In the main **Settings** modal, **Prayer encouragement on cards** offers **Show “Pray For” button** and **Show “Praying #” button** (checkboxes, default on). Preferences are on **`email_subscribers`** (`show_pray_for_button`, `show_praying_count`); they only affect what that user sees when Prayer Encouragement is enabled. See [CHANGELOG](CHANGELOG.md) (*Per-user visibility on cards*) and [DEVELOPMENT.md](DEVELOPMENT.md) (Prayer Encouragement section).

The in-app **Help & Guidance** modal includes **Prayer Encouragement (Pray For)** and **App Settings** entries that describe these toggles.

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **SETUP.md** | Installation, Supabase, email, Planning Center, ESV/API.Bible, deployment |
| **DEVELOPMENT.md** | Architecture, testing, performance optimization, Memorize module |
| **TROUBLESHOOTING.md** | Common errors and solutions |
| **CHANGELOG.md** | Project milestones and completed features |
| **Capacitor/** | iOS/Android native app, push notifications, backend checklist |
| **REMOVAL-RECITE.md** | How to remove Recite mode if the beta is retired |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Angular 22, TypeScript 6, Tailwind CSS v4 |
| **Mobile** | Capacitor 8.4 (iOS/Android) |
| **Backend** | Supabase (PostgreSQL, Edge Functions) |
| **Auth** | Supabase Auth, email verification, MFA email-code |
| **Email** | Microsoft 365 Graph API |
| **Testing** | Vitest 4, Playwright (E2E) |
| **Hosting** | Vercel (Node 24.x) |
| **Monitoring** | PostHog (analytics, session replay, web vitals, error tracking) |

**Node versions:** Local and CI use **22.22.3+** ([`.nvmrc`](../.nvmrc)); Vercel uses **`engines.node`: `24.x`** in `package.json`.

---

## 📞 Support & Issues

- **Questions?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Found a bug?** Open an issue on GitHub or use **Send Feedback** in Settings
- **Have a suggestion?** Start a discussion

---

## 📄 License

Copyright © 2024-2026 Cross Pointe Church. All rights reserved.
