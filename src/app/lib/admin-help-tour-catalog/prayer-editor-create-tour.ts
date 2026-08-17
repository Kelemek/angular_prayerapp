import type { DriveStep } from 'driver.js';
import type { AdminPrayerEditorCreateTourCallbacks } from '../../types/admin-help-tour';

export function buildPrayerEditorCreateTourSteps(callbacks: AdminPrayerEditorCreateTourCallbacks): DriveStep[] {
    const steps: DriveStep[] = [
      {
        popover: {
          title: 'Prayer Editor — create a prayer',
          description:
            'This tour uses <strong>Admin Settings</strong> → <strong>Tools</strong> → <strong>Prayer Editor</strong>, then walks through the <strong>Create New Prayer</strong> form.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#admin-settings-tab-tools',
        popover: {
          title: 'Tools',
          description:
            'Open the <strong>Tools</strong> tab for the Prayer Editor, archive timeline, backups, and other operator utilities.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#prayer-editor-settings-trigger',
        popover: {
          title: 'Prayer Editor',
          description:
            'Expand <strong>Prayer Editor</strong> to search and manage prayers, and to <strong>Create New Prayer</strong> on behalf of someone (for example a walk-in or phone request).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-editor-create-btn',
        popover: {
          title: 'Create New Prayer',
          description:
            'Click here to open the creation form. <strong>Next</strong> opens the form for the rest of the tour.',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Open form →',
          onNextClick: (_e, _s, { driver: drv }) => {
            callbacks.openCreatePrayerForm();
            window.setTimeout(() => {
              drv.refresh();
              drv.moveNext();
            }, 350);
          },
        },
      },
      {
        element: '#tour-prayer-editor-field-find-subscriber',
        popover: {
          title: 'Find subscriber (optional)',
          description:
            'Search <strong>email subscribers</strong> by name or email to pre-fill first name, last name, and email. You can skip this and type those fields manually.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-editor-field-names',
        popover: {
          title: 'First & last name',
          description:
            'Who this prayer is <strong>from</strong> (the requester). Required for the prayer record.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-editor-field-email',
        popover: {
          title: 'Email',
          description:
            'Contact email for this request—used for notifications and matching subscribers when relevant.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-editor-field-praying-for',
        popover: {
          title: 'Praying For',
          description:
            'Short label for the need (for example <em>healing</em> or <em>job search</em>). The prayer <strong>title</strong> is generated as “Prayer for [this text]”.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-editor-field-description',
        popover: {
          title: 'Description',
          description:
            'The full prayer request text—what you want the community to know and pray about.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-editor-field-anonymous',
        popover: {
          title: 'Submit anonymously',
          description:
            'If checked, the requester’s name is <strong>not</strong> shown publicly on the prayer (details still follow your app rules).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-editor-field-status',
        popover: {
          title: 'Status',
          description:
            'Whether this prayer is <strong>Current</strong>, <strong>Answered</strong>, or <strong>Archived</strong>. New requests are usually <strong>Current</strong>.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-editor-create-submit',
        popover: {
          title: 'Create Prayer',
          description:
            'When you’re ready, <strong>Create Prayer</strong> saves the prayer as approved. After that, you’ll be <strong>prompted to send it to subscribers</strong> (broadcast)—you can confirm or skip.',
          side: 'top',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Tour complete',
          description:
            'You did not submit a prayer in this tour. Use <strong>Create New Prayer</strong> anytime from Tools when you need to add one for real.',
          side: 'bottom',
          align: 'center',
          nextBtnText: 'Done',
          onNextClick: (_e, _s, { driver: drv }) => {
            drv.destroy();
          },
        },
      },
    ];
  return steps;
}
