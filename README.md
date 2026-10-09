# Church Prayer Manager

A modern, responsive web and native app for managing prayer requests and memorizing Scripture in your church community. Built with **Angular 22**, TypeScript, Tailwind CSS, Capacitor, and Supabase.

## 📚 Documentation

**Complete documentation available in [`docs/`](docs/README.md)**

Quick links:
- **[Project Changelog](docs/CHANGELOG.md)** - Project history and major milestones
- **[Setup & Deployment](docs/SETUP.md)** - Installation, configuration, and deployment
- **[Development Guide](docs/DEVELOPMENT.md)** - Architecture, testing, and best practices
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Tech Stack

- **Framework**: Angular 22 with standalone components
- **Language**: TypeScript 6.x
- **Styling**: Tailwind CSS v4 with dark mode support
- **Mobile**: Capacitor 8.4 (iOS/Android native apps)
- **Backend**: Supabase (PostgreSQL + Edge Functions + RLS)
- **Real-time**: RxJS observables and Supabase real-time subscriptions
- **Testing**: Vitest with 6,280+ unit tests
- **Analytics & errors**: PostHog (product analytics, session replay, error tracking)
- **Deployment**: Vercel (Node 24.x)

## Features

### 🙏 Prayer Management
- **Add Prayer Requests**: Create new prayer requests with titles, descriptions, categories, and requester information
- **Status Tracking**: Track prayers through various status stages (pending, approved, active, answered, closed)
- **Updates**: Add prayer updates to track progress and answered prayers
- **Pray For (Prayer Encouragement)**: Click “Pray For” on community prayers to encourage requesters; they see how many people have prayed (anonymous count). Admins can enable/disable the feature and set the cooldown (1–168 hours) in Admin settings. In **Settings**, users can hide the Pray For control and/or the praying-count chip on cards for their own view (`email_subscribers` prefs; see [`docs/CHANGELOG.md`](docs/CHANGELOG.md)).
- **Categories**: Organize prayers by custom prayer types
- **Admin Approval**: Moderation system with approval workflow

### 📖 Memorize Scripture
- **Personal memorization**: Add Bible passages, **Bible Books** lists, or verses from admin-curated **Recommended** categories
- **Translations**: ESV (Crossway) plus **KJV, NASB, LSB, NIV, NLT, CSB** via API.Bible; **Listen** is ESV-only
- **Practice modes**: Type, Initials, Word, Reorder, and **Recite** (beta — record and compare via OpenAI Whisper when enabled by admin)
- **Mastery tracking**: Learning → Practicing → Mastered based on completed practice sessions
- **Strict mode**: Optional setting disables auto-reveal after wrong answers and requires a perfect round before advancing
- **Reminders**: Optional hourly memorization nudges (email and/or push), separate from prayer reminders
- See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md#memorize-esv--apibible) and [`docs/CHANGELOG.md`](docs/CHANGELOG.md) for setup (ESV/API.Bible secrets, Recite mode ops)

### 📧 Email Notifications
- **Prayer Reminders**: Automated email reminders for pending prayers
- **Prayer Updates**: Notify subscribers when prayers are updated
- **Approval Notifications**: Alert users when their prayers are approved
- **Customizable Frequency**: Users control email notification preferences
- **9+ notification types** including approval, denial, status changes, and more

### 📱 User Experience
- **Info/Landing Page** (`/info`): Public overview with app icon, Web App/App Store/Android CTAs, and interactive feature preview
- **Native apps**: iOS and Android via Capacitor with push notifications — see [`docs/Capacitor/`](docs/Capacitor/CAPACITOR_GETTING_STARTED.md)
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Updates**: Live prayer updates using Supabase real-time subscriptions
- **Theme Support**: Light and dark mode with persistent user preferences
- **Text Size**: Default, Larger, or Largest text in Settings; preference saved and applied app-wide
- **Prayer reminders**: Optional hourly nudges at chosen clock hours (device time zone); email and/or push based on subscription settings
- **Memorization reminders**: Separate hourly nudges for the Memorize tab (`?filter=memorize` deep links)
- **Advanced Filtering**: Search and filter prayers by category, status, or keywords
- **Printable Lists**: Generate printable prayer request and prayer prompt lists
- **Send Feedback**: In-app GitHub issue submission (Suggestion, Feature Request, Bug Report)

