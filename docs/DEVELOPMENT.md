# Development Guide

For developers working on the Prayer App codebase.

## Table of Contents

1. [Architecture](#architecture)
2. [Testing](#testing)
3. [Code Quality](#code-quality)
4. [Performance](#performance)
5. [Contributing](#contributing)

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
│   │   ├── install-prompt/          # PWA install button
│   │   ├── offline-indicator/       # Offline status banner
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
│   │   ├── pwa.service.ts           # PWA features
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

#### PWAService
```typescript
// Progressive Web App features
- promptInstall()            // Show install dialog
- checkForUpdates()          // Check service worker
- activateUpdate()           // Apply pending update
- isInstalledAsApp()         // Detect PWA mode
- getOnlineStatus()          // Network status
```

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
- **Planning Center**: REST API (direct from frontend for reads)
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

### Service Worker Caching

Configured in `ngsw-config.json`:

```typescript
// Asset groups: Prefetch app shell
// Data groups:
// - prayers (performance, 1h TTL, max 100)
// - admin (network-first, 5m TTL)
// - auth (network-first, 1m TTL)
```

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
