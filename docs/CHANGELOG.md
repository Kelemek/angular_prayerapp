# Changelog

Major features and milestones for the Prayer App.

## [Current] - February 2026

### Print Prayers — anonymous requesters ✅
- **Behavior**: **Print Prayers** (Settings) now shows **Requested by Anonymous** when the community prayer has **`prayers.is_anonymous`**, matching prayer cards and reminder emails. Implementation: [`print.service.ts`](src/app/services/print.service.ts), [`printablePrayerList.ts`](src/utils/printablePrayerList.ts).
- **Security**: [`printablePrayerList.ts`](src/utils/printablePrayerList.ts) now **HTML-escapes** **`prayer_for`**, **requester**, and **update author** when building printable HTML (same pattern as [`print.service.ts`](src/app/services/print.service.ts)), so malicious strings cannot break out of text context into raw markup.

### Rich-text editing for prayers and updates ✅
- **Behavior**: Prayer descriptions and update content now support **bold**, **italic**, **underline** (TipTap `++text++` in Markdown), **strikethrough**, **bullet** / **numbered lists**, and **blockquotes** across every authoring surface (request a prayer, edit a prayer, add / edit an update, admin approval workflows, and the admin **Prayer Editor**). Rich text is stored as **Markdown** in the existing `prayers.description` and `prayer_updates.content` TEXT columns — no schema change — so older native-app builds render raw Markdown gracefully (e.g. `**bold**`, `- item`) until they update. Admin denial reasons and email-template bodies remain plain text.
- **New components**: [`RichTextEditorComponent`](src/app/components/rich-text-editor/rich-text-editor.component.ts) (Tiptap v2 + `StarterKit` + `tiptap-markdown`, implements `ControlValueAccessor` for `ngModel`, toolbar with bold / italic / underline / bullet list / ordered list / blockquote) and [`RichTextViewComponent`](src/app/components/rich-text-view/rich-text-view.component.ts) (marked + DOMPurify, prose-like styling, `target="_blank"` + `rel="noopener noreferrer"` on links, `javascript:` hrefs stripped).
- **Utilities**: [`src/utils/markdown.ts`](src/utils/markdown.ts) — **`markdownToSafeHtml`** (allow-listed tag/attr DOMPurify pass) and **`markdownToPlainText`** (strips code fences, links, emphasis, list markers, headings, blockquotes) for push notification previews and analytics-style character counts.
- **New inline admin editing**: [`admin-prayer-approval.component.ts`](src/app/components/admin-prayer-approval/admin-prayer-approval.component.ts) and [`consolidated-prayer-approval.component.ts`](src/app/components/consolidated-prayer-approval/consolidated-prayer-approval.component.ts) gained **Edit** buttons next to the prayer description (and per update in the consolidated view) so admins can correct formatting before approval. Saves go through [`AdminDataService`](src/app/services/admin-data.service.ts) `editPrayer` / `editUpdate`.
- **Swapped surfaces**: [`prayer-form`](src/app/components/prayer-form/prayer-form.component.ts), [`prayer-card`](src/app/components/prayer-card/prayer-card.component.ts) (Add Update editor + description / update rendering), [`personal-prayer-edit-modal`](src/app/components/personal-prayer-edit-modal/personal-prayer-edit-modal.component.ts), [`personal-prayer-update-edit-modal`](src/app/components/personal-prayer-update-edit-modal/personal-prayer-update-edit-modal.component.ts), [`admin-prayer-edit-modal`](src/app/components/admin-prayer-edit-modal/admin-prayer-edit-modal.component.ts), [`admin-update-edit-modal`](src/app/components/admin-update-edit-modal/admin-update-edit-modal.component.ts), [`admin-update-approval`](src/app/components/admin-update-approval/admin-update-approval.component.ts), [`pending-update-card`](src/app/components/pending-update-card/pending-update-card.component.ts), [`pending-prayer-card`](src/app/components/pending-prayer-card/pending-prayer-card.component.ts), [`prayer-search`](src/app/components/prayer-search/prayer-search.component.ts) (create, edit, add-update, edit-update forms + display), [`prayer-display-card`](src/app/components/prayer-display-card/prayer-display-card.component.ts), and the presentation view's **`totalChars`** calculation in [`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts).
- **Notifications, print, email**: [`admin-data.service.ts`](src/app/services/admin-data.service.ts) uses **`markdownToPlainText`** for push notification bodies so raw Markdown never leaks into a notification banner. [`print.service.ts`](src/app/services/print.service.ts) and [`printablePrayerList.ts`](src/utils/printablePrayerList.ts) render descriptions / updates with **`markdownToSafeHtml`** so printable lists show proper formatting. [`email-notification.service.ts`](src/app/services/email-notification.service.ts) splits variables between `text_body` (plain text) and `html_body` (safe HTML) for `requester_approval`, `denied_prayer`, `denied_update`, `update_author_approval`, and admin notification templates; queued subscriber emails expose both **`{{prayerDescription}}`** (raw, backward compatible) and new **`{{prayerDescriptionHtml}}`** / **`{{prayerDescriptionText}}`** / **`{{updateContentHtml}}`** / **`{{updateContentText}}`** variables so email templates can be updated to render rich text. The [`send-user-hourly-prayer-reminders`](supabase/functions/send-user-hourly-prayer-reminders/index.ts) Edge Function gained a local **`stripMarkdownToText`** helper that replaces `stripHtmlToText` for spotlight descriptions and the latest update preview.
- **Tests**: [`markdown.spec.ts`](src/utils/markdown.spec.ts) covers sanitization and plain-text stripping; [`rich-text-view.component.spec.ts`](src/app/components/rich-text-view/rich-text-view.component.spec.ts) and [`rich-text-editor.component.spec.ts`](src/app/components/rich-text-editor/rich-text-editor.component.spec.ts) cover rendering and editor instantiation. Existing specs for approval components were updated to construct the new `AdminDataService` / `ToastService` / `ChangeDetectorRef` constructor args.
- **Underline everywhere**: TipTap stores underline as `++text++`. [`markdown.ts`](src/utils/markdown.ts) already expands that for `marked` and adds inline `text-decoration` on `<u>` after DOMPurify (for HTML email clients). [`print.service.ts`](src/app/services/print.service.ts) and [`printablePrayerList.ts`](src/utils/printablePrayerList.ts) add explicit `u` / `strong` / `em` / `s` rules for printed prayer descriptions and updates. [`send-user-hourly-prayer-reminders`](supabase/functions/send-user-hourly-prayer-reminders/index.ts) `stripMarkdownToText` strips `++` for plain spotlight/update previews (parity with `markdownToPlainText`).
- **Underline persistence fix**: With `tiptap-markdown` and `html: false`, the default mark serializer dropped underline on `getMarkdown()`. [`UnderlineWithMarkdown`](src/app/lib/tiptap-underline-markdown.extension.ts) extends `@tiptap/extension-underline` with `storage.markdown.serialize` (`++` / `++`), and [`RichTextEditorComponent`](src/app/components/rich-text-editor/rich-text-editor.component.ts) disables StarterKit’s built-in underline in favor of this extension so saves (including **Save** on edit update) persist `++` in the database.