### ⚙️ Admin Portal
- **Settings layout**: Collapsible cards under Settings (Content, Email, Tools, Security, etc.) share consistent spacing and shadows; when collapsed, you can click anywhere on a card to expand it.
- **Prayer Editor (Tools)**: **Create New Prayer** includes **Find subscriber**: search `email_subscribers` by name or email (debounced, limited columns/rows), then pick a row to fill name and email. The main editor **search** also covers **prayer update** text, debounced with a minimum length; see [`docs/CHANGELOG.md`](docs/CHANGELOG.md).
- **Memorize Recommendations**: Curate verse categories and references for the **Recommended** modal; manage Recite mode toggle and usage in **Content**
- **Prayer Moderation**: Review, approve, or deny prayer requests and updates
- **Prayer Encouragement**: Enable/disable “Pray For” and set cooldown (1–168 hours)
- **User Management**: Manage admin access and user permissions
- **Email Settings**: Configure email notifications and subscriber lists
- **Analytics Dashboard**: View site statistics, prayer metrics, and memorization mastery counts
- **Session Management**: Configurable inactivity timeout and max session duration
- **Content Management**: Manage prayer types, prompts, and app branding

### 🎨 Modern Interface
- Clean, intuitive design focused on readability and accessibility
- WCAG 2.1 AA accessibility compliance with ARIA labels
- Keyboard navigation support
- Dark mode with system preference detection
- Color-coded prayer statuses and categories

### 🔒 Security Features
- **Row Level Security (RLS)**: Database security at the row level
- **Email Verification**: Verify user email addresses before access
- **Admin Authentication**: Session-based admin authentication
- **Approval Workflow**: All user-generated content requires admin approval

## Getting Started

### Prerequisites
- Node.js **22.22.3+** (see [`.nvmrc`](.nvmrc); Vercel production uses **24.x** per `package.json` `engines`)
- npm

### Installation & Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the development server**
   ```bash
   npm start
   ```

3. **Open your browser**
   Navigate to `http://localhost:4200`

For Supabase, email, ESV/API.Bible, and Capacitor setup, see [`docs/SETUP.md`](docs/SETUP.md).

### Building for Production

```bash
npm run build
```

The production build will be created in the `dist/prayerapp` directory.

### Native app builds

```bash
npm run cap:dev    # development web build + cap sync
npm run cap:prod   # production web build + cap sync
npm run cap:open   # open iOS project in Xcode
```

See [`docs/Capacitor/CAPACITOR_GETTING_STARTED.md`](docs/Capacitor/CAPACITOR_GETTING_STARTED.md).

## Usage Guide

### Adding a Prayer Request
1. Navigate to the home page
2. Click the "Submit Prayer" button
3. Fill out the prayer request form with details
4. Submit your prayer request for admin approval

### Memorizing Scripture
1. Open the **Memorize** tab on the home page
2. Tap **Add Verses**, **Bible Books**, or **Recommended** to add passages
3. Tap a verse card to start practice (Type, Initials, Word, Reorder, or Recite when enabled)
4. Track progress through Learning, Practicing, and Mastered groups

### Tracking Prayer Status
- View all prayers with their current status
- Filter prayers by status, category, or search term
- Check email for notifications when your prayer is approved or updated

### Prayer Updates
- Add updates to track prayer progress
- View all updates on the prayer request card
- Get notified of updates from prayers you're following

### Admin Portal
- Access the admin dashboard for moderation
- Approve, deny, or edit pending prayer requests and updates
- Manage email settings and notification preferences
- View analytics and site statistics
- Configure session timeouts and session duration limits

## Documentation Structure

The documentation includes:

- **[CHANGELOG.md](docs/CHANGELOG.md)** - Project history and major milestones
- **[SETUP.md](docs/SETUP.md)** - Installation, configuration, and deployment
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Architecture, testing, development, timezone handling, and component documentation
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues, debugging guides, and solutions

See [docs/README.md](docs/README.md) for the complete documentation index.

---

*Built with ❤️ for church communities*
