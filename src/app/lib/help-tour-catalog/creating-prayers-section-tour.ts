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
import type { CreatingPrayersHelpSectionTourHooks, UpdatingPrayerTourOptions } from '../help-tour-hooks';

export function runCreatingPrayersHelpSectionTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    hooks: CreatingPrayersHelpSectionTourHooks,
    options: UpdatingPrayerTourOptions = {}
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getNewPrayerRequestButtonEl()) {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(section.title);
  const desc0 = formatHelpContentHtml(section.description);
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
      element: () => dom.getNewPrayerRequestButtonEl()!,
      popover: {
        title: title0,
        description: `${desc0}<br><br>This tour covers a <strong>community</strong> request and <strong>updates</strong> on cards. Use <strong>Help → Filtering Prayers</strong> for filter tiles, and <strong>Help → Personal Prayers</strong> for private prayers. Tap <strong>Open form &rarr;</strong> to begin (or tap <strong>Request</strong> yourself). Help calls this “Add Request”.`,
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
          'Enter <strong>who or what</strong> this prayer is for—the same field described in Help for a new request.',
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
          'Tap <strong>Submit Prayer Request</strong> when you’re done. <strong>Public</strong> requests go through <strong>admin review</strong> before they show on the community list; you may get an email when yours is approved or needs changes. <strong>Personal</strong> prayers save without that step.',
        side: 'top',
        align: 'start',
      },
    },
  ];

  steps.push({
    popover: {
      title: 'Prayer updates',
      description:
        'Tap <strong>Next</strong> to <strong>close the form</strong> and switch to <strong>Current</strong> prayers when needed. Then we highlight <strong>Add Update</strong> on a prayer card when one is available.',
      side: 'bottom',
      align: 'center',
      onNextClick: (_element, _step, { driver: drv }) => {
        hooks.closePrayerForm();
        hooks.switchToCurrent();
        // Allow Current list + tour anchors to render after leaving Prompts / Personal / etc.
        window.setTimeout(() => {
          drv.refresh();
          drv.moveNext();
        }, 500);
      },
    },
  });

  // Always include update steps: at tour start the user may be on Prompts (no `#tour-prayer-add-update` yet).
  // After `switchToCurrent` on the previous step, the first community card supplies the anchor.
  steps.push(
    {
      element: () => dom.getTourAddUpdateButtonEl()!,
      popover: {
        title: 'Add Update',
        description:
          'On each prayer card, use <strong>Add Update</strong> for progress or thanksgiving. Tap <strong>Open form &rarr;</strong> to open the add-update modal.',
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
    }
  );
  if (includeAnonymous) {
    steps.push({
      element: `#${TOUR_PRAYER_UPDATE_ANONYMOUS_WRAP_ID}`,
      popover: {
        title: 'Anonymous update (optional)',
        description:
          'For <strong>community</strong> prayers you can post this update without showing your name.',
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
