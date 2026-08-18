export interface NewPrayerRequestTourHooks {
  openPrayerForm: () => void;
}

export interface PersonalPrayerTourHooks {
  switchToPersonalFilter: () => void;
  openPrayerForm: () => void;
}
export interface UpdatingPrayerTourOptions {
  /** Community prayer cards show “Post update anonymously”; personal / Planning Center list cards do not. */
  includeAnonymousUpdateStep?: boolean;
}

export interface ManagingPrayerViewsTourHooks {
  switchToCurrent: () => void;
  switchToAnswered: () => void;
  switchToArchived: () => void;
  switchToTotal: () => void;
}

/** One combined **Creating Prayers** (`help_prayers`) tour: community form → updates (filters: **Help → Filtering Prayers** tour). */
export interface CreatingPrayersHelpSectionTourHooks {
  openPrayerForm: () => void;
  closePrayerForm: () => void;
  /** Ensures **Current** (community) list before Add Update steps so the tour anchors exist. */
  switchToCurrent: () => void;
}

/** **Filtering Prayers** (`help_filtering`): walk filter tiles + search using each block’s Help copy. */
export interface FilteringHelpSectionTourHooks {
  switchToCurrent: () => void;
  switchToAnswered: () => void;
  switchToArchived: () => void;
  switchToTotal: () => void;
  switchToMembers: () => void;
  switchToPrompts: () => void;
  switchToPersonal: () => void;
  openSearchPanel?: () => void;
}

export interface PrayerPromptsTourHooks {
  switchToPrompts: () => void;
  clearPromptTypes: () => void;
}

export interface PrayerPromptsTourOptions {
  /** When false, the tour skips type chips and sample card (empty prompts list). */
  hasPrompts: boolean;
}

export interface MemorizeHelpSectionTourHooks {
  switchToMemorize: () => void;
}

export interface MemorizeHelpSectionTourOptions {
  /** When false, the tour highlights the empty state instead of a passage card. */
  hasMemorizedItems: boolean;
  /**
   * Preferred Cards vs Table layout when passages exist. The passage step
   * resolves `#tour-memorize-sample-card` / `#tour-memorize-sample-table` from
   * the live DOM (so a mid-tour layout toggle still works). Defaults to cards.
   */
  listView?: 'cards' | 'table';
}

export interface PrayerEncouragementTourHooks {
  switchToCurrent: () => void;
}

export interface PrayerEncouragementTourOptions {
  /** When true, a middle step highlights **Pray For** / **Prayed For** on the first community card. */
  hasCommunityPrayer: boolean;
}

/** Hooks for **Prayer Presentation Mode** tour on `/presentation`. */
export interface PresentationModeTourHooks {
  openSettings: () => void;
  closeSettings: () => void;
  /** Called on the final step so the tour actually leaves presentation mode (e.g. `router.navigate(['/'])`). */
  exitPresentation: () => void;
  markForCheck: () => void;
  /** If set, runs on the exit step **before** `exitPresentation` (e.g. stash full-tour queue in `sessionStorage`). */
  persistFullGuidedTourQueue?: () => void;
  /**
   * When the **full guided tour** continued into presentation mode, invoked if the user dismisses the
   * presentation tour (× / overlay / escape) before the final step — clears queue/progress so the chain stops.
   */
  onFullGuidedTourInterrupted?: () => void;
}

/** Step 1 on Home: highlight **Pray** → **Next** stores session + navigates to `/presentation`. */
export interface PresentationModePrayButtonPreludeHooks {
  continueToPresentation: () => void;
  markForCheck: () => void;
}

/** Hooks for **Printing** help tour (`help_printing`): open/close Settings around print buttons. */
export interface PrintingHelpTourHooks {
  openSettings: () => void;
  closeSettings: () => void;
  markForCheck: () => void;
}

/** Same lifecycle as printing: open Settings modal, then close when done (`help_email_subscription`). */
export type EmailSubscriptionHelpTourHooks = PrintingHelpTourHooks;

/** Same as printing / email subscription (`help_prayer_reminders`). */
export interface PrayerRemindersHelpTourHooks extends PrintingHelpTourHooks {
  switchToCurrent: () => void;
}

export interface PrayerRemindersHelpTourOptions {
  /** When true, a step highlights the reminder row after the card menu opens. */
  hasReminderCardMenuTarget: boolean;
}

/** Same as printing (`help_feedback`). */
export type FeedbackHelpTourHooks = PrintingHelpTourHooks;

/** Same as printing (`help_settings` — App Settings overview). */
export type AppSettingsHelpTourHooks = PrintingHelpTourHooks;

/** Hooks for the hands-on **Personal Prayers** help tour (`help_personal_prayers`). */
export interface PersonalPrayersHelpSectionTourHooks {
  switchToPersonalFilter: () => void;
  openPrayerForm: () => void;
  markForCheck: () => void;
  fillWalkthroughPrayerFor: () => void;
  fillWalkthroughDescription: () => void;
  ensureWalkthroughPersonalSelected: () => void;
  fillWalkthroughCategory: () => void;
  submitWalkthroughPrayerForm: () => void;
  openWalkthroughPersonalEdit: () => void;
  closeWalkthroughPersonalEdit: () => void;
  clickWalkthroughAddUpdate: () => void;
  narrowToWalkthroughCategoryFilter: () => void;
  deleteWalkthroughTestPrayer: () => void;
}
