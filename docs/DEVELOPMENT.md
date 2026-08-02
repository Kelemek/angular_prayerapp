# Development Guide

For developers working on the Prayer App codebase.

## Table of Contents

1. [Architecture](#architecture) (includes [Public Routes](#public-routes), [Info Page](#info-page), and [Admin portal: nested settings](#admin-portal-nested-settings-cards-and-change-detection))
2. [Testing](#testing)
3. [Code Quality](#code-quality)
4. [Performance](#performance)
5. [Timezone Implementation](#timezone-implementation)
6. [Prayer Encouragement (Pray For)](#prayer-encouragement-pray-for)
7. [Prayer Archiving System](#prayer-archiving-system)
8. [Contributing](#contributing)

---

## Architecture

### Toolchain (2026)

| Area | Version |
|------|---------|
| Angular | 22.x (standalone components, application builder) |
| TypeScript | 6.x |
| Node (local + CI) | **22.22.3+** minimum for Angular 22 ([`.nvmrc`](../.nvmrc), CI **22.22.3**) |
| Node (Vercel) | **`engines.node`: `24.x`** — Vercel `22.x` was **22.22.2**, below Angular 22 minimum |
| Capacitor | 8.4.x (iOS/Android) |
| Tailwind | 4.3.x |
| Unit tests | Vitest 4.1 + @testing-library/angular |
| E2E | Playwright 1.61 |
| Edge Functions | Deno (`Deno.serve`; `supabase-js` pinned in [`supabase/functions/deno.json`](../supabase/functions/deno.json)) |

After Capacitor dependency bumps, run **`npm run cap:sync`** (or `cap:dev` / `cap:prod`) before native builds.

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
| `/` | siteAuthGuard | Home – prayer list, filters, prompts, personal, memorize |
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

### Memorize (ESV + API.Bible)

The **Memorize** tab on [`home.component.ts`](src/app/pages/home/home.component.ts) is a personal scripture memorization module (ported from [Kelemek/Prayer_App](https://github.com/Kelemek/Prayer_App), adapted for single-tenant email scope). Passage text: **ESV** via Crossway API; **KJV, NASB, LSB, NIV, NLT, CSB** via API.Bible. **Listen** is ESV-only.

- **Data**: [`memorized_items`](../supabase/migrations/20260707120000_memorization_esv.sql) stores verse **references** per `user_email` (`text` is empty for `kind = 'verse'`; Bible-books lists keep book names in `text`). RLS: JWT ownership for `authenticated` sessions and **`anon`** access for MFA/localStorage logins (same pattern as `user_prayer_hour_reminders`). [`scripture_cache`](../supabase/migrations/20260707120000_memorization_esv.sql) stores passage text keyed by `(reference, translation)` — `reference` is USFM when parseable (`JHN.3.16`); cache reads fall back to legacy human-readable keys for older rows. `verse_count` per row and `prune_scripture_cache` (~**500**-verse LRU via `cached_at`, refreshed on cache hits; ESV TTL **7** days via `ESV_CACHE_TTL_DAYS`, API.Bible TTL **14** days via `API_BIBLE_CACHE_TTL_DAYS`; cap **`ESV_CACHE_MAX_VERSES`** default **500**). Practice and add-verse flows fetch text through the `scripture` Edge Function (cache hit or upstream API). Preferred translation persists in `localStorage` via [`MemorizationService`](src/app/services/memorization.service.ts). Admin-curated suggestions live in [`memorization_recommendations`](../supabase/migrations/20260710200000_memorization_recommendations.sql) (`reference` + `translation`; all supported Bible codes after [`20260717120000_memorization_recommendations_multi_translation.sql`](../supabase/migrations/20260717120000_memorization_recommendations_multi_translation.sql)) with required `category_id` → [`memorization_recommendation_categories`](../supabase/migrations/20260710210000_memorization_recommendation_categories.sql) (ordered categories; verses ordered within each category). Fresh installs can apply [`20260711120000_seed_ibcd_memorization_recommendations.sql`](../supabase/migrations/20260711120000_seed_ibcd_memorization_recommendations.sql) to pre-populate counseling topics and ESV references from Jim Newheiser / IBCD (*Approximately 100 Go-to Texts for Biblical Counseling*). Managed under **Admin → Settings → Content → Memorize Recommendations**.
- **Services**: [`MemorizationService`](src/app/services/memorization.service.ts) (CRUD, practice stats, in-progress sessions); [`MemorizationRecommendationsService`](src/app/services/memorization-recommendations.service.ts) (cached categories + curated verses, category CRUD/reorder, invalidate on admin writes; home **Recommended** modal force-reloads on open; overlapping loads are generation-guarded; verse placements and category reorder persist via atomic RPCs `apply_memorization_recommendation_placements` / `reorder_memorization_recommendation_categories`); [`ScriptureService`](src/app/services/scripture.service.ts) calls Edge Functions `scripture` and `scripture-audio`. **Recite mode** (when enabled in **Admin → Settings → Content → Memorization Recite Mode**): [`MemorizationReciteSettingsService`](src/app/services/memorization-recite-settings.service.ts) reads `admin_settings.memorization_recite_enabled`; [`MemorizationReciteService`](src/app/services/memorization-recite.service.ts) records audio and POSTs to Edge Function [`transcribe-audio`](../supabase/functions/transcribe-audio/index.ts) (OpenAI **whisper-1**); alignment in [`memorizationReciteAlignment.ts`](src/app/lib/memorization/memorizationReciteAlignment.ts). Available only for **single-verse** references (`isSingleVerseScriptureReference`). Usage logged in `memorization_recite_usage`; admins see optional API-key spend (last 30 days) from [`get-openai-org-usage`](../supabase/functions/get-openai-org-usage/index.ts) (`OPENAI_ADMIN_KEY` + `OPENAI_API_KEY_ID`; separate from `OPENAI_API_KEY` for Whisper). The admin panel shows OpenAI-reported spend only (not the internal ledger estimate).
- **UI**: `memorization-action-bar` (**Add Verses**, **Bible Books**, **Recommended**), `memorized-verse-card` and `memorization-recommendation-card` (reference cards; desktop hover / mobile long-press opens `scripture-hover-preview` for passage text without replacing tap-to-practice / tap-to-add; popover portals to `body` at `z-[220]` so it stacks above the Recommended modal; hover allows pointer into the popover to scroll; long-press cancels on move and stays open until backdrop/Escape (lift suppresses click only); only one preview open at a time; admin Memorize Recommendations rows preview on the reference text the same way), `memorization-recommendations-modal` (categories as collapsed-by-default accordions; expand to tap verses or see **Already added**; Capacitor scroll lock so only the modal scroller moves), `add-memorized-verse-modal`, `add-memorized-bible-books-modal`, `memorization-practice-session`, `bible-passage-picker-modal`, `scripture-attribution`, `memorization-recommendations-manager` (Content tab: categories + verses per category; drag verses between category lists to reassign). Mastery groups (`learning` / `practicing` / `mastered`) via [`memorization-mastery.ts`](src/app/lib/memorization/memorization-mastery.ts). **Admin → Settings → Analytics** shows site-wide mastery totals (same thresholds) via [`AnalyticsService.getStats()`](src/app/services/analytics.service.ts) selecting `memorized_items.practice_sessions`. Visual palette matches [Prayer_App](https://github.com/Kelemek/Prayer_App): soft blue primary actions (`bg-blue-100` / `text-blue-800`), solid `blue-600` grid selections, `#0047AB` active Memorize filter ring. Passage picker keeps gospel_presentation scroll behavior (single inner scroller, inline verses, `scrollIntoView` on expand/chapter). Practice auto-scroll keeps the current blank on screen: word mode above the choice footer, type/initials above the keyboard (initials also below the sticky cue header) via [`memorizationScrollIntoPractice.ts`](src/app/lib/memorization/memorizationScrollIntoPractice.ts). Type/initials hidden practice input uses `name="search"` inside an `autocomplete="off"` form (and hides WebKit contacts autofill buttons) to discourage iOS Safari’s **AutoFill Contact** accessory; it is a 1px near-invisible strip (not `opacity: 0` / `pointer-events: none`, which WebKit focuses without opening the keyboard). Home keeps a pre-mounted **keyboard bridge** input and, when resuming an in-progress type/initials round, focuses it on the verse-card tap *before* mounting the session ([`memorizationKeyboardPractice.ts`](src/app/lib/memorization/memorizationKeyboardPractice.ts)); **`openMemorizationPractice`** then **`detectChanges()`** so the session mounts in the same turn and takes focus. Starting either mode from the mode picker still focuses the practice input in that button’s gesture. **Practice strict mode** (User Settings → **Memorization practice**): `email_subscribers.memorization_strict_mode` (default false) synced through [`UserSessionService`](src/app/services/user-session.service.ts). Standard mode auto-reveals a blank after three consecutive wrong answers in Type, Initials, and Word modes; strict mode keeps the red error flash until the user answers correctly. In **Reorder** mode, [`memorization-reorder-panel`](src/app/components/memorization-reorder-panel/memorization-reorder-panel.component.ts) emits `wrongSwap` when a drag swap does not place any part in its correct slot; the practice session counts that as an error only in strict mode (standard reorder still allows exploratory swaps). After a round, strict mode hides **Next round** until that round had zero wrong attempts (only **Repeat this round** until then). The practice header shows **Errors: N** for the current round only when N &gt; 0; the count stays on screen through the round-complete step and resets when the next round begins.
- **Filter layout**: Button order ends with **Memorize** then **Members** when the Planning Center list filter is shown. Below `sm`, two rows: **`grid-cols-3`** (Current, Answered, Total) then **`grid-cols-4`** (Prompts, Personal, Memorize, Members) when Members is visible, or **`grid-cols-3`** on the second row without Members. `sm:contents` merges into one row on larger screens.
- **Ops**: Set Supabase secrets `ESV_API_TOKEN`, `API_BIBLE_KEY`, and `API_BIBLE_BIBLE_ID_*`; deploy `scripture` + `scripture-audio` — see [docs/SETUP.md](SETUP.md#esv-api-and-apibible-memorize-tab).
- **Copyright**: Per-translation notices via [`scripture-attributions.ts`](src/app/lib/memorization/scripture-attributions.ts) and [`scripture-attribution`](src/app/components/scripture-attribution/scripture-attribution.component.ts) (wording from [API.Bible Terms Appendix B](https://api.bible/terms-and-conditions) and publisher permission-to-quote pages). Full notices on [`/privacy`](src/app/pages/privacy/privacy.component.ts) (**Scripture Copyright**).

### Admin portal: nested settings cards and change detection

The admin route (`src/app/pages/admin/admin.component.ts`) uses **`ChangeDetectionStrategy.OnPush`**. Collapsible **Settings** tabs embed many standalone components as siblings (Analytics, Email, Content, Tools, Security).

**Pattern that caused missed UI updates**: A **child** component uses **OnPush** (or sits under the OnPush admin tree), relies on **native `(submit)`** or **`type="submit"`** without also wiring **`type="button"` `(click)="..."`**, and updates state in **`async`** handlers without **`ChangeDetectorRef.detectChanges()`** / **`ApplicationRef.tick()`** before the first **`await`**. Symptoms: save runs but success/error/spinners do not show until something else triggers change detection.

**CD order for saves / spinners (Content tab + Email manual add)**: After mutating state, call **`markForCheck()`** first (marks this OnPush branch dirty for the next cycle), then **`detectChanges()`** on this component (runs CD immediately so the spinner row appears before the first **`await`**), then **`ApplicationRef.tick()`** so the **OnPush admin parent** picks up the update. Use the same **`markForCheck` → `detectChanges` → `tick`** order in **`finally`** after **`submitting = false`**. Synchronous flows that only flip flags (e.g. **`handleEdit` / `cancelEdit`** on prompts) still call **`markForCheck()`** after updating state.

**Aligned in code (Content tab)**:

- [`prompt-manager.component.ts`](src/app/components/prompt-manager/prompt-manager.component.ts) — click-driven save, `novalidate`, `tick`/`detectChanges`, optional toasts.
- [`prayer-types-manager.component.ts`](src/app/components/prayer-types-manager/prayer-types-manager.component.ts) — same; **`include_in_booklet`** is editable in the add/edit form and via the row **book** toggle (hover/focus tooltip); row **book** and **activate** toggles open **`app-confirmation-dialog`** before updating (same surface as delete).
- [`memorization-recommendations-manager.component.ts`](src/app/components/memorization-recommendations-manager/memorization-recommendations-manager.component.ts) — Content tab curated Memorize verses; picker add + drag reorder; `markForCheck` → `detectChanges` → `tick` while validating/saving.

**Similar surface (watch if reports appear)**:

- [`email-subscribers.component.ts`](src/app/components/email-subscribers/email-subscribers.component.ts) — same pattern for **Manual Entry** → **Add Subscriber** (click-driven, `novalidate`, `tick` / `detectChanges`, inline **Adding…**).

**Lower concern**:

- **Prayer Editor** ([`prayer-search.component.ts`](src/app/components/prayer-search/prayer-search.component.ts)): default change detection; **Create Prayer** primary control is already **`type="button"`** `(click)="createPrayer($event)"`. The form’s **`(submit)`** is mainly for Enter-key behaviour.
- **GitHub / Prayer Encouragement / Rich Text editors** ([`github-settings`](src/app/components/github-settings/github-settings.component.ts), [`prayer-encouragement-settings`](src/app/components/prayer-encouragement-settings/prayer-encouragement-settings.component.ts), [`rich-text-editors-settings`](src/app/components/rich-text-editors-settings/rich-text-editors-settings.component.ts)): **default** change detection, **`(ngSubmit)`** — normal Angular template-driven pattern.
- [**`app-branding`**](src/app/components/app-branding/app-branding.component.ts): OnPush but save is already **`(click)="save()"`** with **`markForCheck()`** in **`save()`**.
- [**`planning-center-list-mapper`**](src/app/components/planning-center-list-mapper/planning-center-list-mapper.component.ts), [**`security-policy-settings`**](src/app/components/security-policy-settings/security-policy-settings.component.ts), [**`test-account-settings`**](src/app/components/test-account-settings/test-account-settings.component.ts), [**`email-verification-settings`**](src/app/components/email-verification-settings/email-verification-settings.component.ts): OnPush; **no `<form>` submit** flows surfaced in template grep — toggles/controls rather than add-form submits.

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
// Per-user: UserSessionService getShowPrayForButton$ / getShowPrayingCount$ + email_subscribers columns
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
- getChurchWebsiteHref()     // Safe http(s) href for optional church site link (header logo/title)

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
  churchWebsiteUrl: string | null; // From admin_settings.church_website_url; home header link when valid http(s)
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
- queueAdminManualBroadcastToSubscribers() // Admin Email: manual broadcast to non-blocked subscribers (ignores is_active); excludes Security → Test Account email; template admin_subscriber_manual_broadcast; accepts `bodyHtml` (sanitized) or `bodyMarkdown`
- getManualBroadcastRecipientEmails() / getManualBroadcastRecipientCount() // Same recipient rules as the manual broadcast (for UI count)
- triggerEmailProcessor()            // Invoke GitHub Action
```

#### PrintService
```typescript
// Generate and download printable prayer lists
- downloadPrintablePrayerList()      // Download public prayers in time range
- downloadPrintableBookletPrayerList() // Admin: saddle-stitch booklet (BookletTimeRange: week, twoweeks, month, twomonths)
- downloadPrintablePromptList()      // Download prayer prompts by type
- downloadPrintablePersonalPrayerList() // Download user's personal prayers
- loadPublicPrayersForTimeRange()    // (private) shared fetch + filter for public list / booklet
- loadBookletPromptSectionsOrdered() // (private) active prayer_types with include_in_booklet + prayer_prompts for booklet
- sortPromptsAlphabeticalByTitle()     // (private) A→Z by title within a prompt type (print + booklet)
- splitPromptsIntoTwoColumnsRowMajor() // (private) alternate prompts left/right columns (reading order)
- generatePrintableHTML()            // Generate HTML for public prayers
- generateSaddleStitchBookletHTML()  // Booklet: padToMultipleOfFourWithBackCoverLast + impose + landscape 2-up
- getPrintablePromptBlockStyles()    // Shared CSS for Print Prompts + booklet prompt blocks (scoped under .booklet-prompt-print-root)
- generatePromptsPrintableHTML()     // Generate HTML for prompts
- generatePersonalPrayersPrintableHTML() // Generate HTML for personal prayers
```

**Saddle-stitch booklet (admin)**: **Admin** → **Settings** → **Tools** → **Saddle-stitch prayer booklet**. **`booklet_insert_pages`** uses the same permissive RLS pattern as **`admin_settings`** (anon + authenticated grants) because the admin portal authenticates via MFA, not a Supabase Auth JWT. — HTML from [`padToMultipleOfFourWithBackCoverLast`](src/app/lib/print-booklet-imposition.ts) + [`saddleStitchImpose`](src/app/lib/print-booklet-imposition.ts). **Reader order**: front cover → **current** prayers → **answered** prayers → **custom insert pages** ([`booklet_insert_pages`](supabase/migrations/20260521120000_booklet_insert_pages.sql), managed in [`prayer-list-booklet-print.component.ts`](src/app/components/prayer-list-booklet-print/prayer-list-booklet-print.component.ts); PNG/JPEG only in v1; one image = one panel via **`packMode: 'onePerPage'`** in [`booklet-measure-inline.ts`](src/app/lib/booklet-measure-inline.ts)) → **prayer prompts** (`prayer_types.include_in_booklet`) → Notes padding (if needed) → back cover. **Front / back**: as in [CHANGELOG](CHANGELOG.md) (**`/info` QR**, cover **PWA icon**, and optional **back-cover branding logo** fetched and inlined as **`data:`** when possible so printing does not depend on loading **`api.qrserver.com`**, same-origin **`/icons`**, or the CDN/logo URL first). **Prayer prompts**: after inserts, optional sections from **`prayer_types.include_in_booklet`** (active types only), ordered by **`display_order`**, **A→Z by title** within each type, with the same **`.type-section` / `.columns` / `.prompt-item`** structure as **Print Prompts** ([`getPrintablePromptBlockStyles`](src/app/services/print.service.ts)); booklet category titles use **`booklet-h2`** (**{category name} Prompts (count)**), matching **Current**/**Answered** section headings (blue **`#1d4ed8`** text, **`#93c5fd`** border); two columns use **row-major** order (left column = items 1, 3, 5…; right = 2, 4, 6…). **Each type is one fragment** (no splitting a category into multiple server batches); units from all types are packed greedily for the fallback layout, with **`sections`** consumed by [`buildBookletMeasurePackScript`](src/app/lib/booklet-measure-inline.ts) for **`scrollHeight`** reflow. **Inner pages**: **`.booklet-panel`** inset (edges + gutter) tuned for denser packing; **13px** scaled copy; `splitBookletMarkdownIntoPanelParts` (**~1750 chars** per segment), **`estimateBookletUnitWeight`**, and **`packBookletUnitsIntoPageChunks`** (**`BOOKLET_PANEL_BOTTOM_SLACK`**) give a heuristic first paint; in a real browser, [`booklet-measure-inline.ts`](src/app/lib/booklet-measure-inline.ts) measures **`scrollHeight` vs `clientHeight`** with rounding + capped bottom-inset tolerance, then re-imposes — see [CHANGELOG](CHANGELOG.md). Answered-prayer card **“(continued)”** / **updates-on-last-segment** behavior is unchanged. Two **`booklet-panel`** columns per **`booklet-print-surface`** (**flex**, fixed height). **Padding** slots (only when imposition pads to a multiple of four) and the **outer back cover** use the same **Notes** header (pencil icon + bold **Notes:**) above ruled handwriting lines — see [CHANGELOG](CHANGELOG.md). Duplex **flip short edge**, fold, staple.

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
   - Meta header and update rows delegate to [`prayer-card-meta-header`](components/prayer-card-meta-header/prayer-card-meta-header.component.ts), [`prayer-update-row`](components/prayer-update-row/prayer-update-row.component.ts), and [`prayer-update-actions`](components/prayer-update-actions/prayer-update-actions.component.ts); shared layout in [`card-meta-header-band`](components/card-meta-header-band/card-meta-header-band.component.ts). Card-type and update-label helpers live in [`prayer-card-kind.ts`](../lib/prayer-card-kind.ts), [`prayer-update-header.ts`](../lib/prayer-update-header.ts), and [`prayer-status-header.ts`](../lib/prayer-status-header.ts).
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
  - **Home / Presentation list cache**: [`planning-center-list.service.ts`](src/app/services/planning-center-list.service.ts) stores each subscriber’s mapped list id and member roster in `localStorage` under `prayerapp_planning_center_list_<normalizedEmail>` (30‑minute TTL). `loadForUser` hydrates `listId$` / `members$` synchronously from cache, then refreshes from `email_subscribers.planning_center_list_id` and `fetchListMembers`. Invalidate on logout and when admins change mapping in [`planning-center-list-mapper.component.ts`](src/app/components/planning-center-list-mapper/planning-center-list-mapper.component.ts). Legacy shared key `planningCenterListData_cache` is migrated once on read.
  - Members sorted by last name (handles suffixes)
- **Admin Auth**: check-admin-status Edge Function (verifies admin status using service role)
- **Rate Limiting**: Email processor respects Microsoft Graph limits

### Admin portal help (videos)

- **UI**: [`admin-help-modal.component.ts`](src/app/components/admin-help-modal/admin-help-modal.component.ts) is opened from the Admin header **Help** control (left of **Main Site**). It mirrors the main app help modal layout (search, accordions, sticky close) but loads **admin-only** topics from [`admin-help-content.service.ts`](src/app/services/admin-help-content.service.ts).
- **Videos**: Each section can set optional **`videoEmbedUrl`** on [`AdminHelpSection`](src/app/types/admin-help-content.ts). Allowed embeds are validated/normalized in [`admin-help-video-url.ts`](src/app/lib/admin-help-video-url.ts) (YouTube watch links are converted to `youtube-nocookie.com/embed/...` when possible).
- **Guided tours (driver.js)**: [`admin-help-driver-tour.service.ts`](src/app/services/admin-help-driver-tour.service.ts) runs admin-only tours. **Email Subscribers — list & toolbar** (`admin_help_email_subscribers_overview`) uses **`prepareOverviewTourListState`** (search **`app-test`**, then **`startEmailSubscribersOverviewTour`**)—toolbar **`#tour-email-subscribers-toolbar`**, search **`#tour-email-subscribers-search`**, per-column anchors **`#tour-email-overview-*`** on the first row, **`#tour-email-subscribers-pagination`**; it does **not** open **Add Subscriber** or CSV. The **Email subscribers** help row (`admin_help_email_subscribers`), **Prayer Editor — create a prayer** (`admin_help_prayer_editor`), **Prayer Editor — edit, delete, add update** (`admin_help_prayer_editor_manage`), **Prayer Prompts & Prayer Types** (`admin_help_prompts_and_types`), and **Memorize Recommendations** (`admin_help_memorize_recommendations`) are **launch-only** controls in [`admin-help-modal.component.ts`](src/app/components/admin-help-modal/admin-help-modal.component.ts) (no accordion body). All call [`HelpDriverTourService.interruptGuidedTours`](src/app/services/help-driver-tour.service.ts) before starting so main-app tours do not overlap. **Prayer Prompts & Types**: [`AdminComponent`](src/app/pages/admin/admin.component.ts) navigates to Settings → **Content** (`#admin-settings-tab-content`); [`PromptManagerComponent`](src/app/components/prompt-manager/prompt-manager.component.ts) and [`PrayerTypesManagerComponent`](src/app/components/prayer-types-manager/prayer-types-manager.component.ts) run **`prepareTourInitialState`** (expand, cancel edit, load); **`startPrayerPromptsAndTypesTour`** highlights **`#prompt-manager-settings-trigger`**, **`#tour-prompt-manager-*`**, **`#prayer-types-manager-trigger`**, **`#tour-prayer-types-*`**—no add/CSV forms opened. **Memorize Recommendations**: same Content tab; [`MemorizationRecommendationsManagerComponent`](src/app/components/memorization-recommendations-manager/memorization-recommendations-manager.component.ts) **`prepareTourInitialState`** returns whether categories exist; **`startMemorizeRecommendationsTour(hasCategories)`** highlights **`#memorization-recommendations-manager-trigger`**, **`#tour-memorize-rec-*`**—no add/picker forms opened. **Email (full tour)**: [`AdminComponent`](src/app/pages/admin/admin.component.ts) navigates to Settings → Email and uses [`EmailSettingsComponent`](src/app/components/email-settings/email-settings.component.ts) / [`EmailSubscribersComponent`](src/app/components/email-subscribers/email-subscribers.component.ts) helpers to open the add form and Planning Center tab when steps advance. Copy stresses **Manual Entry** vs **Search Planning Center** at **`#tour-email-add-mode-tabs`**. **Prayer Editor (create)**: navigate to Settings → Tools (`#admin-settings-tab-tools`), [`PrayerSearchComponent`](src/app/components/prayer-search/prayer-search.component.ts) `#prayerSearch` with `preparePrayerEditorTourInitialState` / `openCreatePrayerFormForTour`; tour anchors `tour-prayer-editor-field-*` and create submit on the create form. **Prayer Editor (manage)**: `preparePrayerEditorManageTourInitialState` returns **`Promise<boolean>`**; `startPrayerEditorManageTour(hasPrayerRow, callbacks)` uses **`AdminPrayerEditorManageTourCallbacks`** to open edit, cancel edit, open add update, cancel add update—field walkthroughs then **no save**. Anchors include **`tour-prayer-editor-edit-field-*`** and **`tour-prayer-editor-add-update-field-*`**. The closing popover notes that **Save** / **Save Update** can prompt **email to subscribers** (broadcast), matching [`PrayerSearchComponent`](src/app/components/prayer-search/prayer-search.component.ts) send dialog after successful saves. For the **email** tour, the demo search does **not** auto-select a person; the tour then highlights **`#tour-email-pc-search-result-mark`** (first row), **`#tour-email-add-selected-pc-btn`**, and **`#tour-email-manual-entry-form`** after **`selectTourPlanningCenterMatchFromDemoResults`** and **`applyTourDemoPlanningCenterAdd`**, then **`#tour-email-manual-add-subscriber-btn`** and **`clearEmailSubscribersTourDemoForm`**. **`runPlanningCenterSearchTourDemo`** returns a **Promise**.

### Admin portal (Settings collapsibles)

- **`src/app/pages/admin/admin.component.ts`** embeds settings subtabs (Analytics, Email, Content, Tools, Security). Each block is typically a standalone component (`prayer-encouragement-settings`, `github-settings`, `app-branding`, `prompt-manager`, `prayer-types-manager`, `memorization-recommendations-manager`, `planning-center-list-mapper`, `email-settings` / subscribers / **admin-subscriber-email-broadcast** (queued broadcast to all subscribers) / templates / verification, `prayer-search`, `prayer-archive-timeline`, `backup-status`, `security-policy-settings`, `test-account-settings`, `admin-user-management`, etc.) with the same **card + collapsible header** pattern.
- **Loading**: Sections that fetch on first expand (and the **Site Analytics** activity chart) use [`admin-section-loading.component.ts`](src/app/components/admin-section-loading/admin-section-loading.component.ts) for a consistent spinner + status line while data is in flight. Site Analytics metric cards include page views, prayer status counts, email subscribers, and **Memorize** totals (**Total** plus **Learning** / **Practicing** / **Mastered**) from [`AnalyticsService.getStats()`](src/app/services/analytics.service.ts).
- **Interaction**: When a section is **collapsed**, the outer card adds **`cursor-pointer`** and a shell **`(click)`** that runs the toggle only while collapsed, so the whole surface opens the panel; the visible header remains a **`<button type="button">`** (focusable, **`cursor-pointer`**) whose handler calls **`$event.stopPropagation()`** after toggling so the shell does not receive a second click. When **expanded**, only the header button collapses; clicks on forms and controls do not use the shell toggle.
- **Prayer Editor** (`app-prayer-search`): Search hints for admins live in the main search **placeholder** (minimum length and fields); body copy above the toolbar was removed as duplicate.

### Rich text for prayers and updates

- **Storage**: Markdown is stored in the existing `prayers.description` and `prayer_updates.content` `TEXT` columns. No migration required. Older native app builds that have not shipped the renderer display raw Markdown (e.g. `**bold**`, `- item`), which degrades gracefully.
- **Editor**: [`RichTextEditorComponent`](../src/app/components/rich-text-editor/rich-text-editor.component.ts) wraps Tiptap v2 (`@tiptap/core`, `@tiptap/starter-kit`, `tiptap-markdown`). Implements `ControlValueAccessor` so `[(ngModel)]="formData.description"` works like a `textarea`. Emits / accepts Markdown through `editor.storage['markdown'].getMarkdown()`. **Underline** must use [`UnderlineWithMarkdown`](../src/app/lib/tiptap-underline-markdown.extension.ts): `StarterKit`’s default underline mark has no `tiptap-markdown` serializer when `html: false`, so underline was lost on save until this extension adds `++`/`++` serialization.
- **Renderer**: [`RichTextViewComponent`](../src/app/components/rich-text-view/rich-text-view.component.ts) converts Markdown to HTML via `marked` and sanitizes with DOMPurify (allow-list of inline / list / link tags only). An `afterSanitizeAttributes` hook forces `target="_blank"` + `rel="noopener noreferrer"` on links and drops `javascript:` hrefs.
- **Utilities**: [`src/utils/markdown.ts`](../src/utils/markdown.ts). Use **`markdownToPlainText`** anywhere content is consumed outside an HTML renderer (push notification body, email subject / plain-text body, character counts); use **`markdownToSafeHtml`** for printable HTML and email HTML bodies. **Underline** from the editor is stored as TipTap’s `++text++` markers; `markdownToSafeHtml` expands those to `<u>` before `marked` parses, and the DOMPurify hook sets inline `text-decoration: underline` on `<u>` so HTML emails match in-app styling. **Print** HTML from [`print.service.ts`](../src/app/services/print.service.ts) and [`printablePrayerList.ts`](../src/utils/printablePrayerList.ts) includes matching rules for `u` / `strong` / `em` / `s` inside `.prayer-description` and `.update-item`.
- **Emails**: [`email-notification.service.ts`](../src/app/services/email-notification.service.ts) builds **two** variable maps per template call — one for `subject` / `text_body` (plain text) and one for `html_body` (safe HTML). Queued subscriber templates also receive new `{{prayerDescriptionHtml}}` / `{{prayerDescriptionText}}` / `{{updateContentHtml}}` / `{{updateContentText}}` variables alongside the legacy `{{prayerDescription}}` / `{{updateContent}}` (still raw Markdown) so admins can update email templates to render rich text without breaking older installs.
- **Edge Functions**: [`send-user-hourly-prayer-reminders`](../supabase/functions/send-user-hourly-prayer-reminders/index.ts) has a local `stripMarkdownToText` helper (not shared with the Angular util because Edge Functions run a separate Deno module graph) used for spotlight descriptions and latest-update previews; it strips `++underline++` the same way as `markdown.ts` for plain-text snippets.
- **Admin inline edit in approval screens**: [`admin-prayer-approval`](../src/app/components/admin-prayer-approval/admin-prayer-approval.component.ts) and [`consolidated-prayer-approval`](../src/app/components/consolidated-prayer-approval/consolidated-prayer-approval.component.ts) expose **Edit** buttons that reveal a `RichTextEditorComponent` with Save / Cancel and call `AdminDataService.editPrayer` / `editUpdate`.

### Prayer Editor: Find subscriber (create prayer)

- **When**: Shown on the **Create New Prayer** form inside [`prayer-search.component.ts`](src/app/components/prayer-search/prayer-search.component.ts) (Admin → Tools → Prayer Editor).
- **Data source**: **`email_subscribers`** via Supabase client—**`name`** and **`email`** only, ordered by name, **`limit`** `userSearchResultLimit` (**20**).
- **Query UX**: **`userSearchMinChars`** (**2**) before search runs; **350 ms** debounce on `ngModelChange`; **escaped** `ilike` wildcards; **in-flight sequence** counter so slower responses do not overwrite newer queries.
- **Selection**: Dropdown rows call **`selectSubscriberUser`** on **`mousedown`** (avoids blur closing the list before click); first token of `name` → **first name**, remainder → **last name**, `email` copied; lookup state reset after pick.

### Prayer Editor search (admin Tools)

- **Location**: [`prayer-search.component.ts`](src/app/components/prayer-search/prayer-search.component.ts) under Admin → **Settings** → **Tools** (collapsible **Prayer Editor**).
- **What is searched**: Prayer fields (title, description, requester, email, `prayer_for`, denial reasons on the prayer, etc.) plus **`prayer_updates.content`**—implemented with broad `select` embeddings and, for update-only matches, a filtered `prayer_updates` join / `ilike` pattern merged into the result ID set.
- **Performance / UX**: **`mainSearchMinChars`** (default 2) gates requests; the main query path is **debounced** (`mainSearchDebounceMs`, **350 ms**) to limit round-trips. Subscriber lookup for **Create New Prayer** uses the separate debounced/capped flow documented above (**Find subscriber**).
- **Parity with Home**: [`PrayerService`](src/app/services/prayer.service.ts) **`applyFilters`** matches the same **search** string against each prayer’s **`updates`** array **`content`** so filtering on the main list behaves consistently with the editor’s mental model.

### Removed/Deprecated Features

- **Approval Codes System** (removed Jan 2026): One-time approval links via `approval_codes` table and `validate-approval-code` Edge Function
  - Replaced with direct `/admin` portal links requiring standard authentication
  - Account approval codes still use simple base64 encoding (no database)

---

## Testing

### Verify before merge or agent handoff

```bash
# Recommended before PR or agent handoff (lint + typecheck + unit tests + checklist output)
npm run pre-handoff

# Typecheck (ng build, development) + full unit test run
npm run verify

# Typecheck only
npm run typecheck

# ESLint errors only (warnings ignored via --quiet)
npm run lint
```

Agents: see [AGENTS.md](../AGENTS.md) and [`.cursor/skills/pre-handoff/SKILL.md`](../.cursor/skills/pre-handoff/SKILL.md). Cursor **`stop` hook** ([`.cursor/hooks.json`](../.cursor/hooks.json)) auto-continues the agent until `npm run pre-handoff` has passed for the current diff under `src/app`, `src/lib`, or `supabase/migrations`. After `pre-handoff` passes, run **`ReadLints`** on touched files and complete the **logic review** in [`.cursor/rules/verify-before-done.mdc`](../.cursor/rules/verify-before-done.mdc). `npm run verify` alone does not catch session/cache/RxJS logic bugs.

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

#### Help & Guidance modal (guided tours)

- **Library**: [driver.js](https://driverjs.com/) — popover z-index above app modals.
- **Creating Prayers** (`help_prayers`): footer **Start guided tour** emits `startCreatingPrayersHelpSectionUiTour`; home calls [`startCreatingPrayersHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (`openPrayerForm`, `closePrayerForm` only). Flow: community form → **Add Update** (when `#tour-prayer-add-update` exists; anonymous step per [`UpdatingPrayerTourOptions`](src/app/services/help-driver-tour.service.ts)). Filter UI: **Filtering Prayers** section. [`PrayerFormComponent`](src/app/components/prayer-form/prayer-form.component.ts) still uses `[defaultPersonalPrayer]="activeFilter === 'personal'"`. Standalone helpers: [`startNewPrayerRequestTour`](src/app/services/help-driver-tour.service.ts), [`startPersonalPrayerTour`](src/app/services/help-driver-tour.service.ts), [`startUpdatingPrayerTour`](src/app/services/help-driver-tour.service.ts), [`startManagingPrayerViewsTour`](src/app/services/help-driver-tour.service.ts).
- **Filtering Prayers** (`help_filtering`): footer **Start guided tour** emits `startFilteringHelpSectionUiTour` with the full [`HelpSection`](src/app/types/help-content.ts) (blocks must stay ordered like [`HelpContentService`](src/app/services/help-content.service.ts) defaults: Filter Options, Personal, Archived/Total, Search); home calls [`startFilteringHelpSectionTour`](src/app/services/help-driver-tour.service.ts) with [`FilteringHelpSectionTourHooks`](src/app/services/help-driver-tour.service.ts). Popover copy comes from each block’s `subtitle` / `text`; **Answered** and **Prompts** steps reuse the matching clause from the **Filter Options** paragraph when possible.
- **Using Prayer Prompts** (`help_prompts`): single **Start guided tour** in the expanded section footer emits `startPrayerPromptsUiTour` with the full [`HelpSection`](src/app/types/help-content.ts); home calls [`startPrayerPromptsTour`](src/app/services/help-driver-tour.service.ts). Prompts tile `tour-filter-prompts`, type row `tour-prompt-type-filters`, first card [`tourPromptAnchors`](src/app/components/prompt-card/prompt-card.component.ts) → `tour-prompt-card-sample`, empty state `tour-prompt-empty-state`, Pray buttons `tour-btn-prayer-mode-mobile` / `tour-btn-prayer-mode-desktop`.
- **Prayer Encouragement (Pray For)** (`help_prayer_encouragement`): footer **Start guided tour** emits `startPrayerEncouragementUiTour`; home switches to **Current**, then [`startPrayerEncouragementTour`](src/app/services/help-driver-tour.service.ts). First community card in the main list sets [`tourPrayForEncouragementAnchors`](src/app/components/prayer-card/prayer-card.component.ts) → **`#tour-prayer-pray-for`** on **Pray For** or **Prayed For**. Final step is **popover-only** (driver.js, no element) for extra context.
- **Searching Prayers** (`help_search`): footer **Start guided tour** emits `startSearchPrayersUiTour`; home calls [`startSearchPrayersTour`](src/app/services/help-driver-tour.service.ts). Search input **`#tour-prayer-search`** in [`PrayerFiltersComponent`](src/app/components/prayer-filters/prayer-filters.component.ts); second step is **popover-only** tips.
- **Personal Prayers** (`help_personal_prayers`): footer **Start guided tour** emits `startPersonalPrayersHelpSectionUiTour`; home calls [`startPersonalPrayersHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (16-step hands-on walkthrough: creates **Test Personal Prayer** / **Test Category**, tours edit, inline update form, `#tour-personal-category-filters`, drag date/time in meta header, then deletes the sample). [`PersonalPrayersHelpSectionTourHooks`](src/app/services/help-driver-tour.service.ts) wires `#prayerFormComp` and `getWalkthroughPersonalPrayer()`. This is the dedicated private-prayer tour; **Creating Prayers** no longer duplicates it.
- **Memorize Scripture** (`help_memorize`): footer **Start guided tour** emits `startMemorizeHelpSectionUiTour`; home calls [`startMemorizeHelpSectionTour`](src/app/services/help-driver-tour.service.ts) with `switchToMemorize`. Anchors: `tour-filter-memorize` on [`HomeComponent`](src/app/pages/home/home.component.ts), `tour-memorize-action-bar` / `tour-memorize-add-verses` / `tour-memorize-recommended` on [`MemorizationActionBarComponent`](src/app/components/memorization-action-bar/memorization-action-bar.component.ts), `tour-memorize-sample-card` via [`tourMemorizeAnchors`](src/app/components/memorized-verse-card/memorized-verse-card.component.ts) on the first passage card, `tour-memorize-empty-state` when the list is empty; final step is popover-only practice-mode tips.
- **Prayer Presentation Mode** (`help_presentation`): footer **Start guided tour** emits `startPresentationModeHelpSectionUiTour`; home calls [`startPresentationModePrayButtonPreludeTour`](src/app/services/help-driver-tour.service.ts) (highlight **Pray**), then on **Next** sets `sessionStorage` [`PRESENTATION_HELP_TOUR_SESSION_KEY`](src/app/services/help-driver-tour.service.ts) and navigates to **`/presentation`**. [`PresentationComponent`](src/app/pages/presentation/presentation.component.ts) consumes the key after [`loadContent()`](src/app/pages/presentation/presentation.component.ts) and calls [`startPresentationModeTour`](src/app/services/help-driver-tour.service.ts) with `openSettings` / `closeSettings` / `exitPresentation` (last step **Next** exits presentation). Toolbar ids on [`PresentationToolbarComponent`](src/app/components/presentation-toolbar/presentation-toolbar.component.ts); settings panel ids on [`PresentationSettingsModalComponent`](src/app/components/presentation-settings-modal/presentation-settings-modal.component.ts).
- **Printing** (`help_printing`): footer **Start guided tour** emits `startPrintingHelpSectionUiTour`; home calls [`startPrintingHelpSectionTour`](src/app/services/help-driver-tour.service.ts) with hooks to open/close [`UserSettingsComponent`](src/app/components/user-settings/user-settings.component.ts). Print row and primary buttons: `tour-settings-print-buttons`, `tour-settings-print-prayers`, `tour-settings-print-prompts`, `tour-settings-print-personal`; header gear: `tour-btn-settings-mobile` / `tour-btn-settings-desktop` on [`HomeComponent`](src/app/pages/home/home.component.ts).
- **Email Subscription** (`help_email_subscription`): footer **Start guided tour** emits `startEmailSubscriptionHelpSectionUiTour`; home calls [`startEmailSubscriptionHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (same open/close Settings hooks as printing). Email block: `tour-settings-email-subscription` on [`UserSettingsComponent`](src/app/components/user-settings/user-settings.component.ts).
- **Prayer reminders** (`help_prayer_reminders`): footer **Start guided tour** emits `startPrayerRemindersHelpSectionUiTour`; home calls [`startPrayerRemindersHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (same Settings hooks). Reminders card: `tour-settings-prayer-reminders`; hour + **Add reminder** row: `tour-settings-prayer-reminder-controls` on [`UserSettingsComponent`](src/app/components/user-settings/user-settings.component.ts).
- **Feedback** (`help_feedback`): footer **Start guided tour** emits `startFeedbackHelpSectionUiTour`; home calls [`startFeedbackHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (same Settings hooks). Settings always shows `tour-settings-feedback-section`—either [`GitHubFeedbackFormComponent`](src/app/components/github-feedback-form/github-feedback-form.component.ts) (`tour-settings-feedback-type`, `tour-settings-feedback-details`) or a short note when GitHub feedback is disabled.
- **App Settings** (`help_settings`): footer **Start guided tour** emits `startAppSettingsHelpSectionUiTour`; home calls [`startAppSettingsHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (same Settings hooks). Anchors on [`UserSettingsComponent`](src/app/components/user-settings/user-settings.component.ts): `tour-settings-theme`, `tour-settings-text-size`, `tour-settings-push-notifications`, `tour-settings-badges`, `tour-settings-prayer-encouragement`, `tour-settings-default-view`; reuses print, email, reminders, and feedback ids above.
- **DOM**: Help blocks keep `id="help-block-{sectionId}-{index}"`. Tour entry: **Creating Prayers** [`onStartCreatingPrayersHelpSectionTour`](src/app/components/help-modal/help-modal.component.ts); **Filtering Prayers** [`onStartFilteringHelpSectionTour`](src/app/components/help-modal/help-modal.component.ts); prompts [`onStartPromptsSectionTour`](src/app/components/help-modal/help-modal.component.ts); prayer encouragement [`onStartPrayerEncouragementSectionTour`](src/app/components/help-modal/help-modal.component.ts); search [`onStartSearchPrayersSectionTour`](src/app/components/help-modal/help-modal.component.ts); Personal Prayers [`onStartPersonalPrayersHelpSectionTour`](src/app/components/help-modal/help-modal.component.ts); presentation [`onStartPresentationModeHelpSectionTour`](src/app/components/help-modal/help-modal.component.ts); printing [`onStartPrintingHelpSectionTour`](src/app/components/help-modal/help-modal.component.ts); email subscription [`onStartEmailSubscriptionHelpSectionTour`](src/app/components/help-modal/help-modal.component.ts); prayer reminders [`onStartPrayerRemindersHelpSectionTour`](src/app/components/help-modal/help-modal.component.ts); feedback [`onStartFeedbackHelpSectionTour`](src/app/components/help-modal/help-modal.component.ts); app settings [`onStartAppSettingsHelpSectionTour`](src/app/components/help-modal/help-modal.component.ts).

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
- **Email template**: `admin_settings.user_hourly_prayer_reminder_template_key` selects `email_templates.template_key` — default **`user_hourly_prayer_reminder`** (`{{appLink}}` only) or **`user_hourly_prayer_reminder_with_spotlight`**, which adds `{{spotlightPrayerKind}}`, `{{spotlightPrayerTitle}}`, `{{spotlightPrayerFor}}`, `{{spotlightPrayerRequester}}` (community: **Anonymous** when `prayers.is_anonymous`, else `requester`; personal spotlight: **Me**), `{{spotlightPrayerDescription}}` (original request) from a random pick in a pool of **community** prayers (approved, **current**, app-wide, no date cutoff) plus **all** **personal** prayers for that user that are not **Answered**. The previous pick is avoided when the pool has more than one (`email_subscribers.hourly_reminder_last_spotlight_key`, updated after a **successful** hourly **push or email**). When the prayer has updates, **`{{updateContent}}`** is the latest **approved** community update (`prayer_updates`) or **latest** personal update (`personal_prayer_updates`); **`{{spotlightLatestUpdateHtml}}`** / **`{{spotlightUpdateTextSection}}`** provide optional formatted blocks. Admins set the template under **Admin → Settings → Email** (`email-settings.component.ts`).
- **Implementation**: [`UserHourReminderService`](src/app/services/user-hour-reminder.service.ts) (`kind: 'prayer'`) with session cache on `UserSessionData`; settings UI via [`HourReminderSettingsSectionComponent`](src/app/components/hour-reminder-settings-section/hour-reminder-settings-section.component.ts) in the Settings modal. Backend: table `user_prayer_hour_reminders`, Edge Function `send-user-hourly-prayer-reminders`, hourly **`pg_cron`** job in Postgres (see § *User hourly prayer reminders* below).
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

- PostHog dashboard (live events, session replay, web vitals, error tracking) — [`src/lib/posthog.ts`](../src/lib/posthog.ts), [`PosthogService`](../src/app/services/posthog.service.ts); set `posthogKey`, `posthogHost` (ingestion via first-party proxy `https://t.cp-church.org`), and `posthogUiHost` (`https://us.posthog.com`). Events send whenever the key is set (including `ng serve`); events are tagged with `app_environment` (`development` vs `production`). If Live events stay empty after a code change, clear site data / `posthog` keys in localStorage (a prior dev build may have opted out). Vercel Analytics / Speed Insights are not bundled. Memorization practice emits `memorization_practice_started` and `memorization_practice_completed` with `mode` (`type`, `firstLetters`, `word`, `reorder`, `recite`), `item_kind` (`verse` \| `bibleBooks`), and optional `bible_books_scope` — see [`memorizationPracticeAnalytics.ts`](../src/app/lib/memorization/memorizationPracticeAnalytics.ts).
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

The **Pray For** feature lets community members indicate they have prayed for a request. When enabled by an admin, approved community, personal, Planning Center **member**, and **prompt** cards show a “Pray For” button. Community cards show an anonymous shared count (e.g. “3 Praying”); personal, member, and prompt cards show **{n} Prayers** (member count is shared across list viewers; personal and prompt counts are private per user). The same user cannot click again on the same item until the **cooldown** has passed (church-wide hours for community; per-user personal/member/prompt cooldown otherwise).

- **Service:** `PrayerEncouragementService` (`src/app/services/prayer-encouragement.service.ts`) — reads `prayer_encouragement_enabled` and `prayer_encouragement_cooldown_hours` from `admin_settings`, caches them, and provides `recordPrayedFor()` and count lookups.
- **Admin UI:** `prayer-encouragement-settings` — toggle “Enable Prayer Encouragement” and cooldown (hours); cooldown control is shown only when the feature is enabled.
- **Prayer card:** `prayer-card` — shows Pray For button and count when enabled (community, personal, and member cards); optional explanation modal with “Do not show again” (localStorage, cleared on logout). Also requires **`UserSessionService.getShowPrayForButton$()`** / **`getShowPrayingCount$()`** so each user can hide those elements via Settings. On **community** cards, **{n} Praying** is visible only to the requester and admins, and Pray For follows `updates_allowed`; on **member** cards the shared **{n} Prayers** count and Pray For / Add Update are available to everyone who can see the Members list (not gated by `updates_allowed`); on **personal** cards, the owner always sees their **{n} Prayers** count (personal lists are not visible to admins or other users). Members tab visibility is unchanged—only users with an applied Planning Center list see member cards.
- **Prompt card:** `prompt-card` — Pray For / Prayed For / private **{n} Prayers** for the current user; presentation prompt slides use the same controls on `prayer-display-card`. Counts live in `prompt_prayed_for_counts` (per `prompt_id` + `user_email`); hydrate via RPC `get_prompt_prayed_for_counts`, increment via `increment_prompt_prayed_for_count` on `PromptService` (MFA/JWT auth same as personal Pray For). Counts follow `UserSession` email (cleared/rehydrated on logout / switch; load paths do not use a lingering Supabase session after logout).
- **Presentation card:** `prayer-display-card` — same Pray For / Prayed For / count controls on congregation, personal, member, and prompt slides in presentation mode, gated by the same user settings and admin feature flag (community still respects update-policy).
- **Presentation loop:** [`PresentationSettingsService`](src/app/services/presentation-settings.service.ts) persists `loop` (default `true`). When `loop` is false, [`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts) auto-play runs through all slides once, stops, and shows a completion overlay (same styling as the prayer timer end message). Closing with **X** calls `dismissPresentationComplete()`, which resets to the first slide **paused**; pressing **Play** dismisses the overlay (if open) and starts another single pass.
- **User preferences (Settings):** `user-settings` — section **Prayer encouragement on cards** (shown only when **`admin_settings.prayer_encouragement_enabled`** is true via `PrayerEncouragementService`); persists `show_pray_for_button`, `show_praying_count`, and **`personal_prayer_cooldown_hours`** (1–168 hours, default 4) on **`email_subscribers`** and calls **`updateUserSession`**. Personal, member, and prompt Pray For cooldown uses the user setting; community prayers use **`admin_settings.prayer_encouragement_cooldown_hours`**. Migrations: `20260327120000_email_subscribers_prayer_encouragement_ui.sql`, `20260726120000_personal_prayer_prayed_for_count.sql`.
- **Database:** `admin_settings`: `prayer_encouragement_enabled` (boolean), `prayer_encouragement_cooldown_hours` (integer, default 4). `prayers`: `prayed_for_count`. `personal_prayers`: `prayed_for_count` (RPC `increment_personal_prayed_for_count(uuid, p_user_email)`). `member_prayed_for_counts`: shared counts keyed by Planning Center `person_id` (RPC `increment_member_prayed_for_count(text)`). `prompt_prayed_for_counts`: per-user counts keyed by `(prompt_id, user_email)` (RPCs `get_prompt_prayed_for_counts(uuid[], text)` and `increment_prompt_prayed_for_count(uuid, text)`; MFA/JWT auth same as personal Pray For). `email_subscribers`: `show_pray_for_button`, `show_praying_count`, `personal_prayer_cooldown_hours`. Migrations: `20260224_prayer_encouragement.sql`, `20260225_prayer_encouragement_cooldown_hours.sql`, `20260327120000_email_subscribers_prayer_encouragement_ui.sql`, `20260726120000_personal_prayer_prayed_for_count.sql`, `20260727160000_member_prayed_for_counts.sql`, `20260727170000_prompt_prayed_for_counts.sql`.
- **Help:** In-app Help & Guidance includes “Prayer Encouragement (Pray For)”, **Using Prayer Prompts**, and **App Settings** topics for encouragement toggles and cooldown (`help-content.service.ts`).

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
- **App**: [`UserHourReminderService`](src/app/services/user-hour-reminder.service.ts) + cache on `UserSessionData`; [`HourReminderSettingsSectionComponent`](src/app/components/hour-reminder-settings-section/hour-reminder-settings-section.component.ts) is hour-only and saves `Intl.DateTimeFormat().resolvedOptions().timeZone`. Rows created before a device time-zone change keep their stored IANA until removed.

- **Documentation**: [CHANGELOG.md](CHANGELOG.md) (*Prayer reminders (hourly nudges)*), [docs/README.md](README.md) (Core Capabilities + Email/Push), in-app Help (`help_prayer_reminders` + App Settings). User-facing subsection: **Prayer reminders (hourly nudges) (Settings)** above.

### User hourly memorization reminders (self nudges)

Same delivery model as prayer hourly reminders, but for scripture memory practice:

- **Table**: `user_memorization_hour_reminders` (migration `20260714120000_user_memorization_hour_reminders.sql`: table, RLS, anon MFA policy, RPC `get_user_memorization_hour_reminders_due_now`, email templates, cron). Hour matching and DST behavior match prayer reminders.
- **Edge function**: `supabase/functions/send-user-hourly-memorization-reminders/` — **email** when `is_active`; **push** when `receive_push` + `device_tokens`; template from `admin_settings.user_hourly_memorization_reminder_template_key`. **`{{appLink}}`** = `APP_URL/?filter=memorize`. Spotlight template (`user_hourly_memorization_reminder_with_spotlight`) picks highest-need row from `memorized_items` (learning tier, least recently practiced, fewest completed sessions; rotation via `hourly_memorization_reminder_last_spotlight_key` after successful push or email). Verse spotlight text from `scripture_cache` when `kind = 'verse'`.
- **Scheduling**: pg_cron job **`invoke-user-hourly-memorization-reminders`** (`0 * * * *` UTC), same Vault secrets as prayer hourly job.
- **App**: Same [`UserHourReminderService`](src/app/services/user-hour-reminder.service.ts) (`kind: 'memorization'`) + `UserSessionData.memorizationHourReminders`; settings UI **Memorization reminders** via [`HourReminderSettingsSectionComponent`](src/app/components/hour-reminder-settings-section/hour-reminder-settings-section.component.ts) (after **Memorization practice**).
- **Admin**: Email settings → **Hourly user memorization reminder email** ([`HourlyReminderTemplateSectionComponent`](src/app/components/hourly-reminder-template-section/hourly-reminder-template-section.component.ts)).
- **Help**: `help_memorization_reminders` + App Settings bullet in `help-content.service.ts`.

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
