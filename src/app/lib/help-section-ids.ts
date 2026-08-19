/** Stable help section ids (must match `HelpContentService`). */
export const HELP_SECTION_ID_PRAYERS = 'help_prayers';
export const HELP_SECTION_ID_PROMPTS = 'help_prompts';
export const HELP_SECTION_ID_ENCOURAGEMENT = 'help_prayer_encouragement';
export const HELP_SECTION_ID_SEARCH = 'help_search';
export const HELP_SECTION_ID_PERSONAL_PRAYERS = 'help_personal_prayers';
export const HELP_SECTION_ID_MEMORIZE = 'help_memorize';
export const HELP_SECTION_ID_PRESENTATION = 'help_presentation';
export const HELP_SECTION_ID_PRINTING = 'help_printing';
export const HELP_SECTION_ID_EMAIL_SUBSCRIPTION = 'help_email_subscription';
export const HELP_SECTION_ID_PRAYER_REMINDERS = 'help_prayer_reminders';
export const HELP_SECTION_ID_FEEDBACK = 'help_feedback';
export const HELP_SECTION_ID_APP_SETTINGS = 'help_settings';
export const HELP_SECTION_ID_FILTERING = 'help_filtering';

/** Section ids that expose a **Start guided tour** button in the Help modal. */
export const HELP_SECTION_IDS_WITH_UI_TOUR: ReadonlySet<string> = new Set([
  HELP_SECTION_ID_PRAYERS,
  HELP_SECTION_ID_PROMPTS,
  HELP_SECTION_ID_ENCOURAGEMENT,
  HELP_SECTION_ID_SEARCH,
  HELP_SECTION_ID_PERSONAL_PRAYERS,
  HELP_SECTION_ID_MEMORIZE,
  HELP_SECTION_ID_FILTERING,
  HELP_SECTION_ID_PRESENTATION,
  HELP_SECTION_ID_PRINTING,
  HELP_SECTION_ID_EMAIL_SUBSCRIPTION,
  HELP_SECTION_ID_PRAYER_REMINDERS,
  HELP_SECTION_ID_FEEDBACK,
  HELP_SECTION_ID_APP_SETTINGS,
]);

export function helpSectionHasUiTour(sectionId: string): boolean {
  return HELP_SECTION_IDS_WITH_UI_TOUR.has(sectionId);
}