### Hourly spotlight email — requester variable ✅
- **Behavior**: [`send-user-hourly-prayer-reminders`](supabase/functions/send-user-hourly-prayer-reminders/index.ts) fills **`{{spotlightPrayerRequester}}`** from community prayer submitter info: **`Anonymous`** when **`prayers.is_anonymous`**, otherwise **`prayers.requester`**. Personal spotlight picks use **`Me`**. Template substitution allows optional spaces around names (e.g. `{{ spotlightPrayerRequester }}`).
- **Docs**: [`email-templates-manager.component.ts`](src/app/components/email-templates-manager/email-templates-manager.component.ts), [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) (Prayer reminders).

### Mass email subscriber links — Current / Answered tab ✅
- **Behavior**: Queued subscriber emails for approved prayers and updates (`approved_prayer`, `approved_update`, `prayer_answered`) set **`{{appLink}}`** to the web app with **`?filter=current`** or **`?filter=answered`** from parent prayer status so recipients land on the matching home list tab. **`HomeComponent`** reads `filter` on load (and on later navigations to home with that query), applies the tab, then strips the query param via **`replaceUrl`**. Implementation: [`email-notification.service.ts`](src/app/services/email-notification.service.ts) (`buildSubscriberAppLink`, `ApprovedUpdatePayload.prayerStatus`), [`admin-data.service.ts`](src/app/services/admin-data.service.ts), [`home.component.ts`](src/app/pages/home/home.component.ts).
- **Docs**: [`email-templates-manager.component.ts`](src/app/components/email-templates-manager/email-templates-manager.component.ts) notes **`{{appLink}}`** for mass templates.

### Hourly user prayer reminder — random recent prayer ✅
- **Behavior**: When Admin → **Settings** → **Email** uses the **random recent prayer** template option, the hourly Edge Function [`send-user-hourly-prayer-reminders`](supabase/functions/send-user-hourly-prayer-reminders/index.ts) builds a pool from **every** approved **current** community prayer (`prayers`, app-wide, no date cutoff) plus **all** **personal** prayers for that subscriber (`personal_prayers`: not **Answered**). It picks randomly, preferring a **different** prayer than the last send when more than one qualifies. **`email_subscribers.hourly_reminder_last_spotlight_key`** updates after a **successful push or email** (not email-only), so push-only subscribers still rotate when several prayers qualify. Template variables `{{spotlightPrayerKind}}`, `{{spotlightPrayerTitle}}`, `{{spotlightPrayerFor}}`, `{{spotlightPrayerRequester}}` (community: **Anonymous** if anonymous, else name; personal: **Me**), `{{spotlightPrayerDescription}}` are filled (empty when none); **`{{updateContent}}`** is the **most recent approved** community update or **latest** personal update (`personal_prayer_updates`), with **`{{spotlightLatestUpdateHtml}}`** / **`{{spotlightUpdateTextSection}}`** for default layouts; HTML bodies use escaped text. **Push** includes a truncated snippet of the latest update when present.
- **Data**: Migration [`20260414120000_user_hourly_reminder_spotlight_prayer.sql`](supabase/migrations/20260414120000_user_hourly_reminder_spotlight_prayer.sql) — `admin_settings.user_hourly_prayer_reminder_template_key`, `email_subscribers.hourly_reminder_last_spotlight_key`, and default template **`user_hourly_prayer_reminder_with_spotlight`** (Prayer Update–style HTML; **`{{spotlightUpdateBlockHtml}}`** omits the Update block when there is no update; built-in footer/description copy matches the no–14-day pool). **Note**: environments that already applied this migration filename will not re-run it; update the template row in **Email Templates** or run an equivalent `UPDATE` if you need the new footer text in production.
- **Admin UI**: [`email-settings.component.ts`](src/app/components/email-settings/email-settings.component.ts) — **Hourly user prayer reminder email** uses the same **collapsible card** pattern as **Prayer Update Reminders** (hover shell, chevron, bordered panel); [`email-templates-manager.component.ts`](src/app/components/email-templates-manager/email-templates-manager.component.ts) documents spotlight variables.

