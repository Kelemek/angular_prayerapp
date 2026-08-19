import type { HelpSection } from '../types/help-content';
import {
  startAppSettingsTour,
  startCreatingPrayersTour,
  startEmailSubscriptionTour,
  startFeedbackTour,
  startFilteringTour,
  startMemorizeTour,
  startPersonalPrayersTour,
  startPrayerEncouragementTour,
  startPrayerPromptsTour,
  startPrayerRemindersTour,
  startPresentationModeTour,
  startPrintingTour,
  startSearchPrayersTour,
  type HomeHelpTourSectionStartContext,
} from './home-help-tour-section-starts';

export const HELP_SECTION_ID_PRESENTATION = 'help_presentation';

export function dispatchHomeHelpSectionTour(
  section: HelpSection,
  ctx: HomeHelpTourSectionStartContext
): boolean {
  switch (section.id) {
    case 'help_prayers':
      startCreatingPrayersTour(section, ctx);
      return true;
    case 'help_filtering':
      startFilteringTour(section, ctx);
      return true;
    case 'help_prompts':
      startPrayerPromptsTour(section, ctx);
      return true;
    case 'help_prayer_encouragement':
      void startPrayerEncouragementTour(section, ctx);
      return true;
    case 'help_search':
      startSearchPrayersTour(section, ctx);
      return true;
    case 'help_personal_prayers':
      startPersonalPrayersTour(section, ctx);
      return true;
    case 'help_memorize':
      startMemorizeTour(section, ctx);
      return true;
    case 'help_printing':
      startPrintingTour(section, ctx);
      return true;
    case 'help_email_subscription':
      startEmailSubscriptionTour(section, ctx);
      return true;
    case 'help_prayer_reminders':
      void startPrayerRemindersTour(section, ctx);
      return true;
    case 'help_feedback':
      startFeedbackTour(section, ctx);
      return true;
    case 'help_settings':
      startAppSettingsTour(section, ctx);
      return true;
    case HELP_SECTION_ID_PRESENTATION:
      startPresentationModeTour(section, ctx);
      return true;
    default:
      return false;
  }
}
