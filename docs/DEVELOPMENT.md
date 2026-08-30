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
│   │   ├── home.component.ts        # Main app page (shell; template in home.component.html)
│   │   ├── home.component.html
│   │   ├── home.component.css
│   │   ├── info/                    # Info/landing page (public, /info)
│   │   └── ...other pages
│   ├── services/
│   │   ├── supabase.service.ts      # Database client
│   │   ├── prayer.service.ts        # Prayer facade (community + personal)
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

### Login Page

The **login page** (`/login`) handles MFA email verification and first-time subscriber registration:

- **MFA flow**: Email → verification code → post-verify routing (existing subscriber, registration form, or pending approval).
- **Phase model**: [`login-phase.ts`](src/app/lib/login-phase.ts) defines `LoginPhase` (`email`, `mfa`, `registration`, `pending_approval`, `blocked`). The template switches on `phase.kind`; `?blocked=true` can show the blocked UI even on the email phase.
- **Coordinators** (page-scoped providers on [`login.component.ts`](src/app/pages/login/login.component.ts)):
  - [`login-mfa.coordinator.ts`](src/app/services/login-mfa.coordinator.ts) — send/verify/resend MFA, `sessionStorage` restore, code sanitization, post-verify phase transitions.
  - [`login-lifecycle.coordinator.ts`](src/app/services/login-lifecycle.coordinator.ts) — `ngOnInit`: branding, query params (`returnUrl`, `email`, `sessionExpired`, `blocked`), `requireSiteLogin$`, code length, pending MFA session restore, authenticated admin redirect.
  - [`login-auth.coordinator.ts`](src/app/services/login-auth.coordinator.ts) — Supabase/Planning Center after MFA (`resolvePostVerificationFlow`, `saveNewSubscriber`, `fetchVerificationCodeLength`).
- **Shell**: [`login-page-shell.ts`](src/app/lib/login-page-shell.ts) exposes `shell.handlers` (submit email, verify MFA, save registration, reset) and `shell.isValidEmail()`; the page implements [`login-page-bindings.ts`](src/app/services/login-page-bindings.ts) for coordinator host binding. [`login-coordinator-wiring.ts`](src/app/services/login-coordinator-wiring.ts) centralizes `bindLoginPageCoordinators` (used by the page constructor) and `createLoginCoordinators` (tests / manual setup).
- **Child components**: [`login-page-layout`](src/app/components/login-page-layout/login-page-layout.component.ts) (gradient + centered column), [`login-header`](src/app/components/login-header/login-header.component.ts) (branding + info link), [`login-phase-panels`](src/app/components/login-phase-panels/login-phase-panels.component.ts) (phase `@switch` delegating to [`login-email-form`](src/app/components/login-email-form/login-email-form.component.ts), [`login-mfa-panel`](src/app/components/login-mfa-panel/login-mfa-panel.component.ts), [`login-registration-form`](src/app/components/login-registration-form/login-registration-form.component.ts), and [`login-account-status`](src/app/components/login-account-status/login-account-status.component.ts)). MFA focus uses `LoginPhasePanelsComponent.focusMfaInput()` → `LoginMfaPanelComponent.focusCodeInput()` on the page.
- **Template**: [`login.component.html`](src/app/pages/login/login.component.html) / [`login.component.css`](src/app/pages/login/login.component.css) (same external-template pattern as Home and Presentation).

### Info Page

The **info page** (`/info`) is a public landing/overview. It is used to introduce the app and drive installs:

- **Hero + CTAs**: [`info-hero-section`](src/app/components/info-hero-section/info-hero-section.component.ts) — title, verse, Web / App Store / Play Store buttons with QR tiles; owns store URLs and `window.open` handlers.
- **Interactive preview**: [`info-feature-overview`](src/app/components/info-feature-overview/info-feature-overview.component.ts) composes [`info-mock-app-header`](src/app/components/info-mock-app-header/info-mock-app-header.component.ts), [`info-mock-search-bar`](src/app/components/info-mock-search-bar/info-mock-search-bar.component.ts), [`info-home-filter-preview-tabs`](src/app/components/info-home-filter-preview-tabs/info-home-filter-preview-tabs.component.ts), and [`info-home-filter-preview-panels`](src/app/components/info-home-filter-preview-panels/info-home-filter-preview-panels.component.ts) (`@switch` for Current/Answered/Archived/Total/Members/Prompts/Personal). Explanation modals in [`info-preview-modals`](src/app/components/info-preview-modals/info-preview-modals.component.ts) on shared [`modal-shell`](src/app/components/modal-shell/modal-shell.component.ts). Preview types and `isPublicPreviewFilter()` in [`info-home-filter-preview.types.ts`](src/app/lib/info-home-filter-preview.types.ts). Info preview TestBed specs auto-discover `info-*` component folders via [`info-preview-component-resources.spec-helper.ts`](src/app/components/info-preview-component-resources.spec-helper.ts).
- **Page shell**: [`info.component.ts`](src/app/pages/info/info.component.ts) — theme toggle, book/TV layout ([`info.component.css`](src/app/pages/info/info.component.css)), branding subscription only.

### Memorize (ESV + API.Bible)

