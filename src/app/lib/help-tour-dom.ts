import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from './help-card-actions-menu-tour';
import {
  TOUR_REQUEST_BTN_MOBILE_ID,
  TOUR_REQUEST_BTN_DESKTOP_ID,
  TOUR_FILTER_PERSONAL_ID,
  TOUR_FILTER_PUBLIC_ID,
  TOUR_FILTER_CURRENT_ID,
  TOUR_FILTER_ARCHIVED_ID,
  TOUR_FILTER_TOTAL_ID,
  TOUR_FILTER_ANSWERED_ID,
  TOUR_FILTER_MEMBERS_ID,
  TOUR_FILTER_PROMPTS_ID,
  TOUR_FILTER_MEMORIZE_ID,
  TOUR_MEMORIZE_ACTION_BAR_ID,
  TOUR_MEMORIZE_ADD_VERSES_ID,
  TOUR_MEMORIZE_RECOMMENDED_ID,
  TOUR_MEMORIZE_SAMPLE_CARD_ID,
  TOUR_MEMORIZE_SAMPLE_TABLE_ID,
  TOUR_MEMORIZE_EMPTY_STATE_ID,
  TOUR_PROMPT_TYPE_FILTERS_ID,
  TOUR_PROMPT_EMPTY_ID,
  TOUR_PROMPT_CARD_SAMPLE_ID,
  TOUR_PRAYER_MODE_MOBILE_ID,
  TOUR_PRAYER_MODE_DESKTOP_ID,
  TOUR_SETTINGS_BTN_MOBILE_ID,
  TOUR_SETTINGS_BTN_DESKTOP_ID,
  TOUR_SETTINGS_PRINT_ROW_ID,
  TOUR_SETTINGS_PRINT_PRAYERS_ID,
  TOUR_SETTINGS_PRINT_PROMPTS_ID,
  TOUR_SETTINGS_PRINT_PERSONAL_ID,
  TOUR_SETTINGS_EMAIL_SUBSCRIPTION_ID,
  TOUR_SETTINGS_PRAYER_REMINDERS_ID,
  TOUR_SETTINGS_PRAYER_REMINDER_CONTROLS_ID,
  TOUR_SETTINGS_FEEDBACK_SECTION_ID,
  TOUR_SETTINGS_FEEDBACK_TYPE_ID,
  TOUR_SETTINGS_FEEDBACK_DETAILS_ID,
  TOUR_SETTINGS_THEME_ID,
  TOUR_SETTINGS_TEXT_SIZE_ID,
  TOUR_SETTINGS_PUSH_ID,
  TOUR_SETTINGS_BADGES_ID,
  TOUR_SETTINGS_PRAYER_ENCOURAGEMENT_ID,
  TOUR_SETTINGS_DEFAULT_VIEW_ID,
  TOUR_SETTINGS_MEMORIZATION_STRICT_MODE_ID,
  TOUR_ADD_UPDATE_BTN_ID,
  TOUR_PRAYER_PRAY_FOR_ID,
  TOUR_PRAYER_REMINDER_BELL_ID,
  TOUR_BTN_SEARCH_MOBILE_ID,
  TOUR_BTN_SEARCH_DESKTOP_ID,
  TOUR_PRAYER_SEARCH_ID,
  PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR,
  PERSONAL_PRAYER_WALKTHROUGH_DESCRIPTION,
  PERSONAL_PRAYER_WALKTHROUGH_CATEGORY,
  TOUR_PRAYER_CHOOSE_PERSONAL_ID,
  TOUR_PRAYER_SUBMIT_REQUEST_ID,
  TOUR_PRAYER_UPDATE_SUBMIT_ID,
  TOUR_PRAYER_UPDATE_ANONYMOUS_WRAP_ID,
  TOUR_PRAYER_UPDATE_MARK_ANSWERED_WRAP_ID,
  TOUR_PERSONAL_CATEGORY_FILTERS_ID,
  TOUR_WALKTHROUGH_PERSONAL_CARD_ID,
  TOUR_WALKTHROUGH_PERSONAL_EDIT_ID,
  TOUR_WALKTHROUGH_PERSONAL_ANSWERED_ID,
  TOUR_WALKTHROUGH_PERSONAL_DELETE_ID,
  TOUR_WALKTHROUGH_ADD_UPDATE_ID,
  TOUR_WALKTHROUGH_UPDATE_CONTENT_ID,
  TOUR_WALKTHROUGH_PERSONAL_DRAG_HANDLE_ID,
  TOUR_PERSONAL_EDIT_MODAL_ROOT_ID,
  TOUR_PRESENTATION_TOOLBAR_ID,
  TOUR_PRESENTATION_PREV_ID,
  TOUR_PRESENTATION_PLAY_ID,
  TOUR_PRESENTATION_NEXT_ID,
  TOUR_PRESENTATION_SETTINGS_BTN_ID,
  TOUR_PRESENTATION_EXIT_ID,
  TOUR_PRESENTATION_SETTINGS_MODAL_ID,
  TOUR_PRESENTATION_SETTING_THEME_ID,
  TOUR_PRESENTATION_SETTING_SMART_ID,
  TOUR_PRESENTATION_SETTING_DURATION_ID,
  TOUR_PRESENTATION_SETTING_SMART_INFO_ID,
  TOUR_PRESENTATION_SETTING_CONTENT_TYPE_ID,
  TOUR_PRESENTATION_SETTING_RANDOMIZE_ID,
  TOUR_PRESENTATION_SETTING_TIME_FILTER_ID,
  TOUR_PRESENTATION_SETTING_STATUS_ID,
  TOUR_PRESENTATION_SETTING_TIMER_ID,
  PRESENTATION_HELP_TOUR_SESSION_KEY,
  FULL_GUIDED_TOUR_QUEUE_KEY,
  FULL_GUIDED_TOUR_CLOSING_SENTINEL,
} from './help-tour-ids';