### Admin help (tutorial videos) ✅
- **Prayer Editor — create a prayer (list icon)**: The Admin Help row for **`admin_help_prayer_editor`** uses a **document with plus** icon in [`admin-help-content.service.ts`](src/app/services/admin-help-content.service.ts) so it reads as “new prayer form,” not search.
- **Prayer Prompts & Prayer Types (driver.js)**: Admin Help topic **`admin_help_prompts_and_types`** is a **launch-only** row. [`startPrayerPromptsAndTypesTour`](src/app/services/admin-help-driver-tour.service.ts) walks **Settings** → **Content** (`#admin-settings-tab-content`), **`#prompt-manager-settings-trigger`** and tour anchors **`#tour-prompt-manager-toolbar`** through **`#tour-prompt-manager-list-area`**, then **`#prayer-types-manager-trigger`** and **`#tour-prayer-types-toolbar`** through **`#tour-prayer-types-list-area`**. [`PromptManagerComponent`](src/app/components/prompt-manager/prompt-manager.component.ts) and [`PrayerTypesManagerComponent`](src/app/components/prayer-types-manager/prayer-types-manager.component.ts) expose **`prepareTourInitialState`** (expand section, cancel edit, load data); [`AdminComponent`](src/app/pages/admin/admin.component.ts) uses **`#promptManager`** / **`#prayerTypesManager`** and **`onPrayerPromptsTypesTourFromHelp`**. The tour does **not** open CSV, Add Prompt, or Add Type forms.
- **Prayer Editor — create a prayer (driver.js)**: Admin Help topic **`admin_help_prayer_editor`** is a **launch-only** row (like email subscribers). [`startPrayerEditorCreateTour`](src/app/services/admin-help-driver-tour.service.ts) walks **Settings** → **Tools** (`#admin-settings-tab-tools`), **Prayer Editor** (`#prayer-editor-settings-trigger`), **Create New Prayer** (`#tour-prayer-editor-create-btn`; **Next** runs `openCreatePrayerForm` to open the form), then field groups `#tour-prayer-editor-field-find-subscriber` through `#tour-prayer-editor-field-status`, **`#tour-prayer-editor-create-submit`** (notes post-save **send to subscribers** prompt), then a closing popover. [`PrayerSearchComponent`](src/app/components/prayer-search/prayer-search.component.ts) exposes `preparePrayerEditorTourInitialState` and `openCreatePrayerFormForTour`; [`AdminComponent`](src/app/pages/admin/admin.component.ts) uses `#prayerSearch` and `onPrayerEditorTourFromHelp`.
- **Prayer Editor — edit, delete, add update (driver.js)**: Admin Help topic **`admin_help_prayer_editor_manage`**. [`startPrayerEditorManageTour`](src/app/services/admin-help-driver-tour.service.ts) walks Tools → Prayer Editor, then the **first prayer**: **Next** runs **`openEditFormForTour`** → field steps (`#tour-prayer-editor-edit-field-*`) → **`cancelEditForTour`** → **`openAddUpdateFormForTour`** → add-update field steps → **`cancelAddUpdateForTour`** (nothing saved). Closing popover notes that real **Save** / **Save Update** can **prompt to send an email to subscribers** (broadcast). **`resetTourUiState`** runs on driver destroy (e.g. close **X**) so edit/add-update is not left open. Row count from **`preparePrayerEditorManageTourInitialState` → `Promise<boolean>`**; [`AdminPrayerEditorManageTourCallbacks`](src/app/services/admin-help-driver-tour.service.ts) wires [`PrayerSearchComponent`](src/app/components/prayer-search/prayer-search.component.ts). Admin starts the tour on the next macrotask after prepare.
- **Email subscribers guided tour (driver.js)**: Tour copy highlights that admins may add a subscriber **manually** (**Manual Entry**) **or** via **Search Planning Center**, with **`#tour-email-add-mode-tabs`** titled **Two ways to add someone**. After the demo search (no auto-select), the tour highlights the **first** Planning Center result row (**`#tour-email-pc-search-result-mark`**), then **`#tour-email-add-selected-pc-btn`**, then **`#tour-email-manual-entry-form`** with fields filled via **`applyTourDemoPlanningCenterAdd`**, then **`#tour-email-manual-add-subscriber-btn`**; **`selectTourPlanningCenterMatchFromDemoResults`** selects Mark Larson or the first row before **Add Selected Subscriber**. In Admin Help, the **Email subscribers & Planning Center** row is a **single tap target** (play icon). **`clearEmailSubscribersTourDemoForm`** runs after the final **Add Subscriber** highlight. Stable anchors also include `#admin-settings-tab-email`, `#tour-email-pc-search-tab`, `#pcSearchNameInput`. [`EmailSubscribersComponent`](src/app/components/email-subscribers/email-subscribers.component.ts) exposes `prepareTourInitialState`, `openAddFormForTour`, `showPlanningCenterTabForTour`, `runPlanningCenterSearchTourDemo`, `selectTourPlanningCenterMatchFromDemoResults`, `applyTourDemoPlanningCenterAdd`, and `clearEmailSubscribersTourDemoForm` for tour hooks.
- **Email Subscribers — overview (driver.js)**: Admin Help topic **`admin_help_email_subscribers_overview`** ([`startEmailSubscribersOverviewTour`](src/app/services/admin-help-driver-tour.service.ts)) walks **Settings** → **Email** → **Email Subscribers**, then **`#tour-email-subscribers-toolbar`**, **`#tour-email-subscribers-search`** (copy explains pre-filled **`app-test`**), then one step per column on the **first result row** (`#tour-email-overview-name` through `#tour-email-overview-delete`) and **`#tour-email-subscribers-pagination`**. [`prepareOverviewTourListState`](src/app/components/email-subscribers/email-subscribers.component.ts) runs **`handleSearch`** with **`app-test`** so a demo row (e.g. App-Test Account) appears when present; if nothing matches, a single list-area step explains the fallback. Admin awaits **`prepareEmailSubscribersOverviewTour`** before starting the driver. The closing step points to **Email subscribers & Planning Center** for the add flow.
- **Admin Portal** header: **Help** (`?`) control to the **left** of **Main Site**, styled like the main app help button.
- **[`admin-help-modal.component.ts`](src/app/components/admin-help-modal/admin-help-modal.component.ts)**: Modal with search, accordions, and per-topic **Watch tutorial** / **Hide tutorial video** (lazy iframe). Embed URLs must be **https** on allowlisted hosts (`youtube.com`, `youtube-nocookie.com`, `player.vimeo.com`); normalization lives in [`admin-help-video-url.ts`](src/app/lib/admin-help-video-url.ts).
- **Content**: Static sections in [`admin-help-content.service.ts`](src/app/services/admin-help-content.service.ts); includes **Email Subscribers — list & toolbar** (overview tour), **Email subscribers & Planning Center**, **Prayer Editor — create a prayer**, **Prayer Editor — edit, delete, add update**, and **Prayer Prompts & Prayer Types** with optional **`videoEmbedUrl`**. Per-topic **Video coming soon** when a section has no valid embed URL.
- **Tests**: [`admin-help-driver-tour.service.spec.ts`](src/app/services/admin-help-driver-tour.service.spec.ts) covers overview column branches, **`destroy`**, and driver **`onNextClick`** paths for email-subscribers and Prayer Editor tours (mocked `driver.js`). Unit tests also cover [`prepareOverviewTourListState`](src/app/components/email-subscribers/email-subscribers.component.ts), [`prepareEmailSubscribersOverviewTour`](src/app/components/email-settings/email-settings.component.ts), [`onEmailSubscribersOverviewTourFromHelp`](src/app/pages/admin/admin.component.ts) (including missing `emailSettingsRef`), [`admin-help-content.service.spec.ts`](src/app/services/admin-help-content.service.spec.ts), and **`startEmailSubscribersOverviewTour`** emit on [`admin-help-modal.component.spec.ts`](src/app/components/admin-help-modal/admin-help-modal.component.spec.ts). **`onEmailSubscribersOverviewTourFromHelp`** uses **`Promise.resolve`** around optional **`prepareEmailSubscribersOverviewTour`** so the overview tour still starts when the ViewChild is not ready.

