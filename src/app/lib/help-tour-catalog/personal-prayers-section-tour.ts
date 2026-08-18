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
import { PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR, PERSONAL_PRAYER_WALKTHROUGH_CATEGORY, TOUR_PERSONAL_CATEGORY_FILTERS_ID, TOUR_WALKTHROUGH_PERSONAL_DRAG_HANDLE_ID, TOUR_WALKTHROUGH_PERSONAL_CARD_ID, TOUR_PRAYER_CHOOSE_PERSONAL_ID, TOUR_PRAYER_SUBMIT_REQUEST_ID, TOUR_WALKTHROUGH_PERSONAL_ANSWERED_ID, TOUR_WALKTHROUGH_PERSONAL_EDIT_ID, TOUR_PERSONAL_EDIT_MODAL_ROOT_ID, TOUR_WALKTHROUGH_ADD_UPDATE_ID, TOUR_WALKTHROUGH_UPDATE_CONTENT_ID, TOUR_WALKTHROUGH_PERSONAL_DELETE_ID } from '../help-tour-ids';
import type { PersonalPrayersHelpSectionTourHooks } from '../help-tour-hooks';

export function runPersonalPrayersHelpSectionTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    hooks: PersonalPrayersHelpSectionTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getNewPrayerRequestButtonEl() || !dom.getPersonalFilterEl()) {
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

  const pf = dom.escapeHtml(PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR);
  const cat = dom.escapeHtml(PERSONAL_PRAYER_WALKTHROUGH_CATEGORY);

  const categoryOrFilterEl = (): HTMLElement => {
    return (
      document.getElementById(TOUR_PERSONAL_CATEGORY_FILTERS_ID) ?? dom.getPersonalFilterEl()!
    );
  };

  const dragOrCardEl = (): HTMLElement => {
    return (
      document.getElementById(TOUR_WALKTHROUGH_PERSONAL_DRAG_HANDLE_ID) ??
      document.getElementById(TOUR_WALKTHROUGH_PERSONAL_CARD_ID) ??
      dom.getPersonalFilterEl()!
    );
  };

  const steps: DriveStep[] = [
    {
      popover: {
        title: title0,
        description: `${desc0}<br><br>We’ll walk through creating a <strong>sample personal prayer</strong> (filled in for you), then remove it at the end.`,
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: () => dom.getNewPrayerRequestButtonEl()!,
      popover: {
        title: 'Request',
        description:
          'Tap <strong>Open form</strong> to start. We’ll switch to <strong>Personal</strong> first so the new request defaults to a private prayer.',
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Open form &rarr;',
        onNextClick: advance(() => {
          hooks.switchToPersonalFilter();
          hooks.openPrayerForm();
        }, 350),
      },
    },
    {
      element: '#prayer_for',
      popover: {
        title: 'Prayer for',
        description: `Tap <strong>Next</strong> to enter <strong>${pf}</strong> (you can change it later in this tour).`,
        side: 'bottom',
        align: 'start',
        onNextClick: advance(() => hooks.fillWalkthroughPrayerFor(), 80),
      },
    },
    {
      element: '#description',
      popover: {
        title: 'Details',
        description: 'Next adds a short sample description for this practice prayer.',
        side: 'top',
        align: 'start',
        onNextClick: advance(() => hooks.fillWalkthroughDescription(), 80),
      },
    },
    {
      element: `#${TOUR_PRAYER_CHOOSE_PERSONAL_ID}`,
      popover: {
        title: 'Personal Prayer',
        description:
          'Choose <strong>Personal Prayer</strong> so this stays private—no admin approval. Tap <strong>Next</strong> to select it.',
        side: 'top',
        align: 'start',
        onNextClick: advance(() => hooks.ensureWalkthroughPersonalSelected(), 120),
      },
    },
    {
      element: '#category',
      popover: {
        title: 'Category',
        description: `Optional but useful: next fills <strong>${cat}</strong> so you can try category filters and ordering later.`,
        side: 'bottom',
        align: 'start',
        onNextClick: advance(() => hooks.fillWalkthroughCategory(), 80),
      },
    },
    {
      element: `#${TOUR_PRAYER_SUBMIT_REQUEST_ID}`,
      popover: {
        title: 'Submit',
        description: 'Tap <strong>Next</strong> to save this personal prayer.',
        side: 'top',
        align: 'start',
        onNextClick: advance(() => hooks.submitWalkthroughPrayerForm(), 950),
      },
    },
    {
      element: () => dom.getPersonalFilterEl()!,
      popover: {
        title: 'Personal list',
        description:
          'You’re on the <strong>Personal</strong> tab. <strong>Current</strong>, <strong>Answered</strong>, and <strong>Total</strong> chips sit in the row below the main tabs; your sample prayer should appear in the list underneath.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => document.getElementById(TOUR_WALKTHROUGH_PERSONAL_CARD_ID) ?? dom.getPersonalFilterEl()!,
      popover: {
        title: 'Your new prayer',
        description: 'This card is the prayer we just created. Next we’ll open the <strong>card menu</strong> and highlight <strong>Mark as answered</strong>.',
        side: 'top',
        align: 'start',
        onNextClick: advance(() => dom.openWalkthroughPersonalCardActionsMenu(), 80),
      },
    },
    {
      element: () =>
        document.getElementById(TOUR_WALKTHROUGH_PERSONAL_ANSWERED_ID) ??
        dom.getPersonalFilterEl()!,
      popover: {
        title: 'Mark as answered',
        description:
          'Open the <strong>card menu</strong>, then tap <strong>Mark as answered</strong> to move this prayer to the <strong>Answered</strong> chip (tap again to clear). Same outcome as the checkbox when editing or adding an update.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: () => document.getElementById(TOUR_WALKTHROUGH_PERSONAL_EDIT_ID) ?? dom.getPersonalFilterEl()!,
      popover: {
        title: 'Edit',
        description: 'Open the <strong>card menu</strong>, then tap <strong>Edit prayer</strong> to change the subject, details, or category any time.',
        side: 'left',
        align: 'start',
        onNextClick: advance(() => hooks.openWalkthroughPersonalEdit(), 320),
      },
    },
    {
      element: () =>
        document.getElementById(TOUR_PERSONAL_EDIT_MODAL_ROOT_ID) ?? dom.getPersonalFilterEl()!,
      popover: {
        title: 'Edit form',
        description: 'Same fields as when you created the prayer. Close when you’re ready to continue.',
        side: 'bottom',
        align: 'center',
        onNextClick: advance(() => hooks.closeWalkthroughPersonalEdit(), 220),
      },
    },
    {
      element: () => document.getElementById(TOUR_WALKTHROUGH_ADD_UPDATE_ID) ?? dom.getPersonalFilterEl()!,
      popover: {
        title: 'Add update',
        description: 'Track progress or answers with prayer updates on your personal cards.',
        side: 'top',
        align: 'start',
        onNextClick: advance(() => hooks.clickWalkthroughAddUpdate(), 220),
      },
    },
    {
      element: () => document.getElementById(TOUR_WALKTHROUGH_UPDATE_CONTENT_ID) ?? dom.getPersonalFilterEl()!,
      popover: {
        title: 'Update notes',
        description:
          'You can type an update here and submit it on the card (optional for this tour). Next closes this panel.',
        side: 'top',
        align: 'start',
        onNextClick: advance(() => hooks.clickWalkthroughAddUpdate(), 180),
      },
    },
    {
      element: () => categoryOrFilterEl(),
      popover: {
        title: 'Categories',
        description:
          'When you have categories, chips appear in the row below the main tabs—<strong>Current</strong>, <strong>Answered</strong>, <strong>Total</strong>, then your named categories (they share each row when they fit and wrap when needed, like prompt type chips). Drag the <strong>six-dot handle</strong> on a chip to <strong>reorder categories</strong>. Tap <strong>Next</strong> to filter to your sample category so card reordering unlocks.',
        side: 'bottom',
        align: 'start',
        onNextClick: advance(() => hooks.narrowToWalkthroughCategoryFilter(), 280),
      },
    },
    {
      element: () => dragOrCardEl(),
      popover: {
        title: 'Reorder prayers',
        description:
          'With <strong>one category</strong> selected, drag the <strong>date and time</strong> at the top of the card to reorder prayers. Your order is saved automatically. Tap <strong>Next</strong> to open the card menu for delete.',
        side: 'right',
        align: 'start',
        onNextClick: advance(() => dom.openWalkthroughPersonalCardActionsMenu(), 80),
      },
    },
    {
      element: () => document.getElementById(TOUR_WALKTHROUGH_PERSONAL_DELETE_ID) ?? dom.getPersonalFilterEl()!,
      popover: {
        title: 'Delete',
        description:
          'Open the <strong>card menu</strong>, then tap <strong>Next</strong> to remove the <strong>sample prayer</strong> we created (this tour’s test data only).',
        side: 'left',
        align: 'start',
        onNextClick: (_e, _s) => {
          hooks.deleteWalkthroughTestPrayer();
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
