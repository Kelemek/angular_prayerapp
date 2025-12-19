# Angular Prayer App Migration

## Migration Status

### ✅ Completed

1. **Project Setup**
   - Created `angular.json` configuration
   - Updated `package.json` with Angular dependencies
   - Configured TypeScript for Angular (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.test.json`)
   - Set up Tailwind CSS for Angular (updated content paths in `tailwind.config.ts`)
   - Created new `src/index.html` for Angular
   - Created `src/styles.css` with preserved Tailwind theming
   - Backed up all React code to `react-backup/` directory

2. **Core Structure**
   - Created Angular app component (`src/app/app.component.ts`)
   - Set up routing configuration (`src/app/app.routes.ts`)
   - Created main entry point (`src/main.ts`)
   - Created environment configuration files
   - Set up directory structure:
     - `src/app/services/` - for Angular services
     - `src/app/components/` - for shared components
     - `src/app/pages/` - for page components
     - `src/app/types/` - TypeScript interfaces (copied from React)

3. **Services**
   - Created `SupabaseService` (`src/app/services/supabase.service.ts`)
     - Includes `directQuery` and `directMutation` methods
     - Preserves connection handling logic from React version

### 🚧 In Progress

**Core Services** - Need to convert these from `src/lib/`:
- Theme service (from `useTheme` hook)
- Toast/notification service (from `ToastContext`)
- Admin authentication service (from `AdminAuthContext` and `useAdminAuth`)
- Prayer manager service (from `usePrayerManager` hook)
- Error logger service (from `errorLogger.ts`)
- Email services (from `emailService.ts`, `emailNotifications.ts`)

### 📋 Remaining Tasks

#### Phase 1: Core Services (HIGH PRIORITY)
1. **ThemeService** - Convert from `src/hooks/useTheme.ts`
   - Manage dark/light/system theme
   - Persist theme in localStorage
   - Apply theme class to document

2. **ToastService** - Convert from `src/contexts/ToastContext.tsx`
   - Show success/error/info messages
   - Auto-dismiss with configurable timeout
   - Queue multiple toasts

3. **AdminAuthService** - Convert from `src/contexts/AdminAuthContext.tsx` and `src/hooks/useAdminAuth.tsx`
   - Handle admin login/logout
   - Manage session state with RxJS
   - Check admin permissions

4. **PrayerService** - Convert from `src/hooks/usePrayerManager.ts`
   - CRUD operations for prayers
   - Real-time updates via Supabase subscriptions
   - Filtering and searching
   - Status management (current, answered, etc.)

5. **ErrorLoggerService** - Convert from `src/lib/errorLogger.ts`
   - Integrate with Sentry
   - Log page views and errors
   - Global error handling

#### Phase 2: Shared Components
Convert these from `src/components/`:
- `SkeletonLoader` - Loading placeholders
- `ThemeToggle` - Theme switcher button
- `AppLogo` - Church logo component
- `Checkbox` - Custom checkbox
- `ErrorBoundary` - Error handling wrapper (convert to ErrorHandler in Angular)

#### Phase 3: Prayer Components  
Convert these core prayer features:
- `PrayerCard` - Display individual prayers
- `PrayerForm` - Add/edit prayers
- `PrayerFilters` - Filter prayers by status/type
- `PrayerSearch` - Search functionality
- `PrayerPresentation` - Presentation mode view
- `MobilePresentation` - Mobile-optimized view
- `ResponsivePresentation` - Responsive wrapper
- `PromptCard` - Prayer prompts display

#### Phase 4: Admin Portal Components
Convert admin features from `src/components/`:
- `AdminLogin` - Admin authentication
- `AdminPortal` - Main admin dashboard
- `AdminUserManagement` - User management
- `PendingPrayerCard` - Approve new prayers
- `PendingUpdateCard` - Approve prayer updates
- `PendingDeletionCard` - Approve deletion requests
- `PendingUpdateDeletionCard` - Approve update deletions
- `PendingStatusChangeCard` - Approve status changes
- `PendingPreferenceChangeCard` - Approve preference changes

#### Phase 5: Settings & Configuration
Convert from `src/components/`:
- `UserSettings` - User preferences
- `AppBranding` - Church branding configuration
- `EmailSettings` - Email configuration
- `EmailSubscribers` - Email subscriber management
- `EmailTemplatesManager` - Email template editor
- `PrayerTypesManager` - Prayer type configuration
- `PromptManager` - Prayer prompts management
- `SessionTimeoutSettings` - Session management
- `BackupStatus` - Backup monitoring
- `RealtimeStatus` - Connection status
- `PrintPrayerList` - Print functionality

#### Phase 6: Pages & Routing
- Create `HomeComponent` with full prayer list view
- Create `AdminComponent` with conditional routing
- Implement hash-based routing (#presentation, #admin)
- Add route guards for admin access
- Implement lazy loading for admin modules

#### Phase 7: Third-Party Integrations
- Sentry integration (`src/lib/sentry.ts`)
- Microsoft Clarity (`src/lib/clarity.ts`)
- Vercel Analytics (convert from React to Angular version)
- Vercel Speed Insights

#### Phase 8: Testing & Validation
- Test all CRUD operations
- Verify real-time updates work
- Test admin authentication flow
- Verify theme switching
- Test responsive design
- Validate email notifications
- Test approval workflow
- Verify print functionality

## Key Differences: React → Angular

### State Management
- **React**: `useState`, `useEffect`, `useContext`
- **Angular**: RxJS Observables, Services with `BehaviorSubject`

### Component Communication
- **React**: Props, Context, Callbacks
- **Angular**: `@Input()`, `@Output()`, Services

### Lifecycle
- **React**: `useEffect`, `useLayoutEffect`
- **Angular**: `ngOnInit`, `ngOnDestroy`, `ngAfterViewInit`

### Styling
- **React**: `className`
- **Angular**: `class` (in templates), `[ngClass]` for dynamic classes

### Forms
- **React**: Controlled components with `onChange`
- **Angular**: Reactive Forms or Template-driven Forms

## Environment Setup

### Required Environment Variables
These need to be set in your hosting environment (Vercel):
- `VITE_SUPABASE_URL` → Should be accessible via Angular environment files
- `VITE_SUPABASE_ANON_KEY` → Should be accessible via Angular environment files

### Local Development
1. Create `.env` file in project root (not tracked in git):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Update `src/environments/environment.ts` to load from this file

## Running the App

```bash
# Development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Architecture Notes

### Standalone Components
This project uses Angular standalone components (no NgModules) for:
- Simpler structure
- Better tree-shaking
- Easier lazy loading
- Modern Angular best practices

### Service Pattern
All business logic is in services:
- `SupabaseService` - Database operations
- `ThemeService` - Theme management  
- `ToastService` - Notifications
- `AdminAuthService` - Authentication
- `PrayerService` - Prayer CRUD operations

### Directory Structure
```
src/
├── app/
│   ├── components/          # Shared/reusable components
│   ├── pages/              # Route components
│   │   ├── home/
│   │   └── admin/
│   ├── services/           # Business logic
│   ├── types/              # TypeScript interfaces
│   ├── app.component.ts
│   └── app.routes.ts
├── environments/           # Environment configs
├── lib/                   # Keep existing lib files for reference
├── styles.css            # Global styles
└── main.ts              # Bootstrap
```

## Deployment

The app is configured for Vercel deployment:
- `vercel.json` updated for Angular
- Output directory: `dist/prayerapp/browser`
- Build command: `npm run build`

## Next Immediate Steps

1. **Create environment variable loader**: Update `environment.ts` to properly load Supabase credentials
2. **Create ThemeService**: Port the theme management from React
3. **Create ToastService**: Port the notification system  
4. **Create basic HomeComponent**: Create the main prayer list view
5. **Test basic build**: Ensure the app compiles and runs

## Notes

- The React code is preserved in `react-backup/` for reference
- All Tailwind CSS custom styles are preserved
- Supabase backend remains unchanged
- All TypeScript types are copied to `src/app/types/`
- The lib directory contains helper utilities that may be reusable