### Admin portal settings UI ✅
- **Collapsible cards** (Admin → Settings: Analytics, Email, Content, Tools, Security) use a shared pattern: consistent **`p-6`** padding on card shells, **`shadow-md`** where cards were mixed (`Database Backup Status`, **Email Templates**, etc.), and a **`min-h-12`** header row with class **`admin-settings-collapsible-trigger`** on the title toggle so closed sections align visually across tabs.
- **Collapsed state**: The **entire card** (outer shell) expands on click, not only the title row; **`cursor-pointer`** applies to the shell while collapsed. The header **button** still handles keyboard focus and calls **`$event.stopPropagation()`** so a click on the title does not fire the shell handler twice.
- **Prayer Editor** ([`prayer-search.component.ts`](src/app/components/prayer-search/prayer-search.component.ts), Admin → Tools): Removed the redundant intro paragraph above **Create New Prayer**; hints live in the search **placeholder** and empty state (see **Prayer Editor search** and **Find subscriber** sections below).

### Prayer Editor: Find subscriber (create prayer) ✅
- **Create New Prayer**: Admins can **Find subscriber** before filling the form—searches **`email_subscribers`** by **name** or **email** with **`ilike`** (patterns escaped for `%` / `_`), **`select('email,name')`** only to keep payloads small, **`limit` 20**, **minimum 2 characters**, and **350 ms debounce** so typing does not hammer the API.
- **Dropdown**: Results show in a **listbox**; **`mousedown`** on a row selects without losing focus to blur. Choosing a subscriber **splits `name`** into first/last on the create form and sets **email**, then clears the lookup UI. A **monotonic request sequence** ignores out-of-order responses if the query changes while a request is in flight.

### Prayer Editor: Find subscriber (add prayer update) ✅
- **Add New Update**: The same **Find subscriber** lookup (shared query via [`fetchSubscriberRows`](src/app/components/prayer-search/prayer-search.component.ts) on **`email_subscribers`**) appears at the **top** of the add-update block; choosing a row fills **First name**, **Last name**, and **Author email** for the update. State is **separate** from the create-prayer lookup so the two flows do not interfere. **`startAddUpdate`** clears the draft and lookup when opening the form from **Add Update**.

### Prayer Editor — `approved_at` on save ✅
- **Data**: In Admin → **Tools** → **Prayer Editor**, **Save** on an edited prayer, **Save Update** when adding a new update, and **Save Update** when editing an existing update now set **`approved_at`** on the corresponding **`prayers`** or **`prayer_updates`** row (current time, ISO), matching implicit admin approval and analytics that key off approval time. Implementation: [`prayer-search.component.ts`](src/app/components/prayer-search/prayer-search.component.ts) (`savePrayer`, `saveNewUpdate`, `saveEditUpdate`).

