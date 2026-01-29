# Changelog

Major features and milestones for the Prayer App.

## [Current] - January 2026

### Code Cleanup: Removed Unused Approval Codes Infrastructure ✅
- ✅ Removed unused `approval_codes` table and related code
  - Admin notification emails now link directly to `/admin` portal (standard login required)
  - Personalized one-time approval links were no longer being generated
  - Removed `ApprovalLinksService.generateApprovalLink()` method
  - Removed `ApprovalLinksService.validateApprovalCode()` method
  - Removed `validate-approval-code` Edge Function
  - Dropped `approval_codes` database table via migration
  - Kept account approval/denial codes (simple base64 encoding, no database required)

- ✅ Security improvements
  - Restricted `backup_tables` view access to service_role only
  - Removed unnecessary public access to database schema information

### Planning Center Members List Mapping ✅
- ✅ Added admin interface for mapping email subscribers to Planning Center lists
  - Search and select email subscribers
  - Browse and filter Planning Center lists
  - Create/update/delete subscriber-to-list mappings
  - View all current mappings in admin dashboard

- ✅ Presentation mode supports members content
  - "Members" content type shows prayer updates from list members
  - "All" content type includes members along with prayers, prompts, and personal prayers
  - Member avatars displayed in presentation cards
  - Members sorted alphabetically by last name (client-side)

- ✅ Smart last name sorting with suffix handling
  - Removes suffixes (Jr, Sr, II, III, IV, V) before sorting
  - Handles multiple last names correctly
  - Case-insensitive alphabetical ordering

- ✅ Planning Center Edge Functions
  - `planning-center-lists` function fetches lists and members via PC API
  - Client-side caching for improved performance
  - CORS headers support modern Supabase client

- ✅ Database schema updates
  - Added `planning_center_list_id` column to `email_subscribers` table
  - Stores mapping between subscribers and PC lists

### Personal Prayers Export Feature ✅
- ✅ Added `downloadPrintablePersonalPrayerList()` method to PrintService
  - Retrieves user's personal prayers via PrayerService.getPersonalPrayers()
  - Filters prayers by time range (week/2-weeks/month/year/all)
  - Includes prayers created in range OR with updates in range
  - Generates print-optimized HTML with professional styling
  - Supports popup window or file download fallback
  - Filename format: `personal-prayers-{range}-{date}.html`

- ✅ Added `generatePersonalPrayersPrintableHTML()` method
  - Creates professional HTML document with embedded CSS
  - Organizes prayers by status (current/answered) with color coding
  - Includes prayer metadata (creator, date, update count)
  - Shows recent updates (last week) with author and date
  - Prevents XSS attacks with HTML entity escaping
  - Responsive design (print-optimized layout)
  - Page break handling for multi-page printing

- ✅ Added `generatePersonalPrayerHTML()` method
  - Renders individual personal prayer cards
  - Includes title, creator, creation date
  - Shows all recent updates (updates from last 7 days)
  - Falls back to most recent update if no recent activity
  - Displays update metadata (author, date)
  - Professional styling with left border indicators

- ✅ Test Coverage Added (10 targeted tests for personal prayers)
  - Empty prayer list handling
  - Window close behavior on errors
  - Time range filtering (week, 2-weeks, month, year, all)
  - Exception handling and error messages
  - HTML generation with updates verification
  - File download fallback when popup blocked
  - Pre-opened window usage (Safari compatibility)
  - Window and DOM method invocation verification

- ✅ Supporting Tests for Main Download Method (6 new tests)
  - Prayer updates fetch error handling
  - Window closing on update errors
  - Update filtering (approved vs unapproved)
  - Null updates data handling gracefully
  - Two-week time range support
  - Filtering prayers with recent updates (inclusion logic)

- ✅ Coverage Improvement
  - Statement coverage: 204/337 (57.02%) → 299/337 (83.14%)
  - Branch coverage: 112/218 (51.4%) → 166/218 (76.1%)
  - Total test count: 162 → 177 (15 new tests)
  - All 177 tests passing with zero failures

**Implementation Details**:

The personal prayers feature extends the existing PrintService architecture:

1. **Data Retrieval**: Uses PrayerService.getPersonalPrayers() to fetch user's personal prayers
2. **Filtering Logic**: Dual filter - includes prayers created in range OR with updates in range
3. **Time Calculation**: 
   - Week: Last 7 days
   - 2-weeks: Last 14 days
   - Month: Last 30 days
   - Year: Last 365 days
   - All: Complete history (2000-01-01 to now)