The **Memorize** tab on [`home.component.ts`](src/app/pages/home/home.component.ts) is a personal scripture memorization module (ported from [Kelemek/Prayer_App](https://github.com/Kelemek/Prayer_App), adapted for single-tenant email scope). Passage text: **ESV** via Crossway API; **KJV, NASB, LSB, NIV, NLT, CSB** via API.Bible. **Listen** is ESV-only.

- **Data**: [`memorized_items`](../supabase/migrations/20260707120000_memorization_esv.sql) stores verse **references** per `user_email` (`text` is empty for `kind = 'verse'`; Bible-books lists keep book names in `text`). RLS: JWT ownership for `authenticated` sessions and **`anon`** access for MFA/localStorage logins (same pattern as `user_prayer_hour_reminders`). [`scripture_cache`](../supabase/migrations/20260707120000_memorization_esv.sql) stores passage text keyed by `(reference, translation)` — `reference` is USFM when parseable (`JHN.3.16`); cache reads fall back to legacy human-readable keys for older rows. `verse_count` per row and `prune_scripture_cache` (~**500**-verse LRU via `cached_at`, refreshed on cache hits; ESV TTL **7** days via `ESV_CACHE_TTL_DAYS`, API.Bible TTL **14** days via `API_BIBLE_CACHE_TTL_DAYS`; cap **`ESV_CACHE_MAX_VERSES`** default **500**). Practice and add-verse flows fetch text through the `scripture` Edge Function (cache hit or upstream API). Preferred translation persists in `localStorage` via [`MemorizationService`](src/app/services/memorization.service.ts). Admin-curated suggestions live in [`memorization_recommendations`](../supabase/migrations/20260710200000_memorization_recommendations.sql) (`reference` + `translation`; all supported Bible codes after [`20260717120000_memorization_recommendations_multi_translation.sql`](../supabase/migrations/20260717120000_memorization_recommendations_multi_translation.sql)) with required `category_id` → [`memorization_recommendation_categories`](../supabase/migrations/20260710210000_memorization_recommendation_categories.sql) (ordered categories; verses ordered within each category). Fresh installs can apply [`20260711120000_seed_ibcd_memorization_recommendations.sql`](../supabase/migrations/20260711120000_seed_ibcd_memorization_recommendations.sql) to pre-populate counseling topics and ESV references from Jim Newheiser / IBCD (*Approximately 100 Go-to Texts for Biblical Counseling*). Managed under **Admin → Settings → Content → Memorize Recommendations**.
- **Services**: [`MemorizationService`](src/app/services/memorization.service.ts) (CRUD, practice stats, in-progress sessions); [`MemorizationRecommendationsService`](src/app/services/memorization-recommendations.service.ts) (cached categories + curated verses, category CRUD/reorder, invalidate on admin writes; home **Recommended** modal force-reloads on open; overlapping loads are generation-guarded; verse placements and category reorder persist via atomic RPCs `apply_memorization_recommendation_placements` / `reorder_memorization_recommendation_categories`); [`ScriptureService`](src/app/services/scripture.service.ts) calls Edge Functions `scripture` and `scripture-audio`. **Recite mode** (when enabled in **Admin → Settings → Content → Memorization Recite Mode**): [`MemorizationReciteSettingsService`](src/app/services/memorization-recite-settings.service.ts) reads `admin_settings.memorization_recite_enabled`; [`MemorizationReciteService`](src/app/services/memorization-recite.service.ts) records audio and POSTs to Edge Function [`transcribe-audio`](../supabase/functions/transcribe-audio/index.ts) (OpenAI **whisper-1**); alignment in [`memorizationReciteAlignment.ts`](src/app/lib/memorization/memorizationReciteAlignment.ts) (re-export barrel; tokenize/match/display/align libs under [`memorization-recite-*.ts`](src/app/lib/memorization/)). Available only for **single-verse** references (`isSingleVerseScriptureReference`). Usage logged in `memorization_recite_usage`; admins see optional API-key spend (last 30 days) from [`get-openai-org-usage`](../supabase/functions/get-openai-org-usage/index.ts) (`OPENAI_ADMIN_KEY` + `OPENAI_API_KEY_ID`; separate from `OPENAI_API_KEY` for Whisper). The admin panel shows OpenAI-reported spend only (not the internal ledger estimate).
- **UI**: `memorization-action-bar` (**Add Verses**, **Bible Books**, **Recommended**), `memorized-verse-card` and `memorization-recommendation-card` (reference cards; desktop hover / mobile long-press opens `scripture-hover-preview` for passage text without replacing tap-to-practice / tap-to-add; template in [`scripture-hover-preview.component.html`](src/app/components/scripture-hover-preview/scripture-hover-preview.component.html); placement/cache helpers in [`scripture-hover-preview-layout.ts`](src/app/lib/scripture-hover-preview-layout.ts) and [`scripture-hover-preview-cache.ts`](src/app/lib/scripture-hover-preview-cache.ts); popover portals to `body` at `z-[220]` so it stacks above the Recommended modal; hover allows pointer into the popover to scroll; long-press cancels on move and stays open until backdrop/Escape (lift suppresses click only); only one preview open at a time; admin Memorize Recommendations rows preview on the reference text the same way), `memorization-recommendations-modal` (categories as collapsed-by-default accordions; expand to tap verses or see **Already added**; Capacitor scroll lock so only the modal scroller moves), `add-memorized-verse-modal`, `add-memorized-bible-books-modal`, `memorization-practice-session`, `bible-passage-picker-modal`, `scripture-attribution`, `memorization-recommendations-manager` (Content tab: categories + verses per category; drag verses between category lists to reassign). Mastery groups (`learning` / `practicing` / `mastered`) via [`memorization-mastery.ts`](src/app/lib/memorization/memorization-mastery.ts). **Admin → Settings → Analytics** shows site-wide mastery totals (same thresholds) via [`AnalyticsService.getStats()`](src/app/services/analytics.service.ts) selecting `memorized_items.practice_sessions`. Visual palette matches [Prayer_App](https://github.com/Kelemek/Prayer_App): soft blue primary actions (`bg-blue-100` / `text-blue-800`), solid `blue-600` grid selections, `#0047AB` active Memorize filter ring. Passage picker keeps gospel_presentation scroll behavior (single inner scroller, inline verses, `scrollIntoView` on expand/chapter). Practice auto-scroll keeps the current blank on screen: word mode above the choice footer, type/initials above the keyboard (initials also below the sticky cue header) via [`memorizationScrollIntoPractice.ts`](src/app/lib/memorization/memorizationScrollIntoPractice.ts). Type/initials hidden practice input uses `name="search"` inside an `autocomplete="off"` form (and hides WebKit contacts autofill buttons) to discourage iOS Safari’s **AutoFill Contact** accessory; it is a 1px near-invisible strip (not `opacity: 0` / `pointer-events: none`, which WebKit focuses without opening the keyboard). Home keeps a pre-mounted **keyboard bridge** input and, when resuming an in-progress type/initials round, focuses it on the verse-card tap *before* mounting the session ([`memorizationKeyboardPractice.ts`](src/app/lib/memorization/memorizationKeyboardPractice.ts)); **`openMemorizationPractice`** then **`detectChanges()`** so the session mounts in the same turn and takes focus. Starting either mode from the mode picker still focuses the practice input in that button’s gesture. **Practice strict mode** (User Settings → **Memorization practice**): `email_subscribers.memorization_strict_mode` (default false) synced through [`UserSessionService`](src/app/services/user-session.service.ts). Standard mode auto-reveals a blank after three consecutive wrong answers in Type, Initials, and Word modes; strict mode keeps the red error flash until the user answers correctly. In **Reorder** mode, [`memorization-reorder-panel`](src/app/components/memorization-reorder-panel/memorization-reorder-panel.component.ts) emits `wrongSwap` when a drag swap does not place any part in its correct slot; the practice session counts that as an error only in strict mode (standard reorder still allows exploratory swaps). After a round, strict mode hides **Next round** until that round had zero wrong attempts (only **Repeat this round** until then). The practice header shows **Errors: N** for the current round only when N &gt; 0; the count stays on screen through the round-complete step and resets when the next round begins.
- **Filter layout**: Main row is **Public** → **Personal** → **Prompts** → **Memorize** (labels only; catalog counts stay on the sub-filter chips). Tabs use a full-width flex row (`flex w-full` with `flex-1` on each button) so four tabs always span the content width equally. The selected tab is a **folder tab** whose fill continues into a connected panel outlined with a 2px accent matching the old tab button (**Public** / **Memorize** `#0047AB`, **Personal** `#2F5F54`, **Prompts** `#988F83`) (`homeFilterTabClass` / `HOME_*_SUB_FILTER_GROUP_CLASS` in [`home-sub-filter-chip-classes.ts`](src/app/lib/home-sub-filter-chip-classes.ts); theme per tab in [`home-filter-tabs`](src/app/components/home-filter-tabs/home-filter-tabs.component.html)). When **Public** is active, bordered chips **Current** → **Answered** → **Archived** → **Total** sit in that panel ([`home-public-status-filters`](src/app/components/home-public-status-filters/home-public-status-filters.component.ts)) and wrap like prompt type chips (`HOME_WRAP_FILTER_CHIP_FLEX_CLASS`: equal split up to 2 per row / 3 on `sm+`); **Archived** shows only community prayers with status `archived`, while **Total** includes every community prayer. If a Planning Center list is mapped, **Members** appears after **Total** in the same panel (`activeFilter === 'planning_center_list'`). **Personal**, **Prompts**, and **Memorize** show their own filter chips in the panel when selected. Empty **Prompts** has no panel, so the selected tab stays fully rounded. [`isPublicTabFilter`](src/app/lib/home-community-filter.ts) treats community statuses and Members as the Public folder tab; [`HomeFilterCoordinator.selectPublicTab()`](src/app/services/home-filter.coordinator.ts) defaults to **Current** when entering Public from another main tab and preserves Members if already selected. Deep links accept `?filter=current|answered|archived|total`. **Help & Guidance** and guided tours describe this layout in [`help-content.service.ts`](src/app/services/help-content.service.ts) and [`help-driver-tour.service.ts`](src/app/services/help-driver-tour.service.ts).
- **Personal category filters**: On the Personal tab, fixed filter chips **Current** → **Answered** → **Total** are always shown (`personalCategoryFilterMode` in [`home.component.ts`](src/app/pages/home/home.component.ts)); user categories follow and exclude the reserved **Answered** string from the drag-reorder list. Default is **Current** (non-Answered). Named categories use the same wrapping chip layout as prompt type filters (`HOME_WRAP_FILTER_CHIP_FLEX_CLASS` + drag-handle chip button). Pray handoff maps these modes to presentation status filters via [`buildPresentationHomeHandoff`](src/app/types/presentation.ts).
- **Deep links**: `?filter=`, `?prayerId=`, and `?promptId=` query params are orchestrated by [`home-deep-link.coordinator.ts`](src/app/services/home-deep-link.coordinator.ts) (host adapter in [`home-deep-link-host.adapter.ts`](src/app/services/home-deep-link-host.adapter.ts)): strip params from the URL, switch tabs/filters, refresh catalogs when needed, and scroll to the target card.
- **Help tours**: Per-section UI tours and the full guided tour queue are launched by [`home-help-tour.launcher.ts`](src/app/services/home-help-tour.launcher.ts) (orchestration + presentation prelude) via section starters in [`home-help-tour-section-starts.ts`](src/app/lib/home-help-tour-section-starts.ts) / [`home-help-tour-dispatch.ts`](src/app/lib/home-help-tour-dispatch.ts) and [`home-help-tour-host.adapter.ts`](src/app/services/home-help-tour-host.adapter.ts) (`HomeHelpTourHostBindings` from [`home-coordinator-wiring.ts`](src/app/services/home-coordinator-wiring.ts)); the help modal calls `helpTour.startSectionTour` / `startFullGuidedTour` on Home.
- **Catalog and filters**: Derived prayer/prompt lists for the active tab are built by [`home-catalog.store.ts`](src/app/services/home-catalog.store.ts) from pure filter helpers in [`home-catalog.ts`](src/app/lib/home-catalog.ts). Tab and search filter changes go through [`home-filter.coordinator.ts`](src/app/services/home-filter.coordinator.ts); the template reads `catalog.*` fields instead of calling getters on each change-detection pass. Prompt type-chip unread badges in [`home-prompt-type-filters`](src/app/components/home-prompt-type-filters/home-prompt-type-filters.component.ts) refresh when `BadgeService.getUpdateBadgesChanged$()` emits so they stay in sync with the Prompts tab count after a card is marked read.
- **Personal category chips**: Filter mode, named-category selection, drag-reorder, and long-press/context-menu rename are owned by [`home-personal-category.controller.ts`](src/app/services/home-personal-category.controller.ts) (per-page provider on Home). Named chip order is **derived** from [`personal-category-order.ts`](src/app/lib/personal-category-order.ts) via `PrayerService.getPersonalPrayersSnapshot()` (with short-lived optimistic order during drag). Category chips use the same static flex-wrap classes as prompt type filters in [`home-personal-category-filters`](src/app/components/home-personal-category-filters/home-personal-category-filters.component.ts); only chips in an in-flight reorder show a spinner. Shared badge pill: [`home-filter-badge-button`](src/app/components/home-filter-badge-button/home-filter-badge-button.component.ts). Fixed chips still map to presentation handoff via [`buildPresentationHomeHandoff`](src/app/types/presentation.ts).
- **Memorize panel**: The Memorize tab’s list, modals, recommended-verse add flow, and practice session lifecycle are owned by [`home-memorization-panel.controller.ts`](src/app/services/home-memorization-panel.controller.ts); the pre-mounted iOS keyboard bridge input remains on [`home.component.html`](src/app/pages/home/home.component.html).
- **Practice session shell**: [`memorization-practice-session.component.ts`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts) extends [`memorization-practice-session-facade.ts`](src/app/lib/memorization-practice-session-facade.ts) and implements [`MemorizationPracticeSessionPanelContext`](src/app/lib/memorization-practice-session-panel-context.ts). Child panels bind `[ctx]`; practicing uses `[view]="practicePanelView"`. Shared state and view getters live in [`memorization-practice-session-facade-base.ts`](src/app/lib/memorization-practice-session-facade-base.ts). Orchestration `run*` modules take `MemorizationPracticeSessionFacadeBase`. Unit tests: shared [`memorization-practice-session.spec-setup.ts`](src/app/components/memorization-practice-session/memorization-practice-session.spec-setup.ts), component `core` / `hydrate-strict` / `coverage` / `recite` specs, and [`memorization-practice-session-scroll-run.spec.ts`](src/app/lib/memorization-practice-session-scroll-run.spec.ts).
- **Presentation handoff**: Home → Pray and return-from-Presentation both route through [`presentation-home-handoff.coordinator.ts`](src/app/services/presentation-home-handoff.coordinator.ts) (`buildHandoffFromHome`, `navigateToPresentation`, `consumeHomeReturnContext`, `applyHomeReturnContext`); Presentation exit still uses `navigateExit`. Community status filters use `PresentationStatusFilters` (`current`, `answered`, `archived`); all-false means every status. Home **Archived** maps to archived-only; **Total** maps to all statuses. New-tab query `homeStatus` accepts `current`, `answered`, `archived`, or `all` ([`presentation.ts`](src/app/types/presentation.ts)).
- **Planning Center Members filter**: List/member sync, virtual member prayer cards, and targeted update reload are owned by [`home-planning-center.controller.ts`](src/app/services/home-planning-center.controller.ts); personal prayer reorder stays in [`home-personal-category.controller.ts`](src/app/services/home-personal-category.controller.ts). Members is a Public sub-filter, not a main tab.
- **Lifecycle bootstrap**: [`home-lifecycle.coordinator.ts`](src/app/services/home-lifecycle.coordinator.ts) owns Home `ngOnInit` wiring (observable assignment, session-driven reload, badge/catalog refresh, deep-link and help-tour resume).
- **Modals**: Settings, prayer form, help, logout confirmation, and personal/member edit dialogs are owned by [`home-modal.controller.ts`](src/app/services/home-modal.controller.ts).
- **Shell cleanup**: [`home.component.html`](src/app/pages/home/home.component.html) reads modal/category/memorize/PC state through [`home-page-shell.ts`](src/app/lib/home-page-shell.ts) (`shell.modals`, `shell.personalCategory`, `shell.handlers`) and page-scoped controllers for lifecycle-only paths. Coordinator `bindHost` wiring is centralized in [`home-coordinator-wiring.ts`](src/app/services/home-coordinator-wiring.ts); catalog rebuild uses [`home-catalog-refresh.ts`](src/app/lib/home-catalog-refresh.ts). Admin navigation, member card actions, and presentation handoff use [`home-admin-navigation.controller.ts`](src/app/services/home-admin-navigation.controller.ts), [`home-prayer-card-actions.controller.ts`](src/app/services/home-prayer-card-actions.controller.ts), and [`home-presentation-navigation.controller.ts`](src/app/services/home-presentation-navigation.controller.ts).
- **Template child components**: Header ([`home-header`](src/app/components/home-header/home-header.component.ts)) includes Help, **Search** (spyglass), Settings, Pray, and Request; search toggles a slide-down panel in [`home.component.html`](src/app/pages/home/home.component.html) (`#home-search-panel`) backed by [`HomeModalController.showSearchPanel`](src/app/services/home-modal.controller.ts) and [`prayer-filters`](src/app/components/prayer-filters/prayer-filters.component.ts) (`embedded` mode). Modals ([`home-modals-host`](src/app/components/home-modals-host/home-modals-host.component.ts)), main filter tabs ([`home-filter-tabs`](src/app/components/home-filter-tabs/home-filter-tabs.component.ts)), public status chips ([`home-public-status-filters`](src/app/components/home-public-status-filters/home-public-status-filters.component.ts)), prompt-type filters ([`home-prompt-type-filters`](src/app/components/home-prompt-type-filters/home-prompt-type-filters.component.ts)), personal-category filters ([`home-personal-category-filters`](src/app/components/home-personal-category-filters/home-personal-category-filters.component.ts)), and card/empty-state content ([`home-prayer-content`](src/app/components/home-prayer-content/home-prayer-content.component.ts)) are standalone components. Shared sub-filter primitives: [`home-sub-filter-chip`](src/app/components/home-sub-filter-chip/home-sub-filter-chip.component.ts), [`home-filter-badge-button`](src/app/components/home-filter-badge-button/home-filter-badge-button.component.ts). Shell children receive state and [`HomePageShell`](src/app/lib/home-page-shell.ts) handler objects via `@Input`; page coordinators stay on [`HomeComponent`](src/app/pages/home/home.component.ts) for lifecycle wiring only. The memorize keyboard bridge remains on [`home.component.html`](src/app/pages/home/home.component.html).
- **Ops**: Set Supabase secrets `ESV_API_TOKEN`, `API_BIBLE_KEY`, and `API_BIBLE_BIBLE_ID_*`; deploy `scripture` + `scripture-audio` — see [docs/SETUP.md](SETUP.md#esv-api-and-apibible-memorize-tab).
- **Copyright**: Per-translation notices via [`scripture-attributions.ts`](src/app/lib/memorization/scripture-attributions.ts) and [`scripture-attribution`](src/app/components/scripture-attribution/scripture-attribution.component.ts) (wording from [API.Bible Terms Appendix B](https://api.bible/terms-and-conditions) and publisher permission-to-quote pages). Full notices on [`/privacy`](src/app/pages/privacy/privacy.component.ts) (**Scripture Copyright**).

### Admin portal: nested settings cards and change detection

The admin route (`src/app/pages/admin/admin.component.ts`) is a single lazy-loaded **`AdminComponent`** (`/admin` in [`app.routes.ts`](src/app/app.routes.ts)) with **`ChangeDetectionStrategy.OnPush`**. The page shell is thin: external template/CSS, [`admin-nav-tiles`](src/app/components/admin-nav-tiles/admin-nav-tiles.component.ts) for the four top tiles (counts from [`admin-nav-tiles.ts`](src/app/lib/admin-nav-tiles.ts)), and tab bodies in [`admin-approvals-panel`](src/app/components/admin-approvals-panel/admin-approvals-panel.component.ts), [`admin-deletions-panel`](src/app/components/admin-deletions-panel/admin-deletions-panel.component.ts), [`admin-accounts-panel`](src/app/components/admin-accounts-panel/admin-accounts-panel.component.ts), and [`admin-settings-panel`](src/app/components/admin-settings-panel/admin-settings-panel.component.ts). Collapsible **Settings** subtabs embed many standalone components as siblings (Analytics, Email, Content, Tools, Security). Site Analytics metric cards are driven by [`admin-analytics-tiles.ts`](src/app/lib/admin-analytics-tiles.ts) via [`admin-site-analytics-panel`](src/app/components/admin-site-analytics-panel/admin-site-analytics-panel.component.ts). Approvals for prayers and updates share one **Approvals** tab (`activeTab === 'prayers'`) via [`consolidated-prayer-approval`](src/app/components/consolidated-prayer-approval/consolidated-prayer-approval.component.ts). Which approval tab is active after load or after a review action comes from [`admin-pending-queues.ts`](src/app/lib/admin-pending-queues.ts) (`firstPendingTab` / `nextPendingTab`); Settings is a sink. Guided-tour ViewChild refs (`emailSettings`, `prayerSearch`, prompt/types/memorize managers) live on **`AdminSettingsPanelComponent`**; [`AdminComponent`](src/app/pages/admin/admin.component.ts) reads them through `#settingsPanelRef` when launching tours.

**Admin data (approvals queue)** — [`AdminDataService`](src/app/services/admin-data.service.ts) exposes `data$` and review actions to the shell. Reads, Postgres mutations, and subscriber/requester notifications are split into [`admin-data-read.service.ts`](src/app/services/admin-data-read.service.ts), [`admin-data-command.service.ts`](src/app/services/admin-data-command.service.ts), and [`admin-data-notify.service.ts`](src/app/services/admin-data-notify.service.ts). Row mapping and shared types: [`admin-data-map.ts`](src/app/lib/admin-data-map.ts), [`types/admin-data.ts`](src/app/types/admin-data.ts).

**Settings Tools subtab** — [`admin-settings-tools-panel.component.ts`](src/app/components/admin-settings-tools-panel/admin-settings-tools-panel.component.ts) hosts Prayer Editor, booklet print, archive timeline, and backup status. [`AdminSettingsPanelComponent`](src/app/components/admin-settings-panel/admin-settings-panel.component.ts) delegates `prayerSearchRef` through that panel for guided tours.

**Prayer Editor subscriber lookup** — Shared debounced `email_subscribers` search for create-prayer and add-update flows lives in [`admin-subscriber-pick.component.ts`](src/app/components/admin-subscriber-pick/admin-subscriber-pick.component.ts) ([`admin-subscriber-pick.ts`](src/app/lib/admin-subscriber-pick.ts)).

**Pattern that caused missed UI updates**: A **child** component uses **OnPush** (or sits under the OnPush admin tree), relies on **native `(submit)`** or **`type="submit"`** without also wiring **`type="button"` `(click)="..."`**, and updates state in **`async`** handlers without **`ChangeDetectorRef.detectChanges()`** / **`ApplicationRef.tick()`** before the first **`await`**. Symptoms: save runs but success/error/spinners do not show until something else triggers change detection.

**CD order for saves / spinners (Content tab + Email manual add)**: After mutating state, call **`markForCheck()`** first (marks this OnPush branch dirty for the next cycle), then **`detectChanges()`** on this component (runs CD immediately so the spinner row appears before the first **`await`**), then **`ApplicationRef.tick()`** so the **OnPush admin parent** picks up the update. Use the same **`markForCheck` → `detectChanges` → `tick`** order in **`finally`** after **`submitting = false`**. Synchronous flows that only flip flags (e.g. **`handleEdit` / `cancelEdit`** on prompts) still call **`markForCheck()`** after updating state.

**Aligned in code (Content tab)**:

- [`prompt-manager.component.ts`](src/app/components/prompt-manager/prompt-manager.component.ts) — thin ViewChild host over [`admin-prompt-manager-facade.ts`](src/app/lib/admin-prompt-manager-facade.ts) (lazy bootstrap, search debounce, CSV/add/edit cards). Host contracts: [`admin-prompt-manager-facade-host.ts`](src/app/lib/admin-prompt-manager-facade-host.ts). Search/delete wiring: [`admin-prompt-manager-facade-run.ts`](src/app/lib/admin-prompt-manager-facade-run.ts). Tour shell orchestration: [`admin-prompt-manager-facade-tour.ts`](src/app/lib/admin-prompt-manager-facade-tour.ts). Section: [`admin-prompt-manager-section`](src/app/components/admin-prompt-manager-section/admin-prompt-manager-section.component.ts). Panel: [`admin-prompt-manager-panel`](src/app/components/admin-prompt-manager-panel/admin-prompt-manager-panel.component.ts) (`panelRef` for tour create/CSV reset). Libs: [`admin-prompt-manager-fetch.ts`](src/app/lib/admin-prompt-manager-fetch.ts), search runner [`admin-prompt-manager-search-run.ts`](src/app/lib/admin-prompt-manager-search-run.ts), [`admin-prompt-manager-commands.ts`](src/app/lib/admin-prompt-manager-commands.ts), delete runner [`admin-prompt-manager-delete-runner.ts`](src/app/lib/admin-prompt-manager-delete-runner.ts), confirmations, tour prep, search debounce. Dialogs: [`admin-prompt-manager-dialogs`](src/app/components/admin-prompt-manager-dialogs/admin-prompt-manager-dialogs.component.ts). Children: CSV panel, create form, edit inline, card row. Child saves use `markForCheck` → `detectChanges` → `tick` with toasts.
- [`prayer-types-manager.component.ts`](src/app/components/prayer-types-manager/prayer-types-manager.component.ts) — thin ViewChild host over [`admin-prayer-types-facade.ts`](src/app/lib/admin-prayer-types-facade.ts) (fetch, drag reorder, toggle confirmations, delete). Host contracts: [`admin-prayer-types-facade-host.ts`](src/app/lib/admin-prayer-types-facade-host.ts). Fetch/confirmation/reorder wiring: [`admin-prayer-types-facade-run.ts`](src/app/lib/admin-prayer-types-facade-run.ts). Tour shell orchestration: [`admin-prayer-types-facade-tour.ts`](src/app/lib/admin-prayer-types-facade-tour.ts). Tests: behavior in [`admin-prayer-types-facade.spec.ts`](src/app/lib/admin-prayer-types-facade.spec.ts) and sibling run/tour libs; shell-only [`prayer-types-manager.component.spec.ts`](src/app/components/prayer-types-manager/prayer-types-manager.component.spec.ts). Section: [`admin-prayer-types-section`](src/app/components/admin-prayer-types-section/admin-prayer-types-section.component.ts). Panel: [`admin-prayer-types-panel`](src/app/components/admin-prayer-types-panel/admin-prayer-types-panel.component.ts) (`panelRef` for type form reset). Libs: [`admin-prayer-types-fetch.ts`](src/app/lib/admin-prayer-types-fetch.ts), fetch runner [`admin-prayer-types-fetch-run.ts`](src/app/lib/admin-prayer-types-fetch-run.ts), [`admin-prayer-types-commands.ts`](src/app/lib/admin-prayer-types-commands.ts), confirmation/mutation runner [`admin-prayer-types-confirmation-runner.ts`](src/app/lib/admin-prayer-types-confirmation-runner.ts), shared error copy [`admin-error-message.ts`](src/app/lib/admin-error-message.ts), confirmations, tour prep. Dialogs: [`admin-prayer-types-dialogs`](src/app/components/admin-prayer-types-dialogs/admin-prayer-types-dialogs.component.ts). Add/edit form: [`admin-prayer-type-form`](src/app/components/admin-prayer-type-form/admin-prayer-type-form.component.ts); rows: [`admin-prayer-type-row`](src/app/components/admin-prayer-type-row/admin-prayer-type-row.component.ts).
- [`memorization-recommendations-manager.component.ts`](src/app/components/memorization-recommendations-manager/memorization-recommendations-manager.component.ts) — Content tab curated Memorize verses; picker add + drag reorder; `markForCheck` → `detectChanges` → `tick` while validating/saving.
- [`verse-memorization-prayer-manager.component.ts`](src/app/components/verse-memorization-prayer-manager/verse-memorization-prayer-manager.component.ts) — Content tab **Verse Memorization of the Week**: Bible passage picker → optional message → **Post**. [`VerseMemorizationPrayerService`](src/app/services/verse-memorization-prayer.service.ts) inserts `content_kind = verse_memorization` prayers as **already approved** (never Pending Approvals), stores passage text in `prayers.description` with the reference appended via [`appendVerseReferenceToDescription`](src/app/lib/verse-memorization-description.ts) so legacy clients that only render `description` still show the reference, then optionally broadcasts via [`broadcastVerseMemorizationPrayerNotifications`](src/app/services/verse-memorization-prayer.service.ts) after [`send-notification-dialog`](src/app/components/send-notification-dialog/send-notification-dialog.component.ts) confirmation. That dialog locks **Send Email & Push** (shows **Sending…**, ignores extra clicks and **Don't Send**) until the parent finishes the broadcast, so a slow queue cannot fire twice. The verse manager also ignores a second confirm while a broadcast is in flight. Then it refreshes the community catalog. Deep links: `buildMemorizeVerseAppLink` in [`email-notification-links.ts`](src/app/lib/email-notification-links.ts) → `/?filter=memorize&verseRef=…` (optional `verseTranslation`); [`home-deep-link.coordinator.ts`](src/app/services/home-deep-link.coordinator.ts) + [`home-memorization-panel.controller.ts`](src/app/services/home-memorization-panel.controller.ts) [`beginVerseMemorizationFromCard`](src/app/services/home-memorization-panel.controller.ts) (same as card **Memorize**). **Memorize** on Current-tab cards and email/push deep links both call `beginVerseMemorizationFromCard`: if the reference is already on the user's list, practice opens immediately (in-progress sessions resume first); otherwise [`verse-memorization-translation-modal`](src/app/components/verse-memorization-translation-modal/verse-memorization-translation-modal.component.ts) (`promptVerseMemorizationTranslation`) asks for a translation before add + practice. Current-tab cards use **Memorize** ([`prayer-card-view-state.ts`](src/app/lib/prayer-card-view-state.ts)). **Auto-archive**: daily [`send-prayer-reminders`](supabase/functions/send-prayer-reminders/index.ts) archives `verse_memorization` rows on Current when `approved_at` is older than **30 days** (independent of `enable_auto_archive` / `days_before_archive`).

**Similar surface (watch if reports appear)**:

- [`email-subscribers.component.ts`](src/app/components/email-subscribers/email-subscribers.component.ts) — OnPush shell extending [`EmailSubscribersFacade`](src/app/lib/admin-email-subscribers-facade.ts) (search, pagination, toggles, tours; ViewChild refs for panel/dialogs/section). Host contracts: [`admin-email-subscribers-facade-host.ts`](src/app/lib/admin-email-subscribers-facade-host.ts). Search/confirmation wiring: [`admin-email-subscribers-facade-run.ts`](src/app/lib/admin-email-subscribers-facade-run.ts). Tour shell orchestration: [`admin-email-subscribers-facade-tour.ts`](src/app/lib/admin-email-subscribers-facade-tour.ts). Tests: behavior in [`admin-email-subscribers-facade.spec.ts`](src/app/lib/admin-email-subscribers-facade.spec.ts) and sibling run/tour/welcome-email libs; shell-only [`email-subscribers.component.spec.ts`](src/app/components/email-subscribers/email-subscribers.component.spec.ts). List search runner [`admin-email-subscribers-search-run.ts`](src/app/lib/admin-email-subscribers-search-run.ts); confirmation open [`admin-email-subscribers-confirmation-open.ts`](src/app/lib/admin-email-subscribers-confirmation-open.ts) and apply runner [`admin-email-subscribers-confirmation-runner.ts`](src/app/lib/admin-email-subscribers-confirmation-runner.ts) with prep/apply in [`admin-email-subscribers-confirmation-prep.ts`](src/app/lib/admin-email-subscribers-confirmation-prep.ts) and [`admin-email-subscribers-confirmation-apply.ts`](src/app/lib/admin-email-subscribers-confirmation-apply.ts); welcome email [`admin-email-subscribers-welcome-email.ts`](src/app/lib/admin-email-subscribers-welcome-email.ts); orientation [`admin-email-subscribers-orientation.ts`](src/app/lib/admin-email-subscribers-orientation.ts); tour UI in [`admin-email-subscribers-tour-actions.ts`](src/app/lib/admin-email-subscribers-tour-actions.ts). Collapsible lazy-first-load helper: [`admin-section-lazy-load.ts`](src/app/lib/admin-section-lazy-load.ts) (also used by Prayer Editor facade). Section: [`admin-email-subscribers-section`](src/app/components/admin-email-subscribers-section/admin-email-subscribers-section.component.ts). Panel: [`admin-email-subscribers-panel`](src/app/components/admin-email-subscribers-panel/admin-email-subscribers-panel.component.ts) (toolbar, banners, CSV/add forms, list search, sortable list, pagination, edit modal; `panelRef` for tour hooks). Dialogs: [`admin-email-subscribers-dialogs`](src/app/components/admin-email-subscribers-dialogs/admin-email-subscribers-dialogs.component.ts). Libs under [`admin-email-subscribers-*.ts`](src/app/lib/admin-email-subscribers.ts) (fetch, sort, pagination, debounce, confirmations, commands, patches, row dispatch). **Manual Entry** → **Add Subscriber**: [`admin-email-subscribers-add-form`](src/app/components/admin-email-subscribers-add-form/admin-email-subscribers-add-form.component.ts). CSV: [`admin-email-subscribers-csv-panel`](src/app/components/admin-email-subscribers-csv-panel/admin-email-subscribers-csv-panel.component.ts). Rows: [`admin-email-subscriber-row`](src/app/components/admin-email-subscriber-row/admin-email-subscriber-row.component.ts).
- [`backup-status.component.ts`](src/app/components/backup-status/backup-status.component.ts) — thin shell (lazy fetch on first expand, manual backup, restore). Section: [`admin-backup-status-section`](src/app/components/admin-backup-status-section/admin-backup-status-section.component.ts). Panel: [`admin-backup-status-panel`](src/app/components/admin-backup-status-panel/admin-backup-status-panel.component.ts) (toolbar, info banner, expandable list). Dialogs: [`admin-backup-status-dialogs`](src/app/components/admin-backup-status-dialogs/admin-backup-status-dialogs.component.ts). Libs under [`admin-backup-status*.ts`](src/app/lib/admin-backup-status.ts) (fetch, format, list helpers, manual backup, restore).
- [`admin-user-management.component.ts`](src/app/components/admin-user-management/admin-user-management.component.ts) — thin OnPush shell (lazy fetch on first expand, add admin + invitation email, toggle email/push prefs, remove admin access). Section: [`admin-user-management-section`](src/app/components/admin-user-management-section/admin-user-management-section.component.ts). Panel: [`admin-user-management-panel`](src/app/components/admin-user-management-panel/admin-user-management-panel.component.ts) (add form, banners, admin list). Dialogs: [`admin-user-management-dialogs`](src/app/components/admin-user-management-dialogs/admin-user-management-dialogs.component.ts) (typed confirmation actions). Libs: [`admin-user-management.ts`](src/app/lib/admin-user-management.ts), fetch, commands, invitation, confirmations, format. Uses [`admin-section-lazy-load.ts`](src/app/lib/admin-section-lazy-load.ts).
- [`email-settings.component.ts`](src/app/components/email-settings/email-settings.component.ts) — Email tab composition shell (subscribers, broadcast, hourly template pickers, templates manager; tour hooks on `emailSubscribers`). Prayer Update Reminders: [`admin-email-prayer-reminders-section`](src/app/components/admin-email-prayer-reminders-section/admin-email-prayer-reminders-section.component.ts) with libs [`admin-email-reminders*.ts`](src/app/lib/admin-email-reminders.ts).
- [`email-templates-manager.component.ts`](src/app/components/email-templates-manager/email-templates-manager.component.ts) — thin shell (lazy load on first expand, select/save/revert). Section: [`admin-email-templates-section`](src/app/components/admin-email-templates-section/admin-email-templates-section.component.ts). Panel: [`admin-email-templates-panel`](src/app/components/admin-email-templates-panel/admin-email-templates-panel.component.ts) (loading/error states, list + inline editor). List: [`admin-email-templates-list`](src/app/components/admin-email-templates-list/admin-email-templates-list.component.ts); editor: [`admin-email-templates-editor`](src/app/components/admin-email-templates-editor/admin-email-templates-editor.component.ts). Libs: [`admin-email-templates.ts`](src/app/lib/admin-email-templates.ts), fetch, save.

**Lower concern**:

- **Prayer Editor** ([`prayer-search.component.ts`](src/app/components/prayer-search/prayer-search.component.ts)): OnPush shell extending [`PrayerEditorFacade`](src/app/lib/admin-prayer-editor-facade.ts) (search, pagination, bulk, save/delete; ViewChild refs for panel/dialogs/section). **Admin Help driver.js** tour entry points (`preparePrayerEditorTourInitialState`, `openCreatePrayerFormForTour`, manage-tour open/cancel/reset) live on the shell and delegate to [`admin-prayer-editor-facade-tour.ts`](src/app/lib/admin-prayer-editor-facade-tour.ts). Toolbar bindings in [`prayer-search.component.html`](src/app/components/prayer-search/prayer-search.component.html) set filter fields and call facade handlers directly (no `onToolbar*` aliases). Host contracts: [`admin-prayer-editor-facade-host.ts`](src/app/lib/admin-prayer-editor-facade-host.ts). Search/confirmation/save/clear wiring: [`admin-prayer-editor-facade-run.ts`](src/app/lib/admin-prayer-editor-facade-run.ts). Save outcome apply: [`admin-prayer-editor-save-facade-apply.ts`](src/app/lib/admin-prayer-editor-save-facade-apply.ts). Tests: behavior in [`admin-prayer-editor-facade.spec.ts`](src/app/lib/admin-prayer-editor-facade.spec.ts) and sibling run/tour/save libs; shell-only [`prayer-search.component.spec.ts`](src/app/components/prayer-search/prayer-search.component.spec.ts). Collapsible shell: [`admin-prayer-editor-section`](src/app/components/admin-prayer-editor-section/admin-prayer-editor-section.component.ts). List panel: [`admin-prayer-editor-panel`](src/app/components/admin-prayer-editor-panel/admin-prayer-editor-panel.component.ts) (create bar, create form, toolbar, bulk, results, pagination, error banner, delete warning; owns create-form and card `ViewChildren` for flush/reset). Dialogs: [`admin-prayer-editor-dialogs`](src/app/components/admin-prayer-editor-dialogs/admin-prayer-editor-dialogs.component.ts) (prayer/update notifications, bulk delete, bulk status, **update delete** confirmations). REST list: [`admin-prayer-editor-search.ts`](src/app/lib/admin-prayer-editor-search.ts); timed fetch: [`admin-prayer-editor-search-run.ts`](src/app/lib/admin-prayer-editor-search-run.ts) with orchestration [`admin-prayer-editor-search-orchestration.ts`](src/app/lib/admin-prayer-editor-search-orchestration.ts). Supabase commands: [`admin-prayer-editor-commands.ts`](src/app/lib/admin-prayer-editor-commands.ts); mutation orchestration: [`admin-prayer-editor-mutations.ts`](src/app/lib/admin-prayer-editor-mutations.ts); save/update apply: [`admin-prayer-editor-save-apply.ts`](src/app/lib/admin-prayer-editor-save-apply.ts) with save runner [`admin-prayer-editor-save-runner.ts`](src/app/lib/admin-prayer-editor-save-runner.ts); mutation feedback [`admin-prayer-editor-mutation-feedback.ts`](src/app/lib/admin-prayer-editor-mutation-feedback.ts); in-memory list patches: [`admin-prayer-editor-list-patches.ts`](src/app/lib/admin-prayer-editor-list-patches.ts). Confirmation dispatch: [`admin-prayer-editor-confirmation-dispatch.ts`](src/app/lib/admin-prayer-editor-confirmation-dispatch.ts); bulk/delete apply: [`admin-prayer-editor-confirmation-apply.ts`](src/app/lib/admin-prayer-editor-confirmation-apply.ts); confirmation runner: [`admin-prayer-editor-confirmation-runner.ts`](src/app/lib/admin-prayer-editor-confirmation-runner.ts); action types in [`admin-prayer-editor-confirmations.ts`](src/app/lib/admin-prayer-editor-confirmations.ts). Tour prep: [`admin-prayer-editor-tour.ts`](src/app/lib/admin-prayer-editor-tour.ts), shell actions [`admin-prayer-editor-tour-actions.ts`](src/app/lib/admin-prayer-editor-tour-actions.ts). Pagination view: [`admin-prayer-editor-pagination-state.ts`](src/app/lib/admin-prayer-editor-pagination-state.ts). UI state: [`admin-prayer-editor-ui-state.ts`](src/app/lib/admin-prayer-editor-ui-state.ts). Card actions: [`admin-prayer-editor-card-dispatch.ts`](src/app/lib/admin-prayer-editor-card-dispatch.ts). Card panel context: [`admin-prayer-editor-card-panel-context.ts`](src/app/lib/admin-prayer-editor-card-panel-context.ts) (`[ctx]` on header/expanded/edit/view/updates/add-update). Search debounce: [`admin-prayer-editor-search-debounce.ts`](src/app/lib/admin-prayer-editor-search-debounce.ts). Pagination scroll: [`admin-prayer-editor-scroll.ts`](src/app/lib/admin-prayer-editor-scroll.ts). Shared errors: [`admin-error-message.ts`](src/app/lib/admin-error-message.ts). Section lazy load: [`admin-section-lazy-load.ts`](src/app/lib/admin-section-lazy-load.ts) (`applyAdminSectionToggle`).
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

Core prayer data orchestration in [`prayer.service.ts`](src/app/services/prayer.service.ts) (facade: session, realtime, resume). Community catalog and member mutations live in [`prayer-community.service.ts`](src/app/services/prayer-community.service.ts) (Supabase adapters in [`prayer-community-db.ts`](src/app/lib/prayer-community-db.ts), catalog load wire in [`prayer-community-load-wire.ts`](src/app/lib/prayer-community-load-wire.ts)); Personal catalog and category orchestration live in [`prayer-personal.service.ts`](src/app/services/prayer-personal.service.ts) (Supabase adapters in [`prayer-personal-db.ts`](src/app/lib/prayer-personal-db.ts), catalog load wire in [`prayer-personal-load-wire.ts`](src/app/lib/prayer-personal-load-wire.ts), category query/orchestration deps in [`prayer-personal-category-wire.ts`](src/app/lib/prayer-personal-category-wire.ts)).. Inner services are composed inside `PrayerService` (not Angular injectables). Callers inject `PrayerService`. Personal category range/count queries are owned by `PrayerPersonalService`; the personal facade hook is session email only. **Phase 1** pure helpers live under [`src/app/lib/prayer-*`](src/app/lib/): [`prayer-types.ts`](src/app/lib/prayer-types.ts) (`PrayerRequest`, `PrayerUpdate`, `PrayerFilters`, `PrayerStatus` — also re-exported from the service), [`prayer-community-load.ts`](src/app/lib/prayer-community-load.ts) (approved community row → `PrayerRequest` + activity sort; month archive query via `formatPrayersByMonthFromDb`; `COMMUNITY_PRAYERS_WITH_UPDATES_SELECT` + `prayersByMonthIsoRange` for month filters), [`prayer-filter.ts`](src/app/lib/prayer-filter.ts) (`applyPrayerCatalogFilters`, `filterPrayerRequestsByStatusAndSearch` — used by `applyFilters` / `getFilteredPrayers`), [`prayer-personal-display.ts`](src/app/lib/prayer-personal-display.ts) (personal DB row mapping, category sanitize/range constants, cache email normalization, local category swap/reorder, display-order-only realtime detection), [`prayer-service-constants.ts`](src/app/lib/prayer-service-constants.ts) (resume debounce, load-error toast cooldown, inactivity threshold). **Phase 2**: [`prayer-service-realtime.ts`](src/app/lib/prayer-service-realtime.ts) (`subscribePrayerCatalogRealtime`, reminder-drop + personal reload rules), [`prayer-member-pray-for.ts`](src/app/lib/prayer-member-pray-for.ts) and [`prayer-member-updates.ts`](src/app/lib/prayer-member-updates.ts) (Planning Center member Pray For counts and update cache keys/grouping), [`prayer-prayed-for-increment.ts`](src/app/lib/prayer-prayed-for-increment.ts) (RPC count parse + in-memory list patch). **Phase 3**: [`prayer-service-resume.ts`](src/app/lib/prayer-service-resume.ts) (debounced resume refresh, cache read on reconnect, inactivity/background timeout helpers, document visibility + `shouldSchedulePrayerResumeRefresh`). **Phase 4**: [`prayer-personal-category.ts`](src/app/lib/prayer-personal-category.ts) (category range math, prayer/category reorder fallback payloads, swap steps, rename id matching, RPC success parsing, category limit helpers). **Phase 5**: [`prayer-community-mutations.ts`](src/app/lib/prayer-community-mutations.ts) and [`prayer-community-deletion-requests.ts`](src/app/lib/prayer-community-deletion-requests.ts) (community submit rows, local list patches, deletion-request payloads); [`prayer-personal-mutations.ts`](src/app/lib/prayer-personal-mutations.ts) (personal prayer field updates, update append/patch/remove, Answered-category clearing). **Phase 6**: [`prayer-catalog-load.ts`](src/app/lib/prayer-catalog-load.ts) (community/personal cache keys, silent-refresh skip rules, load error fallback plans), [`prayer-service-user-email.ts`](src/app/lib/prayer-service-user-email.ts) (`resolvePrayerServiceUserEmail` for Supabase session + MFA localStorage), [`prayer-error-message.ts`](src/app/lib/prayer-error-message.ts) (`extractSupabaseErrorMessage`); personal insert row + prepend helpers extended in [`prayer-personal-mutations.ts`](src/app/lib/prayer-personal-mutations.ts). **Phase 7**: [`prayer-service-session-wire.ts`](src/app/lib/prayer-service-session-wire.ts) (`userSessionEmailDistinctEqual`, `personalPrayerSessionAction` for login/logout personal catalog wiring); community status/delete/subscribe helpers extended in [`prayer-community-mutations.ts`](src/app/lib/prayer-community-mutations.ts). **Phase 8**: [`prayer-service-realtime-handlers.ts`](src/app/lib/prayer-service-realtime-handlers.ts) (`buildPrayerCatalogRealtimeHandlers`); personal category RPC interpret/validate/args in [`prayer-personal-category.ts`](src/app/lib/prayer-personal-category.ts); `PERSONAL_PRAYERS_LIST_SELECT` in [`prayer-personal-display.ts`](src/app/lib/prayer-personal-display.ts); admin notification payloads for community updates and deletion requests in [`prayer-community-mutations.ts`](src/app/lib/prayer-community-mutations.ts) and [`prayer-community-deletion-requests.ts`](src/app/lib/prayer-community-deletion-requests.ts). **Phase 9**: [`prayer-personal-load.ts`](src/app/lib/prayer-personal-load.ts) (`arePrayerCatalogsReadyFromFlags`, `personalPrayersFromDbRows`, `answeredPersonalPrayerIds`); category range resolution, rename validation/payload, and prayer-order RPC args in [`prayer-personal-category.ts`](src/app/lib/prayer-personal-category.ts); member update insert rows in [`prayer-member-updates.ts`](src/app/lib/prayer-member-updates.ts). **Phase 10**: [`prayer-personal-update.ts`](src/app/lib/prayer-personal-update.ts) (`findPersonalPrayerById`, `resolvePersonalPrayerCategoryEdit`, category limit messages, answered-flag clear payload, `displayOrderForPersonalCategoryChange`); [`prayer-personal-display-order.ts`](src/app/lib/prayer-personal-display-order.ts) (batch display-order DB payload + `firstSupabaseBatchError`); `memberPrayerCacheKeysToInvalidate` in [`prayer-member-updates.ts`](src/app/lib/prayer-member-updates.ts). **Phase 11**: [`prayer-personal-order-rpc.ts`](src/app/lib/prayer-personal-order-rpc.ts) (`runPersonalPrayerOrderRpcPerCategory`); [`prayer-personal-order-fallback.ts`](src/app/lib/prayer-personal-order-fallback.ts) (client-side prayer order, category reorder, and swap fallbacks); `wirePrayerResumeListeners` in [`prayer-service-resume.ts`](src/app/lib/prayer-service-resume.ts); member update cache slice helpers and `communityPendingUpdateAdminNotification` in [`prayer-member-updates.ts`](src/app/lib/prayer-member-updates.ts) / [`prayer-community-mutations.ts`](src/app/lib/prayer-community-mutations.ts). **Phase 12**: [`prayer-personal-category-query.ts`](src/app/lib/prayer-personal-category-query.ts) (category range/count from DB row state); [`prayer-personal-category-rpc.ts`](src/app/lib/prayer-personal-category-rpc.ts) (`runPersonalCategoryMutationRpc` for reorder/swap); deletion-request admin notify helpers in [`prayer-community-deletion-requests.ts`](src/app/lib/prayer-community-deletion-requests.ts); `unsubscribePrayerResumeListeners` for teardown. **Phase 13**: [`prayer-personal-insert.ts`](src/app/lib/prayer-personal-insert.ts) (`planPersonalPrayerInsertDisplayOrder`); `runPersonalPrayerDisplayOrderBatchUpdates` in [`prayer-personal-display-order.ts`](src/app/lib/prayer-personal-display-order.ts); prayed-for list patches in [`prayer-prayed-for-increment.ts`](src/app/lib/prayer-prayed-for-increment.ts); member pray-for cache write helper in [`prayer-member-pray-for.ts`](src/app/lib/prayer-member-pray-for.ts); `dispatchCommunityPendingUpdateAdminNotification` in [`prayer-community-mutations.ts`](src/app/lib/prayer-community-mutations.ts). **Phase 14**: [`prayer-personal-update-plan.ts`](src/app/lib/prayer-personal-update-plan.ts) (`startPersonalPrayerUpdatePlan`, category-change validation, answered/reminder flags); [`prayer-personal-rename.ts`](src/app/lib/prayer-personal-rename.ts) (rename id matching + DB payload); `applyCommunityPrayersCacheSnapshot` / `applyPersonalPrayersCacheSnapshot` in [`prayer-catalog-load.ts`](src/app/lib/prayer-catalog-load.ts). **Phases 15–17**: [`prayer-personal-category-query-db.ts`](src/app/lib/prayer-personal-category-query-db.ts) (`resolvePersonalCategoryRangeWithDb`, `fetchPersonalCategoryPrayerCountWithDb`; uncategorized rows use PostgREST `.is("category", null)`); [`prayer-personal-add-plan.ts`](src/app/lib/prayer-personal-add-plan.ts) (`planPersonalPrayerAdd` + shared max-order deps); [`prayer-personal-update-category-plan.ts`](src/app/lib/prayer-personal-update-category-plan.ts) (`resolvePersonalPrayerCategoryChangeDisplayOrder`); `publishCommunityPrayersFromDb` / `applyCommunityLoadErrorPlan` in [`prayer-catalog-load.ts`](src/app/lib/prayer-catalog-load.ts); `applyCommunityPrayerDeleteSnapshot` in [`prayer-community-mutations.ts`](src/app/lib/prayer-community-mutations.ts); `personalPrayerListAfterInsert` in [`prayer-personal-mutations.ts`](src/app/lib/prayer-personal-mutations.ts). **Phases 18–20**: [`prayer-personal-category-orchestrate.ts`](src/app/lib/prayer-personal-category-orchestrate.ts) (category reorder/swap + prayer order RPC orchestration and fallbacks); personal load publish/error helpers in [`prayer-catalog-load.ts`](src/app/lib/prayer-catalog-load.ts); `afterCommunityPendingUpdateInserted` in [`prayer-community-mutations.ts`](src/app/lib/prayer-community-mutations.ts); deletion-request notify wire in [`prayer-community-deletion-requests.ts`](src/app/lib/prayer-community-deletion-requests.ts); member mutation toast wire in [`prayer-member-mutation-wire.ts`](src/app/lib/prayer-member-mutation-wire.ts). Catalog subjects and CRUD live on the inner community/personal services; the facade owns realtime, resume, and session wiring.
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
[`email-notification.service.ts`](../src/app/services/email-notification.service.ts) queues and sends mail; callers still inject this service. Payload types are in [`email-notification-types.ts`](../src/app/lib/email-notification-types.ts) (re-exported). Fallback HTML bodies are in [`email-notification-html.ts`](../src/app/lib/email-notification-html.ts). Link/base-URL helpers: [`email-notification-links.ts`](../src/app/lib/email-notification-links.ts). Template `{{variable}}` apply: [`email-notification-template.ts`](../src/app/lib/email-notification-template.ts). Manual-broadcast recipient filtering: [`email-notification-broadcast.ts`](../src/app/lib/email-notification-broadcast.ts). Per-admin approval emails: [`email-notification-admin-mail.ts`](../src/app/lib/email-notification-admin-mail.ts).
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

#### Personal prayer answered status

Personal prayer cards expose **Mark as answered** in the card hamburger menu (same control as member update answered). Tapping it sets `category` to **Answered** (or clears it when already answered)—the same outcome as **Mark this prayer as answered** on edit / add-update forms—via [`PrayerService.updatePersonalPrayer`](../src/app/services/prayer.service.ts). Leaving **Answered** also clears `mark_as_answered` on that prayer’s updates (before the category write) so a later update edit cannot re-answer from a stale flag; the update-edit checkbox initializes from prayer category only. Unchecking that checkbox on edit clears reserved **Answered** (even if the category field still shows it); on update-edit, the category write runs before the update row save (and rolls back if the update save fails). Sharing a personal prayer to the public list was removed (including admin `is_shared_personal_prayer` handling and the DB column). Legacy presentation return contexts without a personal filter mode restore **Total** (former All Categories).

#### Card actions overflow menu

Home and presentation cards no longer show a tight 16px icon row in the meta header or update band. [`card-actions-overflow-menu`](src/app/components/card-actions-overflow-menu/card-actions-overflow-menu.component.ts) is a hamburger trigger (same 16px glyph + 4px padding as the old icons so the band stays `min-h-[36px]`) that opens a **fixed** `z-50` panel of labeled rows (`min-h-[44px]`). The panel is **body-portaled** so it is not clipped under later cards (same pattern as scripture hover previews, and as card modals before [`prayer-card-modals-stack`](src/app/components/prayer-card/prayer-card-modals-stack.component.ts) moved outside the shell). Flip-up and viewport bounds live in [`fixed-popover-placement.ts`](src/app/lib/fixed-popover-placement.ts) (shared with the category color picker). Overflow-only right-align/clamp lives in [`card-actions-overflow-menu-placement.ts`](src/app/components/card-actions-overflow-menu/card-actions-overflow-menu-placement.ts). Click-outside and Escape close the menu. `bg-shell-corner-seal` must not use `isolation: isolate` or `overflow-hidden` — both clip hanging unread badges ([`card-chrome.css`](../src/card-chrome.css)).

Modal headers and footers use the same band fill as card meta headers via `.modal-chrome-header` / `.modal-chrome-footer` (and `.settings-modal-header` / `.settings-modal-footer` for Settings). Colors are tokenized as `--color-card-meta-header-band` in [`styles.css`](../src/styles.css).

Parents build the item list from existing flags: reminder (`showReminder`), personal answered + edit (`isPersonal`), delete (`showDelete`); prompt cards contribute reminder + admin delete; update rows contribute personal edit, member check+edit, and delete. Each item carries `onSelect`; confirmation dialogs and reminder/edit modals stay on the parent. The Info personal mock uses the same menu. Memorize verse cards do not.

#### BadgeService

Pure helpers: [`badge-read-storage.ts`](src/app/lib/badge-read-storage.ts), [`badge-cache.ts`](src/app/lib/badge-cache.ts), [`badge-count.ts`](src/app/lib/badge-count.ts), [`badge-read-merge.ts`](src/app/lib/badge-read-merge.ts).

**Read state persistence:** [`BadgeReadStateService`](src/app/services/badge-read-state.service.ts) is the sole owner of badge read-state sync. It hydrates `read_prayers_data` / `read_prompts_data` from the DB on session bootstrap, exposes `syncedEmail$` for downstream refresh, and debounces RPC upserts on writes via `setReadPrayersData` / `setReadPromptsData`. [`BadgeService`](src/app/services/badge.service.ts) delegates all read/write to that service and gates `refreshBadgeCounts()` / `isPrayerUnread()` until `isReadyForReads()` is true. Logout calls `flushBeforeLogout()` before clearing local read keys.

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
├── prayer-archive-timeline.component.ts       # ~235 lines (orchestration)
├── prayer-archive-timeline.component.html     # Template
├── prayer-archive-timeline.component.css      # Styles
└── prayer-archive-timeline.component.spec.ts  # Integration + calendar/event tests

Pure helpers: [`prayer-archive-timeline-calendar.ts`](src/app/lib/prayer-archive-timeline-calendar.ts), [`prayer-archive-timeline-events.ts`](src/app/lib/prayer-archive-timeline-events.ts), [`prayer-archive-timeline-ui.ts`](src/app/lib/prayer-archive-timeline-ui.ts).
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

- **UI**: [`admin-help-modal.component.ts`](src/app/components/admin-help-modal/admin-help-modal.component.ts) is opened from the Admin header **Help** control (left of **Main Site**). It mirrors the main app help modal layout (search, accordions, sticky close) but loads **admin-only** topics from the const catalog in [`admin-help-sections.ts`](src/app/lib/admin-help-sections.ts). Tour rows emit a single `startSectionTour`; [`AdminHelpTourLauncher`](src/app/services/admin-help-tour.launcher.ts) switches Settings tabs and starts the matching driver.js tour. ViewChild refs are read via getters after the existing delays so the target section exists in the DOM.
- **Videos**: Each section can set optional **`videoEmbedUrl`** on [`AdminHelpSection`](src/app/types/admin-help-content.ts). Allowed embeds are validated/normalized in [`admin-help-video-url.ts`](src/app/lib/admin-help-video-url.ts) (YouTube watch links are converted to `youtube-nocookie.com/embed/...` when possible).
- **Guided tours (driver.js)**: [`admin-help-driver-tour.service.ts`](src/app/services/admin-help-driver-tour.service.ts) runs admin-only tours using step catalogs in [`lib/admin-help-tour-catalog/`](src/app/lib/admin-help-tour-catalog/) and shared config in [`admin-help-tour-driver-config.ts`](src/app/lib/admin-help-tour-driver-config.ts). Callback types live in [`types/admin-help-tour.ts`](src/app/types/admin-help-tour.ts). [`AdminHelpTourLauncher`](src/app/services/admin-help-tour.launcher.ts) switches Settings tabs and invokes the service after prepare delays. Launch-only tour rows in [`admin-help-modal.component.ts`](src/app/components/admin-help-modal/admin-help-modal.component.ts) call [`HelpDriverTourService.interruptGuidedTours`](src/app/services/help-driver-tour.service.ts) before starting so main-app tours do not overlap. **Email Subscribers — overview** (`admin_help_email_subscribers_overview`) uses **`prepareOverviewTourListState`** (search **`app-test`**) then **`startEmailSubscribersOverviewTour`**. **Email subscribers** (`admin_help_email_subscribers`), **Prayer Editor** create/manage, **Prayer Prompts & Types**, and **Memorize Recommendations** tours follow the same Settings-tab → prepare → driver pattern documented in [`admin-help-sections.ts`](src/app/lib/admin-help-sections.ts).

### Admin portal (Settings collapsibles)

- **`src/app/pages/admin/admin.component.ts`** embeds settings subtabs (Analytics, Email, Content, Tools, Security). Each block is typically a standalone component (`prayer-encouragement-settings`, `github-settings`, `app-branding`, `prompt-manager`, `prayer-types-manager`, `memorization-recommendations-manager`, `planning-center-list-mapper`, `email-settings` / subscribers / **admin-subscriber-email-broadcast** (queued broadcast to all subscribers) / templates / verification, `prayer-search`, `prayer-archive-timeline`, `backup-status`, `security-policy-settings`, `test-account-settings`, `admin-user-management`, etc.) with the same **card + collapsible header** pattern.
- **Loading**: Sections that fetch on first expand (and the **Site Analytics** activity chart) use [`admin-section-loading.component.ts`](src/app/components/admin-section-loading/admin-section-loading.component.ts) for a consistent spinner + status line while data is in flight. Site Analytics metric cards include page views, prayer status counts, email subscribers, and **Memorize** totals (**Total** plus **Learning** / **Practicing** / **Mastered**) from [`AnalyticsService.getStats()`](src/app/services/analytics.service.ts).
- **Interaction**: When a section is **collapsed**, the outer card adds **`cursor-pointer`** and a shell **`(click)`** that runs the toggle only while collapsed, so the whole surface opens the panel; the visible header remains a **`<button type="button">`** (focusable, **`cursor-pointer`**) whose handler calls **`$event.stopPropagation()`** after toggling so the shell does not receive a second click. When **expanded**, only the header button collapses; clicks on forms and controls do not use the shell toggle.
- **Prayer Editor** (`app-prayer-search`): Search hints for admins live in the main search **placeholder** (minimum length and fields); body copy above the toolbar was removed as duplicate.

### Rich text for prayers and updates

- **Storage**: Markdown is stored in the existing `prayers.description` and `prayer_updates.content` `TEXT` columns. No migration required. Older native app builds that have not shipped the renderer display raw Markdown (e.g. `**bold**`, `- item`), which degrades gracefully.
- **Editor**: [`RichTextEditorComponent`](../src/app/components/rich-text-editor/rich-text-editor.component.ts) wraps Tiptap v2 (`@tiptap/core`, `@tiptap/starter-kit`, `tiptap-markdown`). Implements `ControlValueAccessor` so `[(ngModel)]="formData.description"` works like a `textarea`. Emits / accepts Markdown through `editor.storage['markdown'].getMarkdown()`. **Underline** must use [`UnderlineWithMarkdown`](../src/app/lib/tiptap-underline-markdown.extension.ts): `StarterKit`’s default underline mark has no `tiptap-markdown` serializer when `html: false`, so underline was lost on save until this extension adds `++`/`++` serialization.
- **Renderer**: [`RichTextViewComponent`](../src/app/components/rich-text-view/rich-text-view.component.ts) converts Markdown to HTML via `marked` and sanitizes with DOMPurify (allow-list of inline / list / link tags only). An `afterSanitizeAttributes` hook forces `target="_blank"` + `rel="noopener noreferrer"` on links and drops `javascript:` hrefs.
- **Utilities**: [`src/utils/markdown.ts`](../src/utils/markdown.ts). Use **`markdownToPlainText`** anywhere content is consumed outside an HTML renderer (push notification body, email subject / plain-text body, character counts); use **`markdownToSafeHtml`** for printable HTML and email HTML bodies. Pure TipTap/Markdown transforms live in [`markdown-core.ts`](../src/lib/markdown-core.ts). **Underline** from the editor is stored as TipTap’s `++text++` markers; `markdownToSafeHtml` expands those to `<u>` before `marked` parses, and the DOMPurify hook sets inline `text-decoration: underline` on `<u>` so HTML emails match in-app styling. **Print**: [`print.service.ts`](../src/app/services/print.service.ts) loads data and runs download/native flows; full HTML documents and booklet assembly live in [`src/app/lib/print-*-html.ts`](src/app/lib/) (prayer/prompt/personal lists, saddle-stitch booklet, card fragments) with shared helpers (`print-time-range`, `print-native`, `print-prompt-layout`, `print-booklet-pack`, etc.). [`printablePrayerList.ts`](../src/utils/printablePrayerList.ts) includes matching rules for `u` / `strong` / `em` / `s` inside `.prayer-description` and `.update-item`.
- **Emails**: [`email-notification.service.ts`](../src/app/services/email-notification.service.ts) builds **two** variable maps per template call — one for `subject` / `text_body` (plain text) and one for `html_body` (safe HTML) via [`applyEmailTemplateVariables`](../src/app/lib/email-notification-template.ts). Fallback HTML when a DB template is missing lives in [`email-notification-html.ts`](../src/app/lib/email-notification-html.ts). Queued subscriber templates also receive new `{{prayerDescriptionHtml}}` / `{{prayerDescriptionText}}` / `{{updateContentHtml}}` / `{{updateContentText}}` variables alongside the legacy `{{prayerDescription}}` / `{{updateContent}}` (still raw Markdown) so admins can update email templates to render rich text without breaking older installs.
- **Edge Functions**: [`send-user-hourly-prayer-reminders`](../supabase/functions/send-user-hourly-prayer-reminders/index.ts) and [`send-user-prayer-item-reminders`](../supabase/functions/send-user-prayer-item-reminders/index.ts) **inline** TipTap markdown helpers from [`edge-email-markdown.ts`](../src/lib/edge-email-markdown.ts) (regenerate with [`scripts/inline-edge-email-helpers.mjs`](../scripts/inline-edge-email-helpers.mjs) after edits — Supabase deploy does not bundle `../_shared` reliably). **Spotlight HTML template**: redeploy `send-user-hourly-prayer-reminders` before migration [`20260820120000_spotlight_email_render_markdown.sql`](../supabase/migrations/20260820120000_spotlight_email_render_markdown.sql) so `{{spotlightPrayerDescriptionHtml}}` is filled before `html_body` references it.
- **Admin inline edit in approval screens**: [`consolidated-prayer-approval`](../src/app/components/consolidated-prayer-approval/consolidated-prayer-approval.component.ts) exposes **Edit** controls that reveal a `RichTextEditorComponent` with Save / Cancel and call `AdminDataService.editPrayer` / `editUpdate`.

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

CI ([`.github/workflows/test.yml`](../.github/workflows/test.yml)) runs on Ubuntu, Windows, and macOS. Ubuntu also runs typecheck, lint, and `npm run test:coverage`, then uploads the `coverage-report` artifact. GitHub Checks are the PR status signal; the workflow does not post a PR comment (that step required `issues:write` the default `GITHUB_TOKEN` does not have, which made Ubuntu look failed after tests had already passed).

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
- **Filtering Prayers** (`help_filtering`): footer **Start guided tour** emits `startFilteringHelpSectionUiTour` with the full [`HelpSection`](src/app/types/help-content.ts) (blocks must stay ordered like [`HelpContentService`](src/app/services/help-content.service.ts) defaults: Filter Options, Personal, Finding Archived, Search); home calls [`startFilteringHelpSectionTour`](src/app/services/help-driver-tour.service.ts) with [`FilteringHelpSectionTourHooks`](src/app/services/help-driver-tour.service.ts). Popover copy comes from each block’s `subtitle` / `text` (help `**bold**` → `<strong>` via [`formatHelpContentHtml`](src/app/lib/help-content-html.ts)); **Answered** and **Prompts** steps reuse the matching clause from the **Filter Options** paragraph when [`isDescriptiveFilterTourExcerpt`](src/app/lib/help-filter-tour-excerpt.ts) passes. **Archived** uses the Finding Archived block; **Total** uses the Filter Options **Total** clause (or a fallback).
- **Using Prayer Prompts** (`help_prompts`): single **Start guided tour** in the expanded section footer emits `startPrayerPromptsUiTour` with the full [`HelpSection`](src/app/types/help-content.ts); home calls [`startPrayerPromptsTour`](src/app/services/help-driver-tour.service.ts). Prompts tile `tour-filter-prompts`, type row `tour-prompt-type-filters`, first visible prompt card via [`getSamplePromptCardEl`](src/app/lib/help-tour-dom.ts) (`.prompt-card[id^="prompt-card-"]`), empty state `tour-prompt-empty-state`, Pray buttons `tour-btn-prayer-mode-mobile` / `tour-btn-prayer-mode-desktop`.
- **Prayer Encouragement (Pray For)** (`help_prayer_encouragement`): footer **Start guided tour** emits `startPrayerEncouragementUiTour`; home switches to **Current**, then [`startPrayerEncouragementTour`](src/app/services/help-driver-tour.service.ts). First community card in the main list sets [`tourPrayForEncouragementAnchors`](src/app/components/prayer-card/prayer-card.component.ts) → **`#tour-prayer-pray-for`** on **Pray For** or **Prayed For**. Final step is **popover-only** (driver.js, no element) for extra context.
- **Searching Prayers** (`help_search`): footer **Start guided tour** emits `startSearchPrayersUiTour`; home calls [`startSearchPrayersTour`](src/app/services/help-driver-tour.service.ts). Search input **`#tour-prayer-search`** in [`PrayerFiltersComponent`](src/app/components/prayer-filters/prayer-filters.component.ts); second step is **popover-only** tips.
- **Personal Prayers** (`help_personal_prayers`): footer **Start guided tour** emits `startPersonalPrayersHelpSectionUiTour`; home calls [`startPersonalPrayersHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (17-step hands-on walkthrough: creates **Test Personal Prayer** / **Test Category**, opens the card hamburger before **Mark as answered** / **Edit prayer** / **Delete prayer**, tours the inline update form, `#tour-personal-category-filters`, drag date/time in meta header, then deletes the sample). [`PersonalPrayersHelpSectionTourHooks`](src/app/services/help-driver-tour.service.ts) wires `#prayerFormComp` and `getWalkthroughPersonalPrayer()`. This is the dedicated private-prayer tour; **Creating Prayers** no longer duplicates it.
- **Memorize Scripture** (`help_memorize`): footer **Start guided tour** emits `startMemorizeHelpSectionUiTour`; home calls [`startMemorizeHelpSectionTour`](src/app/services/help-driver-tour.service.ts) with `switchToMemorize`. Anchors: `tour-filter-memorize` on [`HomeComponent`](src/app/pages/home/home.component.ts), `tour-memorize-action-bar` / `tour-memorize-add-verses` / `tour-memorize-recommended` on [`MemorizationActionBarComponent`](src/app/components/memorization-action-bar/memorization-action-bar.component.ts), `tour-memorize-sample-card` via [`tourMemorizeAnchors`](src/app/components/memorized-verse-card/memorized-verse-card.component.ts) on the first passage card, `tour-memorize-empty-state` when the list is empty; final step is popover-only practice-mode tips.
- **Prayer Presentation Mode** (`help_presentation`): footer **Start guided tour** emits `startPresentationModeHelpSectionUiTour`; home calls [`startPresentationModePrayButtonPreludeTour`](src/app/services/help-driver-tour.service.ts) (highlight **Pray**), then on **Next** sets `sessionStorage` [`PRESENTATION_HELP_TOUR_SESSION_KEY`](src/app/services/help-driver-tour.service.ts) and navigates to **`/presentation`**. [`PresentationComponent`](src/app/pages/presentation/presentation.component.ts) consumes the key after [`loadContent()`](src/app/pages/presentation/presentation.component.ts) and calls [`startPresentationModeTour`](src/app/services/help-driver-tour.service.ts) with `openSettings` / `closeSettings` / `exitPresentation` (last step **Next** exits presentation). Toolbar ids on [`PresentationToolbarComponent`](src/app/components/presentation-toolbar/presentation-toolbar.component.ts); settings panel ids on [`PresentationSettingsModalComponent`](src/app/components/presentation-settings-modal/presentation-settings-modal.component.ts).
- **Printing** (`help_printing`): footer **Start guided tour** emits `startPrintingHelpSectionUiTour`; home calls [`startPrintingHelpSectionTour`](src/app/services/help-driver-tour.service.ts) with hooks to open/close [`UserSettingsComponent`](src/app/components/user-settings/user-settings.component.ts). Print row and primary buttons: `tour-settings-print-buttons`, `tour-settings-print-prayers`, `tour-settings-print-prompts`, `tour-settings-print-personal`; header gear: `tour-btn-settings-mobile` / `tour-btn-settings-desktop` on [`HomeComponent`](src/app/pages/home/home.component.ts).
- **Email Subscription** (`help_email_subscription`): footer **Start guided tour** emits `startEmailSubscriptionHelpSectionUiTour`; home calls [`startEmailSubscriptionHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (same open/close Settings hooks as printing). Email block: `tour-settings-email-subscription` on [`UserSettingsComponent`](src/app/components/user-settings/user-settings.component.ts).
- **Prayer reminders** (`help_prayer_reminders`): footer **Start guided tour** emits `startPrayerRemindersHelpSectionUiTour`; home calls [`startPrayerRemindersHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (same Settings hooks). **Public** Next opens `[data-card-actions-trigger]` so the per-prayer reminder row (`#tour-prayer-reminder-bell`) is in the DOM. Reminders card: `tour-settings-prayer-reminders`; hour + **Add reminder** row: `tour-settings-prayer-reminder-controls` on [`UserSettingsComponent`](src/app/components/user-settings/user-settings.component.ts).
- **Feedback** (`help_feedback`): footer **Start guided tour** emits `startFeedbackHelpSectionUiTour`; home calls [`startFeedbackHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (same Settings hooks). Settings always shows `tour-settings-feedback-section`—either [`GitHubFeedbackFormComponent`](src/app/components/github-feedback-form/github-feedback-form.component.ts) (`tour-settings-feedback-type`, `tour-settings-feedback-details`) or a short note when GitHub feedback is disabled.
- **App Settings** (`help_settings`): footer **Start guided tour** emits `startAppSettingsHelpSectionUiTour`; home calls [`startAppSettingsHelpSectionTour`](src/app/services/help-driver-tour.service.ts) (same Settings hooks). Anchors on [`UserSettingsComponent`](src/app/components/user-settings/user-settings.component.ts): `tour-settings-theme`, `tour-settings-text-size`, `tour-settings-push-notifications`, `tour-settings-badges`, `tour-settings-prayer-encouragement`, `tour-settings-default-view`; reuses print, email, reminders, and feedback ids above.
- **DOM**: Help blocks keep `id="help-block-{sectionId}-{index}"`. Accordion tour buttons call [`onStartSectionTour`](src/app/components/help-modal/help-modal.component.ts), which routes by section id ([`help-section-ids.ts`](src/app/lib/help-section-ids.ts)) to the same `@Output` emitters listed above (`startCreatingPrayersHelpSectionUiTour`, `startFilteringHelpSectionUiTour`, etc.).

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

#### Prayer reminders (Settings)

Users can opt in to **personal** reminders at selected clock times in **15-minute** steps (not tied to community prayer-update cadence):

- **Location**: Settings modal → **Prayer reminders** section (above the feedback form when GitHub feedback is enabled). Pick a time, **Add reminder**, or **Remove** on a slot. Times use the device IANA time zone when saving. Per-prayer once/daily/weekly reminders use **Add prayer reminder** in the card hamburger menu (see *Per-prayer item reminders* below).
- **Delivery**: **Email** when the user’s **Email subscription** is on (`is_active`). **Push** when `receive_push` is true and a device token exists. Both may fire in the same slot if both are enabled.
- **Email template**: `admin_settings.user_hourly_prayer_reminder_template_key` selects `email_templates.template_key` — default **`user_hourly_prayer_reminder`** (`{{appLink}}` = home only) or **`user_hourly_prayer_reminder_with_spotlight`**, which adds spotlight variables and sets **`{{appLink}}`** to **`APP_URL/?prayerId={id}`** for the featured prayer when one is picked (push includes matching **`prayerId`** for tap-to-open). Spotlight pool: **community** prayers (approved, **current**, app-wide, no date cutoff) plus **all** **personal** prayers for that user that are not **Answered**. The previous pick is avoided when the pool has more than one (`email_subscribers.hourly_reminder_last_spotlight_key`, updated after a **successful** **push or email**). When the prayer has updates, **`{{updateContent}}`** is the latest **approved** community update (`prayer_updates`) or **latest** personal update (`personal_prayer_updates`); **`{{spotlightLatestUpdateHtml}}`** / **`{{spotlightUpdateTextSection}}`** provide optional formatted blocks. Admins set the template under **Admin → Settings → Email** (`email-settings.component.ts`).
- **Implementation**: [`UserHourReminderService`](src/app/services/user-hour-reminder.service.ts) (`kind: 'prayer'`) with session cache on `UserSessionData`; settings UI via [`HourReminderSettingsSectionComponent`](src/app/components/hour-reminder-settings-section/hour-reminder-settings-section.component.ts) in the Settings modal. Backend: table `user_prayer_hour_reminders` (`local_hour` + `local_minute`), Edge Function `send-user-hourly-prayer-reminders`, **`pg_cron` every 15 minutes** (see § *User hourly prayer reminders* below). Migration `20260803160000_reminder_quarter_hour_and_prayer_item_reminders.sql` upgrades slots and crons.
- **Help**: `help-content.service.ts` — standalone section `help_prayer_reminders` (“Prayer reminders”) and **App Settings** item for prayer reminders (after Default Prayer View, before Feedback Form).

#### Per-prayer item reminders

- **UI**: **Add prayer reminder** in the card hamburger on [`prayer-card-meta-header`](src/app/components/prayer-card-meta-header/prayer-card-meta-header.component.ts) (community, personal, and member cards) and [`prompt-card`](src/app/components/prompt-card/prompt-card.component.ts) → [`prayer-item-reminder-modal`](src/app/components/prayer-item-reminder-modal/prayer-item-reminder-modal.component.ts) (once / daily / weekly, 15-minute times; template in [`prayer-item-reminder-modal.component.html`](src/app/components/prayer-item-reminder-modal/prayer-item-reminder-modal.component.html); date/dropdown/validation helpers in [`prayer-item-reminder-modal-ui.ts`](src/app/lib/prayer-item-reminder-modal-ui.ts)). A filled bell in the menu means a reminder is already set.
- **Data**: `user_prayer_item_reminders` + RPC `get_user_prayer_item_reminders_due_now()`; `prayer_kind` is `community` | `personal` | `pc_member` | **`prompt`** (migration `20260805120000_reminder_item_followups.sql`). Title/prayer-for snapshots; for prompts, `prayer_for_snapshot` is the prompt category (`type`).
- **Lifecycle**: Triggers purge reminders when a community prayer is deleted or moves to `archived`/`answered`, a personal prayer is deleted or category becomes `Answered`, or a **prayer prompt is deleted**. [`PrayerService`](src/app/services/prayer.service.ts) and [`PromptService`](src/app/services/prompt.service.ts) drop matching rows from the session cache on delete.
- **Edge**: `send-user-prayer-item-reminders` (push `type: prayer_item_reminder`); skips and deletes rows whose prayer/prompt is missing or inactive; Home `?prayerId=` scrolls to `#prayer-card-{id}` (personal answered prayers switch the Personal chip to **Answered** first so the card is in the DOM), `?promptId=` switches to Prompts and scrolls to `#prompt-card-{id}`.
- **App**: [`PrayerItemReminderService`](src/app/services/prayer-item-reminder.service.ts); cache `UserSessionData.prayerItemReminders` (cleared on logout with session).

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
- **Home Prompts list**: CDK **autosize** virtual scroll in [`home-prayer-content`](src/app/components/home-prayer-content/home-prayer-content.component.ts) when more than 15 prompts are shown (`shouldUseHomePromptVirtualScroll` in [`home-prompt-virtual-scroll.ts`](src/app/lib/home-prompt-virtual-scroll.ts)); shorter/filtered lists use `@for` for stable scroll. Scroll stepping in the same module; row spacing via [`.home-prompt-virtual-scroll-item`](src/app/components/home-prayer-content/home-prayer-content.component.css) padding matching `space-y-2 sm:space-y-3`. After long-list data changes, a one-shot [`reconcileHomeVirtualScrollTotalSizeAtTail`](src/app/lib/home-prompt-virtual-scroll.ts) sets total scroll height from measured content (do **not** reconcile on every scroll — autosize will fight it and jitter). [`home-virtual-scroll-main`](src/app/pages/home/home.component.css) prevents `main` from stretching on Prompts/Public. Prompt `?promptId=` deep links call [`HomeDeepLinkHost.scrollPromptIntoView`](src/app/services/home-deep-link-host.adapter.ts) (`scrollToOffset` estimate, then DOM `scrollIntoView`).
- **Home Public community lists** (Current, Answered, Archived, Total): separate autosize virtual scroll viewport (same parent scroll and row-spacing rules as Prompts; [`home-prayer-virtual-scroll.ts`](src/app/lib/home-prayer-virtual-scroll.ts); [`.home-prayer-virtual-scroll-item`](src/app/components/home-prayer-content/home-prayer-content.component.css)). Community `?prayerId=` links use [`scrollPrayerIntoView`](src/app/services/home-deep-link-host.adapter.ts). Cards call [`scheduleHomePrayerVirtualScrollRemeasure`](src/app/lib/home-prayer-virtual-scroll.ts) when **Show all updates** expands in-card content. Open modals from virtual rows are body-portaled via [`prayer-card-modals-portal.ts`](src/app/lib/prayer-card-modals-portal.ts) in [`prayer-card-modals-stack`](src/app/components/prayer-card/prayer-card-modals-stack.component.ts), [`prompt-card`](src/app/components/prompt-card/prompt-card.component.ts), and [`prayer-item-reminder-modal`](src/app/components/prayer-item-reminder-modal/prayer-item-reminder-modal.component.ts) so fixed overlays and dropdown listboxes are not clipped inside `.cdk-virtual-scroll-content-wrapper`. **Do not** reintroduce a single shared viewport across tabs or scroll/resize `checkViewportSize` resync loops — that caused blank rows and bounce.
- **Personal** and **Members** tabs still use normal `@for` lists (full DOM). Prayer cards hoists Pray For / encouragement visibility from Home like prompt cards ([`prayer-card-actions-row`](src/app/components/prayer-card/prayer-card-actions-row.component.ts)).
- Logo preload hints in HTML head for browser priority

### Monitoring

- PostHog dashboard (live events, session replay, web vitals, error tracking) — [`src/lib/posthog.ts`](../src/lib/posthog.ts), [`PosthogService`](../src/app/services/posthog.service.ts); set `posthogKey`, `posthogHost` (ingestion via first-party proxy `https://t.cp-church.org`), and `posthogUiHost` (`https://us.posthog.com`). Events send whenever the key is set (including `ng serve`). Every event is tagged with `app_environment` (`development` vs `production`), `app_version` (JS bundle marketing version from [`APP_BUNDLE_VERSION`](../src/lib/app-analytics-context.ts)), and `app_platform` (`web`, `ios`, or `android` via Capacitor). The same values are set as **person properties** and passed to `setPersonPropertiesForFlags` so insights, persons, cohorts, and surveys can target a version. Treat `app_version` as an exact string (for example `2.18`); do not use lexicographic greater/less than on dotted versions. When shipping a store release, bump `APP_BUNDLE_VERSION` together with iOS `MARKETING_VERSION` (`ios/App/App.xcodeproj/project.pbxproj`) and Android `versionName` (`android/app/build.gradle`) — Cursor rule [`.cursor/rules/app-version-sync.mdc`](../.cursor/rules/app-version-sync.mdc). Native apps keep the version that was baked in at `cap sync`; a later web deploy does not change them. If Live events stay empty after a code change, clear site data / `posthog` keys in localStorage (a prior dev build may have opted out). Vercel Analytics / Speed Insights are not bundled. Memorization practice emits `memorization_practice_started` and `memorization_practice_completed` with `mode` (`type`, `firstLetters`, `word`, `reorder`, `recite`), `item_kind` (`verse` \| `bibleBooks`), and optional `bible_books_scope` — see [`memorizationPracticeAnalytics.ts`](../src/app/lib/memorization/memorizationPracticeAnalytics.ts). On the CP Prayer / Cross Pointe Prayer project, [Users by app version](https://us.posthog.com/project/438838/insights/BrnNssgz) lists production persons with email, current `app_version`, `app_platform`, and last seen (identified people who have `app_version` set). [Users by app version (mix)](https://us.posthog.com/project/438838/insights/nIM5Ysrd) is unique users of any event in the last 30 days by event `app_version`, production only.
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
- **Prayer card:** [`prayer-card`](src/app/components/prayer-card/prayer-card.component.ts) — shows Pray For button and count when enabled (community, personal, and member cards); optional explanation modal ([`prayer-card-pray-for-modal`](src/app/components/prayer-card/prayer-card-pray-for-modal.component.ts)) with “Do not show again” (localStorage, cleared on logout). Title/body and modal stack: [`prayer-card-title-body`](src/app/components/prayer-card/prayer-card-title-body.component.ts), [`prayer-card-modals-stack`](src/app/components/prayer-card/prayer-card-modals-stack.component.ts) — the modals stack is a **sibling** of the card shell, not inside `bg-shell-corner-seal`, so fixed overlays are not trapped by a card stacking context. Action row and updates list: [`prayer-card-actions-row`](src/app/components/prayer-card/prayer-card-actions-row.component.ts), [`prayer-card-updates-section`](src/app/components/prayer-card/prayer-card-updates-section.component.ts). Display/permission state via [`prayer-card-view-state.ts`](src/app/lib/prayer-card-view-state.ts); badge wire, delete UI patches, and mutation builders in [`prayer-card-badge-wire.ts`](src/app/lib/prayer-card-badge-wire.ts), [`prayer-card-delete-ui.ts`](src/app/lib/prayer-card-delete-ui.ts), [`prayer-card-mutations.ts`](src/app/lib/prayer-card-mutations.ts). Policy/display/pray-for helpers: [`prayer-card-permissions.ts`](src/app/lib/prayer-card-permissions.ts), [`prayer-card-display.ts`](src/app/lib/prayer-card-display.ts), [`prayer-card-pray-for-run.ts`](src/app/lib/prayer-card-pray-for-run.ts), [`prayer-card-delete-requests.ts`](src/app/lib/prayer-card-delete-requests.ts), and related `prayer-card-*` libs beside [`prayer-card-layout.ts`](src/app/lib/prayer-card-layout.ts). Also requires **`UserSessionService.getShowPrayForButton$()`** / **`getShowPrayingCount$()`** so each user can hide those elements via Settings. On **community** cards, **{n} Praying** is visible only to the requester and admins, and Pray For follows `updates_allowed`; on **member** cards the shared **{n} Prayers** count and Pray For / Add Update are available to everyone who can see the Members list (not gated by `updates_allowed`); on **personal** cards, the owner always sees their **{n} Prayers** count (personal lists are not visible to admins or other users). Members visibility is unchanged—only users with an applied Planning Center list see the Public **Members** filter and member cards.
- **Prompt card:** [`prompt-card`](src/app/components/prompt-card/prompt-card.component.ts) — Pray For / Prayed For / private **{n} Prayers** for the current user; presentation prompt slides use **`variant="presentation"`** on the same component. Pray For actions and explanation modal: [`prompt-card-actions-row`](src/app/components/prompt-card/prompt-card-actions-row.component.ts), [`prompt-card-pray-for-modal`](src/app/components/prompt-card/prompt-card-pray-for-modal.component.ts); helpers in [`prompt-card-display.ts`](src/app/lib/prompt-card-display.ts) and [`prompt-card-pray-for-run.ts`](src/app/lib/prompt-card-pray-for-run.ts). Counts live in `prompt_prayed_for_counts` (per `prompt_id` + `user_email`); hydrate via RPC `get_prompt_prayed_for_counts`, increment via `increment_prompt_prayed_for_count` on `PromptService` (MFA/JWT auth same as personal Pray For). Counts follow `UserSession` email (cleared/rehydrated on logout / switch; load paths do not use a lingering Supabase session after logout).
- **Presentation cards:** [`presentation-slide-card`](src/app/components/presentation-slide-card/presentation-slide-card.component.ts) hosts [`prayer-card`](src/app/components/prayer-card/prayer-card.component.ts) / [`prompt-card`](src/app/components/prompt-card/prompt-card.component.ts) with **`variant="presentation"`**, plus personal/member edit modals. Slide meta headers and update rows use the same card hamburger overflow menu as Home. Slide lists are owned by [`presentation-catalog.store.ts`](src/app/services/presentation-catalog.store.ts) on the presentation page (`component.catalog`); `buildVisibleItems` / `shuffleVisibleItems` assemble the active deck. Content loads through [`presentation-content-loader.ts`](src/app/services/presentation-content-loader.ts) (community/personal/member prayers + prompts from [`PrayerService`](src/app/services/prayer.service.ts) / [`PromptService`](src/app/services/prompt.service.ts) snapshots); fetch orchestration, serialized filter reloads, and post-edit slide patching (`patchSlideItemAfterMutation`) live in [`presentation-content.coordinator.ts`](src/app/services/presentation-content.coordinator.ts). Shared filters: [`presentation-time-filter.ts`](src/app/lib/presentation-time-filter.ts), [`presentation-content-filter.ts`](src/app/lib/presentation-content-filter.ts). Loading/empty copy: [`presentation-content-messages.ts`](src/app/lib/presentation-content-messages.ts). Slide item guards (`isPresentationPrayer`, `prayerFromSlideItem`, `promptFromSlideItem`): [`presentation-slide-item.ts`](src/app/lib/presentation-slide-item.ts) — used by the page template and [`presentation-playback-host.adapter.ts`](src/app/services/presentation-playback-host.adapter.ts). Controller host binding: [`presentation-coordinator-wiring.ts`](src/app/services/presentation-coordinator-wiring.ts). Playback: [`presentation-playback.controller.ts`](src/app/services/presentation-playback.controller.ts) with host adapter in [`presentation-playback-host.adapter.ts`](src/app/services/presentation-playback-host.adapter.ts). Prayer timer: [`presentation-prayer-timer.controller.ts`](src/app/services/presentation-prayer-timer.controller.ts). Keyboard/touch/mouse: [`presentation-controls-input.controller.ts`](src/app/services/presentation-controls-input.controller.ts). Help tour launch: [`presentation-help-tour.launcher.ts`](src/app/services/presentation-help-tour.launcher.ts). Home handoff + exit navigation: [`presentation-home-handoff.coordinator.ts`](src/app/services/presentation-home-handoff.coordinator.ts). Persisted settings: [`presentation-settings.coordinator.ts`](src/app/services/presentation-settings.coordinator.ts). Template: [`presentation.component.html`](src/app/pages/presentation/presentation.component.html). Member slides use an empty description; mutations go through [`prayer-card-actions.facade.ts`](src/app/services/prayer-card-actions.facade.ts) with allowance from [`prayer-allowance-policy.service.ts`](src/app/services/prayer-allowance-policy.service.ts). Prompt tallies use per-prompt floors until `PromptService` emits (cleared on session change); community/member refetches use `applyLivePrayedForFloor`. **Tests:** page integration in [`presentation.component.spec.ts`](src/app/pages/presentation/presentation.component.spec.ts); playback in [`presentation-playback.controller.spec.ts`](src/app/services/presentation-playback.controller.spec.ts); loader filters in [`presentation-content-loader.spec.ts`](src/app/services/presentation-content-loader.spec.ts); fetch orchestration and slide mutation in [`presentation-content.coordinator.spec.ts`](src/app/services/presentation-content.coordinator.spec.ts); timer/input/help-tour in matching `*.spec.ts` beside each controller.
- **Presentation loop:** [`PresentationSettingsService`](src/app/services/presentation-settings.service.ts) persists `loop` (default `true`). When `loop` is false, [`presentation-playback.controller.ts`](src/app/services/presentation-playback.controller.ts) auto-play runs through all slides once, stops, and shows a completion overlay (same styling as the prayer timer end message). Closing with **X** calls `dismissPresentationComplete()`, which resets to the first slide **paused**; pressing **Play** dismisses the overlay (if open) and starts another single pass.
- **Presentation settings modal:** [`PresentationSettingsModalComponent`](src/app/components/presentation-settings-modal/presentation-settings-modal.component.ts) is a shell that composes shared [`modal-shell`](src/app/components/modal-shell/modal-shell.component.ts) (`panelId` `tour-presentation-settings-modal`, `closeOnBackdrop` false), theme ([`presentation-settings-theme-section`](src/app/components/presentation-settings-modal/presentation-settings-theme-section.component.ts) + [`presentation-settings-theme-picker`](src/app/components/presentation-settings-modal/presentation-settings-theme-picker.component.ts)), filters ([`presentation-settings-filters-panel`](src/app/components/presentation-settings-modal/presentation-settings-filters-panel.component.ts) — [`PresentationMultiSelectFilterField`](src/app/lib/presentation-settings-multi-select-field.ts) for content type / category dropdowns; presentational rows via [`presentation-settings-multi-select-filter-row`](src/app/components/presentation-settings-modal/presentation-settings-multi-select-filter-row.component.ts); prayer status + time in [`presentation-settings-prayer-status-time-filters`](src/app/components/presentation-settings-modal/presentation-settings-prayer-status-time-filters.component.ts) with [`PresentationPrayerStatusFilterField`](src/app/lib/presentation-settings-prayer-status-filter-field.ts) and [`presentation-settings-single-select-filter-row`](src/app/components/presentation-settings-modal/presentation-settings-single-select-filter-row.component.ts); open/close helpers in [`presentation-settings-filters-dropdown.ts`](src/app/lib/presentation-settings-filters-dropdown.ts); status helpers in [`presentation-settings-filters-state.ts`](src/app/lib/presentation-settings-filters-state.ts); option labels in [`presentation-settings-filter-options.ts`](src/app/lib/presentation-settings-filter-options.ts); presentational [`presentation-settings-multi-select-dropdown`](src/app/components/presentation-settings-modal/presentation-settings-multi-select-dropdown.component.ts) and [`presentation-settings-single-select-dropdown`](src/app/components/presentation-settings-modal/presentation-settings-single-select-dropdown.component.ts)), display/timing ([`presentation-settings-display-section`](src/app/components/presentation-settings-modal/presentation-settings-display-section.component.ts) + [`presentation-settings-toggle-row`](src/app/components/presentation-settings-modal/presentation-settings-toggle-row.component.ts), [`presentation-settings-duration-controls`](src/app/components/presentation-settings-modal/presentation-settings-duration-controls.component.ts), [`presentation-settings-smart-mode-info`](src/app/components/presentation-settings-modal/presentation-settings-smart-mode-info.component.ts), [`presentation-settings-range-field`](src/app/components/presentation-settings-modal/presentation-settings-range-field.component.ts)), and prayer-timer ([`presentation-settings-timer-section`](src/app/components/presentation-settings-modal/presentation-settings-timer-section.component.ts)) sections. Theme, filters, display, and timer share bordered panel chrome via [`presentation-settings-section-card`](src/app/components/presentation-settings-modal/presentation-settings-section-card.component.ts). Tour anchor ids (`tour-presentation-setting-*`) remain on the child templates. Parent page still binds `@Input` / `@Output` on the modal selector unchanged.
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

### User prayer reminders (self nudges)

Users can save one or more **local clock times** (IANA zone + hour + quarter-minute) in **Settings**. A process runs **every 15 minutes** and notifies matching users:

- **Table**: `user_prayer_hour_reminders` (base migration `20260315120000_user_prayer_hour_reminders.sql`; quarter-minutes + cron upgrade in `20260803160000_reminder_quarter_hour_and_prayer_item_reminders.sql`). Matching uses local `HOUR` and `MINUTE` against `local_hour` / `local_minute`. **DST**: Postgres IANA rules. **RLS**: JWT own-row + anon MFA permissive policy (same pattern as before).
- **Edge function**: `supabase/functions/send-user-hourly-prayer-reminders/` — same auth model as **`send-prayer-reminders`**. Sends **email** when `email_subscribers.is_active` is not false. Sends **push** when `receive_push` is true and a `device_tokens` row exists. **Both** when both apply. **Email** uses `email_templates` from **`user_hourly_prayer_reminder_template_key`**; **`{{appLink}}`** is home-only for the simple template, or **`APP_URL/?prayerId=`** for the spotlight pick when one exists. Push spotlight sends include **`prayerId`** for tap navigation ([`app.component.ts`](src/app/app.component.ts)).
- **Scheduling (Supabase)**: Job **`invoke-user-hourly-prayer-reminders`** schedule **`*/15 * * * *`** UTC (Vault `project_url` + `service_role_key`). See [SETUP.md](SETUP.md).
- **App**: [`UserHourReminderService`](src/app/services/user-hour-reminder.service.ts) + cache on `UserSessionData`; [`HourReminderSettingsSectionComponent`](src/app/components/hour-reminder-settings-section/hour-reminder-settings-section.component.ts) saves device IANA timezone.

### Per-prayer item reminders

- **Table / RPC / template / cron / purge triggers**: `user_prayer_item_reminders`, `get_user_prayer_item_reminders_due_now()`, template `user_prayer_item_reminder` (includes latest-update block), job `invoke-user-prayer-item-reminders` (`*/15`), and delete/archive/answered purge triggers — all in `20260803160000_reminder_quarter_hour_and_prayer_item_reminders.sql` (idempotent / re-runnable).
- **Edge**: `supabase/functions/send-user-prayer-item-reminders/` — deletes `once` rows after send; stamps `last_sent_at` for daily/weekly; skips + deletes inactive community/personal targets; injects latest update via `{{updateBlockHtml}}` (same CSS as spotlight).
- **App**: [`PrayerItemReminderService`](src/app/services/prayer-item-reminder.service.ts); push tap → `/?prayerId=`.

### User memorization reminders (self nudges)

Same delivery model as prayer Settings reminders, but for scripture memory practice:

- **Table**: `user_memorization_hour_reminders` (base `20260714120000_user_memorization_hour_reminders.sql`; `local_minute` + `*/15` cron in `20260803160000_reminder_quarter_hour_and_prayer_item_reminders.sql`).
- **Edge function**: `supabase/functions/send-user-hourly-memorization-reminders/` — **email** when `is_active`; **push** when `receive_push` + `device_tokens`; template from `admin_settings.user_hourly_memorization_reminder_template_key`. **`{{appLink}}`** = `APP_URL/?filter=memorize`.
- **Scheduling**: pg_cron job **`invoke-user-hourly-memorization-reminders`** (`*/15 * * * *` UTC), same Vault secrets.
- **App**: Same [`UserHourReminderService`](src/app/services/user-hour-reminder.service.ts) (`kind: 'memorization'`) + `UserSessionData.memorizationHourReminders`; settings UI **Memorization reminders**.
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