### Prayer Editor search — prayer updates & debounce ✅
- **Prayer update text**: Admin **Prayer Editor** (Tools) and the main app **prayer list filter** both treat **prayer update `content`** as searchable, not only columns on the prayer row. [`prayer-search.component.ts`](src/app/components/prayer-search/prayer-search.component.ts) loads prayers with embedded `prayer_updates`, runs field matches, and merges IDs from a `prayer_updates.content` **`ilike`** query against PostgREST. [`PrayerService`](src/app/services/prayer.service.ts) **`applyFilters`** / **`getFilteredPrayers`** include the same idea for the home search box (match on `updates[].content`).
- **Debounced query**: Main text search uses a **minimum length** (`mainSearchMinChars`, default **2**) and **debounced** input so short typing does not spam the API; **Enter** can flush immediately where implemented.
- **Copy**: Placeholder and empty-state strings call out title, requester, email, description, **prayer updates**, denial reasons, etc. (aligned with the queries above).

### Help modal guided tour (driver.js) ✅
- **Creating Prayers** (`help_prayers`): one **Start guided tour** → [`startCreatingPrayersHelpSectionTour`](src/app/services/help-driver-tour.service.ts): community **Request** + form (`#prayer_for`, `#description`, `#tour-prayer-visibility`, `#tour-prayer-anonymous`) → close form → **Add Update** / inline update / optional anonymous / mark answered when available. **No** filter-tile steps—those are [`startFilteringHelpSectionTour`](src/app/services/help-driver-tour.service.ts) under **Filtering Prayers**. **Skips** private-prayer creation (**Personal Prayers** tour). [`startNewPrayerRequestTour`](src/app/services/help-driver-tour.service.ts), [`startPersonalPrayerTour`](src/app/services/help-driver-tour.service.ts), [`startUpdatingPrayerTour`](src/app/services/help-driver-tour.service.ts), and [`startManagingPrayerViewsTour`](src/app/services/help-driver-tour.service.ts) remain for reuse or tests. [`defaultPersonalPrayer`](src/app/components/prayer-form/prayer-form.component.ts) on home when the **Personal** filter is active.
- **Filtering Prayers** (`help_filtering`): footer **Start guided tour** → [`startFilteringHelpSectionTour`](src/app/services/help-driver-tour.service.ts): section title/description, then **`#tour-filter-current`** with **Filter Options** copy, **`#tour-filter-answered`** (clause from overview text), **`#tour-filter-total`** + **Finding Archived Prayers** block, **`#tour-filter-prompts`** (Prompts clause), **`#tour-filter-personal`** + **Personal Prayers Filter** block, **`#tour-prayer-search`** + **Search Across All Filters**; [`FilteringHelpSectionTourHooks`](src/app/services/help-driver-tour.service.ts) on [`HomeComponent`](src/app/pages/home/home.component.ts). Steps omit controls missing from the DOM.
- **Using Prayer Prompts** (`help_prompts`): one **Start guided tour** under the section topics → [`startPrayerPromptsTour`](src/app/services/help-driver-tour.service.ts): **`#tour-filter-prompts`** (intro + **Show prompts**), then either **`#tour-prompt-type-filters`** + **`#tour-prompt-card-sample`** (first card) or **`#tour-prompt-empty-state`**, then **`#tour-btn-prayer-mode-*`** (Pray / presentation; mentions **Settings → Print Prompts**).
- **Prayer Encouragement (Pray For)** (`help_prayer_encouragement`): **Start guided tour** → [`startPrayerEncouragementTour`](src/app/services/help-driver-tour.service.ts): **`#tour-filter-current`** (intro + **Show current**), optional **`#tour-prayer-pray-for`** on the first community card, then a **popover-only** step with more detail.
- **Searching Prayers** (`help_search`): **Start guided tour** → [`startSearchPrayersTour`](src/app/services/help-driver-tour.service.ts): **`#tour-prayer-search`** on Home, then **popover-only** search tips (**Clear Search**, phrases, breadth of terms).
- **Personal Prayers** (`help_personal_prayers`): **Start guided tour** → [`startPersonalPrayersHelpSectionTour`](src/app/services/help-driver-tour.service.ts): hands-on flow—**Request** → form steps auto-filled (**Test Personal Prayer**, sample description, **Personal Prayer**, **Test Category**) → submit → **`#tour-walkthrough-personal-prayer-card`** → edit modal (**`#tour-personal-prayer-edit-modal`**) → **Add update** / textarea → **`#tour-personal-category-filters`** + filter to sample category → card **drag handle** → **delete** (removes sample prayer via API). Constants: `PERSONAL_PRAYER_WALKTHROUGH_*` in the tour service; [`PrayerFormComponent`](src/app/components/prayer-form/prayer-form.component.ts) walkthrough helpers. This is where **private** prayer creation is toured; **Creating Prayers** sticks to community flow + filters.
- **Prayer Presentation Mode** (`help_presentation`): **Start guided tour** runs [`startPresentationModePrayButtonPreludeTour`](src/app/services/help-driver-tour.service.ts) on Home first—highlights header **Pray** (`tour-btn-prayer-mode-*`); **Next** stores `PRESENTATION_HELP_TOUR_SESSION_KEY` and navigates to **`/presentation`**. [`PresentationComponent`](src/app/pages/presentation/presentation.component.ts) runs [`startPresentationModeTour`](src/app/services/help-driver-tour.service.ts) after load: toolbar, controls, settings walkthrough, then final step **Next** calls **`exitPresentation`** (return home), not only the exit button highlight.
- **Printing** (`help_printing`): **Start guided tour** → [`startPrintingHelpSectionTour`](src/app/services/help-driver-tour.service.ts): header **Settings** (`tour-btn-settings-*`), **Next** opens modal, then **`#tour-settings-print-buttons`**, **`#tour-settings-print-prayers`**, **`#tour-settings-print-prompts`**, **`#tour-settings-print-personal`**, tips popover, final **Next** closes Settings.
- **Email Subscription** (`help_email_subscription`): **Start guided tour** → [`startEmailSubscriptionHelpSectionTour`](src/app/services/help-driver-tour.service.ts): **Settings** gear, **`#tour-settings-email-subscription`** (mass email toggle), popover on push vs direct mail, final **Next** closes Settings.
- **Prayer reminders** (`help_prayer_reminders`): **Start guided tour** → [`startPrayerRemindersHelpSectionTour`](src/app/services/help-driver-tour.service.ts): **Settings** gear, **`#tour-settings-prayer-reminders`**, **`#tour-settings-prayer-reminder-controls`** (hour + **Add reminder**), tips popover, final **Next** closes Settings.
- **Feedback** (`help_feedback`): **Start guided tour** → [`startFeedbackHelpSectionTour`](src/app/services/help-driver-tour.service.ts): **Settings** gear, **`#tour-settings-feedback-section`** (always; form or disabled note), **`#tour-settings-feedback-type`**, **`#tour-settings-feedback-details`** in [`GitHubFeedbackFormComponent`](src/app/components/github-feedback-form/github-feedback-form.component.ts) when enabled, tips popover, final **Next** closes Settings.
- **App Settings** (`help_settings`): **Start guided tour** → [`startAppSettingsHelpSectionTour`](src/app/services/help-driver-tour.service.ts): **Settings** gear, then top-to-bottom highlights—**`#tour-settings-print-buttons`**, **`#tour-settings-theme`**, **`#tour-settings-text-size`**, **`#tour-settings-email-subscription`**, **`#tour-settings-push-notifications`** (when shown), **`#tour-settings-badges`**, **`#tour-settings-prayer-encouragement`**, **`#tour-settings-default-view`**, **`#tour-settings-prayer-reminders`**, **`#tour-settings-feedback-section`**, popovers for footer/logout/delete, final **Next** closes Settings.
- Stable `help-block-{sectionId}-{index}` anchors; community tour targets `tour-btn-new-prayer-request-*`, `#prayer_for`, `#description`, `#tour-prayer-visibility`, `#tour-prayer-anonymous`.