4. **HTML Generation**: 
   - DOCTYPE HTML5 with responsive meta tags
   - Embedded CSS for print optimization (page breaks, margins, fonts)
   - Color-coded sections (Blue for current, Green for answered)
   - Professional typography with proper line-height/spacing
5. **Window Management**: 
   - Opens new window with generated HTML
   - Falls back to Blob download + file system when popup blocked
   - Supports pre-opened window (Safari compatibility)
6. **Error Handling**: 
   - Alert user when no prayers found
   - Close provided window on any error
   - Detailed console error logging
   - Graceful fallback to file download

**Impact**: Users can now export and print their personal prayers in various time ranges, supporting prayer journaling, sharing with accountability partners, and archival purposes.

### Code Quality Improvements ✅
- ✅ Removed debug console.log statements (5 removed)
  - Lines 35, 73, 87, 125-129, 734 in print.service.ts
  - Maintained console.error for proper error logging
  - Cleaner production code, reduced console noise

### Bug Fixes & Improvements
- ✅ Fixed badge display on prayer cards under Total Prayers filter
  - Badges now only show for Current and Answered filters
  - Prevents notification indicators from appearing on archived prayers
- ✅ Improved help content for prayer request creation
  - Clarified form field descriptions
  - Better examples matching actual form structure
  - Added information about anonymous option and approval process
- ✅ Cleaned up documentation links
  - Removed references to non-existent documentation files
  - Updated README.md and docs/README.md for accuracy

### PWA Functionality Removed ✅
- ✅ Removed service worker configuration and related services
- ✅ Removed update checking and notification system
- ✅ Removed install prompts and offline indicators
- ✅ App now functions as a standard website
- ✅ All 2785 tests passing

**Impact**: App is simpler and more stable. Reduced complexity from service worker management while maintaining all prayer functionality. Users can still add the site to their home screen using their browser's native feature.

### Badge Functionality ✅
- ✅ BadgeService for tracking read/unread status
- ✅ Track unread prayers and prayer prompts
- ✅ Badge count indicators across components
- ✅ User preference setting for badge display
- ✅ Real-time badge updates with observables
- ✅ Comprehensive test coverage (100+ badge tests)

**Impact**: Users can quickly identify unread prayers and updates. Improves user engagement by showing notification counts on prayers, prompts, and prayer request cards.
- ✅ Install prompt component (Chrome, Edge, Safari iOS)
- ✅ Offline indicator component
- ✅ iOS safe area handling (notch/dynamic island)
- ✅ All tests passing (2846 tests)
- ✅ Deployed to production on Vercel

**Impact**: Users can now install the app on iOS/Android and use offline. Reduced API calls ~300/week through caching.

### Email Queue System ✅
- ✅ GitHub Actions workflow every 5 minutes
- ✅ Respects Microsoft Graph rate limits (120/min)
- ✅ Batch processing with exponential backoff
- ✅ Email templates (7+ types)
- ✅ Subscriber management (opt-in/out)
- ✅ Error logging and retry logic

**Impact**: Reliable email delivery without overwhelming Microsoft's API. Handles 150+ users, 5 prayers/week.

### Admin Features ✅
- ✅ Prayer approval workflow
- ✅ Prayer updates approval
- ✅ Deletion request handling
- ✅ Account approval system
- ✅ Real-time admin dashboard
- ✅ Email settings management
- ✅ User management
- ✅ Prayer Archive Timeline
  - Visual timeline of prayer lifecycle events
  - Automatic timezone detection
  - Activity-based timer logic (timer resets on updates)
  - Month-based navigation
  - Refresh functionality with manual settings control
  - 21 unit tests with full test coverage

### User Features ✅
- ✅ Submit prayer requests
- ✅ Add prayer updates
- ✅ Search prayers (full-text)
- ✅ Theme settings (light/dark)
- ✅ Email preferences
- ✅ Print prayer list
- ✅ Prayer timer
- ✅ Real-time updates

---

## December 2025

### Planning Center Integration
- ✅ Contact lookup by email
- ✅ Auto-populate name from Planning Center
- ✅ Phone number sync
- ✅ Fallback when not available

### Email Improvements
- ✅ HTML templates with Mjml
- ✅ Variable substitution (name, date, etc)
- ✅ Test email sending
- ✅ Email verification for subscriptions

