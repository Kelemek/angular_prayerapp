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
import type { NewPrayerRequestTourHooks } from '../help-tour-hooks';

export function runNewPrayerRequestTour(
  host: HelpTourDriverHost,
  helpContent: HelpContent, hooks: NewPrayerRequestTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getNewPrayerRequestButtonEl()) {
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
        element: () => dom.getNewPrayerRequestButtonEl()!,
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
        element: () => dom.getPrayerSubmitRequestEl()!,
        popover: {
          title: 'Submit for review',
          description:
            'When you’re ready, tap <strong>Submit Prayer Request</strong>. <strong>Public</strong> prayers are <strong>reviewed by an admin</strong> before they appear for everyone; you may get an email when yours is approved or needs attention. <strong>Personal</strong> prayers stay private and skip that review.',
          side: 'top',
          align: 'start',
          onNextClick: host.popoverNextKillsTour(),
        },
      },
    ],
  });

  d.drive(0);
}
