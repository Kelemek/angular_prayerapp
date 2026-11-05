import type { DriveStep, DriverHook } from 'driver.js';
import { TOUR_PRAYER_JOURNAL_MODAL_ID } from '../help-tour-ids';

const openJournalOnNext =
  (journalButtonEl: () => HTMLElement | null): DriverHook =>
  (_element, _step, { driver: drv }) => {
    journalButtonEl()?.click();
    window.setTimeout(() => {
      drv.refresh();
      drv.moveNext();
    }, 280);
  };

const closeJournalOnNext: DriverHook = (_element, _step, { driver: drv }) => {
  document
    .querySelector<HTMLElement>(
      `#${TOUR_PRAYER_JOURNAL_MODAL_ID} [aria-label="Close journal"]`,
    )
    ?.click();
  window.setTimeout(() => {
    drv.refresh();
    drv.moveNext();
  }, 220);
};

/** Highlights Journal on a prayer card, opens the modal briefly, then continues the tour. */
export function appendJournalCardTourSteps(
  steps: DriveStep[],
  journalButtonEl: () => HTMLElement | null,
): void {
  steps.push(
    {
      element: () => journalButtonEl() ?? document.body,
      popover: {
        title: 'Private journal',
        description:
          'Between <strong>Add Update</strong> and <strong>Pray For</strong>, <strong>Journal</strong> opens a private note for this prayer. Only you can read or edit it. Tap <strong>Next</strong> to open the editor (nothing is saved unless you tap Save).',
        side: 'top',
        align: 'start',
        onNextClick: openJournalOnNext(journalButtonEl),
      },
    },
    {
      element: () =>
        document.getElementById(TOUR_PRAYER_JOURNAL_MODAL_ID) ?? journalButtonEl() ?? document.body,
      popover: {
        title: 'Your private note',
        description:
          'Write reflections, Scripture, or reminders for yourself. <strong>Save</strong> stores the note; <strong>Delete</strong> removes it. The pencil on the card shows a colored tip when a note exists. This tour does not save.',
        side: 'bottom',
        align: 'center',
        onNextClick: closeJournalOnNext,
      },
    },
  );
}
