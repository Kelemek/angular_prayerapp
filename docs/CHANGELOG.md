# Changelog

Major features and milestones for the Prayer App.

## [Current] - February 2026

### Reminders — 15-minute slots + per-prayer reminders
- **Settings** Prayer and Memorization reminder pickers use **15-minute** local times (`:00`, `:15`, `:30`, `:45`) instead of top-of-hour only. Existing saved slots keep working (minute defaults to `:00`). Delivery cron for both jobs is `*/15` UTC ([`20260803160000_reminder_quarter_hour_and_prayer_item_reminders.sql`](../supabase/migrations/20260803160000_reminder_quarter_hour_and_prayer_item_reminders.sql), [`HourReminderSettingsSectionComponent`](src/app/components/hour-reminder-settings-section/hour-reminder-settings-section.component.ts), [`UserHourReminderService`](src/app/services/user-hour-reminder.service.ts)).
- **Per-prayer reminders**: Logged-in users can set **once / daily / weekly** reminders on community, personal, Planning Center member prayer cards, and **prayer prompts** via the bell in the card header. Same 15-minute granularity; email and/or push using the same channel rules as Settings nudges. Edge Function [`send-user-prayer-item-reminders`](../supabase/functions/send-user-prayer-item-reminders/index.ts); push/email deep links open Home with `?prayerId=` (prayers) or `?promptId=` (prompts) and scroll to the card ([`PrayerItemReminderService`](src/app/services/prayer-item-reminder.service.ts), [`prayer-item-reminder-modal.component.ts`](src/app/components/prayer-item-reminder-modal/prayer-item-reminder-modal.component.ts), [`prayer-card.component.ts`](src/app/components/prayer-card/prayer-card.component.ts), [`prompt-card.component.ts`](src/app/components/prompt-card/prompt-card.component.ts)).
- **Prompt reminders**: Migration [`20260805120000_reminder_item_followups.sql`](../supabase/migrations/20260805120000_reminder_item_followups.sql) (idempotent) adds `prayer_kind: prompt`, purge-on-prompt-delete, locks down `purge_user_prayer_item_reminders` to `service_role`, duplicate-slot unique indexes, per-channel `last_push_sent_at` / `last_email_sent_at`, partial-retry `get_user_prayer_item_reminders_due_now()`, and email template `user_prayer_item_reminder` with `{{emailHeading}}`. Apply after `20260803160000…` and redeploy `send-user-prayer-item-reminders`.
- **Stop on archive/delete**: Community prayer **delete**, **archived**, or **answered**, and personal prayer **delete** or category **Answered**, remove matching `user_prayer_item_reminders` rows via Postgres triggers in the same migration ([`20260803160000_reminder_quarter_hour_and_prayer_item_reminders.sql`](../supabase/migrations/20260803160000_reminder_quarter_hour_and_prayer_item_reminders.sql)). The send Edge Function also skips and deletes stale rows; the app clears the session reminder cache so the bell updates immediately.
- **Bug fix — blank per-prayer reminder emails**: [`send-user-prayer-item-reminders`](../supabase/functions/send-user-prayer-item-reminders/index.ts) now passes `textBody` / `htmlBody` to `send-email` (matching other reminder jobs). The previous `text` / `html` keys left the Graph body empty while the subject still sent.
- **Per-prayer reminder bell**: Hidden on answered/archived community prayers and answered personal prayers (reminders are purged server-side when status changes).
- **Per-prayer reminder emails include latest update**: Same layout as **Approved Prayer** subscriber emails (🙏 header with rounded top corners, green gradient). TipTap markdown in description and latest update is rendered to safe HTML inline in [`send-user-prayer-item-reminders`](../supabase/functions/send-user-prayer-item-reminders/index.ts) (bold, italic, underline `++…++`, strikethrough, lists with left padding, blockquotes). Latest **Update** subsection renders inside the green-bordered prayer box (`#ecfdf5`, same as approved subscriber emails). Re-run migration `20260803160000…` in SQL editor to refresh template `user_prayer_item_reminder`, then redeploy the edge function.
- **Reminder robustness**: Failed one-time sends reschedule to the next quarter-hour instead of leaving a stuck row; duplicate schedule slots, per-channel delivery columns, and partial-retry due-now RPC are in [`20260805120000_reminder_item_followups.sql`](../supabase/migrations/20260805120000_reminder_item_followups.sql); deep links clear Home search/prompt-type/personal-category filters and keep retrying scroll after lists load (generation counter + `communityPrayersFetchInFlight`); reminder cache drops invalidate in-flight fetches; prayer/prompt cards refresh bells on session changes.
- **Planning Center member cards**: Members tab prayer cards use the meta header band with **Member** in church blue top-left and reminder bell top-right; no card-level date/time (dates on updates only) ([`prayer-card.component.ts`](src/app/components/prayer-card/prayer-card.component.ts), [`prayer-card-meta-header.component.ts`](src/app/components/prayer-card-meta-header/prayer-card-meta-header.component.ts)).
- **Hourly prayer spotlight deep links**: When the spotlight hourly template is used, **`{{appLink}}`** and push **`data.url`** / **`data.prayerId`** open Home with **`?prayerId=`** for the featured prayer (same as per-prayer reminders). Simple nudge template still links to home only. Helpers: [`hourly-prayer-spotlight-deep-link.ts`](src/app/lib/hourly-prayer-spotlight-deep-link.ts); Edge [`send-user-hourly-prayer-reminders`](../supabase/functions/send-user-hourly-prayer-reminders/index.ts); push tap in [`app.component.ts`](src/app/app.component.ts). Redeploy the Edge function after deploy.
- **Help — per-prayer reminders**: **Prayer reminders** help topic and guided tour now cover the card **bell** (once/daily/weekly per prayer) and Settings general nudges in **15-minute** steps ([`help-content.service.ts`](src/app/services/help-content.service.ts), [`help-driver-tour.service.ts`](src/app/services/help-driver-tour.service.ts), tour anchor `tour-prayer-reminder-bell` on the first community card).

