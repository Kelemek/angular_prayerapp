import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import * as dom from '../help-tour-dom';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import {
  TOUR_SETTINGS_PRINT_ROW_ID,
  TOUR_SETTINGS_PRINT_PRAYERS_ID,
  TOUR_SETTINGS_PRINT_MEMORIZATION_ID,
} from '../help-tour-ids';
import type { PrintingHelpTourHooks } from '../help-tour-hooks';

export function runPrintingHelpSectionTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
  hooks: PrintingHelpTourHooks,
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
  const row = (): HTMLElement =>
    document.getElementById(TOUR_SETTINGS_PRINT_ROW_ID) ?? gear();
  const printPrayers = (): HTMLElement =>
    document.getElementById(TOUR_SETTINGS_PRINT_PRAYERS_ID) ?? row();
  const printVerses = (): HTMLElement =>
    document.getElementById(TOUR_SETTINGS_PRINT_MEMORIZATION_ID) ?? row();

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
          'Two actions—<strong>Prayers</strong> and <strong>Verses</strong>—in soft blue bordered tiles. Each opens a short wizard to choose what to include before printing.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: () => printPrayers(),
      popover: {
        title: 'Print Prayers',
        description:
          'Opens a menu for <strong>Church</strong> (community list with a time range), <strong>Personal</strong> prayers (category and time range), or <strong>Prompts</strong> (by type).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => printVerses(),
      popover: {
        title: 'Print Verses',
        description:
          'Print cut-out <strong>memorization verse cards</strong> from your Memorize list—choose duplex (two-sided) or foldable (one-sided) layout.',
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
