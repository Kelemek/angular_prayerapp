import type { DriveStep } from 'driver.js';
import type { AdminPrayerEditorManageTourCallbacks } from '../../types/admin-help-tour';

export function buildPrayerEditorManageTourSteps(hasPrayerRow: boolean, callbacks: AdminPrayerEditorManageTourCallbacks): DriveStep[] {
    const tourUiDelayMs = 380;

    const baseSteps: DriveStep[] = [
      {
        popover: {
          title: 'Prayer Editor — edit & add update',
          description:
            'This tour uses the <strong>first prayer</strong> in your list. It will <strong>open</strong> the edit form and Add Update form, walk through the fields, then <strong>Cancel</strong> each—nothing is saved.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#admin-settings-tab-tools',
        popover: {
          title: 'Tools',
          description:
            'Open <strong>Tools</strong> for the Prayer Editor, archive timeline, backups, and other utilities.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#prayer-editor-settings-trigger',
        popover: {
          title: 'Prayer Editor',
          description:
            'Expand <strong>Prayer Editor</strong> to search prayers, open cards, edit, add updates, or delete.',
          side: 'bottom',
          align: 'start',
        },
      },
    ];

    const rowSteps: DriveStep[] = hasPrayerRow
      ? [
          {
            element: '#tour-prayer-editor-first-row',
            popover: {
              title: 'First prayer in the list',
              description:
                'This row is the <strong>first prayer</strong> on the current page. The card is expanded so you can see edit and add-update actions below.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-prayer-editor-edit-first',
            popover: {
              title: 'Edit this prayer',
              description:
                'The <strong>pencil</strong> opens the edit form. <strong>Next</strong> opens it for you so we can walk the fields.',
              side: 'left',
              align: 'start',
              nextBtnText: 'Open editor →',
              onNextClick: (_e, _s, { driver: drv }) => {
                callbacks.openEditFormForTour();
                window.setTimeout(() => {
                  drv.refresh();
                  drv.moveNext();
                }, tourUiDelayMs);
              },
            },
          },
          {
            element: '#tour-prayer-editor-edit-field-title',
            popover: {
              title: 'Title',
              description: 'The prayer title shown in the list and on cards.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-prayer-editor-edit-field-description',
            popover: {
              title: 'Description',
              description: 'Full text of the prayer request.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-prayer-editor-edit-field-requester-email',
            popover: {
              title: 'Requester & email',
              description: 'Who submitted the request and how to reach them.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-prayer-editor-edit-field-praying-for',
            popover: {
              title: 'Praying For',
              description: 'Short label for who or what the prayer is for.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-prayer-editor-edit-field-status',
            popover: {
              title: 'Status',
              description: '<strong>Current</strong>, <strong>Answered</strong>, or <strong>Archived</strong>.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-prayer-editor-edit-cancel-first',
            popover: {
              title: 'Cancel editing',
              description:
                'Use <strong>Cancel</strong> to close the editor without saving. <strong>Next</strong> does that for this tour.',
              side: 'bottom',
              align: 'start',
              nextBtnText: 'Cancel edit →',
              onNextClick: (_e, _s, { driver: drv }) => {
                callbacks.cancelEditForTour();
                window.setTimeout(() => {
                  drv.refresh();
                  drv.moveNext();
                }, tourUiDelayMs);
              },
            },
          },
          {
            element: '#tour-prayer-editor-add-update-btn',
            popover: {
              title: 'Add Update',
              description:
                'Post a follow-up on this prayer. <strong>Next</strong> opens the form (you will cancel at the end—nothing saved).',
              side: 'top',
              align: 'start',
              nextBtnText: 'Open Add Update →',
              onNextClick: (_e, _s, { driver: drv }) => {
                callbacks.openAddUpdateFormForTour();
                window.setTimeout(() => {
                  drv.refresh();
                  drv.moveNext();
                }, tourUiDelayMs);
              },
            },
          },
          {
            element: '#tour-prayer-editor-add-update-field-names',
            popover: {
              title: 'Author name',
              description: 'First and last name for the person posting this update.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-prayer-editor-add-update-field-author-email',
            popover: {
              title: 'Author email',
              description: 'Contact email for this update.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-prayer-editor-add-update-field-content',
            popover: {
              title: 'Update content',
              description: 'The follow-up message shown on the prayer timeline.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-prayer-editor-add-update-cancel-first',
            popover: {
              title: 'Cancel new update',
              description:
                'Use <strong>Cancel</strong> to close without saving the update. <strong>Next</strong> does that to finish the tour.',
              side: 'bottom',
              align: 'start',
              nextBtnText: 'Cancel update →',
              onNextClick: (_e, _s, { driver: drv }) => {
                callbacks.cancelAddUpdateForTour();
                window.setTimeout(() => {
                  drv.refresh();
                  drv.moveNext();
                }, tourUiDelayMs);
              },
            },
          },
        ]
      : [
          {
            popover: {
              title: 'No prayers in this list',
              description:
                'There are no prayers on the current page. Choose a <strong>status</strong> or <strong>approval</strong> filter, run a <strong>search</strong>, or create a prayer, then open this tour again.',
              side: 'bottom',
              align: 'center',
            },
          },
        ];

    const closingStep: DriveStep = {
      popover: {
        title: 'Tour complete',
        description:
          hasPrayerRow
            ? 'No changes were saved in this tour. When you <strong>Save</strong> edited prayer details or <strong>Save Update</strong> for real, you’ll be <strong>prompted to send an email to subscribers</strong> (broadcast)—you can confirm or skip.'
            : 'When prayers appear in the list, run this tour again.',
        side: 'bottom',
        align: 'center',
        nextBtnText: 'Done',
        onNextClick: (_e, _s, { driver: drv }) => {
          drv.destroy();
        },
      },
    };

    const steps: DriveStep[] = [...baseSteps, ...rowSteps, closingStep];
  return steps;
}