### Settings — Print buttons stack on mobile with larger text
- In **Settings → Print**, the Prayers / Prompts / Personal tiles stay in one row at default text size (including on mobile). On narrow screens with **Large** or **Larger** text, they stack vertically with icon and label side by side; from `sm` up they stay in one row with icon over label. Print filter dropdowns use a wider panel so labels like **All Categories** stay on one line: Prayers opens to the right, Prompts is centered on its button, and Personal opens to the left ([`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts)).

### Memorize — search filter
- On the **Memorize** tab, the Home search field filters Learning / Practicing / Mastered cards by book, reference, or translation (placeholder **Search verses...**). Empty results show a “No passages found” state instead of the empty-list onboarding copy ([`memorization-search.ts`](src/app/lib/memorization/memorization-search.ts), [`home.component.ts`](src/app/pages/home/home.component.ts)).

### Home — filter stat buttons
- Home filter tiles (Current, Answered, Total, Prompts, Personal, Memorize, Members) use slightly more padding on small screens and tighter gaps so they sit closer together without feeling oversized ([`home.component.ts`](src/app/pages/home/home.component.ts)).

### Memorize — action bar label size
- **Add Verses**, **Bible Books**, and **Recommended** use a fixed `14px` font size so they do not grow or shrink with **Settings → Text size** ([`memorization-action-bar.component.ts`](src/app/components/memorization-action-bar/memorization-action-bar.component.ts)).

### Memorize — Cards / Table view
- The Memorize action bar includes a **Cards | Table** toggle with a **View** label. Cards keep the Learning / Practicing / Mastered grid; Table shows a sortable list (Reference in Bible order, Sessions, Mastery). Header and rows use the same white / dark gray-800 surfaces, borders, and shadow as memorized verse cards; the translation (or Bible Books count) appears under the reference in small secondary text. Layout defaults to **Cards** until the user changes it; after that, the choice and table sort column/direction persist in localStorage. Default table sort is Mastery with Learning on top. On mobile, all columns stay visible in one row (no horizontal scroll or stacked card layout). List layout, search filtering, and empty states live in [`memorize-passages-panel.component.ts`](src/app/components/memorize-passages-panel/memorize-passages-panel.component.ts) ([`memorized-verses-table.component.ts`](src/app/components/memorized-verses-table/memorized-verses-table.component.ts), [`memorization-table-sort.ts`](src/app/lib/memorization/memorization-table-sort.ts), [`memorization-list-prefs.ts`](src/app/lib/memorization/memorization-list-prefs.ts), [`memorization-list-sections.ts`](src/app/lib/memorization/memorization-list-sections.ts)). The **Memorize Scripture** guided tour resolves `#tour-memorize-sample-card` or `#tour-memorize-sample-table` from the live DOM (with popover copy to match), so switching Cards/Table mid-tour does not target a missing element ([`help-driver-tour.service.ts`](src/app/services/help-driver-tour.service.ts)).

### Bug fix — KJV paragraph marks in Memorize practice
- KJV passages sometimes include a pilcrow (`¶`) paragraph mark that cannot be typed on a normal keyboard. Memorize practice now strips those marks when loading and tokenizing passage text so practice does not get stuck on an untypable token ([`strip-scripture-for-memorization.ts`](src/app/lib/memorization/strip-scripture-for-memorization.ts), [`memorizationPracticeUtils.ts`](src/app/lib/memorization/memorizationPracticeUtils.ts)). The scripture hover preview uses the same mark stripping so KJV cards do not show `¶` in the popover ([`scripture-hover-preview.component.ts`](src/app/components/scripture-hover-preview/scripture-hover-preview.component.ts)).

### Bug fix — personal prayer updates
- **Add Update** on personal prayers no longer sends a null/empty `content` to `personal_prayer_updates`. The add-update modal reads flushed rich-text markdown directly (instead of stale `ngModel`), enables submit when **Mark as answered** is checked or the editor has text, blocks duplicate submits, and shows **Please enter update content** when the body is empty. Renamed modal output from `submit` to `updateSubmit` so the native form `submit` event no longer fires a second handler with an invalid payload (success + error toasts). Image-only markdown (e.g. screenshots) is preserved when marking answered instead of being replaced by the default text; **Add Update** enables submit for image-only bodies via the same resolver as submit. Shared resolver [`prayer-update-content.ts`](src/app/lib/prayer-update-content.ts); [`PrayerService.addPersonalPrayerUpdate`](src/app/services/prayer.service.ts) uses the same rules before insert ([`prayer-add-update-modal.component.ts`](src/app/components/prayer-add-update-modal/prayer-add-update-modal.component.ts), [`personal-prayer-update-edit-modal.component.ts`](src/app/components/personal-prayer-update-edit-modal/personal-prayer-update-edit-modal.component.ts)). Edit-update modal disables **Save** for whitespace-only content (not only on submit).

### UI — prayer request modal (mobile)
- **New Prayer Request** and other **`ModalShell`** dialogs lock background scroll (body, document root, and `.safe-area-viewport`), scroll only inside the modal body, and resize to the visual viewport when the keyboard is open so fields like **Category** stay reachable ([`modal-shell.component.ts`](src/app/components/modal-shell/modal-shell.component.ts)).
- On mobile, modals align to the **top** of the visible viewport (not vertically centered) so more of the form is visible above the keyboard; desktop keeps centered placement.
- **Custom** category color uses a native color input overlaid on the link label so iOS Safari opens the system picker (programmatic click on a hidden input was unreliable).

### UI — prayer card actions
- **Add Update**, **Pray For**, praying-count badge, and disabled **Prayed For** use the same **`rounded-md`** corner radius on home cards, presentation cards, and shared **`btn-chip`** buttons ([`styles.css`](src/styles.css), [`prayer-display-card.component.ts`](src/app/components/prayer-display-card/prayer-display-card.component.ts)).

### UI — home prayer cards (mobile)
- Tighter horizontal padding on mobile (`px-4`, `sm+` unchanged at `px-6`) for home **prayer**, **personal**, and **prompt** cards; meta header bleed and update rows stay aligned via [`prayer-card-layout.ts`](src/app/lib/prayer-card-layout.ts).
- **Personal** prayer reorder: drag the **date/time** in the card meta header (when one category is selected) instead of a left-side grip; removes extra left padding on reorderable cards ([`card-meta-header-band.component.ts`](src/app/components/card-meta-header-band/card-meta-header-band.component.ts), [`home.component.ts`](src/app/pages/home/home.component.ts)).
- **Personal** category chips: long-press (or right-click) a category filter to rename it; updates all prayers in that category and any saved category color ([`personal-category-rename-modal.component.ts`](src/app/components/personal-category-rename-modal/personal-category-rename-modal.component.ts), [`personal-category-rename.ts`](src/app/lib/personal-category-rename.ts), [`prayer.service.ts`](src/app/services/prayer.service.ts)). Duplicate names are checked against both prayers and saved colors. Rename matches chip semantics by updating every prayer whose trimmed category equals the chip name (including legacy whitespace variants). The active filter updates as soon as prayers rename; dismissing during save clears the saving state, rolls back in-flight prayer renames when possible, and still syncs the filter if the rename already finished.

### UI — card shadows
- **Presentation** slide cards use **`presentation-card-elevation`** ([`styles.css`](src/styles.css)): symmetric `box-shadow` on left, right, and bottom (replacing bottom-heavy `shadow-2xl`). Shadow sits on an outer wrapper; scrollable content stays on the inner card so `overflow-y` does not clip it. The presentation scroll area uses **`card-stack-shadow`** for horizontal bleed inside `overflow-y-auto`.
- **Presentation** mobile: **`overflow-x-hidden`** on the page and scroll containers so **`card-stack-shadow`** negative margins do not cause side-to-side page scrolling ([`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts)).
- **Presentation** iPhone layout: **`presentation-page-shell`** matches Home’s safe-top viewport height; short slides are **vertically centered**; long slides cap at **`max-h-full`** and scroll inside the card ([`styles.css`](src/styles.css), [`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts)).
- **Presentation play mode**: When a slide is taller than the viewport, **auto-scroll** runs from the top at a speed matched to the slide timer so the bottom is visible before the next card ([`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts), [`presentationUtils.ts`](src/utils/presentationUtils.ts)).
- **Presentation play mode**: Slides **fade** (400ms) when advancing automatically or via next while playing; manual navigation when paused stays instant ([`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts)).

### UI — personal prayer categories
- **Fix**: Card header category color picker stays open when the keyboard or visual viewport resizes (repositions instead of closing) and when the user scrolls the prayer list to reach a clipped popover; it still dismisses when the pill scrolls fully off-screen ([`personal-category-pill.component.ts`](src/app/components/personal-category-color-picker/personal-category-pill.component.ts), [`personal-category-picker-placement.ts`](src/app/components/personal-category-color-picker/personal-category-picker-placement.ts)).
- **Fix**: **Custom** color label in the category picker keeps its font-size classes (merged duplicate `ngClass` bindings) ([`personal-category-color-picker.component.ts`](src/app/components/personal-category-color-picker/personal-category-color-picker.component.ts)).
- Personal **category** pills on home prayer cards use a **meta header** row: bold category name (colored text, no background) on the left with **`px-6`** inset (aligned with card body text), created date/time centered on the card, and share/edit/delete on the right; long category names **truncate with ellipsis** in a three-column grid so they cannot overlap the date; full name on hover via `title`. **Personal prayer updates** use the same centered date/time + edit/delete header (no category column). Clicking the category opens a **fixed** color picker (text swatches matching the header color in light and dark mode, not pills) that can extend below the card ([`prayer-card.component.ts`](src/app/components/prayer-card/prayer-card.component.ts), [`personal-category-pill.component.ts`](src/app/components/personal-category-color-picker/personal-category-pill.component.ts), [`personal-category-color-picker.component.ts`](src/app/components/personal-category-color-picker/personal-category-color-picker.component.ts)). Filter/picker pills elsewhere use opaque tints; in **dark mode** those pills use a dark surface with a light category-tinted border and matching text ([`personalCategoryColor.ts`](src/utils/personalCategoryColor.ts), [`styles.css`](src/styles.css)).
- **Category colors**: Personal prayer category pills on cards use your chosen color; pick a color when creating or editing a prayer, or click a category pill on a card ([`personal-category-color-picker.component.ts`](src/app/components/personal-category-color-picker/personal-category-color-picker.component.ts), [`personal-category-pill.component.ts`](src/app/components/personal-category-color-picker/personal-category-pill.component.ts), [`prayer-card.component.ts`](src/app/components/prayer-card/prayer-card.component.ts), [`prayer-form.component.ts`](src/app/components/prayer-form/prayer-form.component.ts), [`personal-prayer-edit-modal.component.ts`](src/app/components/personal-prayer-edit-modal/personal-prayer-edit-modal.component.ts), [`prayer-display-card.component.ts`](src/app/components/prayer-display-card/prayer-display-card.component.ts)). Create/edit forms and the card header popover show **text** color swatches (category name in each preset color, no pill backgrounds); filter chips on the Personal tab stay as pills. Card pills and popover placement live in **`PersonalCategoryPillComponent`**; presentation reads colors from **`PersonalCategoryColorService`** directly. Create/edit only persist a color when the user changes it in the picker; changing category via the dropdown or typing clears that intent. **`PersonalCategoryColorService`** clears stale cache on account switch, ignores in-flight load/set races after logout or sign-in as another user, and keeps the edit modal open when a color save fails after the prayer itself saved. The picker shows swatches labeled with your category name plus a **Custom** link for the native color chooser. On cards near the bottom of the screen, the popover opens upward. Requires migration [`20260731120000_personal_prayer_category_colors.sql`](supabase/migrations/20260731120000_personal_prayer_category_colors.sql) (MFA/anon RLS matches `personal_prayers`).
- **Rich text editor**: Loading existing content with TipTap `++underline++` markdown (e.g. Edit Prayer Update) now shows underlined text instead of raw `++` markers ([`tiptap-underline-markdown.extension.ts`](src/app/lib/tiptap-underline-markdown.extension.ts)).

### UI — prayer request form
- **New Prayer Request modal**: Removed the footer **Close** button; **Submit Prayer Request** is a compact outlined blue button (matching **Pray For** on prayer cards), right-aligned. Dismiss via the header **X** or backdrop click ([`prayer-form.component.ts`](src/app/components/prayer-form/prayer-form.component.ts)).

### UI — home header
- **Pray** and **Request** use the same outlined green/blue chip style as prayer card actions (desktop `h-12` size unchanged) ([`home.component.ts`](src/app/pages/home/home.component.ts)).
- **Help** and **Settings** use the same outlined chip pattern in neutral gray (utility actions, same `h-12` desktop size).

### UI — info page mock header
- Feature-overview mock header **Help**, **Settings**, **Pray**, and **Request** use the same outlined chip styles as Home ([`info.component.ts`](src/app/pages/info/info.component.ts)).

### UI — settings feedback
- **Send Feedback** submit uses the same outlined blue chip style as **Request** / **Submit Prayer Request** ([`github-feedback-form.component.ts`](src/app/components/github-feedback-form/github-feedback-form.component.ts)).

### UI — settings modal footer
- Removed footer **Close**; dismiss via header **X** or backdrop. **Logout** uses the outlined gray chip style ([`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts)).
- **Text size** preview buttons use distinct label sizes (14px / 15px / 16px) for Default, Larger, and Largest ([`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts)).
- Delete-account confirmation: **Delete account but keep my prayers** uses outlined green; **Delete my account and all my prayers** uses outlined red ([`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts)).

### UI — help modal
- Removed footer **Close Help**; dismiss via header **X** or backdrop ([`help-modal.component.ts`](src/app/components/help-modal/help-modal.component.ts)).

### UI — prompt card
- **Meta header**: Prompt type appears as bold colored header text (left); admin **delete** is top-right. The rounded type pill is removed; clicking the type name still filters by that category. Card padding matches main prayer cards (`pt-0 px-6 pb-4`). Unread badges stay at the card corner ([`prompt-card.component.ts`](src/app/components/prompt-card/prompt-card.component.ts)).
- **Fix**: Prompt type filter badges are clickable again—clicking the green count dismisses unread badges for that type only (matches stat-tab badge behavior) ([`home.component.ts`](src/app/pages/home/home.component.ts), [`badge.service.ts`](src/app/services/badge.service.ts)).
- **Pray For** confirmation modal submit uses the outlined blue chip style (matches the card **Pray For** button) ([`prompt-card.component.ts`](src/app/components/prompt-card/prompt-card.component.ts)).

### UI — prayer card
- **Community meta header**: On **Current**, **Answered**, and **Total**, community prayer cards use the same three-column meta header as personal cards—**Current** / **Answered** / **Archived** as colored header text (not pills) in the left column, date/time centered, delete top-right when allowed. Personal, community, and **member** **updates** share the same header pattern (**Update** left, or **Answered** in green when marked answered; date/time centered, actions right). **Updated by** appears below the header on community cards. The **Recent Updates** section heading is removed. Presentation [`prayer-display-card`](src/app/components/prayer-display-card/prayer-display-card.component.ts) uses the same update header layout (read-only). Unread badges remain visible at the card corner (`overflow-hidden` applies only to the header band, not the whole card) ([`prayer-card.component.ts`](src/app/components/prayer-card/prayer-card.component.ts)).
- **Shared card UI**: Meta header band, prayer meta header, update row, and update actions are extracted for reuse—[`card-meta-header-band`](src/app/components/card-meta-header-band/card-meta-header-band.component.ts), [`prayer-card-meta-header`](src/app/components/prayer-card-meta-header/prayer-card-meta-header.component.ts), [`prayer-update-row`](src/app/components/prayer-update-row/prayer-update-row.component.ts), [`prayer-update-actions`](src/app/components/prayer-update-actions/prayer-update-actions.component.ts); helpers in [`prayer-card-kind.ts`](src/app/lib/prayer-card-kind.ts), [`prayer-update-header.ts`](src/app/lib/prayer-update-header.ts), [`prayer-status-header.ts`](src/app/lib/prayer-status-header.ts) (text, border, and pill status classes). [`prompt-card`](src/app/components/prompt-card/prompt-card.component.ts) uses the two-column meta band; [`bible-books-memorization-list`](src/app/components/bible-books-memorization-list/bible-books-memorization-list.component.ts) uses **`innerScroll`** (set `false` in the add-books modal so the parent panel scrolls).
- **Pray For** confirmation modal submit uses the same outlined blue chip style ([`prayer-card.component.ts`](src/app/components/prayer-card/prayer-card.component.ts)).

### UI — presentation display card
- **Pray For** explanation modals (prayer and prompt) use the same outlined blue chip style ([`prayer-display-card.component.ts`](src/app/components/prayer-display-card/prayer-display-card.component.ts)).

### UI — presentation settings
- **Start Prayer Timer** uses the outlined green chip style (matches **Pray** / prayer actions) ([`presentation-settings-modal.component.ts`](src/app/components/presentation-settings-modal/presentation-settings-modal.component.ts)).
- **Return to Home** on the empty-content overlay uses the outlined blue chip style ([`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts)).

### UI — email verification
- **Verify Code** submit uses the outlined blue chip style (full-width unchanged) ([`verification-dialog.component.ts`](src/app/components/verification-dialog/verification-dialog.component.ts)).
- **Send Verification Code** and **Complete Registration** on login use the outlined green chip style (elevated white fill on the gradient for verification; standard green chip for registration) ([`login.component.ts`](src/app/pages/login/login.component.ts)).

### UI — dark mode form fields
- Toned-down inset surfaces use **`bg-inset-surface`** (form inputs), **`bg-inset-surface-muted`** (prayer search, prayer update rows), and **`bg-inset-surface-interactive`** (help topic rows with hover) in [`styles.css`](src/styles.css): light gray fills on white cards; **`rgb(55 65 81 / 0.6)`** in dark mode (**`/0.8` on help row hover**). Custom `bg-gray-50` / `bg-gray-100` utilities force solid dark fills with `!important`, so they must not be paired with `dark:bg-gray-700/*`. Neutral borders on update rows. Applied across prayer filters/search, prayer form, edit modals, login, verification, rich text editor, [`prayer-card`](src/app/components/prayer-card/prayer-card.component.ts), [`prayer-display-card`](src/app/components/prayer-display-card/prayer-display-card.component.ts), [`help-modal`](src/app/components/help-modal/help-modal.component.ts), [`admin-help-modal`](src/app/components/admin-help-modal/admin-help-modal.component.ts), and related surfaces.

### UI — personal prayer edit
- **Edit Prayer** modal **Save Changes** uses outlined blue (prayer); **Edit Prayer Update** uses outlined green (update) ([`personal-prayer-edit-modal.component.ts`](src/app/components/personal-prayer-edit-modal/personal-prayer-edit-modal.component.ts), [`personal-prayer-update-edit-modal.component.ts`](src/app/components/personal-prayer-update-edit-modal/personal-prayer-update-edit-modal.component.ts)).

### UI — bible passage picker
- Selected chapter and verse tiles use outlined blue chip style instead of solid fill ([`bible-passage-picker-modal.component.ts`](src/app/components/bible-passage-picker-modal/bible-passage-picker-modal.component.ts)).

### UI — confirmation dialog
- Shared **Confirm** buttons use outlined blue (normal) or outlined red (`isDangerous`) chip style ([`confirmation-dialog.component.ts`](src/app/components/confirmation-dialog/confirmation-dialog.component.ts)).

### UI — add prayer update
- Home prayer cards (community, personal, and member) open **Add Prayer Update** in a modal instead of an inline form. Dismiss via header **X** or backdrop; no footer **Cancel** ([`prayer-add-update-modal.component.ts`](src/app/components/prayer-add-update-modal/prayer-add-update-modal.component.ts), [`prayer-card.component.ts`](src/app/components/prayer-card/prayer-card.component.ts)).
- **Deletion request modal**: Non-admin community prayer deletion requests open in a modal with the same dismiss pattern (header **X**, backdrop, no footer **Cancel**) ([`prayer-delete-request-modal.component.ts`](src/app/components/prayer-delete-request-modal/prayer-delete-request-modal.component.ts)). The same modal is reused for **update deletion** requests on prayer cards. **Submit Request** uses the outlined red chip style (matches settings delete actions). Draft reason clears when switching between prayer vs update deletion (or between updates) without closing the modal.
- **Modal form reset**: Add-update and deletion-request modals clear draft fields when `isOpen` becomes false (e.g. parent toggles the modal without emitting `close`), so reopening does not show stale content.
- **Shared modal shell**: [`modal-shell.component.ts`](src/app/components/modal-shell/modal-shell.component.ts) centralizes overlay, header, close button, and backdrop dismiss (`target === currentTarget`) for prayer request, add-update, delete-request, and personal edit modals.
- **Deletion request modal**: Single instance on prayer cards with `requestType` (`prayer` | `update`) instead of two duplicate components.
- **Outlined chip utilities**: Shared **`btn-chip`** / **`btn-chip-blue`** / **`btn-chip-green`** / **`btn-chip-gray`** / **`btn-chip-red`** / **`btn-chip-green-elevated`** in [`styles.css`](src/styles.css) replace duplicated Tailwind strings on Home, prayer cards, settings, login, presentation empty state, and modal submit buttons.
- **Personal edit modals**: **Edit Prayer** and **Edit Prayer Update** modals match the same pattern—footer **Cancel** removed; **Save Changes** is right-aligned; dismiss via header **X** or backdrop ([`personal-prayer-edit-modal.component.ts`](src/app/components/personal-prayer-edit-modal/personal-prayer-edit-modal.component.ts), [`personal-prayer-update-edit-modal.component.ts`](src/app/components/personal-prayer-update-edit-modal/personal-prayer-update-edit-modal.component.ts)).

### Admin — OpenAI API key spend (Recite)
- **Memorization Recite Mode**: OpenAI spend in admin is filtered to the Whisper API key (`OPENAI_API_KEY_ID`) instead of org-wide totals ([`get-openai-org-usage`](../supabase/functions/get-openai-org-usage/index.ts), [`memorization-recite-settings`](src/app/components/memorization-recite-settings/memorization-recite-settings.component.ts)). Requires **`OPENAI_ADMIN_KEY`** plus **`OPENAI_API_KEY_ID`** (tracking id from the OpenAI dashboard, not the `sk-…` secret). Admin panel shows only OpenAI-reported spend (app-tracked estimate removed from UI).

### Admin — prayer approval timestamps
- **Consolidated approval cards**: Prayer and update timestamps include time (e.g. `Jul 30, 2026, 11:52 AM`), matching home prayer cards ([`consolidated-prayer-approval.component.ts`](src/app/components/consolidated-prayer-approval/consolidated-prayer-approval.component.ts)).
- **Pending Deletions and Accounts cards**: Request timestamps use the same date+time format ([`pending-deletion-card.component.ts`](src/app/components/pending-deletion-card/pending-deletion-card.component.ts), [`pending-update-deletion-card.component.ts`](src/app/components/pending-update-deletion-card/pending-update-deletion-card.component.ts), [`pending-account-approval-card.component.ts`](src/app/components/pending-account-approval-card/pending-account-approval-card.component.ts)).

### UI — personal tab colors (Kelemek parity)
- **Personal category filters**: Active category chips use the outlined church-green ring style (`personalCategoryActiveClass`) instead of a solid green fill, matching [Kelemek/Prayer_App](https://github.com/Kelemek/Prayer_App) ([`home.component.ts`](src/app/pages/home/home.component.ts), [`info.component.ts`](src/app/pages/info/info.component.ts)).
- **Prompt type filters**: Active type chips use the same outlined stone/tan ring style as the **Prompts** stat tab (`promptTypeActiveClass` from [`prompt-type-chip-classes.ts`](src/app/lib/prompt-type-chip-classes.ts)) instead of a solid `#988F83` fill ([`home.component.ts`](src/app/pages/home/home.component.ts), [`info.component.ts`](src/app/pages/info/info.component.ts)). Home prompt cards use header text for the type (not pills); presentation prompt slides keep **rounded-full** type pills ([`prompt-card.component.ts`](src/app/components/prompt-card/prompt-card.component.ts), [`prayer-display-card.component.ts`](src/app/components/prayer-display-card/prayer-display-card.component.ts)).
- **Presentation archived badge**: Archived status pills on presentation prayer slides use the same gold outlined style as home prayer cards (`#C9A961` border/text, amber tint) instead of gray ([`prayer-display-card.component.ts`](src/app/components/prayer-display-card/prayer-display-card.component.ts)).
- **Memorize action bar**: The passage-picker button is labeled **Add Verses** (was **Verses**) ([`memorization-action-bar.component.ts`](src/app/components/memorization-action-bar/memorization-action-bar.component.ts)).
- **Memorize empty state**: Explains all three ways to add passages—**Add Verses** (passages to memorize), **Bible Books** (book names), **Recommended** (biblical counseling topics)—and that tapping a card starts practice ([`home.component.ts`](src/app/pages/home/home.component.ts)).
- **Fix**: **Bible Books** add modal preview scrolls the full book list (one scroll container on the preview panel; no nested inner cap) ([`add-memorized-bible-books-modal.component.ts`](src/app/components/add-memorized-bible-books-modal/add-memorized-bible-books-modal.component.ts), [`bible-books-memorization-list.component.ts`](src/app/components/bible-books-memorization-list/bible-books-memorization-list.component.ts)).
- **Fix**: Personal prayer **updates** on home cards show vertical spacing between rows again (`space-y-3` applies to block-level `app-prayer-update-row` hosts) ([`prayer-update-row.component.ts`](src/app/components/prayer-update-row/prayer-update-row.component.ts)).
- **UI**: Prayer card meta header and update row dates stack date above time on mobile (`sm` and up stay on one line) ([`card-meta-header-band.component.ts`](src/app/components/card-meta-header-band/card-meta-header-band.component.ts)).
- **Fix**: Switching Old/New Testament tabs in the add-modal book preview resets the parent scroll position (not only the inner list) ([`bible-books-memorization-list-scroll.ts`](src/app/components/bible-books-memorization-list/bible-books-memorization-list-scroll.ts)).
- **Memorize action bar**: **Verses** (and active Bible Books / Recommended) use the same outlined blue ring style as the active **Memorize** stat tab (`#0047AB`, `dark:bg-blue-950`); inactive buttons use the same style on hover ([`memorization-action-bar.component.ts`](src/app/components/memorization-action-bar/memorization-action-bar.component.ts)).
- **Stat filter labels**: Prompts, Personal, Memorize, and Members tab labels use `dark:text-gray-300` like Current/Answered/Total ([`home.component.ts`](src/app/pages/home/home.component.ts), [`info.component.ts`](src/app/pages/info/info.component.ts)).
- **Planning Center member cards**: Member prayer cards use the same church-blue border + ring as the active **Members** stat tab (`#0047AB`) instead of status-colored borders ([`prayer-card.component.ts`](src/app/components/prayer-card/prayer-card.component.ts), [`home.component.ts`](src/app/pages/home/home.component.ts)).
- **Recommended verses modal**: Category accordion hover uses the inset search-field fill (`bg-inset-surface`) instead of a gray lift ([`memorization-recommendations-modal.component.ts`](src/app/components/memorization-recommendations-modal/memorization-recommendations-modal.component.ts)).
- **Memorize practice footers**: Practice session footers (including recite and word-choice bars) inherit the modal/header background instead of a separate inset gray fill ([`memorization-practice-session.component.html`](src/app/components/memorization-practice-session/memorization-practice-session.component.html), [`memorization-word-choices-footer.component.ts`](src/app/components/memorization-word-choices-footer/memorization-word-choices-footer.component.ts)).
- **Memorize practice scroll**: The practice content area (`#practiceScroll`) uses the same white/`gray-800` fill as the practice modal header and footer ([`memorization-practice-session.component.html`](src/app/components/memorization-practice-session/memorization-practice-session.component.html)).
- **Memorize practice mode picker**: Cancel is replaced by a top-right close **X** (backdrop click and Escape still dismiss) ([`memorization-practice-session.component.html`](src/app/components/memorization-practice-session/memorization-practice-session.component.html)).
- **Memorize verse cards**: Practice and remove controls each use the Memorize outlined blue hover independently (`#0047AB` border/ring, `bg-blue-100` / `dark:bg-blue-950`); hovering delete no longer blues the whole card ([`memorized-verse-card.component.ts`](src/app/components/memorized-verse-card/memorized-verse-card.component.ts)).
- **Memorize Start over**: **Start over** matches the **Listen** header control (outlined white/gray-800 with inset-surface hover) ([`memorization-practice-session.component.html`](src/app/components/memorization-practice-session/memorization-practice-session.component.html)).
- **Memorize Listen**: **Listen** and Listen modal controls (play, repeat, speed) use the inset search-field fill on hover (`hover:bg-inset-surface`) ([`memorization-practice-session.component.html`](src/app/components/memorization-practice-session/memorization-practice-session.component.html), [`memorize-listen-controls-dialog.component.ts`](src/app/components/memorize-listen-controls-dialog/memorize-listen-controls-dialog.component.ts), [`memorize-listen-speed-button.component.ts`](src/app/components/memorize-listen-speed-button/memorize-listen-speed-button.component.ts)).
- **Personal prayer cards**: Card borders use neutral gray instead of status-colored blue/green/gold borders, matching congregation card treatment in Kelemek ([`prayer-card.component.ts`](src/app/components/prayer-card/prayer-card.component.ts)).
- **Memorize verse cards**: Learning / Practicing / Mastered sections render in a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`) matching Kelemek ([`home.component.ts`](src/app/pages/home/home.component.ts), [`memorized-verse-card.component.ts`](src/app/components/memorized-verse-card/memorized-verse-card.component.ts)).

### Presentation — settings handoff and persistence ✅
- **Home → Pray**: Clicking **Pray** from the home page opens presentation mode with filters matching the active Home tab: content type (Current/Answered/Total → Prayers; Prompts → Prompts; Personal → Personal; Members → Members; Memorize uses the user’s default prayer view), prayer status (Current/Answered/Total tabs), and selected Prompt or Personal category chips when set. Handoff is **session-only** — nothing from Pray is written to `localStorage` until the user changes presentation settings. Closing presentation returns to the same Home tab and category selection.
- **Presentation**: Content type, randomize order, smart mode, auto-advance interval, **loop** (default on), time period (default **All Time**), prayer status, and prayer timer duration persist in `localStorage` via [`PresentationSettingsService`](src/app/services/presentation-settings.service.ts).
- **Presentation — loop**: Settings → **Display &amp; Timing** → **Loop** (default on). When off, auto-play runs through the slide list once, stops, and shows a **Prayers Complete!** overlay (no clock icon); closing with **X** resets to the first slide paused; press **Play** to start another single pass ([`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts)).
- **Fix**: Pressing Play while the loop-off **Prayers Complete!** overlay is open no longer advances slides behind the modal; it dismisses the overlay and restarts from the first slide ([`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts)).
- **Fix**: Keyboard, swipe, and toolbar prev/next navigation are blocked while the **Prayers Complete!** overlay is open so the current slide cannot change behind the modal.
- **Fix**: With loop off, pausing and resuming playback continues from the current slide instead of restarting from the first slide.
- **Fix**: Dismissing the **Prayers Complete!** overlay closes the presentation settings modal before restarting playback so slides do not advance behind an open settings sheet.
- **Fix**: With loop off and no slides available, Play no longer shows the **Prayers Complete!** overlay or enters a dismiss/restart loop.
- **Fix**: Dismissing **Prayers Complete!** also closes the prayer-timer completion overlay before restarting playback.
- **Fix**: With loop off, pressing forward on the last slide (toolbar, keyboard, or swipe) now shows **Prayers Complete!**, not only when auto-play finishes the cycle.
- **Presentation — completion overlays**: **Prayers Complete!** and **Prayer Timer Complete!** modals no longer pulse; they use the same white/gray card styling and church-green accent as presentation prayer cards.
- **Presentation settings UI**: Settings modal uses bordered section cards (Theme, Filters, Display &amp; Timing, Prayer timer) matching the main app settings layout in [`presentation-settings-modal`](src/app/components/presentation-settings-modal/presentation-settings-modal.component.ts). Content type, randomize, time period, categories, and prayer status live in one **Filters** section. Content type supports multi-select (same interaction as prayer status); time period uses a custom dropdown. **Personal categories** and **Prompt categories** use the same multi-select dropdown pattern and appear only when Personal or Prompts is selected, respectively. Scrollbars are hidden on the settings modal body, presentation page content area, and presentation cards while scroll still works. Removed redundant **Refresh prayers** action — filter and content changes reload automatically.
- **Fix**: Presentation **time period** and **prayer status** filters now apply to congregation prayers whenever prayers are included in a multi-select (or all-types) content mix, not only when prayers are the sole type.
- **Fix**: Home → Pray handoff uses router navigation state (not an in-memory service override), so aborted navigation cannot apply a stale override on a later visit. New-tab navigation uses `homeTypes`, `homeStatus`, `homePromptCats`, `homePersonalCats`, and `homeReturnFilter` query params on the Pray link so closing presentation in a new tab also restores the Home tab and category.
- **Fix**: Presentation filter changes serialize async reloads so rapid dropdown changes cannot leave stale prayer data on screen.
- **Fix**: Randomize + multi-type presentation sessions reshuffle after prayer status or time period changes instead of keeping stale `combinedShuffledItems`.
- **Fix**: Home **Pray** is a real link again (modifier/middle-click opens a new tab); same-tab navigation uses router state, and new-tab navigation uses handoff query params on the link.
- **Fix**: Closing presentation settings applies any open content-type or prayer-status dropdown before dismissing the modal (including toolbar toggle and prayer-timer start).
- **Fix**: Unchecking every content-type option no longer widens the session to all types; the prior selection is kept instead.
- **Fix**: Content-type and prayer-status dropdowns only reload presentation content when the pending selection actually changed.
- **Fix**: Choosing **All Content Types** in presentation settings checks every available type in the dropdown (and still persists as “all” when applied).
- **Presentation — Pray For**: [`PrayerDisplayCardComponent`](src/app/components/prayer-display-card/prayer-display-card.component.ts) shows **Pray For** / **Prayed For** and **{n} Praying** on congregation prayer slides using the same visibility rules as home [`PrayerCardComponent`](src/app/components/prayer-card/prayer-card.component.ts) (user encouragement toggles, admin feature flag, update-policy gate, and card-type exclusions).
- **Personal prayers — Pray For**: Home personal tab cards and presentation personal slides now show **Pray For** / **Prayed For** and **{n} Prayers** under the same encouragement settings. The owner always sees their count (personal lists are private; admins do not browse other users’ personal prayers). Users can set a **personal / member cooldown** (hours) in Settings → **Prayer encouragement on cards**; community prayers still use the admin cooldown. Migration [`20260726120000_personal_prayer_prayed_for_count.sql`](../supabase/migrations/20260726120000_personal_prayer_prayed_for_count.sql) adds `personal_prayers.prayed_for_count`, `email_subscribers.personal_prayer_cooldown_hours`, and RPC `increment_personal_prayed_for_count` (owner-only; MFA email + active subscriber check).
- **Members — Pray For**: Planning Center member cards (home Members tab and presentation member slides) show **Pray For** / **Prayed For** and shared **{n} Prayers** (same label as personal cards) for everyone who can see the list. Members visibility is unchanged—only users with an applied Planning Center list see those cards. Member Pray For uses the same **personal / member / prompt cooldown** setting as personal prayers (Settings → Prayer encouragement on cards); community prayers still use the admin cooldown. Migration [`20260727160000_member_prayed_for_counts.sql`](../supabase/migrations/20260727160000_member_prayed_for_counts.sql) adds `member_prayed_for_counts` and RPC `increment_member_prayed_for_count`.
- **Prompts — Pray For**: Home prompt cards and presentation prompt slides show **Pray For** / **Prayed For** with a **per-user** private **{n} Prayers** tally (same cooldown as personal/member). Migration [`20260727170000_prompt_prayed_for_counts.sql`](../supabase/migrations/20260727170000_prompt_prayed_for_counts.sql) adds `prompt_prayed_for_counts`, RPC `get_prompt_prayed_for_counts`, and RPC `increment_prompt_prayed_for_count` (same MFA/JWT auth pattern as personal Pray For). Authenticated SELECT is own rows only; anon uses the get RPC. `PromptService` hydrates from `UserSession` email and clears/rehydrates on logout / account switch.
- **Fix**: Presentation prompt Pray For tallies clear on logout / account switch even when presentation loaded prompts independently of `PromptService` ([`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts)).
- **Fix**: Presentation `fetchPrompts` ignores late `attachPrayedForCounts` results when the session changed mid-flight (logout / account switch).
- **Fix**: Settings **Prayer encouragement on cards** is hidden when admins disable Prayer Encouragement ([`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts)).
- **Fix**: Settings modal sections use `flex flex-col gap-4` so reminder and feedback cards keep consistent vertical spacing ([`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts)).
- **Help**: **Memorize Scripture** help and guided tour document **Recite mode (beta)** and multi-translation verse picking ([`help-content.service.ts`](src/app/services/help-content.service.ts), [`help-driver-tour.service.ts`](src/app/services/help-driver-tour.service.ts)). **App Settings** help documents the personal / member cooldown control. **Prayer Encouragement (Pray For)** help covers personal Pray For, member-list cards, presentation-mode slides, and updated cooldown/privacy wording.
- **Fix**: Closing the loop-off **Prayers Complete!** overlay with **X** no longer auto-starts the slide countdown; press **Play** (toolbar or `P`) to begin another pass.
- **Fix**: Personal and member prayer cards show **{n} Prayers** (not **{n} Praying**) on the count badge; community cards keep **{n} Praying**.
- **Fix**: Member Pray For / Add Update are not gated by community `updates_allowed` (`admin-only` / `original-requestor`) — Planning Center member cards have no requester email, so list viewers always see those actions when encouragement is enabled.
- **Fix**: Personal Pray For cooldown cleanup waits for session init so a longer user cooldown is not mistaken for the default. Pray For records cooldown optimistically before the increment RPC (cleared on failure) so double-taps cannot inflate counts. Presentation `confirmPrayFor` captures personal vs community before the RPC; `getPersonalPrayers` maps `user_email` for presentation personal slides. New personal prayers include `user_email` on the optimistic cache entry so presentation treats them as personal immediately. `getCanPrayFor$` schedules a refresh when the cooldown expires so Pray For re-enables without a page reload.
- **Fix**: Presentation Pray For modal closes when advancing to another slide so encouragement cannot be recorded against the wrong prayer.
- **Fix**: Presentation Pray For count updates the slide that was prayed for even if auto-advance or navigation changes the current slide before the increment RPC finishes.
- **Fix**: Admin **Prayer Encouragement** enable checkbox could not be unchecked while the cooldown field was visible — the cooldown control is now hidden with CSS instead of removed from the form so `NgForm` no longer reverts the toggle ([`prayer-encouragement-settings`](src/app/components/prayer-encouragement-settings/prayer-encouragement-settings.component.ts)).
- **Fix**: **All Statuses** checks every status option; at least one content type and one status must stay selected.
- **Fix**: Presentation settings modal scrolls normally while a filter dropdown is open (removed full-screen dropdown backdrops that blocked wheel/touch scrolling).
### Memorize — Recite mode (Whisper) ✅
- **Practice**: New **Recite mode (beta)** on single-verse items — record the verse, OpenAI **whisper-1** transcription via [`transcribe-audio`](../supabase/functions/transcribe-audio/index.ts), word-by-word alignment UI in [`memorization-practice-session`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts). Alignment logic in [`memorizationReciteAlignment.ts`](src/app/lib/memorization/memorizationReciteAlignment.ts).
- **Admin**: **Settings → Content → Memorization Recite Mode** ([`memorization-recite-settings`](src/app/components/memorization-recite-settings/memorization-recite-settings.component.ts)) — enable toggle, app-tracked usage this month, optional OpenAI org spend (last 30 days) via [`get-openai-org-usage`](../supabase/functions/get-openai-org-usage/index.ts). **`OPENAI_API_KEY`** for Whisper; optional **`OPENAI_ADMIN_KEY`** (Admin API key) for org-wide spend in admin.
- **Data**: Migration [`20260721120000_memorization_recite_mode.sql`](../supabase/migrations/20260721120000_memorization_recite_mode.sql) — `admin_settings.memorization_recite_enabled`, `memorization_recite_usage` ledger, `is_admin()` aligned with `email_subscribers`, secured admin RPC `get_memorization_recite_usage_summary`, and retained `admin_login` verification rows.
- **Mobile**: Microphone permission strings (iOS `Info.plist`, Android `RECORD_AUDIO`).
- **Fix**: Recite transcription works for MFA (email-code) sign-in — `transcribe-audio` accepts `user_email` validated against `email_subscribers` when no Supabase JWT is present (same pattern as scripture edge functions with `verify_jwt: false`).
- **Fix**: Recite mode picker always re-reads `admin_settings` when practice opens or the mode list is shown, so Safari/other browsers are not stuck on a stale `localStorage` disabled flag. Cache only seeds `enabled: true`; settings load uses `directQuery` (plain fetch) for cross-browser reliability.
- **Fix**: Admin Recite usage panel works with MFA admin login — client passes `mfa_authenticated_email` to `get_memorization_recite_usage_summary` and `get-openai-org-usage`.
- **Fix**: Recite admin panel shows settings immediately (usage loads in background); app-tracked and OpenAI org usage fetch in parallel with visible spinners. Usage block hidden when Recite mode is disabled.
- **Fix**: Recite alignment no longer cascades errors after a wrong opening phrase (e.g. "You are the vine" vs "I am the vine") — short words require exact match; skip-ahead detection limited to the next word only. Reference alignment ignores STT filler (`colon`, `and`, etc.) between chapter and verse numbers.
- **Fix**: Recite transcription and admin usage honor MFA (`mfa_authenticated_email`) — `MemorizationReciteService` resolves caller email like other MFA flows; practice header error count uses `displayPracticeErrors` during Recite results.
- **Fix**: Recite Whisper prompt uses spoken-style references (`2 Timothy 3 16` not `3:16`) so STT matches how users recite; 400ms recording tail after stop reduces clipped trailing verse numbers; results show **What we heard** transcript for debugging.
- **Fix**: Recite Whisper prompt is **reference-only** (not the full verse text) so Whisper does not insert omitted words that appear in the prompt (e.g. **is** in “as is good”).
- **Fix**: Recite alignment no longer treats singular/plural pairs (e.g. **mouth** vs **mouths**) as fuzzy-correct; the top row shows what was heard in red when they differ. The plural heuristic is narrow (exact `+s` / `+es` / `-ies` morphological pairs only, excluding stem-final **-us** / **-ss** and Bible book names) so STT truncations like **witness**→**witnes**, **always**→**alway**, and **jesus**→**jesu** still fuzzy-match.
- **UX**: Recite mode button now appears for all enabled memorization items (not only single-verse references). Choosing Recite on a passage over **5 verses** or a chapter-only reference shows an inline warning in the mode picker.
- **Practice**: Recite mode now supports **Bible Books** lists; alignment treats book names only (no scripture reference suffix). Maximum recording length increased from 3 to **5 minutes** (client auto-stop and usage billing cap).
- **Fix**: Recite auth matches the rest of the MFA app — `transcribe-audio`, `get-openai-org-usage`, and `get_memorization_recite_usage_summary` accept active subscriber email from `mfa_authenticated_email` (no `mfa_session_start` or verification-code proof). Existing logged-in users can use Recite without re-login.
- **Fix**: `transcribe-audio` no longer gates Recite on `email_subscribers.is_active` (mass-email opt-out) or `is_blocked` — any known subscriber email can transcribe; blocked users are already kept out of the app.
- **Fix**: Recite hint peek on multi-digit verse numbers (e.g. Ephesians 4:**29**) no longer blanks the leading digit when only the trailing digit is hidden — each digit in a grouped segment is shown or hidden independently.
- **Fix**: Android native Recite recording — added `MODIFY_AUDIO_SETTINGS` to [`AndroidManifest.xml`](../android/app/src/main/AndroidManifest.xml) (required with `RECORD_AUDIO` for WebView `getUserMedia`).
- **Fix**: Grouped verse-number stats and skip labels stay consistent for partial multi-digit misses; duplicate stop during capture tail no longer double-bills Whisper.
- **Fix**: Recite alignment no longer marks verse words like **twelve** as skipped — spoken number words that normalize to digits (e.g. `twelve` → `12`) match verse text instead of being discarded as stray reference digits ([`memorizationReciteAlignment.ts`](src/app/lib/memorization/memorizationReciteAlignment.ts)).
- **Fix**: Recite reference alignment for verse ranges (e.g. `John 3:16-18`) ignores spoken connectives between endpoint verse numbers — **and**, **through**, **to**, and spoken **dash** / **hyphen** do not affect scoring; both range endpoints must still match.
- **Fix**: Recite reference alignment accepts **Psalm** or **Psalms** interchangeably when reciting the book name (canon stores **Psalms**; users may say either form).
- **Fix**: Recite Whisper prompt includes a translation-style hint (**Contemporary English** vs **King James**) plus the spoken reference (still no verse body) to reduce archaic STT output on modern translations; alignment stays strict so saying **thee**/**ye** when the verse expects **you** is marked wrong.
- **Analytics**: PostHog events `memorization_practice_started` and `memorization_practice_completed` (properties: `mode`, `item_kind`, optional `bible_books_scope`, plus `wrong_attempts` / `correct_keystrokes` on completion) for memorization mode usage reporting — [`memorizationPracticeAnalytics.ts`](src/app/lib/memorization/memorizationPracticeAnalytics.ts). Resuming an in-progress session now emits `memorization_practice_started` once per `sessionSeed` (with `resumed: true`) so reorder and other resumed modes appear in PostHog.
- **UI**: Recite results **what you said** row shows expected verse spelling and capitalization for correct matches (e.g. **twelve**, **God**, **James**) instead of normalized STT lowercase/digits.
- **UI**: Recite results footer adds **Help** (left of **Repeat this round**) with a short feedback prompt; **Open Settings** closes practice and scrolls to **Send Feedback**.
- **UI**: Memorize action bar — **Add Verses** uses soft blue (verse-picker style); **Bible Books** / **Recommended** stay neutral gray until hover or while their modal is open ([`memorization-action-bar`](src/app/components/memorization-action-bar/memorization-action-bar.component.ts)). Dark-mode hover uses `!important` overrides so theme `bg-gray-800` utilities do not block the highlight.
- **Removability**: Recite is isolated under [`src/app/memorization-recite/`](src/app/memorization-recite/) with practice UI in [`memorization-recite-practice.component`](src/app/memorization-recite/memorization-recite-practice.component.ts); integration points marked `@removal-recite`. See [REMOVAL-RECITE.md](REMOVAL-RECITE.md).
### Fix — Add Verses uses picker translation ✅
- **Memorize**: [`add-memorized-verse-modal`](src/app/components/add-memorized-verse-modal/add-memorized-verse-modal.component.ts) tracks the passage picker’s selected translation on confirm instead of re-reading `localStorage` preference, so fetch/save match what the user chose.

### Fix — toast above memorize modals ✅
- **UI**: [`toast-container`](src/app/components/toast-container/toast-container.component.ts) stacks at `z-[250]` (above memorize modals at `z-[200]` and scripture hover preview at `z-[220]`) so success/error toasts stay visible when adding verses from **Recommended**.

### Memorize — API.Bible translations ✅
- **Translations**: Memorize supports **ESV** (Crossway API) plus **KJV, NASB, LSB, NIV, NLT, CSB** via [API.Bible](https://api.bible/) through the `scripture` Edge Function. Passage text is cached per `(reference, translation)` with existing LRU `verse_count` pruning.
- **UI**: Bible passage picker and **Recommended** modal share [`BibleTranslationPickerComponent`](src/app/components/bible-translation-picker/bible-translation-picker.component.ts); preference persists in `localStorage` via [`MemorizationService`](src/app/services/memorization.service.ts). [`scripture-attribution`](src/app/components/scripture-attribution/scripture-attribution.component.ts) shows publisher-required copyright (API.Bible Appendix B + Lockman / Biblica / Tyndale / Holman). **Listen** remains **ESV-only** (no verse-level API.Bible audio).
- **Ops**: New Supabase secrets `API_BIBLE_KEY` and `API_BIBLE_BIBLE_ID_*` — see [`docs/SETUP.md`](docs/SETUP.md#esv-api-memorize-tab). `scripture` Edge Function keeps ESV + API.Bible helpers in a single [`index.ts`](../supabase/functions/scripture/index.ts) (Supabase deploy bundles the entrypoint only). Cache reads try USFM keys first, then legacy human-readable keys for rows written before the USFM migration. Cache prune uses the oldest translation TTL cutoff so API.Bible rows are not evicted early on ESV requests.
- **Data**: Migration [`20260717120000_memorization_recommendations_multi_translation.sql`](supabase/migrations/20260717120000_memorization_recommendations_multi_translation.sql) widens `memorization_recommendations.translation` from ESV-only to all supported Bible codes so admin **Memorize Recommendations** can save curated verses in the admin’s chosen translation.

### Settings — shared Enabled/Disabled toggle ✅
- **UI**: Extracted [`EnabledDisabledToggleComponent`](src/app/components/enabled-disabled-toggle/enabled-disabled-toggle.component.ts) for the two-tile **Enabled** / **Disabled** grid (loading skeleton, selection styling, save-disabled state). **Email Notifications**, **Push Notifications**, and **Notification Badges** in [`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts) now share this component instead of duplicated markup.

### Settings — feedback type tiles ✅
- **UI**: **Send Feedback** in Settings replaces the native **Feedback Type** `<select>` with three selectable tiles (Suggestion, Feature Request, Bug Report) matching settings toggle styling. [`github-feedback-form.component.ts`](src/app/components/github-feedback-form/github-feedback-form.component.ts) keeps `#tour-settings-feedback-type` and `#issueType` anchors; keyboard arrows cycle options and move focus to the selected tile (roving `tabindex`).

### Settings — push notifications UI ✅
- **UI**: **Push Notifications** in Settings now uses the same **Enabled** / **Disabled** button pair as **Email Notifications**, replacing the checkbox and dynamic “Subscribed…” label. [`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts).

### Admin — Email Subscribers mobile dates ✅
- **UI**: On narrow screens, **Added** and **Activity** stack label above a single-line timestamp (`date:'short'`). From **`sm` and up**, date and time render on separate lines (`shortDate` / `shortTime`). Shared markup lives in [`EmailSubscriberTimestampComponent`](src/app/components/email-subscriber-timestamp/email-subscriber-timestamp.component.ts). [`email-subscribers.component.ts`](src/app/components/email-subscribers/email-subscribers.component.ts).

### Hourly reminder refactor ✅
- **Shared service**: Prayer and memorization hourly slots use one [`UserHourReminderService`](src/app/services/user-hour-reminder.service.ts) with `UserHourReminderSlot` and per-kind session cache keys. Race-safe fetch generation and account-switch guards apply to **both** kinds (prayer was previously weaker).
- **Settings UI**: [`HourReminderSettingsSectionComponent`](src/app/components/hour-reminder-settings-section/hour-reminder-settings-section.component.ts) replaces duplicated blocks in [`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts) (~1.6k lines removed).
- **Admin email UI**: [`HourlyReminderTemplateSectionComponent`](src/app/components/hourly-reminder-template-section/hourly-reminder-template-section.component.ts) replaces duplicated prayer/memorization template panels in [`email-settings.component.ts`](src/app/components/email-settings/email-settings.component.ts).

### Memorization reminders (hourly nudges) ✅
- **Settings**: Users opt in under **Settings → Memorization reminders** — pick local clock hours (top of each hour, device IANA time zone) for personal memorization nudges. Separate from **Prayer reminders**. [`HourReminderSettingsSectionComponent`](src/app/components/hour-reminder-settings-section/hour-reminder-settings-section.component.ts) in [`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts), [`UserHourReminderService`](src/app/services/user-hour-reminder.service.ts) (`kind: 'memorization'`).
- **Email**: Sent when **Email subscription** is on (`email_subscribers.is_active`), using template key **`user_hourly_memorization_reminder`** or admin-selected **`user_hourly_memorization_reminder_with_spotlight`**. Links use **`{{appLink}}`** = `APP_URL` + `?filter=memorize`. **`HomeComponent`** applies `filter=memorize` on load (same deep-link pattern as `filter=current|answered`) and strips the query param after switching to the Memorize tab.
- **Push**: Sent when **Push notifications** are on and a `device_tokens` row exists (`data.type`: `memorization_reminder`). Both channels when both apply. Tapping the push on native opens home with **`?filter=memorize`** ([`app.component.ts`](src/app/app.component.ts), [`home.component.ts`](src/app/pages/home/home.component.ts)).
- **Spotlight template**: Picks the subscriber’s memorized item needing the most work (Learning before Practicing/Mastered; never-practiced and oldest `last_practiced_at` first; fewest completed sessions; tie-break rotation via `email_subscribers.hourly_memorization_reminder_last_spotlight_key`). Verse text from `scripture_cache` when available.
- **Data**: Migration [`20260714120000_user_memorization_hour_reminders.sql`](supabase/migrations/20260714120000_user_memorization_hour_reminders.sql) — `user_memorization_hour_reminders`, RPC `get_user_memorization_hour_reminders_due_now`, `admin_settings.user_hourly_memorization_reminder_template_key`, email templates, pg_cron job **`invoke-user-hourly-memorization-reminders`**.
- **Edge**: [`send-user-hourly-memorization-reminders`](supabase/functions/send-user-hourly-memorization-reminders/index.ts) — hourly via Vault + `pg_net` (same secrets as prayer reminders). Deploy after applying migration.
- **Admin**: **Admin → Settings → Email → Hourly user memorization reminder email** template picker. [`email-settings.component.ts`](src/app/components/email-settings/email-settings.component.ts).
- **Help**: Standalone section **`help_memorization_reminders`** and **App Settings** item in [`help-content.service.ts`](src/app/services/help-content.service.ts).
- **Fix**: Memorization spotlight reminder emails no longer show awkward line breaks — Bible book names (e.g. `1 Kings`, `2 Timothy`) stay on one line via nowrap spans in HTML and non-breaking spaces in plain text; verse text from `scripture_cache` is normalized before render (stray single newlines collapsed; paragraph breaks preserved). Formatting helpers in [`memorization-email-format.ts`](src/app/lib/memorization/memorization-email-format.ts), duplicated in [`send-user-hourly-memorization-reminders`](supabase/functions/send-user-hourly-memorization-reminders/index.ts).

### Settings — sticky modal header ✅
- **UI**: The Settings modal header (title + close) stays fixed while the body scrolls. [`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts).

### Memorize — strict practice mode ✅
- **Fix**: Round 5 in **Strict** mode now requires a perfect completion before the **Done** screen — same repeat-until-error-free behavior as rounds 1–4. Standard mode is unchanged (round 5 can finish with errors). Resuming or switching to Standard on a saved final-round state shows **Finish practice** instead of advancing to a non-existent round 6; final-round header copy matches the active mode. Session bootstrap is awaited before allowing a strict final round to finish with errors.
- **Settings**: User Settings adds **Memorization practice** with **Standard** (default) and **Strict**. Strict mode disables auto-reveal after three wrong attempts on a blank in Type, Initials, and Word modes; wrong answers keep flashing red until the user gets it right. In **Reorder** mode, strict mode also counts a swap as an error when no verse part lands in its correct reading-order slot (standard mode still allows exploratory swaps). In strict mode, **Next round** is hidden until the current round is completed with zero errors (only **Repeat this round** is offered). Preference syncs via `email_subscribers.memorization_strict_mode` and [`UserSessionService`](src/app/services/user-session.service.ts). Migration [`20260713120000_email_subscribers_memorization_strict_mode.sql`](supabase/migrations/20260713120000_email_subscribers_memorization_strict_mode.sql).
- **UI**: Practice session header shows **Errors: N** for the **current round** only when N &gt; 0; the count stays visible on the round-complete screen until **Repeat this round** or **Next round**, then resets to zero for the new try. The completion screen header shows **Finished**. Word-mode choice buttons live in [`MemorizationWordChoicesFooterComponent`](src/app/components/memorization-word-choices-footer/memorization-word-choices-footer.component.ts) with a fixed footer height, **three rows below `sm`**, **two rows at `sm` and wider** (even split, horizontal scroll on narrow widths) so the passage above does not jump when choices change. Digit blanks show six number choices (was four). [`memorization-practice-session.component.ts`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts), [`memorizationPracticeUtils.ts`](src/app/lib/memorization/memorizationPracticeUtils.ts), [`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts).
- **Help**: **Memorize Scripture** help and guided tour describe **Standard** vs **Strict** practice; **App Settings** help and tour include the **Memorization practice** control. [`help-content.service.ts`](src/app/services/help-content.service.ts), [`help-driver-tour.service.ts`](src/app/services/help-driver-tour.service.ts).
- **Fix**: **Repeat** / **Next round** now persist in-progress practice after `wrongAttemptsInRound` resets, so strict mode resume no longer keeps a stale round error count. Settings without a cached session loads `memorization_strict_mode` from `email_subscribers` instead of defaulting to Standard. Legacy in-progress saves without per-round error counts still block strict **Next round** when session errors exist; strict-mode toggles refresh `UserSessionService` even without a cached session; pre-upgrade `userSession` localStorage entries missing `memorizationStrictMode` are not published until the database refresh. Practice sessions subscribe to `userSession$` so strict mode applies when the session loads later; legacy `inRound` resumes also restore round error counts from `wrongAttempts`. **Next round** stays hidden on error rounds until `UserSessionService` finishes initializing so strict users cannot advance during the pre-session window; `nextRound()` is guarded to match. Auto-reveal after three wrong attempts is likewise blocked until session bootstrap resolves strict vs standard. `UserSessionService` no longer marks the session initialized when publishing a cached snapshot—it waits until the database refresh completes.

### Settings — Print and Add reminder button layout ✅
- **UI**: **Print** tiles stay in one row of three on all screen sizes (no longer stack into three rows on narrow viewports). Icon and label are stacked inside each tile at every breakpoint. **Add reminder** keeps the plus icon and label on one row at all breakpoints. [`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts).

### Admin help — Memorize Recommendations guided tour ✅
- **UI**: Admin header **?** → **Memorize Recommendations** starts a driver.js tour of Settings → Content → **Memorize Recommendations** (categories, verses, drag-reorder). Does not open add forms. [`admin-help-driver-tour.service.ts`](src/app/services/admin-help-driver-tour.service.ts), [`memorization-recommendations-manager.component.ts`](src/app/components/memorization-recommendations-manager/memorization-recommendations-manager.component.ts), [`admin-help-modal.component.ts`](src/app/components/admin-help-modal/admin-help-modal.component.ts).

### Admin Analytics — Memorize total count ✅
- **UI**: Admin → Settings → Analytics adds a **Total** metric card for site-wide count of all `memorized_items` rows (sum of Learning + Practicing + Mastered). [`analytics.service.ts`](src/app/services/analytics.service.ts), [`admin.component.ts`](src/app/pages/admin/admin.component.ts).

### Marketing — Memorize subscriber promo ✅
- **Ops**: Paste-ready subscriber announcement (subject options, Markdown, companion HTML) lives in [`docs/marketing/memorize-subscriber-promo.md`](docs/marketing/memorize-subscriber-promo.md). Screenshots are under [`public/marketing/memorize/`](public/marketing/memorize/) and must be deployed before sending so `https://cpprayer.cp-church.org/marketing/memorize/…` resolves. Prefer **HTML paste** in Admin broadcast for this promo.
- **Assets**: Modal crops are taken from full-resolution captures and downscaled (not upscaled) so email images stay sharp. Full-page Memorize shots (`01` / `02` / `05`) use a non-admin subscriber session (no Admin badge). [`07-practice-modes-grid.png`](public/marketing/memorize/07-practice-modes-grid.png) is a labeled 2×2 collage of Type, Initials, Word, and Reorder mid-practice on the same verse.
- **Email**: [`markdownToSafeHtml`](src/utils/markdown.ts) / [`sanitizeEmailHtml`](src/utils/markdown.ts) allowlist safe HTTPS (and root-relative) `<img>` tags so Admin → **Send email to all subscribers** can include those screenshots.
- **Editor**: Broadcast UI defaults to **HTML paste** (textarea) with optional **Rich text** (TipTap, including Image for Markdown screenshots). [`admin-subscriber-email-broadcast.component.ts`](src/app/components/admin-subscriber-email-broadcast/admin-subscriber-email-broadcast.component.ts); queue accepts `bodyHtml` or `bodyMarkdown` in [`email-notification.service.ts`](src/app/services/email-notification.service.ts).

### Memorize — Recommended modal category accordions ✅
- **UI**: The Memorize **Recommended** modal shows each category as a custom accordion (collapsed by default) with verse count and chevron; expand a category to see its verse cards. Closing the modal resets expansion. [`memorization-recommendations-modal.component.ts`](src/app/components/memorization-recommendations-modal/memorization-recommendations-modal.component.ts).
- **Fix**: On Capacitor / touch devices, opening Recommended locks background scroll (body, documentElement, and `.safe-area-viewport`) and only allows `touchmove` inside the modal scroller so the page behind does not scroll. Same approach as the Bible passage picker. Touches inside a body-portaled scripture hover preview are also allowed so long-press previews remain scrollable.
- **Help**: **Memorize Scripture** help and guided tour cover **Recommended** (topic categories, Already added, hover/long-press preview); tour step highlights `tour-memorize-recommended`.

### Memorize — verse hover / long-press preview ✅
- **UI**: Memorize list cards and Recommended modal cards show passage text on desktop hover (500ms) or mobile long-press via a portaled popover. Primary tap still opens practice / adds the verse. Admin **Memorize Recommendations** drag rows also preview on hover/long-press (reference text only, so drag handle and delete stay clear). Hover previews omit the ESV attribution footer (still shown in practice / privacy). [`scripture-hover-preview.component.ts`](src/app/components/scripture-hover-preview/scripture-hover-preview.component.ts), [`memorized-verse-card.component.ts`](src/app/components/memorized-verse-card/memorized-verse-card.component.ts), [`memorization-recommendation-card.component.ts`](src/app/components/memorization-recommendation-card/memorization-recommendation-card.component.ts), [`memorization-recommendations-manager.component.ts`](src/app/components/memorization-recommendations-manager/memorization-recommendations-manager.component.ts).
- **Fix**: Dismissing the preview no longer blanks the page. The popover is attached with `ApplicationRef` + `document.body` instead of CDK `DomPortalOutlet` on the host `ViewContainerRef` (detach was tearing down sibling views).
- **Fix**: Preview popover stacking is `z-[220]` (backdrop `z-[210]`) so it appears above the Recommended modal (`z-[200]`), not behind it.
- **Fix**: Mobile long-press keeps the preview open after finger lift (dismiss via backdrop tap or Escape) so the passage is readable; lift still suppresses the synthetic click so practice/add do not fire.
- **Fix**: Long-press on mobile disables native text selection and the iOS/Android callout menu on the card and preview (`select-none`, `-webkit-touch-callout: none`, clear selection on open, block `contextmenu`).
- **Fix**: Desktop hover popovers use `pointer-events: auto` with a short leave grace so the pointer can move into the popover to scroll long passages; scroll events inside the popover do not dismiss it.
- **Fix**: Long-press cancels when the finger moves more than 10px (scroll gesture) so list scrolling does not open a preview. Opening a preview closes any other open instance so popovers do not stack.
- **Fix**: Clicking a wrapped card (practice / add) dismisses the desktop hover preview so the portaled popover cannot sit above the practice session or Recommended modal and block interaction.
- **Fix**: Scrolling the Memorize list or Recommended modal dismisses an open long-press preview (scroll inside the popover itself still allowed) so the fixed overlay does not float away from its card.
- **Fix**: Hover previews also dismiss on keyboard Enter/Space (and click) on the wrapped card, not only `pointerdown`. Recommended modal scroll lock treats text-node touches inside scripture hover previews as allowed so long-press passages remain scrollable.
- **Fix**: Activating a card before the hover delay elapses cancels the pending open timer so a preview cannot appear over practice / add after navigation.
- **Fix**: While a long-press preview is open, Enter/Space (and click) on the still-focused card dismiss the overlay instead of opening practice/add underneath it.
- **Fix**: Long-press previews dismiss on viewport resize and `touchcancel`. Recommended category accordions set `aria-controls` only while expanded.

### Memorize — IBCD counseling recommendation seed ✅
- **Data**: Migration [`20260711120000_seed_ibcd_memorization_recommendations.sql`](supabase/migrations/20260711120000_seed_ibcd_memorization_recommendations.sql) seeds **30** counseling topic categories and **104** ESV-normalized verse references from Jim Newheiser / IBCD *Approximately 100 Go-to Texts for Biblical Counseling* (topic headings only; idempotent `ON CONFLICT DO NOTHING`). Categories use alphabetical `display_order` (A→Z by name). Duplicate references across topics are stored once (first category wins). Admins can still edit categories and verses under **Settings → Content → Memorize Recommendations**.
- **Data**: Migration [`20260711130000_sort_ibcd_recommendation_categories_alpha.sql`](supabase/migrations/20260711130000_sort_ibcd_recommendation_categories_alpha.sql) updates `display_order` for those IBCD category names on databases that already applied the seed with topic-list order.

### Memorize — recommendation categories ✅
- **Data**: Migration [`20260710210000_memorization_recommendation_categories.sql`](supabase/migrations/20260710210000_memorization_recommendation_categories.sql) adds `memorization_recommendation_categories` and required `category_id` on `memorization_recommendations` (FK `ON DELETE RESTRICT`). Existing verses are backfilled into a default **General** category.
- **Admin**: Settings → Content → **Memorize Recommendations** manages categories (add/rename/delete when empty, drag reorder) and verses under each category. Adding a verse requires a selected category. Drag a verse onto another category’s list (including empty “Drop verses here” zones) to move it. [`memorization-recommendations-manager.component.ts`](src/app/components/memorization-recommendations-manager/memorization-recommendations-manager.component.ts).
- **UI**: The Memorize **Recommended** modal lists verses grouped by category; opening the modal force-refetches so admin edits appear promptly. [`memorization-recommendations-modal.component.ts`](src/app/components/memorization-recommendations-modal/memorization-recommendations-modal.component.ts), [`home.component.ts`](src/app/pages/home/home.component.ts).
- **Fix**: `CacheService.invalidate` resolves the configured storage key (same as get/set), so `memorizationRecommendations` clears `memorizationRecommendations_cache`. [`cache.service.ts`](src/app/services/cache.service.ts).
- **Fix**: Recommendation loads use a generation token so overlapping `load()` calls cannot apply stale results; a failed force refresh keeps prior in-memory data instead of wiping the list. Verse move/reorder persists via atomic RPC [`apply_memorization_recommendation_placements`](supabase/migrations/20260710220000_apply_memorization_recommendation_placements.sql); category reorder via [`reorder_memorization_recommendation_categories`](supabase/migrations/20260710230000_reorder_memorization_recommendation_categories.sql). After a successful write (CRUD, reorder, or placement), the service updates in-memory state and cache before reload so a failed `load(true)` cannot make admin `syncFromService()` look like a revert. `groupedSnapshot` clones items so optimistic admin drag cannot corrupt the service cache. Admin drag handlers ignore drops while a prior persist is in flight. [`memorization-recommendations.service.ts`](src/app/services/memorization-recommendations.service.ts), [`memorization-recommendations-manager.component.ts`](src/app/components/memorization-recommendations-manager/memorization-recommendations-manager.component.ts).

### Memorize — admin verse recommendations ✅
- **Data**: Migration [`20260710200000_memorization_recommendations.sql`](supabase/migrations/20260710200000_memorization_recommendations.sql) adds `memorization_recommendations` (reference + ESV translation, `display_order`, permissive RLS for admin MFA/anon).
- **Admin**: Settings → Content → **Memorize Recommendations** lists curated verses, adds via the shared Bible passage picker, deletes, and drag-reorders. [`memorization-recommendations-manager.component.ts`](src/app/components/memorization-recommendations-manager/memorization-recommendations-manager.component.ts).
- **UI**: Memorize tab **+ Recommended** opens a modal of curated verses; tapping a card calls `MemorizationService.addVerse`. Cards already in the user’s list show **Already added** and are not clickable. [`memorization-action-bar.component.ts`](src/app/components/memorization-action-bar/memorization-action-bar.component.ts), [`memorization-recommendations-modal.component.ts`](src/app/components/memorization-recommendations-modal/memorization-recommendations-modal.component.ts), [`memorization-recommendations.service.ts`](src/app/services/memorization-recommendations.service.ts), [`home.component.ts`](src/app/pages/home/home.component.ts).
- **Fix**: Closing the Bible passage picker on Admin restores `documentElement`/`body` overflow correctly when there is no `.safe-area-viewport` (previously left the admin page unscrollable after adding a recommendation). [`bible-passage-picker-modal.component.ts`](src/app/components/bible-passage-picker-modal/bible-passage-picker-modal.component.ts).

### Admin Analytics — Memorize mastery counts ✅
- **UI**: Admin → Settings → Analytics shows three metric cards (**Learning**, **Practicing**, **Mastered**) with site-wide counts of `memorized_items`, using the same completed-session thresholds as the Memorize tab (`< 3` / `3–8` / `9+`). Subtitles say **memorized verses**. [`analytics.service.ts`](src/app/services/analytics.service.ts), [`admin.component.ts`](src/app/pages/admin/admin.component.ts), [`memorization-mastery.ts`](src/app/lib/memorization/memorization-mastery.ts).
- **UI**: Removed the **Active Email Subscribers** metric card from Site Analytics (total **Email Subscribers** remains).
- **UI**: Site Analytics metric tiles are more compact (tighter grid, smaller padding/type/icons) so the chart sits higher on the page.
- **UI**: Analytics tiles use a shared cream/neutral shell with brand left-border accents by group: church blue (page views), church green (prayers), gold (subscribers), slate (memorize).
- **UI**: Admin Portal header no longer shows the email / logout chip (Help and Main Site remain).

### Email templates — Outlook desktop–safe HTML ✅
- **Data**: Migration [`20260710120000_email_templates_outlook_desktop_safe.sql`](supabase/migrations/20260710120000_email_templates_outlook_desktop_safe.sql) updates all live `email_templates.html_body` rows for Outlook desktop (Word HTML engine): solid `bgcolor` / `background-color` under optional gradients, nested `table role="presentation"` shells (~600px), inline styles only (no `<style>` / class reliance), and CTA cells with `bgcolor`. Subjects, `text_body`, names, and descriptions are unchanged; all `{{variables}}` are preserved. **Apply to a test Supabase project first**, then production — see [SETUP.md](SETUP.md#email-templates).

### Memorize — keyboard on resume of in-progress type/initials ✅
- **Fix**: Reopening a verse with an in-progress type or first-letters round mounts and focuses the hidden practice input during `onOpen` (same user gesture as the tap), before the async passage fetch. Closing clears the hydrate-once guard so the next open can prime again. [`memorization-practice-session.component.ts`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts).
- **Fix**: Home runs **`detectChanges()`** when opening practice so the session mounts inside the verse-card tap turn (not on a later CD cycle). The capture input no longer uses `opacity: 0` / `pointer-events: none` (WebKit focuses those without opening the keyboard); it is a 1px near-invisible strip with `font-size: 16px`, and focus is followed by `click()` to coax the software keyboard. [`home.component.ts`](src/app/pages/home/home.component.ts), [`memorization-practice-session.component.ts`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts).
- **Fix**: Close→reopen still failed because a *newly created* practice input cannot open the iOS keyboard even with sync CD. Home now keeps a pre-mounted **keyboard bridge** input and focuses it on the verse-card tap *before* mounting the session when resuming an in-progress type/initials round; the session then takes focus so keystrokes go to practice. [`home.component.ts`](src/app/pages/home/home.component.ts), [`memorizationKeyboardPractice.ts`](src/app/lib/memorization/memorizationKeyboardPractice.ts).

### Memorize — initials mode opens keyboard on start ✅
- **Fix**: Starting **First letters** focuses the hidden practice input immediately after render (resolve by DOM id if `ViewChild` is not ready yet) so mobile Safari/Chrome can open the keyboard in the same user-gesture turn; focus is restored if scroll nudges steal it. [`memorization-practice-session.component.ts`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts).

### Memorize — type-mode error ring clears ✅
- **Fix**: Wrong-answer red ring clears after the brief flash via `NgZone.run` + `detectChanges`, and a correct keystroke/word guess clears any lingering flash immediately so the border does not stay on in type mode. [`memorization-practice-session.component.ts`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts).

### Memorize — suppress Safari AutoFill Contact on practice input ✅
- **UI**: Type and initials modes wrap the hidden practice input in a form with `autocomplete="off"`, set `name="search"`, use a non-contact `aria-label`, and hide WebKit contacts/credentials autofill buttons so iOS Safari is less likely to show the **AutoFill Contact** accessory (and related site badge) above the keyboard. [`memorization-practice-session.component.html`](src/app/components/memorization-practice-session/memorization-practice-session.component.html), [`memorization-practice-session.component.ts`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts).

### Memorize — initials active cue padding ✅
- **UI**: First-letters cue glyphs always reserve horizontal padding (`inline-block px-1`) so the active blue highlight can move without shifting neighboring letters; only ring/background/text colors toggle with the active cue. [`memorization-practice-session.component.html`](src/app/components/memorization-practice-session/memorization-practice-session.component.html).

### Memorize — practice auto-scroll without bounce ✅
- **Fix**: Blank auto-scroll uses a single instant `scrollTop` nudge (no nearest-scroll + smooth `scrollTo` combo). Initials cue scrolling adjusts only the cue strip’s `scrollTop` instead of `scrollIntoView` (which could also move `#practiceScroll`). Pending scroll timers are coalesced. [`memorization-practice-session.component.ts`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts).

### Memorize — first-letters verse blank auto-scroll ✅
- **Fix**: Initials mode now scrolls the focused verse blank into `#practiceScroll` (same keyboard-aware nudge as type mode), not only the cue strip. Visible top accounts for the sticky round/cue header so the blank is not hidden under it on long passages. [`memorization-practice-session.component.ts`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts), [`memorizationScrollIntoPractice.ts`](src/app/lib/memorization/memorizationScrollIntoPractice.ts).

### Memorize — word-mode scroll above choice footer ✅
- **Fix**: Word-mode auto-scroll measures `[data-testid="memorize-word-choices"]` and keeps the current blank above that footer (with a small gap), including when choices wrap to multiple rows. Scroll is deferred until after layout and also runs after each word guess. [`memorization-practice-session.component.ts`](src/app/components/memorization-practice-session/memorization-practice-session.component.ts), [`memorizationScrollIntoPractice.ts`](src/app/lib/memorization/memorizationScrollIntoPractice.ts).

### Memorize — practice ESV attribution scrolls with passage ✅
- **UI**: During practice, ESV attribution sits at the bottom of the passage inside `#practiceScroll` (same as intro) instead of a pinned footer above word-choice / round chrome. Auto-scroll that keeps the current blank above the keyboard is no longer blocked by a fixed attribution bar on long passages; users scroll to the end to see the notice. [`memorization-practice-session.component.html`](src/app/components/memorization-practice-session/memorization-practice-session.component.html).

### Settings — print buttons (Prayer_App style) ✅
- **UI**: Settings **Print** row uses bordered card layout with a **3-column grid** (stacked on narrow screens): soft blue **`border-2`** tiles with icon + short label (**Prayers** / **Prompts** / **Personal**), gray chevron split, and blue highlight when a filter is active—matching [Kelemek/Prayer_App](https://github.com/Kelemek/Prayer_App) instead of solid green bars. On narrow screens all three show the label beside the icon; at `sm+` they stack icon-over-label. The settings modal panel hides its scrollbar while keeping touch scroll (same as Prayer_App). [`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts).

### Settings — notification & preference cards (Prayer_App style) ✅
- **UI**: **Email notifications**, **Notification badges**, **Prayer encouragement** (Show/Hide for Pray For and Praying #), **Default prayer view**, and **Prayer reminders** use the same soft blue **`border-2`** tile pattern as Prayer_App—**Enabled**/**Disabled** or option buttons instead of checkboxes/radios; reminder hours use a chevron dropdown and bordered slot rows with split **Remove**; **Add reminder** matches print tiles (plus icon, spinner while saving, bordered success/error alerts). Tour anchor IDs unchanged. [`user-settings.component.ts`](src/app/components/user-settings/user-settings.component.ts).

### Help — Memorize Scripture section ✅
- **Help modal**: New **`help_memorize`** accordion (**Memorize Scripture**) with topics on adding verses/Bible books, **Recommended** curated verses (topic accordions, Already added, hover/long-press preview), mastery groups, practice modes, and ESV listen audio; **Start guided tour** highlights `tour-filter-memorize`, `tour-memorize-action-bar`, `tour-memorize-recommended`, sample card or empty state, then practice tips. Included in **Full guided tour** after Personal Prayers. [`help-content.service.ts`](src/app/services/help-content.service.ts), [`help-modal.component.ts`](src/app/components/help-modal/help-modal.component.ts), [`help-driver-tour.service.ts`](src/app/services/help-driver-tour.service.ts), [`home.component.ts`](src/app/pages/home/home.component.ts).
- **Fix**: Memorize guided tour no longer exits silently when started from another filter—the action bar and list anchors are resolved after **Show Memorize** switches the view (same pattern as Prayer Prompts). [`help-driver-tour.service.ts`](src/app/services/help-driver-tour.service.ts).

### Capacitor — bottom safe bar with short lists ✅
- **UI**: On native (`html.native-app`), `.safe-area-viewport` is a flex column and `main` grows so the sticky `.bottom-safe-bar` stays at the bottom of the screen when Home content is short (notably the **Memorize** filter with few passages). Previously `sticky bottom-0` left the bar mid-screen until content overflowed. [`styles.css`](src/styles.css).

### Home — Memorize (ESV verse memorization) ✅
- **Behavior**: New **Memorize** filter tab on Home for personal verse and Bible-books memorization with practice modes (type, word, reorder, first letters) and ESV listen audio. Filter row order: Current → Answered → Total → Prompts → Personal → **Memorize** → **Members** (when Planning Center list is mapped). On small screens: **3 buttons** on the first row and **4** on the second when Members is shown (`grid-cols-3` + `grid-cols-4`); **3 + 3** when Members is hidden.
- **Backend**: Migration [`20260707120000_memorization_esv.sql`](../supabase/migrations/20260707120000_memorization_esv.sql) (`memorized_items` stores **reference only** for verses — `text` is empty; ESV passage text lives only in `scripture_cache` with `verse_count` + `prune_scripture_cache` ~**500**-verse LRU / **7**-day TTL, JWT + anon RLS for MFA logins). Edge Functions [`scripture`](../supabase/functions/scripture/index.ts) and [`scripture-audio`](../supabase/functions/scripture-audio/index.ts) (ESV API only; secret **`ESV_API_TOKEN`**; `verify_jwt: false` for MFA clients). [`ScriptureService`](../src/app/services/scripture.service.ts) sends the anon key as `Authorization` when no Supabase JWT is present.
- **Frontend**: [`MemorizationService`](../src/app/services/memorization.service.ts), [`ScriptureService`](../src/app/services/scripture.service.ts), components under [`src/app/components/`](../src/app/components/) (`memorization-*`, `add-memorized-*`, `bible-passage-picker-modal`, `scripture-attribution`). Verse items are saved by reference; practice loads passage text on demand via `ScriptureService.getPassage`. Type/initials practice auto-focuses the hidden input when a round starts so the keyboard is ready without tapping the first blank (off-screen on all mobile hosts so Safari iOS does not show a blue focus line at the top of the practice scroll area). Wrong-answer red ring flashes briefly (~220ms) instead of lingering. Session completion screen stays visible until the user taps **Done** (item refresh after stats save no longer resets to intro or reloads passage text). Initials mode selects the first word on round start (active cue highlighted and scrolled into view; round 5 keeps all cues as dots until typed). After three wrong attempts, initials mode reveals the hidden cue letter as well as the verse word. Initials cue glyphs always reserve light horizontal padding; the active cue adds an inset ring/background without shifting letter positions (word spaces sit outside the glyph spans). Passage picker uses Prayer_App memorize colors (soft blue testament tabs, solid `blue-600` chapter/verse picks) with gospel_presentation scroll layout (inline verses, `scrollIntoView` on expand/chapter). On mobile, the picker locks Home’s `.safe-area-viewport` scroll (`overflow` + `touch-action`), uses capture-phase `touchmove` guards so drags on header/footer (including **Add**) do not scroll the page, `overscroll-y-contain` on the book list, and hides the list scrollbar while keeping touch scroll. Tap a selected verse again to deselect before choosing another. Reorder mode applies inter-chip margin via `ngClass` (Angular `[class.mr-1.5]` incorrectly binds `mr-1`, which collapsed word spacing). **ESV compliance**: full Crossway copyright notice in [`scripture-attribution`](../src/app/components/scripture-attribution/scripture-attribution.component.ts) (intro and practice UI; attribution sits at the bottom of the scrollable passage so auto-scroll / keyboard layout is not blocked by a pinned notice) and **Scripture Copyright (ESV)** on [`/privacy`](../src/app/pages/privacy/privacy.component.ts) via shared [`esv-copyright.ts`](../src/app/lib/memorization/esv-copyright.ts). See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#memorize-esv).

### Toolchain — dependency upgrades (Angular 22, ecosystem) ✅
- **Angular 22** (`@angular/*` **22.0.4**), **TypeScript 6** (`~6.0.3`), **angular-eslint 22**. CLI migrations: **`ChangeDetectionStrategy.Eager`** on components that did not set a strategy (preserves pre-v22 default behavior); **`withXhr()`** on [`provideHttpClient`](src/main.ts) so HttpClient keeps the XHR backend; extended diagnostics for nullish coalescing / optional chain suppressed in [`tsconfig.app.json`](tsconfig.app.json).
- **Ecosystem minors**: Capacitor **8.4.1**, `@capacitor/push-notifications` **8.1.1**, `@capgo/capacitor-printer` **8.1.0** (upstream includes Android `runOnUiThread`; removed obsolete patch-package patch), `@supabase/supabase-js` **^2.110.0**, Vitest **4.1.9**, Playwright **1.61.1**, Tailwind **4.3.2**, TipTap **3.27.1**, and related patch bumps. **driver.js 1.6** dropped `side: 'over'` — tour steps use **`side: 'bottom'`** in help driver services.
- **Node**: Angular 22 requires **Node ≥ 22.22.3** (or **≥ 24.15.0**). Vercel’s **`22.x`** image was **22.22.2** (too old for `ng build`), so [`package.json`](../package.json) **`engines.node`** is **`24.x`** for deploys. CI [`.github/workflows/test.yml`](.github/workflows/test.yml) and [`.nvmrc`](../.nvmrc) pin **`22.22.3`** for local/CI. See [docs/SETUP.md](docs/SETUP.md).
- **Vercel install**: [`.npmrc`](../.npmrc) sets **`legacy-peer-deps=true`** so `npm install` succeeds while **lucide-angular@0.x** still peers only through Angular 21 (runtime-compatible with 22).
- **Markdown / CI tests**: [`src/utils/markdown.ts`](../src/utils/markdown.ts) lazily binds DOMPurify to `window` (with passthrough detection), falls back to an allowlist sanitizer when structural tags are dropped, and uses a dedicated `Marked` instance; [`vitest.config.mts`](../vitest.config.mts) uses **jsdom**, **`pool: 'forks'`**, and **`disableConsoleIntercept`** on CI to avoid Vitest worker teardown races.
- **Edge Functions**: Migrated from deprecated `std@0.168.0/http/server.ts` **`serve`** to **`Deno.serve`**; pinned **`@supabase/supabase-js@2.110.0`** in [`supabase/functions/deno.json`](supabase/functions/deno.json) and function imports; `deno check` on representative functions.
- **Verify**: `npm run pre-handoff` (5417+ unit tests); `npm run cap:sync` after Capacitor bumps.
- **Deferred**: lucide-angular v1 (breaking icon API), zoneless change detection, Signal Forms rewrite.

### Developer workflow — verify before done ✅
- **Behavior**: Agents and contributors run **`npm run pre-handoff`** (lint + typecheck + unit tests + logic-review reminders) before finishing; [`scripts/pre-handoff.js`](scripts/pre-handoff.js), [AGENTS.md](../AGENTS.md), skill [`.cursor/skills/pre-handoff/SKILL.md`](.cursor/skills/pre-handoff/SKILL.md). Cursor **`stop` hook** [`.cursor/hooks.json`](.cursor/hooks.json) auto-continues the agent until pre-handoff passes when `src/app`, `src/lib`, or `supabase/migrations` changed. Rule [`.cursor/rules/verify-before-done.mdc`](.cursor/rules/verify-before-done.mdc) still requires **`ReadLints`** and manual logic review (session/cache/RxJS races, regression tests) — automated verify alone does not catch those bugs.
- **CI**: GitHub Actions runs typecheck and lint (no longer `continue-on-error` on lint). See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#verify-before-merge-or-agent-handoff).

### Home — Planning Center Members filter (cache-first) ✅
- **Behavior**: The **Members** stat button and count hydrate from **per-user** `localStorage` on first paint (same pattern as prompts), then refresh in the background from Supabase (`planning_center_list_id`) and the Planning Center API. Count shows **…** while members load when the list id is already known.
- **Implementation**: [`planning-center-list.service.ts`](src/app/services/planning-center-list.service.ts) (`listId$`, `members$`, `loading$`, key `prayerapp_planning_center_list_<email>`, 30‑minute TTL, one-time migration from legacy `planningCenterListData_cache`); [`home.component.ts`](src/app/pages/home/home.component.ts) subscribes and calls `loadForCurrentUser()` in `ngOnInit`; [`presentation.component.ts`](src/app/pages/presentation/presentation.component.ts) uses the same service. Cache invalidates on logout ([`admin-auth.service.ts`](src/app/services/admin-auth.service.ts), lazy `Injector.get`) and when an admin maps or clears a subscriber list ([`planning-center-list-mapper.component.ts`](src/app/components/planning-center-list-mapper/planning-center-list-mapper.component.ts)).
- **Fix**: Logout no longer injects `PlanningCenterListService` in `AdminAuthService`’s constructor (broke bootstrap: circular DI with `UserSessionService`).
- **Fix**: When `planning_center_list_id` changes, [`planning-center-list.service.ts`](src/app/services/planning-center-list.service.ts) clears members before emitting the new list id so Home’s `combineLatest` never loads member prayers for the wrong roster. If `fetchListMembers` fails, members are cleared and the per-user cache is updated so a new list id is not left paired with a stale roster.
- **Fix**: [`home.component.ts`](src/app/pages/home/home.component.ts) clears `filteredPlanningCenterPrayers` whenever the member roster is empty, not only when there is no list id (avoids stale member cards after API failure or an empty list).
- **Fix**: [`planning-center-list.service.ts`](src/app/services/planning-center-list.service.ts) ignores late `refreshFromServer` results when `loadedEmail` no longer matches (account switch while a prior load is in flight).
- **Fix**: [`planning-center-list-mapper.component.ts`](src/app/components/planning-center-list-mapper/planning-center-list-mapper.component.ts) always invalidates a subscriber’s Planning Center cache on **Remove mapping** (email from DB `select`, `mappings`, or `subscribers`).
- **Fix**: [`home.component.ts`](src/app/pages/home/home.component.ts) dedupes `userSession$` before filtering out logout so re-login with the same email still calls `loadForUser` (Planning Center data no longer stays stale when Home stays mounted).

### Monitoring — remove Vercel Analytics and Speed Insights ✅
- **Behavior**: Dropped `@vercel/analytics` and `@vercel/speed-insights`; web vitals and product analytics use **PostHog** only (plus admin Site Analytics in Supabase). Vercel remains the hosting platform.
- **Implementation**: Removed init blocks from [`src/main.ts`](src/main.ts); dependencies removed from [`package.json`](package.json).

### Monitoring — PostHog replaces Sentry and Clarity ✅
- **Behavior**: Client analytics, session replay, and error tracking use **PostHog** (`posthog-js`) instead of Sentry and Microsoft Clarity.
- **Implementation**: [`src/lib/posthog.ts`](src/lib/posthog.ts), [`PosthogService`](src/app/services/posthog.service.ts), [`providePostHogErrorHandler`](src/app/posthog-error-handler.ts); environment `posthogKey`, `posthogHost` (first-party proxy `https://t.cp-church.org`), and `posthogUiHost` (`https://us.posthog.com`) — see [`docs/SETUP.md`](docs/SETUP.md).
- **Fix**: Local `ng serve` now sends events when `posthogKey` is set (removed dev `opt_out_capturing`); initial route emits `$pageview`; filter Live events by `app_environment` if needed.
- **Privacy**: [`privacy.component.ts`](src/app/pages/privacy/privacy.component.ts) copy updated for PostHog.

### Admin — booklet custom insert pages ✅
- **Behavior**: **Tools → Saddle-stitch prayer booklet** includes **Custom insert pages**: upload PNG/JPEG (one image = one half-letter page), thumbnails, drag-to-reorder, and remove. Pages print **after answered prayers** and **before** booklet prompt sections.
- **Data**: [`booklet_insert_pages`](supabase/migrations/20260521120000_booklet_insert_pages.sql) table; images stored as data URLs (same pattern as branding logos).
- **Print**: [`print.service.ts`](src/app/services/print.service.ts) and [`booklet-measure-inline.ts`](src/app/lib/booklet-measure-inline.ts) (`packMode: 'onePerPage'`).

### Admin — settings loading feedback ✅
- **Behavior**: Collapsible settings cards that load data on first expand (and the **Site Analytics** activity chart) show a **shared** centered spinner and short status message while data is in flight, instead of an empty panel.
- **Implementation**: [`admin-section-loading.component.ts`](src/app/components/admin-section-loading/admin-section-loading.component.ts); used from **Prayer Encouragement**, **Rich text editors**, **GitHub Feedback**, **App Branding**, **Email** → **Prayer Update Reminders**, **Security** (policies, email verification, test account), and [`site-analytics-activity-chart.component.ts`](src/app/components/site-analytics-activity-chart/site-analytics-activity-chart.component.ts).

### Admin — Prayer Prompts (Update / Add save) ✅
- **Fix**: **Update Prompt** / **Add Prompt** use **`type="button"`** with **`(click)="savePrompt()"`** so saves do not depend on native form **`submit`** / **`ngSubmit`** (which could fail to run). Title fields use **Enter** to save via **`onPromptTitleEnter`**. Forms use **`novalidate`**. **`ApplicationRef.tick()`** runs after key state changes so the **OnPush** admin tree repaints. **`ToastService`** shows a **single** toast on completion: **Prompt updated.** / **Prompt added.** or **Could not save prompt:** on failure (inline spinner still covers in-flight saving).
- **Fix (validation CD)**: Required-field validation and save **`try` / `finally`** blocks run **`markForCheck` → `detectChanges` → `tick`** so OnPush parents see spinner and completion state; **`handleEdit` / `cancelEdit`** call **`markForCheck`** after updating form state.
- **Implementation**: [`prompt-manager.component.ts`](src/app/components/prompt-manager/prompt-manager.component.ts).

### Admin — Email Subscribers (manual Add Subscriber) ✅
- **Fix**: **Manual Entry** → **Add Subscriber** matches the Content-tab pattern: **`type="button"`** `(click)="handleAddSubscriber()"`, **`novalidate`**, **`ApplicationRef.tick()`** / **`detectChanges`** around async add (including validation / duplicate-email exits), inline **Adding…** row, **Enter** on name/email submits via **`onManualAddFieldEnter`**. Behavior (duplicate check, Planning Center lookup, welcome dialog, tour demo guard) unchanged.
- **Fix (success banner)**: After manual add or CSV import, **`handleSearch({ preserveCsvSuccess: true })`** refreshes the grid without clearing **`csvSuccess`**, so the green confirmation stays visible until a normal search/refresh clears it.
- **Implementation**: [`email-subscribers.component.ts`](src/app/components/email-subscribers/email-subscribers.component.ts).
- **Docs**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) (*Admin portal: nested settings*).

