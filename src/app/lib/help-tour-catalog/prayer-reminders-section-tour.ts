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
import { TOUR_SETTINGS_PRAYER_REMINDERS_ID, TOUR_SETTINGS_PRAYER_REMINDER_CONTROLS_ID } from '../help-tour-ids';
import type { PrayerRemindersHelpTourOptions, PrayerRemindersHelpTourHooks } from '../help-tour-hooks';

export function runPrayerRemindersHelpSectionTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    options: PrayerRemindersHelpTourOptions,
    hooks: PrayerRemindersHelpTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getPublicFilterEl() || !dom.getSettingsHeaderButtonEl()) {
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
  const remindersCard = (): HTMLElement =>
    document.getElementById(TOUR_SETTINGS_PRAYER_REMINDERS_ID) ?? gear();
  const controls = (): HTMLElement =>
    document.getElementById(TOUR_SETTINGS_PRAYER_REMINDER_CONTROLS_ID) ?? remindersCard();

  const steps: DriveStep[] = [
    {
      element: () => dom.getPublicFilterEl()!,
      popover: {
        title: title0,
        description: `${desc0}<br><br>There are two kinds of reminders: the <strong>card menu</strong> (hamburger) on a prayer card for one prayer at a time, and <strong>general nudges</strong> in Settings. Tap <strong>Next</strong> to open <strong>Church</strong> prayers on the <strong>Current</strong> chip.`,
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Show current &rarr;',
        onNextClick: host.advanceAfterOrKill(() => {
          hooks.switchToCurrent();
          openCardActionsOverflowMenu(getCardActionsOverflowTriggerEl(document));
        }),
      },
    },
  ];

  if (options.hasReminderCardMenuTarget && getCardActionsOverflowTriggerEl(document)) {
    steps.push({
      element: () => dom.getPrayerReminderBellEl()!,
      popover: {
        title: 'Per-prayer reminder',
        description:
          'Open the <strong>card menu</strong> (hamburger), then tap <strong>Add prayer reminder</strong> (or <strong>Manage prayer reminders</strong> if one is already set) to schedule a <strong>one-time</strong>, <strong>daily</strong>, or <strong>weekly</strong> reminder for that specific prayer. Times use 15-minute steps in your device time zone. A filled bell in the menu means you already have a reminder scheduled.',
        side: 'left',
        align: 'start',
      },
    });
  }

  steps.push(
    {
      element: () => gear(),
      popover: {
        title: 'General prayer nudges',
        description:
          '<strong>Settings → Prayer reminders</strong> adds optional nudges at times you choose—not tied to one card. Tap <strong>Next</strong> to open Settings.',
        side: 'bottom',
        align: 'center',
        onNextClick: advance(() => hooks.openSettings(), 420),
      },
    },
    {
      element: () => remindersCard(),
      popover: {
        title: 'Prayer reminders in Settings',
        description:
          'Optional nudges at clock times you choose in <strong>15-minute</strong> steps (:00, :15, :30, :45)—just for you, separate from community prayer emails. If <strong>email subscription</strong> is on, you can get a reminder email; if <strong>push</strong> is on and this device is registered, you can get a push too. Times use your <strong>device time zone</strong>.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => controls(),
      popover: {
        title: 'Add a general reminder',
        description:
          'Pick a <strong>time</strong> from the dropdown, then tap <strong>Add reminder</strong>. You can add several slots. Each saved time appears in the list above with <strong>Remove</strong> to delete it.',
        side: 'top',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'Tips',
        description:
          'Per-prayer reminders clear automatically when a prayer is deleted, archived, or answered. Push delivery needs the <strong>installed native app</strong> on your phone (setting a reminder on the web is fine). General and per-prayer reminders don’t replace community update emails—they’re a personal rhythm to pause and pray.',
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
    }
  );

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