export function getPresentationToolbarEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRESENTATION_TOOLBAR_ID);
}

export function getNewPrayerRequestButtonEl(): HTMLElement | null {
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

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getPersonalFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_PERSONAL_ID);
}

export function getPublicFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_PUBLIC_ID);
}

export function getCurrentFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_CURRENT_ID);
}

export function getArchivedFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_ARCHIVED_ID);
}

export function getTotalFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_TOTAL_ID);
}

export function getAnsweredFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_ANSWERED_ID);
}

export function getMembersFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_MEMBERS_ID);
}

export function getPromptsFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_PROMPTS_ID);
}

export function getMemorizeFilterEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_FILTER_MEMORIZE_ID);
}

export function getMemorizeActionBarEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_MEMORIZE_ACTION_BAR_ID);
}

export function getMemorizeRecommendedEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_MEMORIZE_RECOMMENDED_ID);
}

export function getMemorizeEmptyStateEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_MEMORIZE_EMPTY_STATE_ID);
}

export function getMemorizeSampleCardEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_MEMORIZE_SAMPLE_CARD_ID);
}

export function getMemorizeSampleTableEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_MEMORIZE_SAMPLE_TABLE_ID);
}

/** Live Cards or Table list anchor — prefers the active layout, falls back if the user switched mid-tour. */
export function getMemorizePassageListEl(
  prefer: 'cards' | 'table' = 'cards'
): HTMLElement | null {
  const card = getMemorizeSampleCardEl();
  const table = getMemorizeSampleTableEl();
  if (prefer === 'table') {
    return table ?? card;
  }
  return card ?? table;
}

export const MEMORIZE_PASSAGE_CARDS_TITLE = 'Passage cards';
export const MEMORIZE_PASSAGE_CARDS_DESCRIPTION =
  'Tap a card to practice. Cards are grouped as <strong>Learning</strong>, <strong>Practicing</strong>, or <strong>Mastered</strong> based on completed sessions. On desktop, hover a verse (or long-press on mobile) to preview the passage text.';
export const MEMORIZE_PASSAGE_TABLE_TITLE = 'Passage list';
export const MEMORIZE_PASSAGE_TABLE_DESCRIPTION =
  'Tap a row to practice. Sort by <strong>Reference</strong>, <strong>Sessions</strong>, or <strong>Mastery</strong>. Switch to <strong>Cards</strong> for Learning / Practicing / Mastered groups and hover previews.';

export function applyMemorizePassageListPopover(popover: {
  title: HTMLElement;
  description: HTMLElement;
}): void {
  if (getMemorizeSampleCardEl()) {
    popover.title.innerHTML = MEMORIZE_PASSAGE_CARDS_TITLE;
    popover.description.innerHTML = MEMORIZE_PASSAGE_CARDS_DESCRIPTION;
    return;
  }
  if (getMemorizeSampleTableEl()) {
    popover.title.innerHTML = MEMORIZE_PASSAGE_TABLE_TITLE;
    popover.description.innerHTML = MEMORIZE_PASSAGE_TABLE_DESCRIPTION;
  }
}

export function getPromptTypeFiltersEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PROMPT_TYPE_FILTERS_ID);
}

export function getPromptEmptyStateEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PROMPT_EMPTY_ID);
}

export function getSamplePromptCardEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return (
    document.querySelector<HTMLElement>('.prompt-card[id^="prompt-card-"]') ??
    document.getElementById(TOUR_PROMPT_CARD_SAMPLE_ID)
  );
}

export function getPrayerModeButtonEl(): HTMLElement | null {
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

export function getTourAddUpdateButtonEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_ADD_UPDATE_BTN_ID);
}

export function getPrayerSubmitRequestEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRAYER_SUBMIT_REQUEST_ID);
}

export function getTourUpdateSubmitButtonEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRAYER_UPDATE_SUBMIT_ID);
}

export function getPrayerEncouragementPrayForButtonEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRAYER_PRAY_FOR_ID);
}

export function getPrayerReminderBellEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRAYER_REMINDER_BELL_ID);
}

export function openWalkthroughPersonalCardActionsMenu(): void {
  if (typeof document === 'undefined') {
    return;
  }
  const card = document.getElementById(TOUR_WALKTHROUGH_PERSONAL_CARD_ID);
  openCardActionsOverflowMenu(
    getCardActionsOverflowTriggerEl(card) ?? getCardActionsOverflowTriggerEl(document)
  );
}

export function getPrayerSearchInputEl(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  return document.getElementById(TOUR_PRAYER_SEARCH_ID);
}

export function getSettingsHeaderButtonEl(): HTMLElement | null {
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

