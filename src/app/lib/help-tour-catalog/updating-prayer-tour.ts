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
import { TOUR_PRAYER_UPDATE_ANONYMOUS_WRAP_ID, TOUR_PRAYER_UPDATE_MARK_ANSWERED_WRAP_ID } from '../help-tour-ids';
import type { UpdatingPrayerTourOptions } from '../help-tour-hooks';

export function runUpdatingPrayerTour(
  host: HelpTourDriverHost,
  helpContent: HelpContent, options: UpdatingPrayerTourOptions = {}
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getTourAddUpdateButtonEl()) {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(helpContent.subtitle);
  const body0 = formatHelpContentHtml(helpContent.text);
  const includeAnonymous = options.includeAnonymousUpdateStep === true;

  const openUpdateFormOnNext: DriverHook = (_element, _step, { driver: drv }) => {
    dom.getTourAddUpdateButtonEl()?.click();
    window.setTimeout(() => {
      drv.refresh();
      drv.moveNext();
    }, 250);
  };

  const steps: DriveStep[] = [
    {
      element: () => dom.getTourAddUpdateButtonEl()!,
      popover: {
        title: title0,
        description: `${body0}<br><br>The button is labeled <strong>Add Update</strong> on each prayer card. Tap <strong>Open form</strong> to open the add-update modal (or tap <strong>Add Update</strong> yourself).`,
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Open form &rarr;',
        onNextClick: openUpdateFormOnNext,
      },
    },
    {
      element: '#tour-prayer-update-content',
      popover: {
        title: 'Update details',
        description: 'Share progress, thanksgiving, or what to keep praying for.',
        side: 'top',
        align: 'start',
      },
    },
  ];

  if (includeAnonymous) {
    steps.push({
      element: `#${TOUR_PRAYER_UPDATE_ANONYMOUS_WRAP_ID}`,
      popover: {
        title: 'Anonymous update (optional)',
        description: 'For <strong>community</strong> prayers you can post this update without showing your name.',
        side: 'top',
        align: 'start',
      },
    });
  }

  steps.push({
    element: `#${TOUR_PRAYER_UPDATE_MARK_ANSWERED_WRAP_ID}`,
    popover: {
      title: 'Mark as answered (optional)',
      description:
        'Optional: check this when the prayer is answered to move it to the <strong>Answered</strong> view (works for community and personal prayers). Leave it unchecked if you’re only sharing an update and the request is still active.',
      side: 'top',
      align: 'start',
    },
  });

  steps.push({
    element: () => dom.getTourUpdateSubmitButtonEl()!,
    popover: {
      title: 'Add Update',
      description:
        'Tap <strong>Add Update</strong> to send what you entered. For <strong>community</strong> prayers, updates are <strong>reviewed by an admin</strong> before everyone sees them—like new requests. You may get an email when yours is approved or needs attention. <strong>Personal</strong> updates don’t go through that queue.',
      side: 'top',
      align: 'start',
      onNextClick: host.popoverNextKillsTour(),
    },
  });

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
