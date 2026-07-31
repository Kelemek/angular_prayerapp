import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { driver, type Driver, type DriveStep, type DriverHook, type Config } from 'driver.js';
import type { HelpContent, HelpSection } from '../types/help-content';

export const TOUR_REQUEST_BTN_MOBILE_ID = 'tour-btn-new-prayer-request-mobile';
export const TOUR_REQUEST_BTN_DESKTOP_ID = 'tour-btn-new-prayer-request-desktop';
export const TOUR_FILTER_PERSONAL_ID = 'tour-filter-personal';
export const TOUR_FILTER_CURRENT_ID = 'tour-filter-current';
export const TOUR_FILTER_TOTAL_ID = 'tour-filter-total';
export const TOUR_FILTER_ANSWERED_ID = 'tour-filter-answered';
export const TOUR_FILTER_PROMPTS_ID = 'tour-filter-prompts';
export const TOUR_FILTER_MEMORIZE_ID = 'tour-filter-memorize';
export const TOUR_MEMORIZE_ACTION_BAR_ID = 'tour-memorize-action-bar';
export const TOUR_MEMORIZE_ADD_VERSES_ID = 'tour-memorize-add-verses';
export const TOUR_MEMORIZE_RECOMMENDED_ID = 'tour-memorize-recommended';
export const TOUR_MEMORIZE_SAMPLE_CARD_ID = 'tour-memorize-sample-card';
export const TOUR_MEMORIZE_EMPTY_STATE_ID = 'tour-memorize-empty-state';
export const TOUR_PROMPT_TYPE_FILTERS_ID = 'tour-prompt-type-filters';
export const TOUR_PROMPT_EMPTY_ID = 'tour-prompt-empty-state';
export const TOUR_PROMPT_CARD_SAMPLE_ID = 'tour-prompt-card-sample';
export const TOUR_PRAYER_MODE_MOBILE_ID = 'tour-btn-prayer-mode-mobile';
export const TOUR_PRAYER_MODE_DESKTOP_ID = 'tour-btn-prayer-mode-desktop';
export const TOUR_SETTINGS_BTN_MOBILE_ID = 'tour-btn-settings-mobile';
export const TOUR_SETTINGS_BTN_DESKTOP_ID = 'tour-btn-settings-desktop';
export const TOUR_SETTINGS_PRINT_ROW_ID = 'tour-settings-print-buttons';
export const TOUR_SETTINGS_PRINT_PRAYERS_ID = 'tour-settings-print-prayers';
export const TOUR_SETTINGS_PRINT_PROMPTS_ID = 'tour-settings-print-prompts';
export const TOUR_SETTINGS_PRINT_PERSONAL_ID = 'tour-settings-print-personal';
export const TOUR_SETTINGS_EMAIL_SUBSCRIPTION_ID = 'tour-settings-email-subscription';
export const TOUR_SETTINGS_PRAYER_REMINDERS_ID = 'tour-settings-prayer-reminders';
export const TOUR_SETTINGS_PRAYER_REMINDER_CONTROLS_ID = 'tour-settings-prayer-reminder-controls';
export const TOUR_SETTINGS_FEEDBACK_SECTION_ID = 'tour-settings-feedback-section';
export const TOUR_SETTINGS_FEEDBACK_TYPE_ID = 'tour-settings-feedback-type';
export const TOUR_SETTINGS_FEEDBACK_DETAILS_ID = 'tour-settings-feedback-details';
export const TOUR_SETTINGS_THEME_ID = 'tour-settings-theme';
export const TOUR_SETTINGS_TEXT_SIZE_ID = 'tour-settings-text-size';
export const TOUR_SETTINGS_PUSH_ID = 'tour-settings-push-notifications';
export const TOUR_SETTINGS_BADGES_ID = 'tour-settings-badges';
export const TOUR_SETTINGS_PRAYER_ENCOURAGEMENT_ID = 'tour-settings-prayer-encouragement';
export const TOUR_SETTINGS_DEFAULT_VIEW_ID = 'tour-settings-default-view';
export const TOUR_SETTINGS_MEMORIZATION_STRICT_MODE_ID = 'tour-settings-memorization-strict-mode';
/** First prayer card in the list: “Add Update” opens the add-update modal (see `PrayerCardComponent.tourUpdateAnchors`). */
export const TOUR_ADD_UPDATE_BTN_ID = 'tour-prayer-add-update';
/** **Pray For** / **Prayed For** on the first community card (see `PrayerCardComponent.tourPrayForEncouragementAnchors`). */
export const TOUR_PRAYER_PRAY_FOR_ID = 'tour-prayer-pray-for';
/** Home prayer list search field (`PrayerFiltersComponent`). */
export const TOUR_PRAYER_SEARCH_ID = 'tour-prayer-search';

/** Hands-on Personal Prayers help tour — sample prayer (must match `PrayerFormComponent` + Home helpers). */
export const PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR = 'Test Personal Prayer';
export const PERSONAL_PRAYER_WALKTHROUGH_DESCRIPTION =
  'Test prayer description for the guided walkthrough.';
export const PERSONAL_PRAYER_WALKTHROUGH_CATEGORY = 'Test Category';

export const TOUR_PRAYER_CHOOSE_PERSONAL_ID = 'tour-prayer-choose-personal';
export const TOUR_PRAYER_SUBMIT_REQUEST_ID = 'tour-prayer-submit-request';
/** Community add-update modal — green **Add Update** submit (admin review applies when you send). */
export const TOUR_PRAYER_UPDATE_SUBMIT_ID = 'tour-prayer-update-submit';
/** Wrapper around anonymous checkbox + label (driver.js highlights the whole row). */
export const TOUR_PRAYER_UPDATE_ANONYMOUS_WRAP_ID = 'tour-prayer-update-anonymous-wrap';
/** Wrapper around “mark answered” checkbox + label. */
export const TOUR_PRAYER_UPDATE_MARK_ANSWERED_WRAP_ID = 'tour-prayer-update-mark-answered-wrap';
export const TOUR_PERSONAL_CATEGORY_FILTERS_ID = 'tour-personal-category-filters';
export const TOUR_WALKTHROUGH_PERSONAL_CARD_ID = 'tour-walkthrough-personal-prayer-card';
export const TOUR_WALKTHROUGH_PERSONAL_EDIT_ID = 'tour-walkthrough-personal-edit';
export const TOUR_WALKTHROUGH_PERSONAL_DELETE_ID = 'tour-walkthrough-personal-delete';
export const TOUR_WALKTHROUGH_ADD_UPDATE_ID = 'tour-walkthrough-add-update';
export const TOUR_WALKTHROUGH_UPDATE_CONTENT_ID = 'tour-walkthrough-update-content';
export const TOUR_WALKTHROUGH_PERSONAL_DRAG_HANDLE_ID = 'tour-walkthrough-personal-drag-handle';
export const TOUR_PERSONAL_EDIT_MODAL_ROOT_ID = 'tour-personal-prayer-edit-modal';

/** Presentation page (`/presentation`) — toolbar & settings modal (driver.js). */
export const TOUR_PRESENTATION_TOOLBAR_ID = 'tour-presentation-toolbar';
export const TOUR_PRESENTATION_PREV_ID = 'tour-presentation-prev';
export const TOUR_PRESENTATION_PLAY_ID = 'tour-presentation-play';
export const TOUR_PRESENTATION_NEXT_ID = 'tour-presentation-next';
export const TOUR_PRESENTATION_SETTINGS_BTN_ID = 'tour-presentation-settings';
export const TOUR_PRESENTATION_EXIT_ID = 'tour-presentation-exit';
export const TOUR_PRESENTATION_SETTINGS_MODAL_ID = 'tour-presentation-settings-modal';
export const TOUR_PRESENTATION_SETTING_THEME_ID = 'tour-presentation-setting-theme';
export const TOUR_PRESENTATION_SETTING_SMART_ID = 'tour-presentation-setting-smart';
export const TOUR_PRESENTATION_SETTING_DURATION_ID = 'tour-presentation-setting-duration';
export const TOUR_PRESENTATION_SETTING_SMART_INFO_ID = 'tour-presentation-setting-smart-info';
export const TOUR_PRESENTATION_SETTING_CONTENT_TYPE_ID = 'tour-presentation-setting-content-type';
export const TOUR_PRESENTATION_SETTING_RANDOMIZE_ID = 'tour-presentation-setting-randomize';
export const TOUR_PRESENTATION_SETTING_TIME_FILTER_ID = 'tour-presentation-setting-time-filter';
export const TOUR_PRESENTATION_SETTING_STATUS_ID = 'tour-presentation-setting-status';
export const TOUR_PRESENTATION_SETTING_TIMER_ID = 'tour-presentation-setting-timer';

/** Home stores this before navigating to `/presentation`; `PresentationComponent` reads it to start the tour. */
export const PRESENTATION_HELP_TOUR_SESSION_KEY = 'prayerapp_start_presentation_help_tour';

/** After presentation mode help tour exits, Home reads this to continue **Full guided tour** with remaining section ids. */
export const FULL_GUIDED_TOUR_QUEUE_KEY = 'prayerapp_full_guided_tour_queue';

/** Stored in `FULL_GUIDED_TOUR_QUEUE_KEY` when the full tour ends right after presentation (no later sections). */
export const FULL_GUIDED_TOUR_CLOSING_SENTINEL = '__PRAYERAPP_FULL_TOUR_CLOSING__';

/** Global progress for **Full guided tour** (welcome + each section + thank you). Shown in `AppComponent`. */
export type FullGuidedTourProgress = { current: number; total: number };

export type ParsedFullGuidedTourQueue =
  | { kind: 'empty' }
  | { kind: 'legacy_closing' }
  | { kind: 'legacy_section_ids'; ids: string[] }
  | { kind: 'closing'; totalSteps: number }
  | {
      kind: 'resume';
      ids: string[];
      totalSteps: number;
      resumeStartGlobalSectionIndex: number;
    };

/**
 * Parses `FULL_GUIDED_TOUR_QUEUE_KEY` session value: legacy JSON array or `{ v: 1, ... }` from presentation handoff.
 */