### Admin — Prayer Types (Add / Update save) ✅
- **Fix**: **Add Type** / **Update Type** use **`saveType()`** from **`type="button"`** clicks (not native **`submit`**). The section component is **OnPush**; **`ApplicationRef.tick()`**, **`detectChanges`**, and **`markForCheck`** run around saves; **`novalidate`** on the form; inline **Saving…** spinner; **`ToastService`** on validation (**warning**), success (**Prayer type added.** / **Prayer type updated.**), and failure. **`toggleAddForm`** / **`handleEdit`** call **`markForCheck`** so the form opens reliably. Inserts/updates persist **`include_in_booklet`** (default **false**); **`toggleIncludeInBooklet`** flips booklet inclusion per row (book icon left of activate/deactivate; CSS **hover/focus tooltip** plus **`title`**); **Confirm** runs after the same modal pattern as delete (**toggleBooklet** / **toggleActive**); **`pointerdown`** propagation stopped so CDK drag does not eat the first tap. The add/edit form includes an **Include in saddle-stitch booklet** checkbox (same field).
- **Implementation**: [`prayer-types-manager.component.ts`](src/app/components/prayer-types-manager/prayer-types-manager.component.ts).
- **Docs**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) (*Admin portal: nested settings*).

### Admin — send email to all subscribers (Email tab) ✅
- **Behavior**: **Admin** → **Settings** → **Email**, under **Email Subscribers**, includes a collapsible **Send email to all subscribers** card: **Subject**, rich **Message** ([`RichTextEditorComponent`](src/app/components/rich-text-editor/rich-text-editor.component.ts)), and **Send**. Sends queue **one `email_queue` row per recipient** and invokes **`trigger-email-processor`** (same path as prayer/update subscriber blasts). Recipients are all **`email_subscribers`** rows with **`is_blocked = false`**, **ignoring `is_active`** (includes people who turned off mass email). The email configured under **Admin → Security → Test Account** (`admin_settings.test_account_email`) is **excluded** when set (case-insensitive match). Template key **`admin_subscriber_manual_broadcast`**; migration [`20260509120000_admin_subscriber_manual_broadcast_template.sql`](supabase/migrations/20260509120000_admin_subscriber_manual_broadcast_template.sql).
- **Deploy**: Apply that migration to the **same** Supabase database your GitHub **`process-email-queue`** workflow uses; otherwise the processor fails with a missing `template_key` error. See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) (*Email queue processor — missing template*).
- **Implementation**: [`queueAdminManualBroadcastToSubscribers`](src/app/services/email-notification.service.ts); UI [`admin-subscriber-email-broadcast.component.ts`](src/app/components/admin-subscriber-email-broadcast/admin-subscriber-email-broadcast.component.ts); wired from [`email-settings.component.ts`](src/app/components/email-settings/email-settings.component.ts).
- **Tests**: [`email-notification.service.spec.ts`](src/app/services/email-notification.service.spec.ts) covers validation, fetch filter, enqueue, and processor trigger.

