import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from '../help-filter-tour-excerpt';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpTourDriverHost } from '../help-tour-driver-host';

export function runSearchPrayersTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string }
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getPrayerSearchInputEl()) {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(section.title);
  const desc0 = formatHelpContentHtml(section.description);

  const steps: DriveStep[] = [
    {
      element: () => dom.getPrayerSearchInputEl()!,
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
        onNextClick: host.popoverNextKillsTour(),
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
