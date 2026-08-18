import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from '../help-filter-tour-excerpt';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpContent, HelpSection } from '../../types/help-content';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import { TOUR_SETTINGS_PRINT_ROW_ID, TOUR_SETTINGS_THEME_ID, TOUR_SETTINGS_TEXT_SIZE_ID, TOUR_SETTINGS_EMAIL_SUBSCRIPTION_ID, TOUR_SETTINGS_PUSH_ID, TOUR_SETTINGS_BADGES_ID, TOUR_SETTINGS_PRAYER_ENCOURAGEMENT_ID, TOUR_SETTINGS_DEFAULT_VIEW_ID, TOUR_SETTINGS_MEMORIZATION_STRICT_MODE_ID, TOUR_SETTINGS_PRAYER_REMINDERS_ID, TOUR_SETTINGS_FEEDBACK_SECTION_ID } from '../help-tour-ids';
import type { AppSettingsHelpTourHooks } from '../help-tour-hooks';

export function runAppSettingsHelpSectionTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    hooks: AppSettingsHelpTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getSettingsHeaderButtonEl()) {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(section.title);
  const desc0 = formatHelpContentHtml(section.description);

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

  const gear = (): HTMLElement => dom.getSettingsHeaderButtonEl()!;
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
          'Optional nudges in <strong>15-minute</strong> steps (device time zone). Add times with the dropdown and <strong>Add reminder</strong>; works with email and/or push when those are on. Use the <strong>card menu</strong> on a prayer card for a reminder on a specific prayer.',
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
          host.killActiveDriver();
        },
      },
    },
  ];

  const d = host.startTourDriver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    smoothScroll: true,
    allowClose: true,
    popoverClass: 'help-driver-popover',
    steps,
  });

  d.drive(0);
}