### Church website URL (header logo link) ✅
- Optional **`admin_settings.church_website_url`**: admins set it in **App Branding**; cached with other branding (`BrandingService`, `branding_last_modified` trigger includes URL changes).
- Home header **`app-logo`**: when the URL is a valid `http:`/`https:` link, the logo image and text title/subtitle wrap in an external link (`target="_blank"`, `rel="noopener noreferrer"`).
- Migration: `20260327130000_church_website_url.sql`.

### Info Page (`/info`) ✅
- ✅ **Public landing/overview page at `/info`**
  - Hero with app icon, “Cross Pointe Prayer Community” title, and short description.
  - CTAs: Web App (with QR), App Store (with QR), Android (coming soon).
  - Interactive feature preview: mock header (Help, Settings, Pray, Request), filter tabs (Current, Answered, Total, Prompts, Personal), and sample cards with modals (badges, prompt categories, personal actions).
  - Theme toggle and light/dark support; uses BrandingService for optional church logo.
  - No auth required; linked from login (“Learn more about this app”) and support (“About the app”).

- ✅ **Implementation**
  - `src/app/pages/info/info.component.ts` (standalone, lazy-loaded).
  - Route added in `app.routes.ts`; documented in README.md, docs/README.md, and DEVELOPMENT.md (Public Routes, Info Page section).

### Push Notifications and Email/Push Preferences ✅
- ✅ **`receive_push` default false and set only when device token is registered**
  - New subscribers and existing rows default to `receive_push = false`. When the native app stores a device token (`PushNotificationService.storeDeviceToken()`), it sets `receive_push = true` for that subscriber. Users can turn push off in Settings.
  - Migration: `20260223_receive_push_default_false.sql` (default + backfill).

- ✅ **Separate email vs push preferences**
  - **`is_active`** = mass **email** only (new/approved prayers, updates). Turning off "email notifications" only stops bulk emails; direct emails (e.g. your prayer approved/denied) still go out.
  - **`receive_push`** = app **push** (enabled when the app is installed and a device token is registered).
  - **`receive_admin_push`** = admin-only push (independent of `is_active`). Migration: `20260221_admin_not_tied_to_is_active.sql`, `20260222_email_subscribers_receive_admin_push.sql`.

- ✅ **Push when admin approves prayer or update**
  - When an admin approves a **prayer**, the **requester** gets a push: "Prayer approved."
  - When an admin approves an **update**, the **update author** gets a push: "Update approved."
  - Implemented via `PushNotificationService.sendPushToEmails()` called from `AdminDataService.approvePrayer()` and `approveUpdate()`; tap handling for `prayer_approved` and `update_approved` in `app.component.ts` and `capacitor.service.ts`.

- ✅ **Documentation**
  - Capacitor docs under `docs/Capacitor/` (CAPACITOR_GETTING_STARTED, CAPACITOR_BACKEND_SETUP, CAPACITOR_SETUP, CAPACITOR_QUICKSTART) with full migration list and preference model. Main docs README links to Capacitor and describes email vs push preferences.