### Backup workflow CI fix (Node 20 + Supabase Realtime) ✅
- **Behavior**: `.github/workflows/backup-database-api.yml` now installs `ws` and builds the service-role Supabase client with `realtime.transport = ws` in the generated `backup-script.mjs`, so the daily backup job no longer fails on GitHub Actions Node 20 with `Node.js 20 detected without native WebSocket support`.
- **Implementation**: Added `createSupabaseServiceClient()` in the inline backup script and reused it for both normal backup work and failure logging inserts to `backup_logs`.
- **Actions runtime update**: GitHub workflows now use `actions/checkout@v5` and `actions/setup-node@v5` (where used) so CI aligns with the Node 24 JavaScript action runtime migration and avoids Node 20 deprecation warnings.
- **Workflow Node runtime update**: Workflows that explicitly pinned `node-version: '20'` now pin `node-version: '22'` (`backup-database-api`, `restore-database`, `process-email-queue`, and `test`) to align with current LTS and reduce CI risk ahead of Node 20 runner removal.

### Admin — saddle-stitch prayer booklet (Tools) ✅
- **Behavior**: **Admin** → **Settings** → **Tools** includes a collapsible **Saddle-stitch prayer booklet** card. Admins pick **1 week**, **2 weeks**, **1 month**, or **2 months**, then **Open for printing** to get an HTML file with **saddle-stitch imposition** on **US Letter landscape** (two **5.5"×8.5"** panels per print side), plus on-screen print tips (duplex, flip on short edge, fold, staple). Uses the same public prayer time-range filter as the standard printable list. **`TimeRange`** in [`print.service.ts`](src/app/services/print.service.ts) and [`printablePrayerList.ts`](src/utils/printablePrayerList.ts) includes **`twomonths`** (two calendar months back) for parity.
- **Fix (Tools UI)**: [`prayer-list-booklet-print`](src/app/components/prayer-list-booklet-print/prayer-list-booklet-print.component.ts) time range uses **`type="button"`** options (**`role="radio"`**, **`aria-checked`**) wired to **`setBookletRange`**, avoiding native **`<input type="radio">`** + **`[checked]`** quirks where only the default fit looked selectable in some browsers.
- **Copy (booklet cards)**: Compact booklet prayer cards use **Prayer For:** before the name (replacing **For:**), matching **Print Prayers**, in [`generatePrayerHTML`](src/app/services/print.service.ts) (`compactBooklet`).
- **Readability (booklet)**: Half-letter **`.booklet-panel`** inset (outer edge + spine sides) is **~half** the previous values (e.g. bottom **~0.375in**), with cover blocks using matching **~0.1in** inset. **`estimateBookletUnitWeight`** scales compact **Updates** by **full** first-update Markdown (narrow-column wrap premium + **~1.48×** chars; **~57** char line width baseline), **`getBookletDescriptionSegmentMaxChars`** shortens description splits when updates are heavy, and **`BOOKLET_PANEL_BOTTOM_SLACK`** **~220** aligns with thinner bottom inset plus slightly looser heuristic packing for **`packBookletUnitsIntoPageChunks`**. **`(continued)`** — **`splitBookletMarkdownIntoPanelParts`**, **`packBookletUnitsIntoPageChunks`** in [`print.service.ts`](src/app/services/print.service.ts).
- **Measured packing (booklet)**: Inline script [`booklet-measure-inline.ts`](src/app/lib/booklet-measure-inline.ts) fits chunks when **`scrollHeight` ≤ usable height**, with tolerance for font/rounding (**~12px**) and a capped dip into computed **bottom inset** (~**45%**, max ~**20px**), so layouts use space more aggressively without treating the padded bottom as an absolute cliff; content stays within the **`overflow:hidden`** half-letter panel on paper. **`BOOKLET_PANEL_BOTTOM_SLACK`** above keeps heuristic fallback broadly aligned when measurement does not run. The string still includes heuristic chunks for first paint / non-JS test environments.
- **Back cover**: The outer back panel shares the padding **Notes** treatment: pencil icon plus bold **Notes:** heading, then the same wide (**~0.42in**) handwriting rules, stopping above the optional bottom **branding logo** (if **Use logo** is on); if there is no logo, the ruled area runs under the heading to the bottom. Spacing under the header matches the line rhythm (`coverBackInner`, [`generateSaddleStitchBookletHTML`](src/app/services/print.service.ts)).
- **Blank pads / imposition**: Padding pages insert **before** the back cover when needed so the **last reader page stays the outer back cover** after folding. When **`padCount`** &gt; **0**, each padded panel is a **Notes** page: pencil icon, **Notes:** heading, plus widely spaced ruled lines (**~0.42in**) for handwriting ([`blankInner`](src/app/services/print.service.ts)); clearance under the heading matches the spacing between successive lines. When no padding is needed, there are no Notes pages.
- **QR / app icon / back branding logo (printing reliability)**: Before opening or downloading booklet HTML, **`downloadPrintableBookletPrayerList`** fetches and inlines **`data:`** images when possible: the **`api.qrserver.com`** PNG for **`/info`** (QR), **`/icons/icon-512.png`** (PWA icon), and the optional **Admin branding logo URL** when **Use logo** is on (same URL as the bottom-of-back-cover **`img.booklet-logo`**). If a fetch fails, the matching remote **`src`** is used. Print CSS uses **`print-color-adjust: exact`** on **`.booklet-front-qr`**, **`.booklet-app-icon`**, and **`img.booklet-logo`** so images print reliably.
- **Prayer prompts in booklet**: Migration [`20260510120000_prayer_types_include_in_booklet.sql`](supabase/migrations/20260510120000_prayer_types_include_in_booklet.sql) adds **`prayer_types.include_in_booklet`**. **Admin** → **Prayer Types**: **book** icon (left of activate/deactivate) toggles inclusion in the saddle-stitch booklet. **`loadBookletPromptSectionsOrdered`** loads **active** flagged types in **`display_order`** and prompts after **answered** prayers; within each type, prompts are **A→Z by title**; prompt list layout uses **`getPrintablePromptBlockStyles`** under **`.booklet-prompt-print-root`** (same **`.type-section` / columns / `.prompt-item`** as **Print Prompts**). Booklet category **`h2`** elements use **`booklet-h2`**—same blue title and **`#93c5fd`** underline as **Current Prayer Requests** / **Answered Prayers**. Two-column layout is **row-major** (left, right, left, right …), same as **Print Prompts**. Titles read **`{category name} Prompts (count)`**. Each prompt **type** is **one** booklet fragment (categories are **not** split into multiple server-side batches). Units from all included types are **greedy-packed** (`partitionBookletUnitsIntoChunks` / `packBookletUnitsIntoPageChunks`) with **`sections`** JSON for [`buildBookletMeasurePackScript`](src/app/lib/booklet-measure-inline.ts), which reflows by **`scrollHeight`** so a tall category continues on the next reader chunk/page. The booklet downloads even when the prayer range is empty but qualifying prompts exist.
- **Print — Prayer Prompts list**: **`generatePromptsPrintableHTML`** (Settings → **Print Prompts**) uses the same **A→Z by title** ordering per type and **row-major** two-column layout as booklet prompts ([`sortPromptsAlphabeticalByTitle`](src/app/services/print.service.ts), [`splitPromptsIntoTwoColumnsRowMajor`](src/app/services/print.service.ts)); previously prompts followed fetch order and columns were filled down the **left** stack first, then the **right**. Section headings use **`{category name} Prompts (count)`** (same wording as the booklet; [`printablePromptList.ts`](src/utils/printablePromptList.ts) matches for the non-`PrintService` path).