export function parseFullGuidedTourQueue(raw: string): ParsedFullGuidedTourQueue {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return { kind: 'empty' };
      }
      const ids = parsed.filter((id): id is string => typeof id === 'string');
      if (ids.length === 0) {
        return { kind: 'empty' };
      }
      if (ids.length === 1 && ids[0] === FULL_GUIDED_TOUR_CLOSING_SENTINEL) {
        return { kind: 'legacy_closing' };
      }
      return { kind: 'legacy_section_ids', ids };
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const o = parsed as Record<string, unknown>;
      if (o['v'] === 1 && o['mode'] === 'closing' && typeof o['totalSteps'] === 'number' && o['totalSteps'] >= 2) {
        return { kind: 'closing', totalSteps: o['totalSteps'] };
      }
      if (o['v'] === 1 && Array.isArray(o['ids']) && typeof o['totalSteps'] === 'number' && o['totalSteps'] >= 2) {
        const ids = (o['ids'] as unknown[]).filter((id): id is string => typeof id === 'string');
        const resumeStart =
          typeof o['resumeStartGlobalSectionIndex'] === 'number' ? o['resumeStartGlobalSectionIndex'] : 0;
        if (ids.length === 0) {
          return { kind: 'closing', totalSteps: o['totalSteps'] };
        }
        return {
          kind: 'resume',
          ids,
          totalSteps: o['totalSteps'],
          resumeStartGlobalSectionIndex: resumeStart,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return { kind: 'empty' };
}

/** Payload written to `PRESENTATION_HELP_TOUR_SESSION_KEY` (JSON). */
export interface PresentationHelpTourSessionPayload {
  title: string;
  description?: string;
  /** When true, presentation exit persists `FULL_GUIDED_TOUR_QUEUE_KEY` (remaining ids or closing sentinel). */
  fullGuidedTourFromFullChain?: boolean;
  /** Sections still to run after returning from presentation (may be empty — then we only show the closing popover). */
  fullGuidedTourRemainingSectionIds?: string[];
  /** Welcome + sections + thank-you step count for the global progress bar. */
  fullGuidedTourTotalSteps?: number;
  /** Global index (0-based) of the first id in `fullGuidedTourRemainingSectionIds` within the full section list. */
  fullGuidedTourResumeStartGlobalSectionIndex?: number;
}

function getPresentationToolbarEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRESENTATION_TOOLBAR_ID);
}

function getNewPrayerRequestButtonEl(): HTMLElement | null {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }
  const desktop = document.getElementById(TOUR_REQUEST_BTN_DESKTOP_ID);
  const mobile = document.getElementById(TOUR_REQUEST_BTN_MOBILE_ID);
  if (!desktop && !mobile) {
    return null;
  }
  const wide = window.matchMedia('(min-width: 640px)').matches;
  if (wide) {
    return desktop ?? mobile;
  }
  return mobile ?? desktop;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface NewPrayerRequestTourHooks {
  openPrayerForm: () => void;
}

export interface PersonalPrayerTourHooks {
  switchToPersonalFilter: () => void;
  openPrayerForm: () => void;
}

function getPersonalFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_PERSONAL_ID);
}

function getCurrentFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_CURRENT_ID);
}

function getTotalFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_TOTAL_ID);
}

function getAnsweredFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_ANSWERED_ID);
}

function getPromptsFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_PROMPTS_ID);
}

function getMemorizeFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_MEMORIZE_ID);
}

function getMemorizeActionBarEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_MEMORIZE_ACTION_BAR_ID);
}

function getMemorizeRecommendedEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_MEMORIZE_RECOMMENDED_ID);
}

function getMemorizeEmptyStateEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_MEMORIZE_EMPTY_STATE_ID);
}

function getMemorizeSampleCardEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_MEMORIZE_SAMPLE_CARD_ID);
}

function getPromptTypeFiltersEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PROMPT_TYPE_FILTERS_ID);
}

function getPromptEmptyStateEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PROMPT_EMPTY_ID);
}

function getSamplePromptCardEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PROMPT_CARD_SAMPLE_ID);
}

function getPrayerModeButtonEl(): HTMLElement | null {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }
  const desktop = document.getElementById(TOUR_PRAYER_MODE_DESKTOP_ID);
  const mobile = document.getElementById(TOUR_PRAYER_MODE_MOBILE_ID);
  if (!desktop && !mobile) {
    return null;
  }
  const wide = window.matchMedia('(min-width: 640px)').matches;
  if (wide) {
    return desktop ?? mobile;
  }
  return mobile ?? desktop;
}

function getTourAddUpdateButtonEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_ADD_UPDATE_BTN_ID);
}

function getPrayerSubmitRequestEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRAYER_SUBMIT_REQUEST_ID);
}

function getTourUpdateSubmitButtonEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRAYER_UPDATE_SUBMIT_ID);
}

function getPrayerEncouragementPrayForButtonEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRAYER_PRAY_FOR_ID);
}

function getPrayerSearchInputEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRAYER_SEARCH_ID);
}

function getSettingsHeaderButtonEl(): HTMLElement | null {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return null;
  }
  const desktop = document.getElementById(TOUR_SETTINGS_BTN_DESKTOP_ID);
  const mobile = document.getElementById(TOUR_SETTINGS_BTN_MOBILE_ID);
  if (!desktop && !mobile) {
    return null;
  }
  const wide = window.matchMedia('(min-width: 640px)').matches;
  if (wide) {
    return desktop ?? mobile;
  }
  return mobile ?? desktop;
}

export interface UpdatingPrayerTourOptions {
  /** Community prayer cards show “Post update anonymously”; personal / Planning Center list cards do not. */
  includeAnonymousUpdateStep?: boolean;
}

export interface ManagingPrayerViewsTourHooks {
  switchToCurrent: () => void;
  switchToAnswered: () => void;
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
  switchToTotal: () => void;
  switchToPrompts: () => void;
  switchToPersonal: () => void;
}