### Prayer Encouragement (Pray For) ✅
- ✅ **Community “Pray For” support**
  - Prayer cards show a “Pray For” button when the feature is enabled; users can record that they prayed for a request.
  - Requesters and admins see an anonymous count (e.g. “3 Praying”); who clicked is not shown.
  - Cooldown (1–168 hours, configurable in Admin) limits how often the same user can click Pray For on the same prayer.

- ✅ **Admin settings**
  - Admin → Prayer Encouragement: toggle “Enable Prayer Encouragement” and set “Cooldown (hours)” (1–168). Cooldown control only visible when the feature is on.
  - Stored in `admin_settings`: `prayer_encouragement_enabled`, `prayer_encouragement_cooldown_hours` (default 4).

- ✅ **Implementation**
  - `PrayerEncouragementService`: reads/caches enabled and cooldown from DB; `recordPrayedFor()`, count lookups.
  - `prayer-encouragement-settings` component for admin UI; `prayer-card` shows button, count, and optional explanation modal (“Do not show again” in localStorage, cleared on logout).
  - Database: `prayers.prayed_for_count`; migrations: `20260224_prayer_encouragement.sql`, `20260225_prayer_encouragement_cooldown_hours.sql`.

- ✅ **Documentation**
  - docs/README.md (Core Capabilities, Key Concepts); README.md (Prayer Management, Admin Portal); DEVELOPMENT.md (PrayerEncouragementService, Prayer Encouragement section). In-app Help includes “Prayer Encouragement (Pray For)” section.

- ✅ **Per-user visibility on cards (Settings)**
  - **Prayer encouragement on cards** in the main settings modal: users can keep or turn off the **Show “Pray For” button** and **Show “Praying #” button** options for their own view (defaults on). Does not disable Prayer Encouragement for the community; it only hides those controls or the count chip for that subscriber.
  - Stored on **`email_subscribers`**: `show_pray_for_button`, `show_praying_count` (both `boolean NOT NULL DEFAULT true`). Migration: `20260327120000_email_subscribers_prayer_encouragement_ui.sql`.
  - **`UserSessionService`** selects these fields in `loadUserSession`, maps them to `UserSessionData`, exposes `getShowPrayForButton$()` and `getShowPrayingCount$()`, and **`updateUserSession`** keeps the cache in sync when toggles save.
  - **`prayer-card`** gates the Pray For block and the N Praying chip with those observables in addition to `PrayerEncouragementService.getPrayerEncouragementEnabled$()`.
  - In-app **Help**: **App Settings** and **Prayer Encouragement (Pray For)** both document the two toggles (`help-content.service.ts`).

### Personal Prayer Sharing to Public Prayer Feature ✅
- ✅ Users can now share personal prayers to the public prayer list for community support
  - Share button on personal prayer cards (share icon)
  - Confirmation modal before sharing
  - Personal prayer copy remains in user's account for reference
  - Shared prayer becomes a new public prayer with "pending" approval status
  - Admin receives notification to review and approve/deny

- ✅ Seamless data copying workflow
  - All updates/comments from personal prayer copied to public version
  - Prayer metadata preserved (title, description, prayer_for, status)
  - Requester name from user session or extracted from email
  - Email address included for admin contact

- ✅ Service implementation
  - `PrayerService.sharePrayerForApproval()` method handles all logic
  - Creates new prayer in `prayers` table with `approval_status: 'pending'`
  - Copies all related prayer updates to new public prayer
  - Sends admin notification about new prayer request
  - Refreshes user's personal prayers list after successful share

- ✅ UI improvements
  - Prayer card component displays share button for personal prayers
  - Loading spinner during share operation
  - Success toast notification: "Prayer shared! It has been submitted for admin approval."
  - Error handling with user-friendly messages
  - Modal closes automatically on successful share

- ✅ Documentation
  - Added comprehensive feature guide to DEVELOPMENT.md (Core Services section)
  - Includes data flow, process steps, UI components, error handling
  - Database impact overview (prayers, prayer_updates, personal_prayers tables)
  - User experience flow diagram
  - Testing guidance and troubleshooting tips

### Logo Flash Optimization ✅
- ✅ Eliminated visual flash of text logo on page refresh
  - BrandingService now initializes during APP_INITIALIZER (before component tree renders)
  - Logo data cached in localStorage and loaded synchronously on app boot
  - Added lightweight metadata-only queries to check for logo updates
  - Only fetches full logo data from Supabase when admin changes branding
  - Browser preload hints improve image load timing
  - Backward-compatible with existing branding system (no breaking changes)

- ✅ Database optimization with migration
  - Added `branding_last_modified` column to `admin_settings` table
  - Automatic trigger tracks when branding fields actually change
  - Metadata-only queries (~3s timeout) prevent downloading large base64 blobs unnecessarily
  - Efficient cache invalidation strategy

- ✅ Performance improvements
  - Reduced unnecessary database queries (only when branding changes)
  - Faster subsequent page loads (logos loaded from cache)
  - Minimal bandwidth for unchanged logos (metadata check only)
  - Better perceived performance on slower connections

### Delete Account (Settings) ✅
- ✅ **Users can delete their account from the main site settings modal**
  - "Delete your account" option at the bottom of the settings panel (below the feedback section).
  - Opens a verification dialog with a warning that the action cannot be undone.
  - Two choices: **"Delete account but keep my prayers"** (removes only the account from `email_subscribers`; prayers remain so they can still be lifted up) or **"Delete my account and all my prayers"** (removes the user’s prayer_updates, prayers, personal_prayers, and email_subscribers row).
  - After either choice the user is signed out via existing logout flow and would need to be re-approved to use the app again.

