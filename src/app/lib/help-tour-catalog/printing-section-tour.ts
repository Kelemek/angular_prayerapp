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
import { TOUR_SETTINGS_PRINT_ROW_ID, TOUR_SETTINGS_PRINT_PRAYERS_ID, TOUR_SETTINGS_PRINT_PROMPTS_ID, TOUR_SETTINGS_PRINT_PERSONAL_ID } from '../help-tour-ids';
import type { PrintingHelpTourHooks } from '../help-tour-hooks';

export function runPrintingHelpSectionTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    hooks: PrintingHelpTourHooks
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
