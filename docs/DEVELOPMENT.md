# Development Guide

For developers working on the Prayer App codebase.

## Table of Contents

1. [Architecture](#architecture)
2. [Testing](#testing)
3. [Code Quality](#code-quality)
4. [Performance](#performance)
5. [Timezone Implementation](#timezone-implementation)
6. [Prayer Archiving System](#prayer-archiving-system)
7. [Contributing](#contributing)

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
- **Rate Limiting**: Email processor respects Microsoft Graph limits

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

---

## Performance

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

### Monitoring

- Clarity Analytics dashboard
- Monitor Core Web Vitals
- Check Vercel deployment logs
- Supabase query performance

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

Executed by the `send-prayer-reminders` GitHub Actions workflow:

1. **Daily execution** (~4:15 AM CST)
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