- ✅ **Implementation**
  - `user-settings.component.ts`: custom verification modal (z-[60]), `deleteAccountKeepPrayers()`, `deleteAccountAndPrayers()` with correct delete order; error handling and loading state.
  - Help: App Settings section in `help-content.service.ts` includes "Delete your account" with description of the two options.
  - Unit tests in `user-settings.component.spec.ts` (dialog, keep-prayers path, delete-prayers path, cancel, errors, empty email) and `help-content.service.spec.ts` (settings section includes delete-account help).

### Text Size (Settings) ✅
- ✅ **Users can adjust on-screen text size from Settings**
  - Settings modal includes a "Text size" section with three options: **Default**, **Larger**, and **Largest**.
  - Choice is stored in localStorage and applied app-wide via a CSS custom property (`--text-scale`) on the document root; base font size scales with the selection for easier reading.
  - In-app Help includes a "Text size" entry under App Settings describing the options and that the preference is saved automatically.

- ✅ **Implementation**
  - `TextSizeService`: `getTextSize()`, `setTextSize(size)`; persists `textSize` in localStorage and updates `document.documentElement.style.setProperty('--text-scale', …)`.
  - `src/styles.css`: `:root { --text-scale: 1 }`; `html { font-size: calc(16px * var(--text-scale, 1)) }`.
  - `user-settings.component.ts`: Text size UI (three buttons), `handleTextSizeChange()`, sync from service in `ngOnInit` and `ngOnChanges` when modal opens; unit tests for loading, syncing, and handling each size.
  - `help-content.service.ts`: "Text size" help block under `help_settings` (after Theme Options).

### Prayer reminders (hourly nudges) ✅
- ✅ **Optional personal reminders at the top of chosen clock hours**
  - In **Settings**, users can add one or more hours (0–23) in their **device time zone** to receive a short nudge to pray. Add/remove slots with the dropdown and **Add reminder** / **Remove**.
  - **Email**: Sent when **Email subscription** is on (`email_subscribers.is_active`), using template key **`user_hourly_prayer_reminder`** (`{{appLink}}` in Edge; align **`APP_URL`** with `environment.appUrl` in production).
  - **Push**: Sent when **push** is enabled and the device has a registered token (`receive_push` + `device_tokens`), same pattern as other user pushes.
  - If **both** email and push apply, the user may receive **both** at that hour. These reminders are **personal** and separate from **community** prayer-update reminders configured by admins for requesters.

- ✅ **Implementation**
  - **DB**: `user_prayer_hour_reminders` (IANA timezone + local wall hour per row); RPC `get_user_prayer_hour_reminders_due_now()` for hourly matching. Migration: `20260315120000_user_prayer_hour_reminders.sql`.
  - **Edge**: `supabase/functions/send-user-hourly-prayer-reminders/` — invoked hourly via **Supabase `pg_cron` + `pg_net`** (migration `20260316130000_schedule_user_hourly_prayer_reminders_cron.sql`), Vault secrets `project_url` + `service_role_key`. Replaces former GitHub Action workflow for this job. See [SETUP.md](SETUP.md).
  - **App**: `UserPrayerReminderService` (stale-while-revalidate cache on session), `UserSessionService` fields `prayerHourReminders` / `prayerHourRemindersFetchedAt`; UI in `user-settings.component.ts`. Unit tests: `user-prayer-reminder.service.spec.ts`.
  - **Help**: Standalone section **`help_prayer_reminders`** (“Prayer reminders”) in `help-content.service.ts`, plus **“Prayer reminders (hourly nudges)”** under **App Settings** (above Feedback Form). See **DEVELOPMENT.md** (Settings + “User hourly prayer reminders”).

### Community prayer reminders (`send-prayer-reminders`) scheduling ✅
- ✅ **Daily Edge Function trigger moved from GitHub Actions to Supabase `pg_cron`**
  - Migration `20260317120000_schedule_send_prayer_reminders_cron.sql` registers job **`invoke-send-prayer-reminders`** (`0 10 * * *` UTC), POSTing to **`send-prayer-reminders`** via **`pg_net`**, using the same Vault secrets **`project_url`** + **`service_role_key`** as the hourly user reminders job.
  - Removed `.github/workflows/send-prayer-reminders.yml`. See [SETUP.md](SETUP.md) (Community prayer reminders) and [DEVELOPMENT.md](DEVELOPMENT.md) (Archiving Workflow).

### Device token cleanup (`cleanup-device-tokens`) scheduling ✅
- ✅ **Daily Edge Function trigger moved from GitHub Actions to Supabase `pg_cron`**
  - Migration `20260318120000_schedule_cleanup_device_tokens_cron.sql` registers job **`invoke-cleanup-device-tokens`** (`0 3 * * *` UTC), POSTing to **`cleanup-device-tokens`** via **`pg_net`**, using Vault **`project_url`** + **`service_role_key`**.
  - Removed `.github/workflows/cleanup-device-tokens.yml`. See [SETUP.md](SETUP.md) (Device token cleanup) and [Capacitor/CAPACITOR_BACKEND_SETUP.md](Capacitor/CAPACITOR_BACKEND_SETUP.md).

## [Previous] - January 2026

### Email Badge Logout with Confirmation Modal ✅
- ✅ Email badge in header is now clickable to log out
  - Appears on both home page and admin portal
  - Shows confirmation dialog before logging out
  - Dialog displays "Log Out?" with "Log Out" and "Cancel" options
  - Same logout behavior as settings modal logout button
  - Badge has hover state for better discoverability

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