- **UX (Tools — booklet download)**: [`downloadPrintableBookletPrayerList`](src/app/services/print.service.ts) surfaces empty-range warnings, popup-blocked download hints, and generation errors via [`ToastService`](src/app/services/toast.service.ts) instead of blocking **`alert()`** (other printable flows unchanged).

- **Implementation**: Imposition helpers in [`print-booklet-imposition.ts`](src/app/lib/print-booklet-imposition.ts); [`PrintService`](src/app/services/print.service.ts) `downloadPrintableBookletPrayerList()` + `generateSaddleStitchBookletHTML()`; UI in [`prayer-list-booklet-print.component.ts`](src/app/components/prayer-list-booklet-print/prayer-list-booklet-print.component.ts). Shared fetch/filter via `loadPublicPrayersForTimeRange()`.

### Print — /info QR footer on prayer and prompt lists ✅
- **Behavior**: **Print Prayers** and **Print Prompts** (Settings) append a small footer with a **QR code** to the public **`/info`** page and a line of copy (larger text) so people scanning from paper can open the **website and app store** details: *“Want to get the app?”* plus *“Scan to open the prayer app info page in your browser to get the website and app store links.”* The link target uses the same public base URL as email links ([`getEmailBaseUrl()`](src/app/services/email-notification.service.ts)); the QR image is generated like the [Info](src/app/pages/info/info.component.ts) page (external `api.qrserver.com` image URL). The print and **saddle-stitch booklet** cover QR images use **rounded corners** (`border-radius`, [`print.service.ts`](src/app/services/print.service.ts) `.print-info-qr` / `.booklet-front-qr`). Implementation: [`print.service.ts`](src/app/services/print.service.ts) (`buildPrintInfoFooterHtml`, `getPrintInfoFooterStyles`).

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