/** Pull `"Name" …` clause from **Filter Options** overview text for per-filter popovers. */
function excerptForNamedFilter(overview: string, name: string): string {
  const needle = `"${name}"`;
  const idx = overview.indexOf(needle);
  if (idx < 0) {
    return '';
  }
  const rest = overview.slice(idx);
  const after = needle.length;
  const commaNext = rest.indexOf(', "', after);
  const andNext = rest.indexOf(', and "', after);
  const next =
    commaNext > 0 && andNext > 0
      ? Math.min(commaNext, andNext)
      : commaNext > 0
        ? commaNext
        : andNext > 0
          ? andNext
          : -1;
  if (next > 0) {
    return rest.slice(0, next).trim();
  }
  const dot = rest.indexOf('.', after);
  return dot > 0 ? rest.slice(0, dot + 1).trim() : rest.trim();
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
export type PrayerRemindersHelpTourHooks = PrintingHelpTourHooks;

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

@Injectable({
  providedIn: 'root',
})
export class HelpDriverTourService {
  private activeDriver: Driver | null = null;
  /** Fired once when the active driver is destroyed (finished, closed, or `destroy()`). */
  private tourFinishedCallback: (() => void) | null = null;
  /** Drives how `tourFinishedCallback` runs when the **full guided tour** advances between sections. */
  private tourChainMode: 'off' | 'sectionAdvance' | 'welcome' = 'off';
  /** Set only when ending the driver via `killActiveDriver()` (tour code), not × / overlay / escape. */
  private lastDriverDestroyWasProgrammatic = false;
  /** User closed the overlay or popover close control during a chained section tour. */
  private tourAbortedFullChainByUser = false;

  private readonly fullGuidedTourProgressSubject = new BehaviorSubject<FullGuidedTourProgress | null>(null);
  /** Emits while **Full guided tour** is active (`null` when hidden). */
  readonly fullGuidedTourProgress$ = this.fullGuidedTourProgressSubject.asObservable();

  /** 0-based step index; `total` = welcome + section count + thank you. */
  setFullGuidedTourProgress(current: number, total: number): void {
    if (total < 1) {
      this.clearFullGuidedTourProgress();
      return;
    }
    const c = Math.max(0, Math.min(current, total - 1));
    this.fullGuidedTourProgressSubject.next({ current: c, total });
  }

  clearFullGuidedTourProgress(): void {
    this.fullGuidedTourProgressSubject.next(null);
  }

  /**
   * Drops full-tour handoff state in `sessionStorage` (queue + presentation payload when it was part of the full chain).
   * Safe when no full tour is active (no-op on keys that are not full-chain).
   */
  clearFullGuidedTourNavigationState(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    try {
      sessionStorage.removeItem(FULL_GUIDED_TOUR_QUEUE_KEY);
      const raw = sessionStorage.getItem(PRESENTATION_HELP_TOUR_SESSION_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { fullGuidedTourFromFullChain?: boolean };
        if (p?.fullGuidedTourFromFullChain === true) {
          sessionStorage.removeItem(PRESENTATION_HELP_TOUR_SESSION_KEY);
        }
      }
    } catch {
      /* ignore */
    }
  }

  /** Stops driver.js and clears full-tour progress (Help modal close / starting a single-section tour). */
  interruptGuidedTours(): void {
    this.clearFullGuidedTourNavigationState();
    this.clearFullGuidedTourProgress();
    this.destroy();
  }

  /**
   * When the current tour ends, run `fn` once (used by **Full guided tour** on Home).
   * Cleared when `destroy()` is called or when the next tour starts.
   */
  queueTourFinishedCallback(fn: (() => void) | null): void {
    this.tourFinishedCallback = fn;
    this.tourChainMode = fn ? 'sectionAdvance' : 'off';
  }

  /** Tear down the active driver only (keeps `queueTourFinishedCallback` for full-tour chaining). */
  private killActiveDriver(): void {
    if (this.activeDriver) {
      this.lastDriverDestroyWasProgrammatic = true;
      this.activeDriver.destroy();
      this.activeDriver = null;
    }
  }

  /**
   * Runs `fn`, then after the UI settles either `moveNext` or programmatic `killActiveDriver` when already on the
   * last step. Fixes **Full guided tour** `sectionAdvance` when the final step used `moveNext()` instead of a clean
   * last-index destroy (driver.js `onDestroyed` + `onLastIndex`).
   */
  private advanceAfterOrKill(fn: () => void, delayMs = 200): DriverHook {
    return (_element, _step, { driver: drv }) => {
      fn();
      window.setTimeout(() => {
        drv.refresh();
        const cfg = typeof drv.getConfig === 'function' ? drv.getConfig() : undefined;
        const len = cfg?.steps?.length ?? 0;
        const i =
          typeof drv.getActiveIndex === 'function' ? (drv.getActiveIndex() ?? 0) : 0;
        if (len > 0 && i >= len - 1) {
          this.killActiveDriver();
        } else {
          drv.moveNext();
        }
      }, delayMs);
    };
  }

  /** Last step **Next**: programmatic destroy so `queueTourFinishedCallback` runs in `sectionAdvance` mode. */
  private popoverNextKillsTour(): DriverHook {
    return () => {
      this.killActiveDriver();
    };
  }

  private startTourDriver(config: Config): Driver {
    const userOnDestroyed = config.onDestroyed;
    const userOnCloseClick = config.onCloseClick;
    const userOverlay = config.overlayClickBehavior;
    const chainSection = this.tourChainMode === 'sectionAdvance';
    const overlayClickBehavior: Config['overlayClickBehavior'] =
      chainSection && userOverlay !== 'nextStep'
        ? typeof userOverlay === 'function'
          ? (element, step, opts) => {
              this.tourAbortedFullChainByUser = true;
              userOverlay(element, step, opts);
            }
          : (_element, _step, opts) => {
              this.tourAbortedFullChainByUser = true;
              opts.driver.destroy();
            }
        : userOverlay;

    const d = driver({
      ...config,
      overlayClickBehavior,
      onCloseClick: (element, step, opts) => {
        if (chainSection) {
          this.tourAbortedFullChainByUser = true;
        }
        if (userOnCloseClick) {
          userOnCloseClick(element, step, opts);
        } else {
          opts.driver.destroy();
        }
      },
      onDestroyed: (element, step, opts) => {
        userOnDestroyed?.(element, step, opts);
        const mode = this.tourChainMode;
        const cb = this.tourFinishedCallback;
        const steps = opts.config.steps ?? [];
        const idx = opts.state.activeIndex;
        const onLastIndex =
          steps.length > 0 && typeof idx === 'number' && idx === steps.length - 1;
        const programmatic = this.lastDriverDestroyWasProgrammatic;
        this.lastDriverDestroyWasProgrammatic = false;

        let runCallback = false;
        if (cb) {
          if (mode === 'sectionAdvance') {
            const userAbort = this.tourAbortedFullChainByUser;
            this.tourAbortedFullChainByUser = false;
            if (programmatic) {
              runCallback = true;
            } else if (userAbort) {
              runCallback = false;
            } else {
              runCallback = onLastIndex;
            }
            if (!runCallback) {
              this.clearFullGuidedTourNavigationState();
              this.clearFullGuidedTourProgress();
            }
          } else if (mode === 'welcome') {
            runCallback = true;
          } else {
            runCallback = true;
          }
        }

        this.tourFinishedCallback = null;
        this.tourChainMode = 'off';
        this.activeDriver = null;

        if (runCallback && cb) {
          window.setTimeout(() => {
            try {
              cb();
            } catch {
              /* ignore */
            }
          }, 0);
        }
      },
    });
    this.activeDriver = d;
    return d;
  }

  /**
   * Full guided tour intro (popover only). **`onBegin`** runs when the user taps **Begin**; × / overlay / **Escape** end the whole full tour.
   */
  startFullGuidedTourWelcome(onBegin: () => void, opts?: { totalSteps: number }): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.destroy();
    if (opts?.totalSteps != null && opts.totalSteps >= 2) {
      this.setFullGuidedTourProgress(0, opts.totalSteps);
    } else {
      this.clearFullGuidedTourProgress();
    }
    this.tourFinishedCallback = onBegin;
    this.tourChainMode = 'welcome';

    /** Clears handoff only when the user aborts the **whole** full tour (not when tapping **Begin**). */
    const dismissWelcome = (): void => {
      this.tourFinishedCallback = null;
      this.clearFullGuidedTourNavigationState();
      this.clearFullGuidedTourProgress();
    };

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      /**
       * driver.js: `driver.destroy()` ends with `g(false)`, which **skips** `onDestroyStarted` and runs `onDestroyed`
       * with `tourFinishedCallback` still set — so **Begin** → `destroy()` correctly chains into the first section.
       * Escape / dimmed overlay use `g(true)` first; that path invokes `onDestroyStarted` only, so we clear the
       * callback here then call `destroy()` again (`g(false)`) to finish teardown without running `onBegin`.
       */
      onDestroyStarted: (_element, _step, opts) => {
        dismissWelcome();
        opts.driver.destroy();
      },
      steps: [
        {
          popover: {
            title: 'Welcome',
            description:
              'This <strong>full guided tour</strong> walks through each Help topic on the real app, one after another. <strong>Close</strong>, the dimmed overlay, or <strong>Escape</strong> ends the <em>entire</em> tour at any time. Within each topic you can still use <strong>Previous</strong>.<br><br>Tap <strong>Begin</strong> when you’re ready to start.',
            side: 'bottom',
            align: 'center',
            nextBtnText: 'Begin',
            onNextClick: (_element, _step, opts) => {
              opts.driver.destroy();
            },
            onCloseClick: (_element, _step, opts) => {
              dismissWelcome();
              opts.driver.destroy();
            },
          },
        },
      ],
    });
    d.drive(0);
  }

  /** Closing message after the last section tour in **Full guided tour**. */
  startFullGuidedTourClosing(opts?: { totalSteps?: number }): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.destroy();
    if (opts?.totalSteps != null && opts.totalSteps >= 2) {
      this.setFullGuidedTourProgress(opts.totalSteps - 1, opts.totalSteps);
    } else {
      this.clearFullGuidedTourProgress();
    }
    const d = this.startTourDriver({
      showProgress: false,
      /** `next` + last-step logic yields a footer **Close** button; `close` keeps the corner × (driver hides the footer if only `close`). */
      showButtons: ['next', 'close'],
      doneBtnText: 'Close',
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      onDestroyed: () => {
        this.clearFullGuidedTourProgress();
      },
      steps: [
        {
          popover: {
            title: 'Thank you',
            description:
              'You’ve reached the end of the full tour. We hope this helps you pray with your church and grow in faith.<br><br>' +
              'Remember: each topic in <strong>Help &amp; Guidance</strong> has its own <strong>Start guided tour</strong> if you ever want to revisit just that part of the app.<br><br>' +
              '<strong>Thank you and God bless.</strong>',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    });
    d.drive(0);
  }

  /**
   * Walks the real UI for creating a prayer: **Request** in the header → form fields.
   * Uses help article copy for the intro step, then field-level guidance on the real form.
   */
  startNewPrayerRequestTour(helpContent: HelpContent, hooks: NewPrayerRequestTourHooks): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getNewPrayerRequestButtonEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(helpContent.subtitle);
    const body0 = escapeHtml(helpContent.text);
    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps: [
        {
          element: () => getNewPrayerRequestButtonEl()!,
          popover: {
            title: title0,
            description: `${body0}<br><br>Tap <strong>Open form</strong> to continue (or tap <strong>Request</strong> yourself). The article refers to this as “Add Request”.`,
            side: 'bottom',
            align: 'start',
            nextBtnText: 'Open form &rarr;',
            onNextClick: (_element, _step, { driver: drv }) => {
              hooks.openPrayerForm();
              window.setTimeout(() => {
                drv.refresh();
                drv.moveNext();
              }, 200);
            },
          },
        },
        {
          element: '#prayer_for',
          popover: {
            title: 'Prayer for',
            description:
              'Enter <strong>who or what</strong> this prayer is for—the same field described in Help.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#description',
          popover: {
            title: 'Prayer request details',
            description: 'Add the details so your community can pray meaningfully.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-prayer-visibility',
          popover: {
            title: 'Public or personal',
            description:
              '<strong>Public Prayer</strong> is reviewed by an admin before it appears for everyone. <strong>Personal Prayer</strong> stays private to you.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-prayer-anonymous',
          popover: {
            title: 'Optional anonymity',
            description:
              'For public prayers, you can check <strong>Make this prayer anonymous</strong> so your name is not shown.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: () => getPrayerSubmitRequestEl()!,
          popover: {
            title: 'Submit for review',
            description:
              'When you’re ready, tap <strong>Submit Prayer Request</strong>. <strong>Public</strong> prayers are <strong>reviewed by an admin</strong> before they appear for everyone; you may get an email when yours is approved or needs attention. <strong>Personal</strong> prayers stay private and skip that review.',
            side: 'top',
            align: 'start',
            onNextClick: this.popoverNextKillsTour(),
          },
        },
      ],
    });

    d.drive(0);
  }

  /**
   * Personal prayers flow: **Personal** filter → **Request** → form fields (personal visibility, optional category).
   * Step 0 uses the help article copy; opening the form while the Personal filter is active defaults the form to personal (see `defaultPersonalPrayer` on the prayer form).
   */
  startPersonalPrayerTour(helpContent: HelpContent, hooks: PersonalPrayerTourHooks): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getPersonalFilterEl() || !getNewPrayerRequestButtonEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(helpContent.subtitle);
    const body0 = escapeHtml(helpContent.text);

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps: [
        {
          element: () => getPersonalFilterEl()!,
          popover: {
            title: title0,
            description: `${body0}<br><br>Tap <strong>Show Personal</strong> to switch to your private list (or tap <strong>Personal</strong> yourself).`,
            side: 'bottom',
            align: 'start',
            nextBtnText: 'Show Personal &rarr;',
            onNextClick: (_element, _step, { driver: drv }) => {
              hooks.switchToPersonalFilter();
              window.setTimeout(() => {
                drv.refresh();
                drv.moveNext();
              }, 200);
            },
          },
        },
        {
          element: () => getNewPrayerRequestButtonEl()!,
          popover: {
            title: 'Add Request',
            description:
              'With <strong>Personal</strong> selected, tap <strong>Request</strong> (same as “Add Request” in Help). The form opens ready for a <strong>personal</strong> prayer—no admin approval.',
            side: 'bottom',
            align: 'start',
            nextBtnText: 'Open form &rarr;',
            onNextClick: (_element, _step, { driver: drv }) => {
              hooks.openPrayerForm();
              window.setTimeout(() => {
                drv.refresh();
                drv.moveNext();
              }, 220);
            },
          },
        },
        {
          element: '#prayer_for',
          popover: {
            title: 'Prayer for',
            description: 'Who or what this personal prayer is for.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#description',
          popover: {
            title: 'Details',
            description: 'Add the details for your private request.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-prayer-visibility',
          popover: {
            title: 'Personal vs public',
            description:
              '<strong>Personal Prayer</strong> should stay selected for a private request. <strong>Public</strong> would send the request for admin review—switch only if you meant a community prayer.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#category',
          popover: {
            title: 'Category (optional)',
            description:
              'Optionally tag this prayer (e.g. Health, Family). You can skip this or add a new category name.',
            side: 'top',
            align: 'start',
            onNextClick: this.popoverNextKillsTour(),
          },
        },
      ],
    });

    d.drive(0);
  }

  /**
   * Modal **Add Update** on the first visible prayer card → update text, optional anonymous (community), mark answered.
   * Requires at least one prayer in the current list with updates allowed (tour anchor on the first card).
   */
  startUpdatingPrayerTour(helpContent: HelpContent, options: UpdatingPrayerTourOptions = {}): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getTourAddUpdateButtonEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(helpContent.subtitle);
    const body0 = escapeHtml(helpContent.text);
    const includeAnonymous = options.includeAnonymousUpdateStep === true;

    const openUpdateFormOnNext: DriverHook = (_element, _step, { driver: drv }) => {
      getTourAddUpdateButtonEl()?.click();
      window.setTimeout(() => {
        drv.refresh();
        drv.moveNext();
      }, 250);
    };

    const steps: DriveStep[] = [
      {
        element: () => getTourAddUpdateButtonEl()!,
        popover: {
          title: title0,
          description: `${body0}<br><br>The button is labeled <strong>Add Update</strong> on each prayer card. Tap <strong>Open form</strong> to open the add-update modal (or tap <strong>Add Update</strong> yourself).`,
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Open form &rarr;',
          onNextClick: openUpdateFormOnNext,
        },
      },
      {
        element: '#tour-prayer-update-content',
        popover: {
          title: 'Update details',
          description: 'Share progress, thanksgiving, or what to keep praying for.',
          side: 'top',
          align: 'start',
        },
      },
    ];

    if (includeAnonymous) {
      steps.push({
        element: `#${TOUR_PRAYER_UPDATE_ANONYMOUS_WRAP_ID}`,
        popover: {
          title: 'Anonymous update (optional)',
          description: 'For <strong>community</strong> prayers you can post this update without showing your name.',
          side: 'top',
          align: 'start',
        },
      });
    }

    steps.push({
      element: `#${TOUR_PRAYER_UPDATE_MARK_ANSWERED_WRAP_ID}`,
      popover: {
        title: 'Mark as answered (optional)',
        description:
          'Optional: check this when the prayer is answered to move it to the <strong>Answered</strong> view (works for community and personal prayers). Leave it unchecked if you’re only sharing an update and the request is still active.',
        side: 'top',
        align: 'start',
      },
    });

    steps.push({
      element: () => getTourUpdateSubmitButtonEl()!,
      popover: {
        title: 'Add Update',
        description:
          'Tap <strong>Add Update</strong> to send what you entered. For <strong>community</strong> prayers, updates are <strong>reviewed by an admin</strong> before everyone sees them—like new requests. You may get an email when yours is approved or needs attention. <strong>Personal</strong> updates don’t go through that queue.',
        side: 'top',
        align: 'start',
        onNextClick: this.popoverNextKillsTour(),
      },
    });

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Personal** (intro) → **Current** → **Answered** → **Total** filter tiles.
   */
  startManagingPrayerViewsTour(helpContent: HelpContent, hooks: ManagingPrayerViewsTourHooks): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (
      !getPersonalFilterEl() ||
      !getCurrentFilterEl() ||
      !getAnsweredFilterEl() ||
      !getTotalFilterEl()
    ) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(helpContent.subtitle);
    const body0 = escapeHtml(helpContent.text);

    const steps: DriveStep[] = [
      {
        element: () => getPersonalFilterEl()!,
        popover: {
          title: title0,
          description: `${body0}<br><br>The <strong>Personal</strong> tile is for prayers only you can see. Tap <strong>Show Current</strong> next to switch to the shared community list (active requests).`,
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Show Current &rarr;',
          onNextClick: this.advanceAfterOrKill(hooks.switchToCurrent),
        },
      },
      {
        element: () => getCurrentFilterEl()!,
        popover: {
          title: 'Current (community)',
          description:
            '<strong>Current</strong> shows active prayer requests shared with your church. Next: <strong>Answered</strong> prayers.',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Show Answered &rarr;',
          onNextClick: this.advanceAfterOrKill(hooks.switchToAnswered),
        },
      },
      {
        element: () => getAnsweredFilterEl()!,
        popover: {
          title: 'Answered (community)',
          description:
            '<strong>Answered</strong> lists prayers marked as answered. Tap <strong>Show Total</strong> to see every community prayer in one place.',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Show Total &rarr;',
          onNextClick: this.advanceAfterOrKill(hooks.switchToTotal),
        },
      },
      {
        element: () => getTotalFilterEl()!,
        popover: {
          title: 'Total (community)',
          description:
            '<strong>Total</strong> includes all community prayers—current, answered, and archived. Tap <strong>Personal</strong> anytime to return to your private list.',
          side: 'bottom',
          align: 'start',
          onNextClick: this.popoverNextKillsTour(),
        },
      },
    ];

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Creating Prayers** (`help_prayers`): community **Request** + form → **Add Update** on Current (after switching from other tabs).
   * Filter tiles: **Help → Filtering Prayers** tour. Skips private-prayer creation (**Personal Prayers** help tour).
   */
  startCreatingPrayersHelpSectionTour(
    section: { title: string; description: string },
    hooks: CreatingPrayersHelpSectionTourHooks,
    options: UpdatingPrayerTourOptions = {}
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getNewPrayerRequestButtonEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);
    const includeAnonymous = options.includeAnonymousUpdateStep === true;

    const openUpdateFormOnNext: DriverHook = (_element, _step, { driver: drv }) => {
      getTourAddUpdateButtonEl()?.click();
      window.setTimeout(() => {
        drv.refresh();
        drv.moveNext();
      }, 250);
    };

    const steps: DriveStep[] = [
      {
        element: () => getNewPrayerRequestButtonEl()!,
        popover: {
          title: title0,
          description: `${desc0}<br><br>This tour covers a <strong>community</strong> request and <strong>updates</strong> on cards. Use <strong>Help → Filtering Prayers</strong> for filter tiles, and <strong>Help → Personal Prayers</strong> for private prayers. Tap <strong>Open form &rarr;</strong> to begin (or tap <strong>Request</strong> yourself). Help calls this “Add Request”.`,
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Open form &rarr;',
          onNextClick: (_element, _step, { driver: drv }) => {
            hooks.openPrayerForm();
            window.setTimeout(() => {
              drv.refresh();
              drv.moveNext();
            }, 200);
          },
        },
      },
      {
        element: '#prayer_for',
        popover: {
          title: 'Prayer for',
          description:
            'Enter <strong>who or what</strong> this prayer is for—the same field described in Help for a new request.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#description',
        popover: {
          title: 'Prayer request details',
          description: 'Add the details so your community can pray meaningfully.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-visibility',
        popover: {
          title: 'Public or personal',
          description:
            '<strong>Public Prayer</strong> is reviewed by an admin before it appears for everyone. <strong>Personal Prayer</strong> stays private to you.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-anonymous',
        popover: {
          title: 'Optional anonymity',
          description:
            'For public prayers, you can check <strong>Make this prayer anonymous</strong> so your name is not shown.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: () => getPrayerSubmitRequestEl()!,
        popover: {
          title: 'Submit for review',
          description:
            'Tap <strong>Submit Prayer Request</strong> when you’re done. <strong>Public</strong> requests go through <strong>admin review</strong> before they show on the community list; you may get an email when yours is approved or needs changes. <strong>Personal</strong> prayers save without that step.',
          side: 'top',
          align: 'start',
        },
      },
    ];

    steps.push({
      popover: {
        title: 'Prayer updates',
        description:
          'Tap <strong>Next</strong> to <strong>close the form</strong> and switch to <strong>Current</strong> prayers when needed. Then we highlight <strong>Add Update</strong> on a prayer card when one is available.',
        side: 'bottom',
        align: 'center',
        onNextClick: (_element, _step, { driver: drv }) => {
          hooks.closePrayerForm();
          hooks.switchToCurrent();
          // Allow Current list + tour anchors to render after leaving Prompts / Personal / etc.
          window.setTimeout(() => {
            drv.refresh();
            drv.moveNext();
          }, 500);
        },
      },
    });

    // Always include update steps: at tour start the user may be on Prompts (no `#tour-prayer-add-update` yet).
    // After `switchToCurrent` on the previous step, the first community card supplies the anchor.
    steps.push(
      {
        element: () => getTourAddUpdateButtonEl()!,
        popover: {
          title: 'Add Update',
          description:
            'On each prayer card, use <strong>Add Update</strong> for progress or thanksgiving. Tap <strong>Open form &rarr;</strong> to open the add-update modal.',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Open form &rarr;',
          onNextClick: openUpdateFormOnNext,
        },
      },
      {
        element: '#tour-prayer-update-content',
        popover: {
          title: 'Update details',
          description: 'Share progress, thanksgiving, or what to keep praying for.',
          side: 'top',
          align: 'start',
        },
      }
    );
    if (includeAnonymous) {
      steps.push({
        element: `#${TOUR_PRAYER_UPDATE_ANONYMOUS_WRAP_ID}`,
        popover: {
          title: 'Anonymous update (optional)',
          description:
            'For <strong>community</strong> prayers you can post this update without showing your name.',
          side: 'top',
          align: 'start',
        },
      });
    }
    steps.push({
      element: `#${TOUR_PRAYER_UPDATE_MARK_ANSWERED_WRAP_ID}`,
      popover: {
        title: 'Mark as answered (optional)',
        description:
          'Optional: check this when the prayer is answered to move it to the <strong>Answered</strong> view (works for community and personal prayers). Leave it unchecked if you’re only sharing an update and the request is still active.',
        side: 'top',
        align: 'start',
      },
    });
    steps.push({
      element: () => getTourUpdateSubmitButtonEl()!,
      popover: {
        title: 'Add Update',
        description:
          'Tap <strong>Add Update</strong> to send what you entered. For <strong>community</strong> prayers, updates are <strong>reviewed by an admin</strong> before everyone sees them—like new requests. You may get an email when yours is approved or needs attention. <strong>Personal</strong> updates don’t go through that queue.',
        side: 'top',
        align: 'start',
        onNextClick: this.popoverNextKillsTour(),
      },
    });

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Filtering Prayers** (`help_filtering`): intro from section title/description; each step **title** matches the
   * highlighted control (**Current**, **Answered**, **Total**, **Prompts**, **Personal**, **Search**). Help copy lives
   * in descriptions; **Next** applies the matching filter then advances.
   */
  startFilteringHelpSectionTour(section: HelpSection, hooks: FilteringHelpSectionTourHooks): void {
    if (typeof document === 'undefined') {
      return;
    }

    const c0 = section.content[0];
    if (!c0 || !getCurrentFilterEl()) {
      return;
    }

    this.killActiveDriver();

    const c1 = section.content[1];
    const c2 = section.content[2];
    const c3 = section.content[3];
    const overview = c0.text;
    const currentPhrase = excerptForNamedFilter(overview, 'Current');
    const currentStepDescription = currentPhrase
      ? `${escapeHtml(currentPhrase)}<br><br>${escapeHtml(c0.text)}`
      : escapeHtml(c0.text);

    const steps: DriveStep[] = [
      {
        popover: {
          title: escapeHtml(section.title),
          description: escapeHtml(section.description),
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: () => getCurrentFilterEl()!,
        popover: {
          title: escapeHtml('Current'),
          description: currentStepDescription,
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Next',
          onNextClick: this.advanceAfterOrKill(hooks.switchToCurrent),
        },
      },
    ];

    const answeredPhrase = excerptForNamedFilter(overview, 'Answered');
    if (getAnsweredFilterEl()) {
      steps.push({
        element: () => getAnsweredFilterEl()!,
        popover: {
          title: escapeHtml('Answered'),
          description: answeredPhrase
            ? escapeHtml(answeredPhrase)
            : escapeHtml('This filter shows prayers that have been answered.'),
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Next',
          onNextClick: this.advanceAfterOrKill(hooks.switchToAnswered),
        },
      });
    }

    if (c2 && getTotalFilterEl()) {
      const totalDescription = `${escapeHtml(c2.subtitle)}<br><br>${escapeHtml(c2.text)}`;
      steps.push({
        element: () => getTotalFilterEl()!,
        popover: {
          title: escapeHtml('Total'),
          description: totalDescription,
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Next',
          onNextClick: this.advanceAfterOrKill(hooks.switchToTotal),
        },
      });
    }

    const promptsPhrase = excerptForNamedFilter(overview, 'Prompts');
    if (getPromptsFilterEl()) {
      steps.push({
        element: () => getPromptsFilterEl()!,
        popover: {
          title: escapeHtml('Prompts'),
          description: promptsPhrase
            ? escapeHtml(promptsPhrase)
            : escapeHtml('This filter shows prayer prompt cards.'),
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Next',
          onNextClick: this.advanceAfterOrKill(hooks.switchToPrompts),
        },
      });
    }

    if (c1 && getPersonalFilterEl()) {
      const personalDescription = `${escapeHtml(c1.subtitle)}<br><br>${escapeHtml(c1.text)}`;
      steps.push({
        element: () => getPersonalFilterEl()!,
        popover: {
          title: escapeHtml('Personal'),
          description: personalDescription,
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Next',
          onNextClick: this.advanceAfterOrKill(hooks.switchToPersonal),
        },
      });
    }

    if (c3 && getPrayerSearchInputEl()) {
      steps.push({
        element: () => getPrayerSearchInputEl()!,
        popover: {
          title: escapeHtml('Search'),
          description: `${escapeHtml(c3.subtitle)}<br><br>${escapeHtml(c3.text)}`,
          side: 'bottom',
          align: 'start',
          onNextClick: this.popoverNextKillsTour(),
        },
      });
    }

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * One tour for **Using Prayer Prompts**: Prompts tile → (optional) type row + sample card → **Pray** (presentation).
   * Pass `hasPrompts: false` when there are no prompts: second step highlights the empty state instead.
   */
  startPrayerPromptsTour(
    section: { title: string; description: string },
    options: PrayerPromptsTourOptions,
    hooks: PrayerPromptsTourHooks
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getPromptsFilterEl() || !getPrayerModeButtonEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);

    const step0: DriveStep = {
      element: () => getPromptsFilterEl()!,
      popover: {
        title: title0,
        description: `${desc0}<br><br><strong>Prayer prompts</strong> are ideas to guide what you pray. Tap <strong>Show prompts</strong> to open the prompts view (or tap the tile yourself).`,
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Show prompts &rarr;',
        onNextClick: this.advanceAfterOrKill(hooks.switchToPrompts),
      },
    };

    const steps: DriveStep[] = [step0];

    if (options.hasPrompts) {
      steps.push(
        {
          element: () => getPromptTypeFiltersEl()!,
          popover: {
            title: 'Filter by type',
            description:
              'Use <strong>All Types</strong> to see every prompt. Tap a type chip to narrow the list. On each card, the type badge also toggles that filter.',
            side: 'bottom',
            align: 'start',
            nextBtnText: 'Next &rarr;',
            onNextClick: this.advanceAfterOrKill(hooks.clearPromptTypes),
          },
        },
        {
          element: () => getSamplePromptCardEl()!,
          popover: {
            title: 'Prompt cards',
            description:
              'Each card is a suggestion you can pray through. Unread prompts may show a badge you can clear.',
            side: 'top',
            align: 'start',
          },
        }
      );
    } else {
      steps.push({
        element: () => getPromptEmptyStateEl()!,
        popover: {
          title: 'No prompts yet',
          description:
            'When your church adds prayer prompts, they will appear here. You can still use <strong>Pray</strong> mode and print prompts from <strong>Settings</strong> when they are available.',
          side: 'top',
          align: 'start',
        },
      });
    }

    steps.push({
      element: () => getPrayerModeButtonEl()!,
      popover: {
        title: 'Prayer mode and print',
        description:
          'Tap <strong>Pray</strong> for a focused presentation-style view of prompts. To print prompts, open <strong>Settings</strong> and use <strong>Print Prompts</strong>.',
        side: 'bottom',
        align: 'end',
        onNextClick: this.popoverNextKillsTour(),
      },
    });

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Memorize** (`help_memorize`): Memorize filter → action bar → Recommended → sample card or empty state → practice tips.
   */
  startMemorizeHelpSectionTour(
    section: { title: string; description: string },
    options: MemorizeHelpSectionTourOptions,
    hooks: MemorizeHelpSectionTourHooks
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getMemorizeFilterEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);

    const step0: DriveStep = {
      element: () => getMemorizeFilterEl()!,
      popover: {
        title: title0,
        description: `${desc0}<br><br>Tap <strong>Memorize</strong> to open your personal scripture list (or tap the tile yourself).`,
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Show Memorize &rarr;',
        onNextClick: this.advanceAfterOrKill(hooks.switchToMemorize),
      },
    };

    const steps: DriveStep[] = [
      step0,
      {
        element: () => getMemorizeActionBarEl()!,
        popover: {
          title: 'Add passages',
          description:
            'Use <strong>Verses</strong> to pick a Bible reference, or <strong>Bible Books</strong> to memorize whole books in order. Your list is private to your account.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => getMemorizeRecommendedEl()!,
        popover: {
          title: 'Recommended verses',
          description:
            'Tap <strong>Recommended</strong> for curated passages grouped by topic. Expand a category, then tap a verse to add it. Verses already on your list show <strong>Already added</strong>.',
          side: 'bottom',
          align: 'start',
        },
      },
    ];

    if (options.hasMemorizedItems) {
      steps.push({
        element: () => getMemorizeSampleCardEl()!,
        popover: {
          title: 'Passage cards',
          description:
            'Tap a card to practice. Cards are grouped as <strong>Learning</strong>, <strong>Practicing</strong>, or <strong>Mastered</strong> based on completed sessions. On desktop, hover a verse (or long-press on mobile) to preview the passage text.',
          side: 'top',
          align: 'start',
        },
      });
    } else {
      steps.push({
        element: () => getMemorizeEmptyStateEl()!,
        popover: {
          title: 'No passages yet',
          description:
            'When you add a verse, Bible books list, or Recommended passage, it appears here. Use the buttons above to get started.',
          side: 'top',
          align: 'start',
        },
      });
    }

    steps.push({
      popover: {
        title: 'Practice modes',
        description:
          'Each session offers modes such as <strong>Type</strong>, <strong>Word</strong>, <strong>Reorder</strong>, and <strong>First letters</strong>. When your church enables it, <strong>Recite mode (beta)</strong> records your voice and shows word-by-word accuracy. You can also <strong>Listen</strong> to ESV audio while you practice. In <strong>Settings → Memorization practice</strong>, choose <strong>Standard</strong> (auto-reveal after three wrong attempts) or <strong>Strict</strong> (no auto-reveal; finish each round with zero errors before <strong>Next round</strong>). Progress saves automatically.',
        side: 'bottom',
        align: 'center',
        onNextClick: this.popoverNextKillsTour(),
      },
    });

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Pray For** / Prayer Encouragement: **Current** filter → **Pray For** button on first community card (when visible)
   * → popover-only step with fuller explanation.
   */
  startPrayerEncouragementTour(
    section: { title: string; description: string },
    options: PrayerEncouragementTourOptions,
    hooks: PrayerEncouragementTourHooks
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getCurrentFilterEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);

    const steps: DriveStep[] = [
      {
        element: () => getCurrentFilterEl()!,
        popover: {
          title: title0,
          description: `${desc0}<br><br>Community prayer requests appear under <strong>Current</strong>, <strong>Answered</strong>, or <strong>Total</strong> (not Personal or member-list views). Tap <strong>Show current</strong> to jump to active requests.`,
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Show current &rarr;',
          onNextClick: this.advanceAfterOrKill(hooks.switchToCurrent),
        },
      },
    ];

    if (options.hasCommunityPrayer) {
      steps.push({
        element: () => getPrayerEncouragementPrayForButtonEl()!,
        popover: {
          title: 'Pray For',
          description:
            'Tap <strong>Pray For</strong> to record that you prayed; the requester only sees a total count, not who tapped. If you already prayed recently, you may see <strong>Prayed For</strong> until the cooldown ends. The next step summarizes settings and privacy.',
          side: 'top',
          align: 'start',
        },
      });
    }

    steps.push({
      popover: {
        title: 'What is Pray For?',
        description:
          'When Prayer Encouragement is enabled, <strong>Pray For</strong> lets you record that you prayed for a community, personal, Planning Center member, or prayer prompt (and on presentation slides). On community and member cards viewers only see a <strong>total count</strong>—your tap is anonymous. On personal and prompt cards you track your own <strong>{n} Prayers</strong> count. Members still appear only if you have a Planning Center list applied.<br><br>You can turn the button or the praying count off for yourself in <strong>Settings</strong> under prayer encouragement on cards. After you tap Pray For, a <strong>cooldown</strong> applies before you can tap again for the same request (personal / member / prompt cooldown in Settings; community uses the church-wide setting).',
        side: 'bottom',
        align: 'center',
        onNextClick: this.popoverNextKillsTour(),
      },
    });

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Searching Prayers**: search field on Home, then popover-only search tips (aligned with `help_search` in `HelpContentService`).
   */
  startSearchPrayersTour(section: { title: string; description: string }): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getPrayerSearchInputEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);

    const steps: DriveStep[] = [
      {
        element: () => getPrayerSearchInputEl()!,
        popover: {
          title: title0,
          description: `${desc0}<br><br>The list below filters as you type, matching <strong>titles and descriptions</strong>. Try words like <strong>healing</strong> or <strong>job</strong> as in the help examples.`,
          side: 'bottom',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Search tips',
          description:
            'Shorter, broader words usually return more results; narrower terms focus the list. When you have text in the field, use <strong>Clear Search</strong> to reset. Exact phrases may work with quotes depending on how your church data is stored.',
          side: 'bottom',
          align: 'center',
          onNextClick: this.popoverNextKillsTour(),
        },
      },
    ];

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Printing** (`help_printing`): Settings gear → print row → **Print Prayers** / **Print Prompts** / **Print Personal**,
   * then tips and close Settings.
   */
  startPrintingHelpSectionTour(
    section: { title: string; description: string },
    hooks: PrintingHelpTourHooks
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getSettingsHeaderButtonEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);

    const advance = (fn: () => void, delayMs: number): DriverHook => {
      return (_element, _step, { driver: drv }) => {
        fn();
        window.setTimeout(() => {
          hooks.markForCheck();
          drv.refresh();
          drv.moveNext();
        }, delayMs);
      };
    };

    const gear = (): HTMLElement => getSettingsHeaderButtonEl()!;
    const row = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_PRINT_ROW_ID) ?? gear();
    const printPrayers = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_PRINT_PRAYERS_ID) ?? row();
    const printPrompts = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_PRINT_PROMPTS_ID) ?? row();
    const printPersonal = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_PRINT_PERSONAL_ID) ?? row();

    const steps: DriveStep[] = [
      {
        element: () => gear(),
        popover: {
          title: title0,
          description: `${desc0}<br><br>Open <strong>Settings</strong> (gear icon) to reach the print actions at the top of the panel. Tap <strong>Next</strong> to open Settings.`,
          side: 'bottom',
          align: 'center',
          onNextClick: advance(() => hooks.openSettings(), 420),
        },
      },
      {
        element: () => row(),
        popover: {
          title: 'Print options',
          description:
            'Three print actions—<strong>Prayers</strong> (community list), <strong>Prompts</strong>, and <strong>Personal</strong>—in soft blue bordered cards (Prayer_App style). Each has a <strong>chevron</strong> to narrow what gets included (time range, prompt types, or personal categories).',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: () => printPrayers(),
        popover: {
          title: 'Print Prayers',
          description:
            'Prints <strong>community prayers</strong> to match what you see on the home list—your <strong>filter</strong> (Current, Answered, Total, …) and <strong>search</strong> apply. Use the <strong>chevron</strong> on the right to choose how far back in time to include.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => printPrompts(),
        popover: {
          title: 'Print Prompts',
          description:
            'Print prayer <strong>prompts</strong> for groups or study. The chevron lets you print <strong>all types</strong> or pick specific categories.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => printPersonal(),
        popover: {
          title: 'Print Personal',
          description:
            'Print your <strong>private</strong> personal prayers as they appear when you use the Personal filter. The chevron limits output to selected <strong>categories</strong> or all.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Before you print',
          description:
            'Adjust <strong>filters and search</strong> on the main page first if you want a narrower community print. Printing opens a preview you can send to your printer or save as PDF from the browser.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        popover: {
          title: 'Done',
          description: 'Tap <strong>Next</strong> to close Settings.',
          side: 'bottom',
          align: 'center',
          onNextClick: (_e, _s) => {
            hooks.closeSettings();
            hooks.markForCheck();
            this.killActiveDriver();
          },
        },
      },
    ];

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Email Subscription** (`help_email_subscription`): Settings gear → **Email subscription** toggle in Settings.
   */
  startEmailSubscriptionHelpSectionTour(
    section: { title: string; description: string },
    hooks: EmailSubscriptionHelpTourHooks
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getSettingsHeaderButtonEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);

    const advance = (fn: () => void, delayMs: number): DriverHook => {
      return (_element, _step, { driver: drv }) => {
        fn();
        window.setTimeout(() => {
          hooks.markForCheck();
          drv.refresh();
          drv.moveNext();
        }, delayMs);
      };
    };

    const gear = (): HTMLElement => getSettingsHeaderButtonEl()!;
    const emailBlock = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_EMAIL_SUBSCRIPTION_ID) ?? gear();

    const steps: DriveStep[] = [
      {
        element: () => gear(),
        popover: {
          title: title0,
          description: `${desc0}<br><br>Use the <strong>Settings</strong> gear in the header to manage email notifications. Tap <strong>Next</strong> to open Settings.`,
          side: 'bottom',
          align: 'center',
          onNextClick: advance(() => hooks.openSettings(), 420),
        },
      },
      {
        element: () => emailBlock(),
        popover: {
          title: 'Email subscription',
          description:
            'Choose <strong>Enabled</strong> or <strong>Disabled</strong> for <strong>mass email</strong> about new prayers and updates from your community. Turn it <strong>off</strong> to stop those blasts while still using the app. Changes save automatically.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'What stays separate',
          description:
            '<strong>Push notifications</strong> are a separate <strong>Enabled</strong> / <strong>Disabled</strong> control below (when available). Some <strong>direct</strong> emails—such as when a prayer you submitted is approved or needs attention—may still be sent when the app must reach you about your own content.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        popover: {
          title: 'Done',
          description: 'Tap <strong>Next</strong> to close Settings.',
          side: 'bottom',
          align: 'center',
          onNextClick: (_e, _s) => {
            hooks.closeSettings();
            hooks.markForCheck();
            this.killActiveDriver();
          },
        },
      },
    ];

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Prayer reminders** (`help_prayer_reminders`): Settings → **Prayer reminders** card → hour + **Add reminder**.
   */
  startPrayerRemindersHelpSectionTour(
    section: { title: string; description: string },
    hooks: PrayerRemindersHelpTourHooks
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getSettingsHeaderButtonEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);

    const advance = (fn: () => void, delayMs: number): DriverHook => {
      return (_element, _step, { driver: drv }) => {
        fn();
        window.setTimeout(() => {
          hooks.markForCheck();
          drv.refresh();
          drv.moveNext();
        }, delayMs);
      };
    };

    const gear = (): HTMLElement => getSettingsHeaderButtonEl()!;
    const remindersCard = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_PRAYER_REMINDERS_ID) ?? gear();
    const controls = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_PRAYER_REMINDER_CONTROLS_ID) ?? remindersCard();

    const steps: DriveStep[] = [
      {
        element: () => gear(),
        popover: {
          title: title0,
          description: `${desc0}<br><br><strong>Prayer reminders</strong> live in <strong>Settings</strong>. Tap <strong>Next</strong> to open them.`,
          side: 'bottom',
          align: 'center',
          onNextClick: advance(() => hooks.openSettings(), 420),
        },
      },
      {
        element: () => remindersCard(),
        popover: {
          title: 'Prayer reminders',
          description:
            'Optional nudges at the <strong>start of clock hours</strong> you choose—just for you, separate from community prayer emails. If <strong>email subscription</strong> is on, you can get a reminder email; if <strong>push</strong> is on and this device is registered, you can get a push too. Times use your <strong>device time zone</strong>.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => controls(),
        popover: {
          title: 'Add a reminder',
          description:
            'Pick an <strong>hour</strong> from the dropdown, then tap <strong>Add reminder</strong>. You can add several hours. Each saved slot appears in the list above with <strong>Remove</strong> to delete it.',
          side: 'top',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Tips',
          description:
            'You need a saved <strong>email</strong> on your account to add reminders. Reminders don’t replace community updates—they’re a personal rhythm to pause and pray.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        popover: {
          title: 'Done',
          description: 'Tap <strong>Next</strong> to close Settings.',
          side: 'bottom',
          align: 'center',
          onNextClick: (_e, _s) => {
            hooks.closeSettings();
            hooks.markForCheck();
            this.killActiveDriver();
          },
        },
      },
    ];

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Feedback** (`help_feedback`): Settings → **Send Feedback** card → type, details, submit (or note when disabled).
   */
  startFeedbackHelpSectionTour(
    section: { title: string; description: string },
    hooks: FeedbackHelpTourHooks
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getSettingsHeaderButtonEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);

    const advance = (fn: () => void, delayMs: number): DriverHook => {
      return (_element, _step, { driver: drv }) => {
        fn();
        window.setTimeout(() => {
          hooks.markForCheck();
          drv.refresh();
          drv.moveNext();
        }, delayMs);
      };
    };

    const gear = (): HTMLElement => getSettingsHeaderButtonEl()!;
    const feedbackCard = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_FEEDBACK_SECTION_ID) ?? gear();
    const typeRow = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_FEEDBACK_TYPE_ID) ?? feedbackCard();
    const detailsBlock = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_FEEDBACK_DETAILS_ID) ?? feedbackCard();

    const steps: DriveStep[] = [
      {
        element: () => gear(),
        popover: {
          title: title0,
          description: `${desc0}<br><br><strong>Feedback</strong> is sent from <strong>Settings</strong>. Tap <strong>Next</strong> to open them.`,
          side: 'bottom',
          align: 'center',
          onNextClick: advance(() => hooks.openSettings(), 420),
        },
      },
      {
        element: () => feedbackCard(),
        popover: {
          title: 'Send Feedback',
          description:
            'When enabled for your church, you’ll see the full form here—**Suggestion**, **Feature request**, or **Bug report**. If you only see a short note, in-app feedback isn’t turned on for this app yet.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => typeRow(),
        popover: {
          title: 'Feedback type',
          description:
            'Choose **Suggestion** for improvements, **Feature request** for new ideas, or **Bug report** if something broke.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => detailsBlock(),
        popover: {
          title: 'Title & description',
          description:
            'Give a clear **title** and enough **description** that the team can act on it. When the fields look good, tap <strong>Send Feedback</strong>.',
          side: 'top',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Tips',
          description:
            'Your feedback is sent to the <strong>development team</strong> and will be <strong>reviewed</strong>. You’ll see a confirmation or error message under the form after sending.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        popover: {
          title: 'Done',
          description: 'Tap <strong>Next</strong> to close Settings.',
          side: 'bottom',
          align: 'center',
          onNextClick: (_e, _s) => {
            hooks.closeSettings();
            hooks.markForCheck();
            this.killActiveDriver();
          },
        },
      },
    ];

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **App Settings** (`help_settings`): Settings panel overview—print, theme, text size, notifications, badges,
   * prayer encouragement, default view, memorization practice, reminders, feedback, then footer notes.
   */
  startAppSettingsHelpSectionTour(
    section: { title: string; description: string },
    hooks: AppSettingsHelpTourHooks
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getSettingsHeaderButtonEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);

    const advance = (fn: () => void, delayMs: number): DriverHook => {
      return (_element, _step, { driver: drv }) => {
        fn();
        window.setTimeout(() => {
          hooks.markForCheck();
          drv.refresh();
          drv.moveNext();
        }, delayMs);
      };
    };

    const gear = (): HTMLElement => getSettingsHeaderButtonEl()!;
    const printRow = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_PRINT_ROW_ID) ?? gear();
    const themeEl = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_THEME_ID) ?? printRow();
    const textSizeEl = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_TEXT_SIZE_ID) ?? themeEl();
    const emailEl = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_EMAIL_SUBSCRIPTION_ID) ?? textSizeEl();
    const pushEl = (): HTMLElement => document.getElementById(TOUR_SETTINGS_PUSH_ID) ?? emailEl();
    const badgesEl = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_BADGES_ID) ?? pushEl();
    const encouragementEl = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_PRAYER_ENCOURAGEMENT_ID) ?? badgesEl();
    const defaultViewEl = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_DEFAULT_VIEW_ID) ?? encouragementEl();
    const memorizationEl = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_MEMORIZATION_STRICT_MODE_ID) ?? defaultViewEl();
    const remindersEl = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_PRAYER_REMINDERS_ID) ?? memorizationEl();
    const feedbackEl = (): HTMLElement =>
      document.getElementById(TOUR_SETTINGS_FEEDBACK_SECTION_ID) ?? remindersEl();

    const steps: DriveStep[] = [
      {
        element: () => gear(),
        popover: {
          title: title0,
          description: `${desc0}<br><br>These options live in <strong>Settings</strong> (the gear in the header). Tap <strong>Next</strong> to open the panel.`,
          side: 'bottom',
          align: 'center',
          onNextClick: advance(() => hooks.openSettings(), 420),
        },
      },
      {
        element: () => printRow(),
        popover: {
          title: 'Print',
          description:
            '<strong>Print Prayers</strong>, <strong>Print Prompts</strong>, and <strong>Print Personal</strong>—each with a <strong>chevron</strong> to limit time range, prompt types, or categories. Filters and search on Home apply to community prints.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: () => themeEl(),
        popover: {
          title: 'Theme',
          description:
            'Choose <strong>Light</strong>, <strong>Dark</strong>, or <strong>System</strong>. Your choice saves automatically.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => textSizeEl(),
        popover: {
          title: 'Text size',
          description:
            '<strong>Default</strong>, <strong>Larger</strong>, or <strong>Largest</strong> for easier reading across the app—saved automatically.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => emailEl(),
        popover: {
          title: 'Email subscription',
          description:
            'Choose <strong>Enabled</strong> or <strong>Disabled</strong> for mass <strong>email</strong> about new prayers and community updates. Direct emails about your own submissions may still be sent when needed.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => pushEl(),
        popover: {
          title: 'Push notifications',
          description:
            'When this block appears (often in the <strong>native app</strong>), control <strong>push</strong> separately from email. If you don’t see it here, push may not apply on this device.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => badgesEl(),
        popover: {
          title: 'Notification badges',
          description:
            'Choose <strong>Enabled</strong> or <strong>Disabled</strong> for badge counts on filters and cards; dismiss from the badge or filter as described in Help.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => encouragementEl(),
        popover: {
          title: 'Prayer encouragement on cards',
          description:
            'Use <strong>Show</strong> or <strong>Hide</strong> for <strong>Pray For</strong> and <strong>Praying #</strong> on community cards for <em>your</em> view only—others are unaffected.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => defaultViewEl(),
        popover: {
          title: 'Default prayer view',
          description:
            'Pick <strong>Current Prayers</strong> or <strong>Personal Prayers</strong> as your default when you open the app—saved to your account.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => memorizationEl(),
        popover: {
          title: 'Memorization practice',
          description:
            'Choose <strong>Standard</strong> (auto-reveal after three wrong attempts on a blank) or <strong>Strict</strong> (no auto-reveal; <strong>Errors: N</strong> in practice; finish each round with zero errors before <strong>Next round</strong>). Syncs across your devices.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => remindersEl(),
        popover: {
          title: 'Prayer reminders',
          description:
            'Optional hourly nudges (device time zone). Add hours with the dropdown and <strong>Add reminder</strong>; needs a saved email. Works with email and/or push when those are on.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => feedbackEl(),
        popover: {
          title: 'Feedback',
          description:
            'Send suggestions, bugs, or feature ideas when your church enables the form—or read the note if feedback isn’t turned on.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Footer & account',
          description:
            'At the bottom: <strong>Logout</strong> and <strong>Close</strong>. You can also sign out from your email badge in the header (with confirmation). <strong>Delete your account</strong> is below feedback when you need it.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        popover: {
          title: 'Done',
          description: 'Tap <strong>Next</strong> to close Settings.',
          side: 'bottom',
          align: 'center',
          onNextClick: (_e, _s) => {
            hooks.closeSettings();
            hooks.markForCheck();
            this.killActiveDriver();
          },
        },
      },
    ];

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Personal Prayers** help section (`help_personal_prayers`): hands-on walkthrough—creates a sample prayer
   * (**Test Personal Prayer**), tours edit / update / categories & drag / delete, then removes it.
   */
  startPersonalPrayersHelpSectionTour(
    section: { title: string; description: string },
    hooks: PersonalPrayersHelpSectionTourHooks
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getNewPrayerRequestButtonEl() || !getPersonalFilterEl()) {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);

    const advance = (fn: () => void, delayMs: number): DriverHook => {
      return (_element, _step, { driver: drv }) => {
        fn();
        window.setTimeout(() => {
          hooks.markForCheck();
          drv.refresh();
          drv.moveNext();
        }, delayMs);
      };
    };

    const pf = escapeHtml(PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR);
    const cat = escapeHtml(PERSONAL_PRAYER_WALKTHROUGH_CATEGORY);

    const categoryOrFilterEl = (): HTMLElement => {
      return (
        document.getElementById(TOUR_PERSONAL_CATEGORY_FILTERS_ID) ?? getPersonalFilterEl()!
      );
    };

    const dragOrCardEl = (): HTMLElement => {
      return (
        document.getElementById(TOUR_WALKTHROUGH_PERSONAL_DRAG_HANDLE_ID) ??
        document.getElementById(TOUR_WALKTHROUGH_PERSONAL_CARD_ID) ??
        getPersonalFilterEl()!
      );
    };

    const steps: DriveStep[] = [
      {
        popover: {
          title: title0,
          description: `${desc0}<br><br>We’ll walk through creating a <strong>sample personal prayer</strong> (filled in for you), then remove it at the end.`,
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: () => getNewPrayerRequestButtonEl()!,
        popover: {
          title: 'Request',
          description:
            'Tap <strong>Open form</strong> to start. We’ll switch to <strong>Personal</strong> first so the new request defaults to a private prayer.',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Open form &rarr;',
          onNextClick: advance(() => {
            hooks.switchToPersonalFilter();
            hooks.openPrayerForm();
          }, 350),
        },
      },
      {
        element: '#prayer_for',
        popover: {
          title: 'Prayer for',
          description: `Tap <strong>Next</strong> to enter <strong>${pf}</strong> (you can change it later in this tour).`,
          side: 'bottom',
          align: 'start',
          onNextClick: advance(() => hooks.fillWalkthroughPrayerFor(), 80),
        },
      },
      {
        element: '#description',
        popover: {
          title: 'Details',
          description: 'Next adds a short sample description for this practice prayer.',
          side: 'top',
          align: 'start',
          onNextClick: advance(() => hooks.fillWalkthroughDescription(), 80),
        },
      },
      {
        element: `#${TOUR_PRAYER_CHOOSE_PERSONAL_ID}`,
        popover: {
          title: 'Personal Prayer',
          description:
            'Choose <strong>Personal Prayer</strong> so this stays private—no admin approval. Tap <strong>Next</strong> to select it.',
          side: 'top',
          align: 'start',
          onNextClick: advance(() => hooks.ensureWalkthroughPersonalSelected(), 120),
        },
      },
      {
        element: '#category',
        popover: {
          title: 'Category',
          description: `Optional but useful: next fills <strong>${cat}</strong> so you can try category filters and ordering later.`,
          side: 'bottom',
          align: 'start',
          onNextClick: advance(() => hooks.fillWalkthroughCategory(), 80),
        },
      },
      {
        element: `#${TOUR_PRAYER_SUBMIT_REQUEST_ID}`,
        popover: {
          title: 'Submit',
          description: 'Tap <strong>Next</strong> to save this personal prayer.',
          side: 'top',
          align: 'start',
          onNextClick: advance(() => hooks.submitWalkthroughPrayerForm(), 950),
        },
      },
      {
        element: () => getPersonalFilterEl()!,
        popover: {
          title: 'Personal list',
          description:
            'You’re on the <strong>Personal</strong> filter. Your sample prayer should appear in the list below.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_WALKTHROUGH_PERSONAL_CARD_ID) ?? getPersonalFilterEl()!,
        popover: {
          title: 'Your new prayer',
          description: 'This card is the prayer we just created. Next we’ll open <strong>Edit</strong>.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_WALKTHROUGH_PERSONAL_EDIT_ID) ?? getPersonalFilterEl()!,
        popover: {
          title: 'Edit',
          description: 'Use the pencil to change the subject, details, or category any time.',
          side: 'left',
          align: 'start',
          onNextClick: advance(() => hooks.openWalkthroughPersonalEdit(), 320),
        },
      },
      {
        element: () =>
          document.getElementById(TOUR_PERSONAL_EDIT_MODAL_ROOT_ID) ?? getPersonalFilterEl()!,
        popover: {
          title: 'Edit form',
          description: 'Same fields as when you created the prayer. Close when you’re ready to continue.',
          side: 'bottom',
          align: 'center',
          onNextClick: advance(() => hooks.closeWalkthroughPersonalEdit(), 220),
        },
      },
      {
        element: () => document.getElementById(TOUR_WALKTHROUGH_ADD_UPDATE_ID) ?? getPersonalFilterEl()!,
        popover: {
          title: 'Add update',
          description: 'Track progress or answers with prayer updates on your personal cards.',
          side: 'top',
          align: 'start',
          onNextClick: advance(() => hooks.clickWalkthroughAddUpdate(), 220),
        },
      },
      {
        element: () => document.getElementById(TOUR_WALKTHROUGH_UPDATE_CONTENT_ID) ?? getPersonalFilterEl()!,
        popover: {
          title: 'Update notes',
          description:
            'You can type an update here and submit it on the card (optional for this tour). Next closes this panel.',
          side: 'top',
          align: 'start',
          onNextClick: advance(() => hooks.clickWalkthroughAddUpdate(), 180),
        },
      },
      {
        element: () => categoryOrFilterEl(),
        popover: {
          title: 'Categories',
          description:
            'When you have categories, these chips appear above the list. Drag the <strong>six-dot handle</strong> on a chip to <strong>reorder categories</strong>. Tap <strong>Next</strong> to filter to your sample category so card reordering unlocks.',
          side: 'bottom',
          align: 'start',
          onNextClick: advance(() => hooks.narrowToWalkthroughCategoryFilter(), 280),
        },
      },
      {
        element: () => dragOrCardEl(),
        popover: {
          title: 'Reorder prayers',
          description:
            'With <strong>one category</strong> selected, use the <strong>handle on the left of the card</strong> to drag prayers up or down. Your order is saved automatically.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_WALKTHROUGH_PERSONAL_DELETE_ID) ?? getPersonalFilterEl()!,
        popover: {
          title: 'Delete',
          description:
            'Tap <strong>Next</strong> to remove the <strong>sample prayer</strong> we created (this tour’s test data only).',
          side: 'left',
          align: 'start',
          onNextClick: (_e, _s) => {
            hooks.deleteWalkthroughTestPrayer();
            hooks.markForCheck();
            this.killActiveDriver();
          },
        },
      },
    ];

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
    });

    d.drive(0);
  }

  /**
   * **Prayer Presentation Mode** prelude on Home: highlights header **Pray**, then `continueToPresentation` runs on **Next**
   * (typically `sessionStorage` + `navigate(['/presentation'])`).
   */
  startPresentationModePrayButtonPreludeTour(
    section: { title: string; description: string },
    hooks: PresentationModePrayButtonPreludeHooks,
    opts?: { fullGuidedTourPrelude?: boolean }
  ): void {
    if (typeof document === 'undefined') {
      return;
    }

    this.killActiveDriver();

    const title0 = escapeHtml(section.title);
    const desc0 = escapeHtml(section.description);
    const pray = (): HTMLElement | null => getPrayerModeButtonEl();

    const abortFullTourPrelude = (): void => {
      this.clearFullGuidedTourNavigationState();
      this.clearFullGuidedTourProgress();
    };

    const preludeCloseClick: DriverHook | undefined = opts?.fullGuidedTourPrelude
      ? (_element, _step, opts2) => {
          abortFullTourPrelude();
          opts2.driver.destroy();
        }
      : undefined;

    const step: DriveStep = pray()
      ? {
          element: () => pray()!,
          popover: {
            title: title0,
            description: `${desc0 ? `${desc0}<br><br>` : ''}Tap the <strong>Pray</strong> button in the header (highlighted) anytime to open <strong>presentation mode</strong> for a group or shared screen. Tap <strong>Next</strong> and we’ll open it for you to continue the guided tour.`,
            side: 'bottom',
            align: 'center',
            onNextClick: (_e, _s) => {
              hooks.continueToPresentation();
              hooks.markForCheck();
              this.killActiveDriver();
            },
            ...(preludeCloseClick ? { onCloseClick: preludeCloseClick } : {}),
          },
        }
      : {
          popover: {
            title: title0,
            description: `${desc0 ? `${desc0}<br><br>` : ''}Use the <strong>Pray</strong> button in the header to open <strong>presentation mode</strong>. Tap <strong>Next</strong> to open it now and continue the tour.`,
            side: 'bottom',
            align: 'center',
            onNextClick: (_e, _s) => {
              hooks.continueToPresentation();
              hooks.markForCheck();
              this.killActiveDriver();
            },
            ...(preludeCloseClick ? { onCloseClick: preludeCloseClick } : {}),
          },
        };

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps: [step],
      ...(opts?.fullGuidedTourPrelude
        ? {
            onDestroyStarted: (_element, _step, opts2) => {
              abortFullTourPrelude();
              opts2.driver.destroy();
            },
          }
        : {}),
    });

    d.drive(0);
  }

  /**
   * **Prayer Presentation Mode** (`help_presentation`): runs on `/presentation` after Home navigates here.
   * Toolbar controls → open **Settings** → theme, smart/duration, content type, randomize, time/status, timer → exit.
   */
  startPresentationModeTour(section: { title: string; description: string }, hooks: PresentationModeTourHooks): void {
    if (typeof document === 'undefined') {
      return;
    }

    if (!getPresentationToolbarEl()) {
      return;
    }

    this.killActiveDriver();

    const desc0 = escapeHtml(section.description);

    const advance = (fn: () => void, delayMs: number): DriverHook => {
      return (_element, _step, { driver: drv }) => {
        fn();
        window.setTimeout(() => {
          hooks.markForCheck();
          drv.refresh();
          drv.moveNext();
        }, delayMs);
      };
    };

    const bar = (): HTMLElement => getPresentationToolbarEl()!;
    const modalOrBar = (): HTMLElement =>
      document.getElementById(TOUR_PRESENTATION_SETTINGS_MODAL_ID) ?? getPresentationToolbarEl()!;

    const timingEl = (): HTMLElement =>
      document.getElementById(TOUR_PRESENTATION_SETTING_DURATION_ID) ??
      document.getElementById(TOUR_PRESENTATION_SETTING_SMART_INFO_ID) ??
      document.getElementById(TOUR_PRESENTATION_SETTING_SMART_ID) ??
      modalOrBar();

    const steps: DriveStep[] = [
      {
        element: () => bar(),
        popover: {
          title: 'Presentation toolbar',
          description:
            `${desc0 ? `${desc0}<br><br>` : ''}You’re in <strong>presentation mode</strong>. The toolbar is fixed at the bottom (on desktop, move the pointer to the lower edge to show it, or <strong>double-tap</strong> on touch). Left: navigation and play. Right: <strong>Settings</strong> and <strong>Exit</strong>. This tour walks each control and the settings panel.`,
          side: 'top',
          align: 'center',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_PREV_ID) ?? bar(),
        popover: {
          title: 'Previous',
          description: 'Go to the previous prayer, prompt, or slide. Same as swiping <strong>right</strong> on touch or the <strong>←</strong> arrow key.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_PLAY_ID) ?? bar(),
        popover: {
          title: 'Play / Pause',
          description:
            'Starts automatic advance. While playing, a <strong>countdown</strong> shows time left on the current slide. You can also press <strong>P</strong> to toggle play.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_NEXT_ID) ?? bar(),
        popover: {
          title: 'Next',
          description: 'Advance manually. Same as swiping <strong>left</strong>, <strong>→</strong>, or <strong>Space</strong>.',
          side: 'top',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Touch & keyboard',
          description:
            '<strong>Swipe</strong> left/right to change slides. <strong>Escape</strong> exits presentation mode. On desktop without touch, use the toolbar or arrow keys as above.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_SETTINGS_BTN_ID) ?? bar(),
        popover: {
          title: 'Settings',
          description: 'Tap <strong>Next</strong> to open the settings panel and walk through options.',
          side: 'top',
          align: 'end',
          onNextClick: advance(() => hooks.openSettings(), 380),
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_SETTINGS_MODAL_ID) ?? bar(),
        popover: {
          title: 'Presentation settings',
          description:
            'Choose how content looks, how long each slide stays, what to include, and optional <strong>Prayer Timer</strong> blocks for focused prayer.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_SETTING_THEME_ID) ?? modalOrBar(),
        popover: {
          title: 'Theme',
          description: '<strong>Light</strong>, <strong>Dark</strong>, or follow the <strong>System</strong> appearance.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_SETTING_SMART_ID) ?? modalOrBar(),
        popover: {
          title: 'Smart Mode & timing',
          description:
            '<strong>Smart Mode</strong> adjusts display time from how much text is on each slide. Turn it off to set a fixed <strong>5–60 second</strong> interval with quick <strong>10s / 20s / 30s</strong> buttons.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => timingEl(),
        popover: {
          title: 'Reading time',
          description:
            'With Smart Mode on, see how timing is estimated. With it off, use the <strong>slider</strong> and presets for auto-advance.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_SETTING_CONTENT_TYPE_ID) ?? modalOrBar(),
        popover: {
          title: 'Content type',
          description:
            'Show <strong>Prayers</strong>, <strong>Prompts</strong>, <strong>Personal</strong>, <strong>Members</strong> (when your church maps a list), or <strong>All</strong> combined.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_SETTING_RANDOMIZE_ID) ?? modalOrBar(),
        popover: {
          title: 'Randomize order',
          description: 'Shuffle the sequence for variety in group settings.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_SETTING_TIME_FILTER_ID) ?? modalOrBar(),
        popover: {
          title: 'Time period',
          description:
            'For <strong>Prayers</strong> and <strong>Personal</strong>, limit how far back to pull requests (week through all time). Hidden for prompts-only content.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_SETTING_STATUS_ID) ?? modalOrBar(),
        popover: {
          title: 'Prayer status',
          description:
            'Include <strong>Current</strong>, <strong>Answered</strong>, and/or <strong>Archived</strong> community prayers—or all statuses. Open the dropdown to combine filters.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_SETTING_TIMER_ID) ?? modalOrBar(),
        popover: {
          title: 'Prayer timer',
          description:
            'Separate from slide auto-advance: set <strong>minutes</strong> for a focused prayer block, then <strong>Start Prayer Timer</strong>. You’ll get a full-screen notice when time is up.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Close settings',
          description:
            'Use the <strong>X</strong> in the header to close, or tap <strong>Next</strong> here and we’ll close the panel for you.',
          side: 'bottom',
          align: 'center',
          onNextClick: advance(() => hooks.closeSettings(), 280),
        },
      },
      {
        element: () => document.getElementById(TOUR_PRESENTATION_EXIT_ID) ?? bar(),
        popover: {
          title: 'Exit presentation',
          description:
            'Tap <strong>Next</strong> to leave presentation mode and return home (same as this button or <strong>Escape</strong>).',
          side: 'top',
          align: 'end',
          onNextClick: (_e, _s) => {
            hooks.persistFullGuidedTourQueue?.();
            hooks.exitPresentation();
            hooks.markForCheck();
            this.killActiveDriver();
          },
        },
      },
    ];

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
      onDestroyed: (_element, _step, opts) => {
        const stepsArr = opts.config.steps ?? [];
        const idx = opts.state.activeIndex;
        const onLast =
          stepsArr.length > 0 && typeof idx === 'number' && idx === stepsArr.length - 1;
        const prog = this.lastDriverDestroyWasProgrammatic;
        if (!onLast && !prog) {
          hooks.onFullGuidedTourInterrupted?.();
        }
      },
    });

    d.drive(0);
  }

  destroy(): void {
    this.tourFinishedCallback = null;
    this.tourChainMode = 'off';
    this.lastDriverDestroyWasProgrammatic = false;
    this.tourAbortedFullChainByUser = false;
    this.killActiveDriver();
  }
}