### Accessibility
- ✅ WCAG 2.1 AA compliance
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Color contrast improvements
- ✅ Focus management

---

## November 2025

### Analytics & Monitoring
- ✅ Clarity Analytics integration
- ✅ Event tracking (prayers submitted, approved, etc)
- ✅ Performance monitoring
- ✅ User behavior analysis

### Performance Optimizations
- ✅ Service worker caching
- ✅ API caching (1h for prayers, 5m for admin)
- ✅ Image optimization
- ✅ Bundle size reduction
- ✅ Database query optimization

### Mobile Optimizations
- ✅ iOS safe area support
- ✅ Touch-friendly UI
- ✅ Mobile-first responsive design
- ✅ PWA manifest

---

## October 2025

### Real-Time Updates
- ✅ Supabase real-time subscriptions
- ✅ Live prayer list updates
- ✅ Admin dashboard updates
- ✅ Connection status indicator

### Security
- ✅ Row-level security (RLS) on all tables
- ✅ Admin-only routes with guards
- ✅ Email verification
- ✅ Session timeout
- ✅ CSRF protection
- ✅ XSS prevention (Angular sanitization)

---

## September 2025

### Database
- ✅ PostgreSQL via Supabase
- ✅ 12+ tables (prayers, updates, users, etc)
- ✅ Full-text search index
- ✅ Migrations versioning
- ✅ Automated backups

### Authentication
- ✅ Supabase Auth with email/password
- ✅ Email verification required
- ✅ Session persistence
- ✅ Admin approval workflow

---

## August 2025

### Core Features
- ✅ Prayer request submission
- ✅ Prayer request approval workflow
- ✅ Prayer updates
- ✅ Admin dashboard
- ✅ Email notifications
- ✅ Search functionality

---

## Timeline Summary

| Phase | Status | Date | Impact |
|-------|--------|------|--------|
| Core features | ✅ Complete | Aug-Sep 2025 | MVP ready |
| Auth & Security | ✅ Complete | Sep-Oct 2025 | User management |
| Real-time updates | ✅ Complete | Oct 2025 | Live dashboard |
| Email system | ✅ Complete | Oct-Nov 2025 | Notifications |
| Performance | ✅ Complete | Nov 2025 | Faster loading |
| Analytics | ✅ Complete | Nov 2025 | Usage insights |
| PWA | ✅ Complete | Jan 2026 | Offline support |

---

## Future Roadmap

### Not Currently Planned
- Web push notifications (iOS doesn't support)
- SMS notifications (cost: $20-25/month)
- Mobile app (web PWA sufficient for now)
- GraphQL API (REST is sufficient)
- Blockchain/Web3 features

### Possible Future Phases
- **Phase 2A**: Email digest (weekly summary)
- **Phase 2B**: Offline support for updates
- **Phase 2C**: Advanced reporting/analytics
- **Phase 3**: Prayer journal/reflection system
- **Phase 4**: Prayer group collaboration features

---

## Known Limitations

### iOS/Safari
- ❌ Web push notifications not supported (Apple limitation)
- ✅ PWA installs and works offline
- ✅ Can send emails instead

### Android
- ✅ Full PWA support including push notifications
- ✅ Works offline completely

### Performance
- ✅ Handles 150+ users, 5 prayers/week comfortably
- ✅ Email processing: ~20 per 5-minute cycle
- ✅ Real-time updates: ~200 concurrent users

---

## Version History

- **v1.0.0** (Jan 2026) - PWA complete, Phase 1 launch
- **v0.9.0** (Dec 2025) - Planning Center integration
- **v0.8.0** (Nov 2025) - Performance & analytics
- **v0.7.0** (Oct 2025) - Real-time updates & security
- **v0.6.0** (Sep 2025) - Auth system
- **v0.5.0** (Aug 2025) - Core features MVP

---

## Test Coverage

- **Total Tests**: 2846 passing, 2 skipped
- **Coverage**: 80%+
  - Services: 90%+
  - Components: 70%+
  - Guards: 85%+
- **E2E Tests**: 15+ Playwright tests
- **Type Coverage**: 100% (strict TypeScript)

---

## Contributors

- Development: Cross Pointe Church Tech Team
- Design: Cross Pointe Design Team
- Testing: Full QA team
- Feedback: Cross Pointe congregation members

---

## License

© 2024-2026 Cross Pointe Church. All rights reserved.
