# Development Guide

For developers working on the Prayer App codebase.

## Table of Contents

1. [Architecture](#architecture) (includes [Public Routes](#public-routes) and [Info Page](#info-page))
2. [Testing](#testing)
3. [Code Quality](#code-quality)
4. [Performance](#performance)
5. [Timezone Implementation](#timezone-implementation)
6. [Prayer Encouragement (Pray For)](#prayer-encouragement-pray-for)
7. [Prayer Archiving System](#prayer-archiving-system)
8. [Contributing](#contributing)

---

## Architecture

### Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── home/                    # Home page
│   │   ├── admin/                   # Admin dashboard
│   │   ├── prayer-cards/            # Prayer display components
│   │   ├── pending-*/               # Admin approval cards

│   │   └── ...other components
│   ├── pages/
│   │   ├── admin/                   # Admin portal
│   │   ├── home.component.ts        # Main app page
│   │   ├── info/                    # Info/landing page (public, /info)
│   │   └── ...other pages
│   ├── services/
│   │   ├── supabase.service.ts      # Database client
│   │   ├── prayer.service.ts        # Prayer business logic
│   │   ├── admin-data.service.ts    # Admin operations
│   │   ├── email-notification.service.ts # Email queue

│   │   ├── user-session.service.ts  # Auth & session
│   │   └── ...other services
│   ├── guards/
│   │   ├── admin.guard.ts           # Admin access control
│   │   └── site-auth.guard.ts       # General auth
│   ├── types/
│   │   ├── prayer.ts                # Prayer interfaces
│   │   └── ...other types
│   ├── app.component.ts             # Root component
│   └── app.routes.ts                # Route definitions
├── environments/
│   ├── environment.ts               # Development config
│   └── environment.prod.ts          # Production config
├── lib/
│   ├── supabase.ts                  # Supabase client config
│   └── ...utilities
└── main.ts                           # Bootstrap
```

### Public Routes

| Path | Guard | Purpose |
|------|--------|--------|
| `/` | siteAuthGuard | Home – prayer list, filters, prompts, personal |
| `/info` | none | Info/landing page – app overview, CTAs, feature preview |
| `/login` | none | Login / MFA verification |
| `/privacy` | none | Privacy policy |
| `/support` | none | Support and help links |
| `/admin` | siteAuthGuard, adminGuard | Admin portal |
| `/presentation` | siteAuthGuard | Prayer presentation mode |

### Info Page

The **info page** (`/info`) is a public landing/overview. It is used to introduce the app and drive installs:

- **Hero**: App icon, “Cross Pointe Prayer Community” title, short description
- **CTAs**: Web App (with QR), App Store (with QR), Android (coming soon)
- **Feature overview**: Interactive preview of the main app (mock header, filter tabs, sample cards). Users can tap filter tabs (Current, Answered, Total, Prompts, Personal) and open modals (Help, Settings, badges, prompt categories, personal actions) to see how the app works
- **Theme**: Supports light/dark mode via theme toggle
- **Implementation**: `src/app/pages/info/info.component.ts` (standalone). Lazy-loaded in `app.routes.ts`. Uses `BrandingService` (via `BRANDING_SERVICE_TOKEN`) for optional logo; no auth required.

### Core Services

#### SupabaseService
```typescript
// Wrapper around Supabase client
// Usage: Inject into any service
constructor(private supabase: SupabaseService) {}
this.supabase.client.from('table').select()
```

#### PrayerService
```typescript
// Business logic for prayers
- loadPrayers()              // Fetch with filters/sorting
- submitPrayer()             // Create new prayer
- updatePrayer()             // Add update to prayer
- approvePrayer()            // Admin approval
- denyPrayer()               // Admin denial
- searchPrayers()            // Full-text search
- Real-time subscriptions    // Listen for changes
```

#### AdminDataService
```typescript
// Admin operations
- fetchAdminData()           // Get all pending items
- approvePrayer()            // Approve prayer
- denyPrayer()               // Deny prayer
- updatePrayer()             // Edit prayer
- deletePrayer()             // Delete prayer
- updateAppSettings()        // Change app config
```

#### UserSessionService
```typescript
// Authentication & session
- loadUserSession()          // Load from localStorage
- saveToCache()              // Persist session
- logout()                   // Clear session
- isAdmin()                  // Check role
- getUserProfile()           // Get user data
```

#### PrayerEncouragementService
```typescript
// Prayer Encouragement (Pray For) feature
- isEnabled$                 // Observable: feature on/off from admin_settings
- getCooldownHours()         // Cooldown hours (1–168) from admin_settings, cached
- recordPrayedFor(prayerId)  // Record that current user prayed for a prayer (respects cooldown)
- getPrayedForCount(prayerId) // Fetches prayed_for_count for a prayer
// Settings: admin_settings.prayer_encouragement_enabled, prayer_encouragement_cooldown_hours
// UI: Admin → Prayer Encouragement (toggle + cooldown); prayer-card shows Pray For button and count
```

#### PullToRefreshDirective
```typescript
// Gesture-based pull-to-refresh for scrollable containers (optimized for native apps)
- @Input() refreshing         // Bound to component loading state to avoid duplicate refreshes
- @Input() appPullToRefreshDisabled // Optional flag to disable on specific screens
- @Output() refresh          // Emits when user pulls down beyond threshold at top of list
// Usage: Wrap main scrollable content and handle (refresh) in the page component
```

#### BrandingService
```typescript
// App branding (logos, titles) with optimized caching
- initialize()               // Load from cache + check for DB updates
- getBranding()              // Get current branding data
- getImageUrl()              // Get correct logo URL (light/dark mode)

// Architecture:
// 1. Synchronous cache load (localStorage) on app bootstrap
// 2. Lightweight metadata check (branding_last_modified timestamp)
// 3. Full fetch only if DB timestamp is newer than cache
// 4. Falls back to cache on network errors
// 5. Emits through Observable for reactive updates

// Observable:
branding$: Observable<BrandingData>  // Subscribable branding stream

// Data structure:
interface BrandingData {
  useLogo: boolean;
  lightLogo: string | null;      // Base64 data URL
  darkLogo: string | null;       // Base64 data URL
  appTitle: string;
  appSubtitle: string;
  lastModified: Date | null;     // Cache validation timestamp
}

// Performance Optimization:
// - First visit: Caches logos in localStorage after fetch
// - Subsequent visits: Loads from cache (instant, no flash)
// - Smart updates: Only re-fetches if admin changed branding
// - Metadata-only queries: 3s timeout for lightweight timestamp check
// - Full fetches: 10s timeout only when needed
```

#### EmailNotificationService
```typescript
// Email queue management
- sendApprovedPrayerNotification()   // Queue email
- sendDeniedPrayerNotification()     // Queue email
- triggerEmailProcessor()            // Invoke GitHub Action
```

#### PrintService
```typescript
// Generate and download printable prayer lists
- downloadPrintablePrayerList()      // Download public prayers in time range
- downloadPrintablePromptList()      // Download prayer prompts by type
- downloadPrintablePersonalPrayerList() // Download user's personal prayers
- generatePrintableHTML()            // Generate HTML for public prayers
- generatePromptsPrintableHTML()     // Generate HTML for prompts
- generatePersonalPrayersPrintableHTML() // Generate HTML for personal prayers
```

**Personal Prayers Functionality**:

The PrintService includes comprehensive support for personal prayers - prayers that users have submitted for their own spiritual growth or private prayer groups.

**Key Features**:

1. **Personal Prayer Download**
   - Generate printable list of user's personal prayers
   - Filter by time range: week, 2 weeks, month, year, or all
   - Include prayer updates (comments) chronologically

2. **Time Range Filtering**
   - **Week**: Last 7 days
   - **2 Weeks**: Last 14 days
   - **Month**: Last 30 days
   - **Year**: Last 365 days
   - **All**: Complete history

3. **Smart Filtering Logic**
   - Includes prayers created in the time range
   - Also includes older prayers with recent updates in the range
   - Excludes archived prayers (status = 'archived')

4. **HTML Generation Features**
   - Professional formatting with CSS styling
   - Print-optimized layout with page breaks
   - Color-coded sections by prayer type/status
   - Includes prayer metadata (requester, creation date, updates)
   - HTML entities escaped to prevent XSS

5. **Print/Download Options**
   - Opens in new window for direct printing
   - Falls back to file download if popup blocked
   - Includes current date and time range label
   - Filename format: `personal-prayers-{range}-{date}.html`

**Usage**:

```typescript
// In a component
constructor(private printService: PrintService) {}

// Download personal prayers
downloadPersonalPrayers(timeRange: 'week' | 'month' | 'year' | 'all') {
  // Open window first for Safari compatibility
  const newWindow = window.open('', '_blank');
  
  // Then trigger download
  this.printService.downloadPrintablePersonalPrayerList(timeRange, newWindow);
}
```

**Error Handling**:

- Alerts user if no personal prayers found
- Closes new window on error
- Logs detailed error messages to console
- Shows descriptive alert messages

#### Personal Prayer Sharing to Public Prayer Feature

**Overview**:

This feature allows users to share their personal prayers to the public prayer list for community support while keeping their personal copy in their account for reference. The shared prayer goes through the normal admin approval workflow before appearing publicly.

**Key Components**:

1. **Data Flow**:
   - User initiates sharing from personal prayer card (share icon button)
   - System creates a copy as a public prayer with "pending" approval status
   - All updates from the personal prayer are copied to the public version
   - Original personal prayer is kept (not deleted)
   - Admin receives notification to review and approve/deny the prayer

2. **SharePrayerForApproval Method** (PrayerService):

```typescript
/**
 * Share a personal prayer - create public copy for approval without deleting personal
 * The personal prayer stays in the user's account for their reference
 * The public prayer will go through the normal approval process
 * @param personalPrayerId The ID of the personal prayer to share
 * @returns Promise<string> The ID of the newly created public prayer
 */
async sharePrayerForApproval(personalPrayerId: string): Promise<string>
```

**Process Steps**:

   - **Step 1**: Fetch the personal prayer with all its updates
   - **Step 2**: Get the user's name from session or extract from email
   - **Step 3**: Create a new public prayer in the "prayers" table with:
     - All content from personal prayer (title, description, prayer_for)
     - Requester name (user's full name or formatted email)
     - Email address for contact
     - Status matching personal prayer (current/answered)
     - Approval status set to "pending"
   - **Step 4**: Copy all updates/comments from personal prayer to public prayer
   - **Step 5**: Keep the personal prayer intact (no deletion)
   - **Step 6**: Send admin notification about the new public prayer request

3. **UI Components**:

**Prayer Card** (`prayer-card.component.ts`):
   - Shows "share" icon button when `isPersonal = true`
   - Click opens share confirmation modal
   - Modal shows:
     - Prayer title and description
     - Message: "Share this prayer to the public prayer list?"
     - Confirmation and cancel buttons
   - "handleSharePrayer()" called on confirmation
   - Loading spinner during share operation
   - Emits delete event to notify parent to refresh list after successful share

**Share Modal**:
```html
@if (isPersonal) {
  <button
    (click)="showShareModal = true"
    aria-label="Share personal prayer"
    title="Share prayer to public"
    class="text-blue-500 hover:text-blue-700 dark:text-blue-400"
  >
    <!-- Share icon SVG -->
  </button>
}
```

4. **Error Handling**:

```typescript
// Service catches and handles errors:
- Prayer not found: "Personal prayer not found"
- Create public prayer fails: "Failed to create public prayer"
- Update copy fails: Logs warning but doesn't block (prayer created successfully)
- Session/email issues: Shows appropriate error message

// Component error handling:
- Wraps sharePrayerForApproval in try-catch
- Shows toast/error notifications to user
- Manages isShareLoading state during operation
- Closes modal automatically on success
```

5. **Database Impact**:

**Table: prayers** (public prayers table):
```sql
INSERT INTO prayers (
  title, description, prayer_for, 
  requester, email, status, 
  approval_status, created_at, updated_at
) VALUES (...)
```

**Table: prayer_updates** (copy updates):
```sql
INSERT INTO prayer_updates (
  prayer_id, content, author, author_email,
  is_anonymous, approval_status, created_at
) VALUES (...)
```

**Table: personal_prayers** (unchanged):
```sql
-- Personal prayer remains unchanged, not deleted
-- User can still see and edit their personal copy
```

6. **User Experience Flow**:

```
Personal Prayer View
  ↓
[User clicks share icon]
  ↓
Share Confirmation Modal
  ↓
[User clicks "Confirm"]
  ↓
System Creates Public Prayer Copy
  ↓
System Copies All Updates
  ↓
Admin Notification Sent
  ↓
Personal Prayer List Refreshed
  ↓
Success Toast: "Prayer shared! It has been submitted for admin approval."
```

7. **Configuration**:

No configuration needed. Feature uses:
- Current user session for requester email
- App's standard approval workflow
- Existing email notification system

8. **Testing**:

The feature is covered by tests in:
- `prayer-card.component.spec.ts` - UI interaction tests
- `prayer.service.spec.ts` - Service logic tests

Key test scenarios:
- Successful share (personal prayer kept, public prayer created)
- Share with updates (all updates copied)
- Error handling (prayer not found, database errors)
- Loading state management
- Modal interactions

**Example Test**:
```typescript
it('handleSharePrayer should share personal prayer', async () => {
  component.isPersonal = true;
  component.prayer = mockPrayer;
  
  const sharePromise = component.handleSharePrayer();
  expect(component.isShareLoading).toBe(true);
  
  await sharePromise;
  
  expect(component.isShareLoading).toBe(false);
  expect(component.showShareModal).toBe(false);
});
```

9. **Troubleshooting**:

| Issue | Cause | Solution |
|-------|-------|----------|
| Share button not visible | Prayer not marked as personal | Check `isPersonal` property |
| "Prayer shared" message but doesn't appear public | Waiting for admin approval | Check admin dashboard for pending prayers |
| Share fails silently | User not logged in | Verify user session is active |
| Updates not copied | Updates didn't copy cleanly | Check database for partial records, admin can re-share or manually copy |

#### BadgeService
```typescript
// Track read/unread status for prayers and prompts
- getBadgeFunctionalityEnabled$()    // Observable of badge setting
- markPrayerAsRead()                 // Mark prayer as read
- markPromptAsRead()                 // Mark prompt as read
- isPromptUnread()                   // Check if prompt unread
- getBadgeCount$()                   // Observable of badge counts
- getUpdateBadgesChanged$()          // Observable of changes
- refreshBadgeCounts()               // Refresh badge data
```

**Usage in Components**:
```typescript
// Inject the service
constructor(private badgeService: BadgeService) {}

// Check if item unread
if (this.badgeService.isPromptUnread(promptId)) {
  // Show badge indicator
}

// Mark as read when user views
await this.badgeService.markPromptAsRead(promptId);

// Get badge counts
this.badgeService.getBadgeCount$().pipe(
  takeUntil(this.destroy$)
).subscribe(counts => {
  this.badgeCount = counts.prompts;
});
```

#### PrayerArchiveTimelineComponent

**Location**: `src/app/components/prayer-archive-timeline/`

**Status**: Production ready with full test coverage (21 unit tests)

The Prayer Archive Timeline component provides administrators with a visual timeline of prayer lifecycle events. It displays prayer creation dates, predicted reminder dates (based on creation or last update), when reminders were sent, predicted archive dates, and when prayers were archived.

**Key Features**:

1. **Automatic Timezone Detection**
   - Detects user's system timezone using `Intl.DateTimeFormat().resolvedOptions().timeZone`
   - No user configuration needed
   - Displays detected timezone in settings panel
   - All dates formatted in user's timezone

2. **Activity-Based Timer Logic**
   - Fetches prayer updates from database for each prayer
   - Calculates "last activity date" (most recent update or creation date)
   - **Timer Reset**: If a prayer is updated after a reminder is sent, the archive timer resets
   - Matches the backend `send-prayer-reminders` function behavior

3. **Database-Driven Settings**
   - Loads `reminder_interval_days` and `days_before_archive` from `admin_settings` table
   - Defaults: 30 days for both intervals
   - Falls back to defaults if database unavailable

4. **Month-Based Navigation**
   - Displays events organized by month
   - Previous/Next buttons to navigate timeline
   - Automatically calculates min/max months from events
   - Preserves scroll position on navigation
   - Buttons disable at timeline boundaries

5. **Refresh Functionality**
   - Manual refresh button with loading spinner
   - Reloads settings and prayers simultaneously
   - Proper change detection with OnPush strategy
   - Loading state visible during async operations

**Timeline Events**:

Each prayer generates timeline events based on status:

| Event Type | Condition | Display |
|------------|-----------|---------|
| `reminder-upcoming` | No reminder sent yet, future date | "Reminder Due" badge |
| `reminder-sent` | Reminder already sent | "Reminder Sent" badge |
| `archive-upcoming` | Archive date in future, no updates since reminder | "Archive Pending" badge |
| `archive-past` | Archive date passed, no updates since reminder | "Overdue Archive" badge |
| `archived` | Prayer status is "archived" | "Archived" badge |

**How It Works**:

1. **Initialization**: Detects timezone, loads settings from admin_settings table, fetches prayers
2. **Event Processing**: For each prayer, fetches updates to determine last activity, calculates reminder/archive dates
3. **Month Navigation**: Filters events by current month, enables/disables navigation buttons
4. **Scroll Preservation**: Stores scroll position before async navigation, restores after

**Database Tables Used**:

- `admin_settings`: `reminder_interval_days`, `days_before_archive`
- `prayers`: id, title, created_at, last_reminder_sent, updated_at, status
- `prayer_updates`: created_at (for determining last activity)

**Performance Optimizations**:
- ChangeDetectionStrategy.OnPush for manual change detection
- Scroll position stored as local variable (no DOM queries)
- Prayer updates fetched in parallel with `Promise.all()`
- Lazy loaded in Admin panel (lazy route)
- Minimal subscriptions with proper cleanup

**Main Methods**:
```typescript
// Load data
loadPrayers(force?: boolean): Promise<void>
loadSettings(): Promise<void>
refreshData(): void

// Processing
processPrayers(prayers: PrayerRequest[]): Promise<void>
filterCurrentMonth(): Promise<void>

// Navigation
previousMonth(): void
nextMonth(): void

// Utilities
getLocalDateString(date: Date): string
getLocalDate(dateString: string): Date
```

**Usage in Admin Panel**:
```typescript
import { PrayerArchiveTimelineComponent } from '../../components/prayer-archive-timeline/prayer-archive-timeline.component';

@Component({
  selector: 'app-admin',
  imports: [PrayerArchiveTimelineComponent, ...],
  template: `<app-prayer-archive-timeline></app-prayer-archive-timeline>`
})
export class AdminComponent {}
```

**Configuration**: Update values in Supabase admin_settings table:
```sql
UPDATE admin_settings 
SET reminder_interval_days = 45,
    days_before_archive = 30;
```

**Testing**: Full test coverage with 21 unit tests covering:
- Date formatting and timezone handling (2 tests)
- Reminder calculation (4 tests)
- Timer reset logic (3 tests)
- Month navigation (5 tests)
- Refresh functionality (2 tests)
- Database settings (2 tests)
- Event grouping (1 test)

Run tests: `npm test -- src/app/components/prayer-archive-timeline/prayer-archive-timeline.component.spec.ts`

**File Structure**:
```
src/app/components/prayer-archive-timeline/
├── prayer-archive-timeline.component.ts       # 662 lines
├── prayer-archive-timeline.component.html     # Template
├── prayer-archive-timeline.component.css      # Styles
└── prayer-archive-timeline.component.spec.ts  # 285 lines, 21 tests
```

**Troubleshooting**:
- **Timeline shows no events**: Check if prayers have `last_reminder_sent` set and `enable_auto_archive` is true
- **Events in wrong month**: Verify system timezone is correct, clear cache, check console
- **Refresh doesn't work**: Verify user is admin and Supabase connection is active
```

### State Management

The app uses **RxJS observables** for state, not Ngrx/Redux:

```typescript
// Example: Prayer service
private prayersSubject = new BehaviorSubject<Prayer[]>([]);
prayers$ = this.prayersSubject.asObservable();

// In template
@for (prayer of (prayers$ | async); track prayer.id) {
  <app-prayer-card [prayer]="prayer"></app-prayer-card>
}
```

### API Communication

- **Database**: Supabase client (REST API under the hood)
- **Email**: Microsoft Graph API via backend edge function
- **Planning Center**: REST API via Edge Functions (planning-center-lists, planning-center-lookup)
  - List fetching and member lookup
  - Cached on client-side for performance
  - Members sorted by last name (handles suffixes)
- **Admin Auth**: check-admin-status Edge Function (verifies admin status using service role)
- **Rate Limiting**: Email processor respects Microsoft Graph limits

### Removed/Deprecated Features

- **Approval Codes System** (removed Jan 2026): One-time approval links via `approval_codes` table and `validate-approval-code` Edge Function
  - Replaced with direct `/admin` portal links requiring standard authentication
  - Account approval codes still use simple base64 encoding (no database)

---

## Testing

### Running Tests

```bash
# Watch mode (recommended for dev)
npm test

# Run once
npm test -- --run

# With coverage report
npm test -- --run --coverage

# UI dashboard
npm run test:ui

# Run specific test file
npm test -- src/app/services/prayer.service.spec.ts

# Run tests matching pattern
npm test -- --grep "should load prayers"
```

### Test Structure

```typescript
// Example test file: prayer.service.spec.ts
import { PrayerService } from './prayer.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('PrayerService', () => {
  let service: PrayerService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            data: [{ id: '1', title: 'Test' }],
            error: null
          })
        })
      }
    };

    service = new PrayerService(mockSupabase);
  });

  it('should load prayers', async () => {
    const prayers = await service.loadPrayers();
    expect(prayers).toHaveLength(1);
    expect(prayers[0].title).toBe('Test');
  });
});
```

### Mocking

Use `vi` (Vitest) for mocking:

```typescript
// Mock a function
const mockFn = vi.fn();
const mockFn = vi.fn().mockReturnValue('value');
const mockFn = vi.fn().mockResolvedValue(data);

// Spy on method
const spy = vi.spyOn(obj, 'method');
expect(spy).toHaveBeenCalled();
spy.mockRestore();

// Mock module
vi.mock('./supabase.service');
```

### Coverage Goals

Current coverage: **80%+ overall**, with specific targets per area:

- Services: 90%+ (business logic)
- Components: 70%+ (UI logic)
- Guards: 85%+ (critical)
- Types: 100% (no logic)

Check coverage:
```bash
npm test -- --run --coverage
open coverage/index.html
```

---

## Code Quality

### TypeScript

- Strict mode enabled (`tsconfig.json`)
- No `any` types (use specific types)
- All public methods documented
- Interfaces for all data models

### Linting

```bash
# Check TypeScript
npm run type-check

# ESLint (auto-fix)
npm run lint -- --fix
```

### Naming Conventions

- **Components**: PascalCase, `-component` suffix (`PrayerCard Component`)
- **Services**: PascalCase, `-service` suffix (`PrayerService`)
- **Variables**: camelCase (`prayerId`, `userEmail`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_PRAYERS`, `API_TIMEOUT`)
- **Files**: kebab-case (`.service.ts`, `.component.ts`)

### Code Style

- Use standalone components (no NgModule)
- Prefer composition over inheritance
- Use `readonly` for immutable properties
- Extract magic strings to constants
- One component per file (except specs)

### User Interface Patterns

#### Logout Functionality

The application provides two ways for users to log out:

1. **Email Badge Logout** (Header)
   - Email badge displayed in top-right corner of header (both home and admin pages)
   - Clickable with hover state for discoverability
   - Shows confirmation modal before logging out
   - Modal displays "Log Out?" with "Log Out" and "Cancel" options
   - Implemented in: `home.component.ts`, `admin.component.ts`

2. **Settings Modal Logout**
   - Logout button in user settings modal footer
   - Logs out immediately without confirmation
   - Implemented in: `user-settings.component.ts`

#### Delete Account (Settings)

Users can delete their account from the main site settings modal:

- **Location**: Bottom of the settings panel (below the feedback section), "Delete your account" link.
- **Verification dialog**: Opens with a warning that the action cannot be undone. Two options:
  - **Delete account but keep my prayers** — Deletes only the user’s row in `email_subscribers`; their prayers and updates remain so they can still be lifted up. Then calls `adminAuthService.logout()`.
  - **Delete my account and all my prayers** — Deletes in order: `prayer_updates` (author_email), `prayers` (email), `personal_prayers` (user_email; DB cascades to `personal_prayer_updates`), then `email_subscribers`. Then calls `adminAuthService.logout()`.
- **Implementation**: `user-settings.component.ts` — `showDeleteAccountVerification`, `deletingAccount`, `closeDeleteAccountVerification()`, `deleteAccountKeepPrayers()`, `deleteAccountAndPrayers()`. On any delete failure, error is set and logout is not called.
- **Help**: App Settings section in `help-content.service.ts` includes a "Delete your account" content item describing the two choices.

#### Text Size (Settings)

Users can change on-screen text size from the Settings modal:

- **Location**: Settings modal → "Text size" section (after Theme), with three options: Default, Larger, Largest.
- **Behavior**: Selection is stored in localStorage and applied globally via `--text-scale` on `document.documentElement`; `html { font-size: calc(16px * var(--text-scale, 1)) }` in `src/styles.css` scales base font size.
- **Implementation**: `TextSizeService` (`src/app/services/text-size.service.ts`) — `getTextSize()`, `setTextSize(size)`; persists and applies scale on init and when changed. `user-settings.component.ts` — text size UI, `handleTextSizeChange()`, sync from service in `ngOnInit` and when modal opens via `ngOnChanges`.
- **Help**: App Settings in `help-content.service.ts` includes a "Text size" entry (after Theme Options) describing the options and that the preference is saved automatically.

#### Prayer reminders (hourly nudges) (Settings)

Users can opt in to **personal** reminders at the top of selected clock hours (not tied to community prayer-update cadence):

- **Location**: Settings modal → **Prayer reminders** section (above the feedback form when GitHub feedback is enabled). Pick an hour, **Add reminder**, or **Remove** on a slot. Times use the device IANA time zone when saving.
- **Delivery**: **Email** when the user’s **Email subscription** is on (`is_active`). **Push** when `receive_push` is true and a device token exists. Both may fire in the same hour if both are enabled.
- **Implementation**: `UserPrayerReminderService` (`src/app/services/user-prayer-reminder.service.ts`) — loads/caches slots on `UserSessionData`; `user-settings.component.ts` — `loadPrayerReminders()`, add/remove handlers. Backend: table `user_prayer_hour_reminders`, Edge Function `send-user-hourly-prayer-reminders`, hourly **`pg_cron`** job in Postgres (see § *User hourly prayer reminders* below).
- **Help**: `help-content.service.ts` — standalone section `help_prayer_reminders` (“Prayer reminders”) and **App Settings** item **“Prayer reminders (hourly nudges)”** (after Default Prayer View, before Feedback Form).

Both logout methods call `adminAuthService.logout()` which:
- Signs out from Supabase Auth
- Clears all session data and localStorage
- Invalidates all caches (prayers, prompts, personal prayers, etc.)
- Automatically redirects to `/login` page

**Implementation Example**:
```typescript
// In component
showLogoutConfirmation = false;

async handleLogout(): Promise<void> {
  this.showLogoutConfirmation = false;
  await this.adminAuthService.logout();
}

// In template
<button (click)="showLogoutConfirmation = true" class="...">
  {{ userEmail }}
</button>

@if (showLogoutConfirmation) {
  <app-confirmation-dialog
    title="Log Out?"
    message="Are you sure you want to log out?"
    confirmText="Log Out"
    cancelText="Cancel"
    (confirm)="handleLogout()"
    (cancel)="showLogoutConfirmation = false"
  ></app-confirmation-dialog>
}
```

---

## Performance

### Branding Service Caching

The BrandingService implements a multi-tier caching strategy to eliminate logo flash and reduce database queries:

**Cache Layers**:
1. **localStorage** - Persists logos across page refreshes
2. **Metadata queries** - Check if branding changed (lightweight timestamp query)
3. **Full data fetch** - Download logos only if admin changed them

**How It Works**:
- App bootstrap calls `BrandingService.initialize()` during `APP_INITIALIZER`
- Synchronously loads logos from localStorage (no async wait)
- Queries `admin_settings.branding_last_modified` timestamp (~3s timeout)
- Compares timestamp: if newer than cached version, fetches full data (~10s timeout)
- Falls back to cache if network fails
- Components render with logos available immediately (no flash)

**Performance Benefits**:
- **First visit**: Normal load from Supabase, then cache
- **Subsequent visits with no changes**: Only metadata query (3s, no logo download)
- **After admin updates logo**: Full fetch triggered by timestamp change
- **No logo flash**: Bootstrap ensures logos load before component tree renders

**Database**: Uses new `branding_last_modified` timestamp column with automatic trigger

### Database Optimization

- Indexes on frequently queried columns
- RLS policies instead of app-level checks
- Real-time subscriptions only for active section
- Pagination for large lists

### Frontend Optimization

- OnPush change detection strategy
- trackBy functions in loops
- Lazy-load admin routes
- Image optimization (PNG/WebP)
- Bundle analysis: `npm run build:analyze`
- Logo preload hints in HTML head for browser priority

### Monitoring

- Clarity Analytics dashboard
- Monitor Core Web Vitals
- Check Vercel deployment logs
- Supabase query performance
- BrandingService logs: `[BrandingService]` prefix in console

---

## Timezone Implementation

The Prayer Archive Timeline component automatically detects and uses your local timezone for all date display and filtering operations. This ensures that prayer events, reminders, and archives are shown in YOUR local time, not UTC or any other timezone.

### Features

1. **Automatic Timezone Detection**
   - Detects user's system timezone using Web API: `Intl.DateTimeFormat().resolvedOptions().timeZone`
   - Works automatically without user configuration
   - Example: If in Pacific Time, detects `America/Los_Angeles`

2. **Timezone Display**
   - Timeline displays detected timezone in the settings panel
   - "Timezone:" field visible in the blue settings box at top of timeline

3. **Timezone-Aware Date Filtering**
   - Prayer events filtered based on local timezone, not UTC
   - Resolves issues where timezone offset could cause events to appear in wrong month
   - Uses ISO date string comparison (`YYYY-MM-DD` format) in local timezone
   - Example: January 31 at 11:59 PM UTC in PST stays as January 31, displays correctly

4. **Timezone-Aware Date Display**
   - Event dates formatted using timezone context
   - "Today", "Tomorrow", and date labels respect local timezone
   - Date comparison for "Today" vs "Tomorrow" is timezone-aware

### Technical Details

**New Methods**:
- `getLocalDateString(date: Date): string` - Converts UTC Date to local YYYY-MM-DD format
- `getLocalDate(dateString: string): Date` - Converts UTC date string to Date in user's timezone

**Updated Methods**:
- `filterCurrentMonth()` - Uses `getLocalDateString()` for month comparison
- `formatDate(date: Date)` - Includes `timeZone: this.userTimezone` in `toLocaleDateString()` calls

**Common Timezones**:
- `America/New_York` - Eastern Time
- `America/Chicago` - Central Time
- `America/Los_Angeles` - Pacific Time
- `Europe/London` - UK Time
- `Asia/Tokyo` - Japan Standard Time

### Testing

To verify timezone is working:
1. Navigate to Prayer Archive Timeline in Admin panel
2. Check "Timezone:" field in settings box shows correct timezone
3. Verify prayer events appear on correct calendar dates
4. Confirm "Today" and "Tomorrow" labels match local date

---

## Prayer Encouragement (Pray For)

The **Pray For** feature lets community members indicate they have prayed for a request. When enabled by an admin, approved community prayer cards show a “Pray For” button; the requester and admins see an anonymous count (e.g. “3 Praying”). The same user cannot click again on the same prayer until the **cooldown** (1–168 hours, set in Admin → Prayer Encouragement) has passed.

- **Service:** `PrayerEncouragementService` (`src/app/services/prayer-encouragement.service.ts`) — reads `prayer_encouragement_enabled` and `prayer_encouragement_cooldown_hours` from `admin_settings`, caches them, and provides `recordPrayedFor()` and count lookups.
- **Admin UI:** `prayer-encouragement-settings` — toggle “Enable Prayer Encouragement” and cooldown (hours); cooldown control is shown only when the feature is enabled.
- **Prayer card:** `prayer-card` — shows Pray For button and count when enabled; optional explanation modal with “Do not show again” (localStorage, cleared on logout).
- **Database:** `admin_settings`: `prayer_encouragement_enabled` (boolean), `prayer_encouragement_cooldown_hours` (integer, default 4). `prayers`: `prayed_for_count`. Migrations: `20260224_prayer_encouragement.sql`, `20260225_prayer_encouragement_cooldown_hours.sql`.
- **Help:** In-app Help & Guidance includes a “Prayer Encouragement (Pray For)” section (`help-content.service.ts`).

---

## Prayer Archiving System

The prayer archiving system automatically archives prayers when specific criteria are met, preventing the prayer list from becoming too large while keeping active prayers visible.

### Archive Criteria

A prayer is archived when **all** of the following conditions are met:

1. A reminder email was sent (`last_reminder_sent` is not null)
2. The reminder was sent more than **30 days ago** (configurable in `admin_settings.days_before_archive`)
3. **No updates** have been made to the prayer since the reminder was sent (`updated_at` ≤ `last_reminder_sent`)

**Important**: If a prayer is updated after a reminder is sent, the archive counter resets. The prayer will only be eligible for archiving again after another reminder is sent and 30+ days pass without updates.

### Archive Configuration

**Location**: `admin_settings` table in Supabase

| Setting | Default | Purpose |
|---------|---------|---------|
| `enable_auto_archive` | `true` | Enable/disable archiving |
| `days_before_archive` | `30` | Days after reminder before archiving |

### Archiving Workflow

Executed by **Supabase `pg_cron`** (migration `20260317120000_schedule_send_prayer_reminders_cron.sql`, job `invoke-send-prayer-reminders`, **daily 10:00 UTC** — e.g. 4:00 AM CST / 5:00 AM CDT depending on DST). Replaces the former GitHub Actions workflow for this job.

1. **Daily execution** at that UTC time
2. For each prayer:
   - Check if eligible for reminder (30+ days since last reminder)
   - Send reminder email if needed
   - Check if any are eligible for archiving
   - Archive if all criteria met

### Checking Archive Status

#### Using Supabase REST API

**Get Archive Settings**:
```bash
curl -s "https://[project].supabase.co/rest/v1/admin_settings?select=days_before_archive,enable_auto_archive" \
  -H "apikey: YOUR_ANON_KEY" | jq '.[0]'
```

**Get Prayers with Reminders**:
```bash
curl -s "https://[project].supabase.co/rest/v1/prayers?select=id,title,last_reminder_sent,updated_at&order=last_reminder_sent.asc" \
  -H "apikey: YOUR_ANON_KEY" | jq '.[] | select(.last_reminder_sent != null)'
```

#### Predicting Next Archives

Use this Python script to analyze which prayers will be archived:

```python
from datetime import datetime, timedelta
import re

def parse_iso_datetime(s):
    """Parse ISO datetime with flexible microsecond format"""
    s = s.replace('+00:00', '').replace('Z', '')
    match = re.match(r'(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?', s)
    if match:
        year, month, day, hour, minute, second, micro = match.groups()
        if micro:
            micro = (micro + '000000')[:6]
        else:
            micro = '0'
        return datetime(int(year), int(month), int(day), int(hour), int(minute), int(second), int(micro))
    raise ValueError(f"Could not parse: {s}")

days_before_archive = 30
today = datetime.now()

for prayer in prayers_data:
    reminder_date = parse_iso_datetime(prayer['last_reminder_sent'])
    updated_date = parse_iso_datetime(prayer['updated_at'])
    archive_date = reminder_date + timedelta(days=days_before_archive)
    days_remaining = (archive_date - today).days
    updated_since = updated_date > reminder_date
    
    print(f"{prayer['title']}")
    print(f"  Archive date: {archive_date.strftime('%B %d, %Y')}")
    print(f"  Days remaining: {days_remaining}")
    print(f"  Updated since reminder: {updated_since}")
```

### Troubleshooting Archives

**Prayer not archiving as expected**:
1. Verify `enable_auto_archive` is set to `true`
2. Check if prayer has been updated since reminder was sent
3. Confirm it's actually 30+ days since the reminder
4. Check GitHub Actions logs for workflow errors

**How to manually archive a prayer**:
Update the prayer's `archived_at` timestamp in the Supabase dashboard (or use service key to update via API).

**Related Files**:
- Edge function: `supabase/functions/send-prayer-reminders/`
- Reminder service: `src/app/services/email-notification.service.ts`
- Settings: `admin_settings` table in Supabase

### User hourly prayer reminders (self nudges)

Users can save one or more **local clock hours** (with an IANA time zone) in **Settings**. A separate process runs **every hour** and notifies matching users:

- **Table**: `user_prayer_hour_reminders` (migration `20260315120000_user_prayer_hour_reminders.sql`: table, RLS, anon access, RPC, default `email_templates.user_hourly_prayer_reminder`). Each row stores an IANA zone (from the device when the user saved the slot) and a **local wall hour** 0–23. Matching uses `EXTRACT(HOUR FROM (NOW() AT TIME ZONE iana_timezone)) = local_hour`, so only due rows are selected (low egress). **DST**: Postgres applies the IANA rules (e.g. `America/Chicago`), so the reminder follows local civil time across spring/fall transitions (no separate DST flag). **RLS**: JWT-based `authenticated` policies enforce `user_email = auth.jwt() email`. The MFA/anon browser uses the **`anon`** role with a separate permissive policy (**not** `TO public`, so it does not override JWT ownership for real Supabase sessions). Anon clients have no `auth.jwt()` email, so row ownership cannot be enforced in Postgres for that path; inserts are still constrained by FK to `email_subscribers`. **App cannot change RLS** — only migrations/SQL.
- **Edge function**: `supabase/functions/send-user-hourly-prayer-reminders/` — same auth model as **`send-prayer-reminders`**. Sends **email** when `email_subscribers.is_active` is not false (same idea as session `isActive`). Sends **push** when `receive_push` is true and a `device_tokens` row exists (session `receivePush` + native). **Both** when both apply. **Email** uses `email_templates` key **`user_hourly_prayer_reminder`** with **`{{appLink}}`** from Edge secret **`APP_URL`** (match **`environment.appUrl`** in prod). The function prefixes **`https://`** when **`APP_URL`** is host-only so links are not rewritten to **`x-webdoc://`** in Apple Mail. Invokes `send-email` and/or `send-push-notification`.
- **Scheduling (Supabase)**: Migration `20260316130000_schedule_user_hourly_prayer_reminders_cron.sql` enables **`pg_net`** + **`pg_cron`** and registers **`invoke-user-hourly-prayer-reminders`** (`0 * * * *` UTC). The job POSTs to the Edge Function using Vault secrets **`project_url`** and **`service_role_key`** (same service_role JWT as GitHub `SUPABASE_SERVICE_KEY`). See [SETUP.md](SETUP.md) (User hourly prayer reminders). The GitHub workflow for this job was removed in favor of DB scheduling.
- **App**: `UserPrayerReminderService` + cache on `UserSessionData`; settings UI is hour-only and saves `Intl.DateTimeFormat().resolvedOptions().timeZone`. Rows created before a device time-zone change keep their stored IANA until removed.

- **Documentation**: [CHANGELOG.md](CHANGELOG.md) (*Prayer reminders (hourly nudges)*), [docs/README.md](README.md) (Core Capabilities + Email/Push), in-app Help (`help_prayer_reminders` + App Settings). User-facing subsection: **Prayer reminders (hourly nudges) (Settings)** above.

---

## Contributing

### Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes with tests
3. Run tests: `npm test -- --run`
4. Commit with clear message: `git commit -m "Add feature X"`
5. Push: `git push origin feature/my-feature`
6. Open PR with description
7. Wait for CI to pass + review
8. Merge to main

### Commit Messages

```
feat: Add new prayer filter
fix: Fix email sending error
docs: Update README
test: Add tests for prayer service
refactor: Extract prayer list component
chore: Update dependencies
```

### Code Review Checklist

- [ ] Tests pass
- [ ] No TypeScript errors
- [ ] No console errors/warnings
- [ ] No hardcoded values
- [ ] Follows naming conventions
- [ ] Code is documented
- [ ] No breaking changes

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run tests in watch mode
npm run type-check       # Check TypeScript

# Build & Deploy
npm run build            # Build for production
npm run build:analyze    # Analyze bundle size
npm run preview          # Preview production build locally

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npm test -- --run        # Run tests once
npm test -- --run --coverage  # With coverage

# Deployment
npm run deploy           # Deploy to Vercel
npm run deploy:preview   # Deploy to preview URL
```

---

## Resources

- [Angular Docs](https://angular.io)
- [Supabase Docs](https://supabase.io/docs)
- [Vitest Docs](https://vitest.dev)
- [TailwindCSS Docs](https://tailwindcss.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
