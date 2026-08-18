import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from '../help-filter-tour-excerpt';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpContent } from '../../types/help-content';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import type { PersonalPrayerTourHooks } from '../help-tour-hooks';

export function runPersonalPrayerTour(
  host: HelpTourDriverHost,
  helpContent: HelpContent, hooks: PersonalPrayerTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getPersonalFilterEl() || !dom.getNewPrayerRequestButtonEl()) {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(helpContent.subtitle);
  const body0 = formatHelpContentHtml(helpContent.text);

  const d = host.startTourDriver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    smoothScroll: true,
    allowClose: true,
    popoverClass: 'help-driver-popover',
    steps: [
      {
        element: () => dom.getPersonalFilterEl()!,
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
        element: () => dom.getNewPrayerRequestButtonEl()!,
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
          onNextClick: host.popoverNextKillsTour(),
        },
      },
    ],
  });

  d.drive(0);
}
