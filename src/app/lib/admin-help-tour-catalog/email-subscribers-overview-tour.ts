import type { DriveStep } from 'driver.js';

export function buildEmailSubscribersOverviewTourSteps(): DriveStep[] {
    const hasColumnAnchors =
      typeof document !== 'undefined' && !!document.querySelector('#tour-email-overview-name');

    const columnSteps: DriveStep[] = hasColumnAnchors
      ? [
          {
            element: '#tour-email-overview-name',
            popover: {
              title: 'Name',
              description:
                'Display name for this person—used in the app and in mass emails. You can change it with <strong>Edit</strong> (email itself stays fixed).',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-email-overview-email',
            popover: {
              title: 'Email',
              description:
                'Address used for sign-in and as the key for this subscriber row. It is not editable here; add a new subscriber if someone needs a different address.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-email-overview-added',
            popover: {
              title: 'Added',
              description:
                'When this subscriber record was created in the list (sortable with the column header on wide screens).',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-email-overview-activity',
            popover: {
              title: 'Activity',
              description:
                'Last time they used the site or app. <strong>No activity</strong> means they have not opened the portal yet.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-email-overview-email-toggle',
            popover: {
              title: 'Email (mass notifications)',
              description:
                'Turns <strong>bulk</strong> email on or off (new prayers, updates, reminders, broadcasts). One-off emails such as approvals may still send when required.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-email-overview-push',
            popover: {
              title: 'Push',
              description:
                'Mobile push notifications for the native app when a device is registered. Independent of the email toggle above.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-email-overview-pc',
            popover: {
              title: 'PC (Planning Center)',
              description:
                'Whether this email is verified against your Planning Center people data (import and add flows can set or refresh this).',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-email-overview-block',
            popover: {
              title: 'Block',
              description:
                'When on, this person cannot log in to the site. Use for abuse or revoked access; they can still be removed from the list with <strong>Delete</strong>.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-email-overview-edit',
            popover: {
              title: 'Edit',
              description:
                'Opens a dialog to change <strong>display name</strong> only. Email is shown read-only in that dialog.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '#tour-email-overview-delete',
            popover: {
              title: 'Delete',
              description:
                'Removes this subscriber from the email list. Admins may remain able to sign in; wording in the confirmation explains the effect for admin accounts.',
              side: 'bottom',
              align: 'start',
            },
          },
        ]
      : [
          {
            element: '#tour-email-subscribers-list-area',
            popover: {
              title: 'No sample row for this tour',
              description:
                'The tour searched for <strong>app-test</strong> to load a demo row (for example <strong>App-Test Account</strong>). No matching subscribers were found—try that search yourself after the tour, or add a subscriber, then run this help topic again.',
              side: 'top',
              align: 'start',
            },
          },
        ];

    const paginationSteps: DriveStep[] =
      hasColumnAnchors && document.querySelector('#tour-email-subscribers-pagination')
        ? [
            {
              element: '#tour-email-subscribers-pagination',
              popover: {
                title: 'Pagination & counts',
                description:
                  'See how many subscribers matched the search, how many are active, change <strong>items per page</strong>, and move between pages when the list is long.',
                side: 'top',
                align: 'start',
              },
            },
          ]
        : [];

    const steps: DriveStep[] = [
      {
        popover: {
          title: 'Email Subscribers — overview',
          description:
            'This tour walks the subscriber list: toolbar, search (pre-filled with <strong>app-test</strong> for a sample row), then each column. It does <strong>not</strong> open <strong>Add Subscriber</strong>—use <strong>Email subscribers &amp; Planning Center</strong> for that.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#admin-settings-tab-email',
        popover: {
          title: 'Email tab',
          description:
            'From <strong>Admin Settings</strong>, open the <strong>Email</strong> tab for templates, reminders, and subscribers.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#email-subscribers-trigger',
        popover: {
          title: 'Email Subscribers section',
          description:
            'Expand <strong>Email Subscribers</strong> to see the toolbar, search, and the list of people who can receive email or app notifications.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-email-subscribers-toolbar',
        popover: {
          title: 'Import and add',
          description:
            '<strong>Upload CSV</strong> opens a bulk import flow (name and email per row) with optional Planning Center checks during import. <strong>Add Subscriber</strong> opens a form where you can enter someone manually or search Planning Center—we skip that step here; use the other help tour when you are ready to walk through it.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-email-subscribers-search',
        popover: {
          title: 'Search subscribers',
          description:
            'The tour filled in <strong>app-test</strong> so the list below shows a matching account when one exists (for example <strong>App-Test Account</strong>). In daily use, type any part of a name or email—after a short pause the list updates. Clear the field to reload everyone.',
          side: 'bottom',
          align: 'start',
        },
      },
      ...columnSteps,
      ...paginationSteps,
      {
        popover: {
          title: 'Next steps',
          description:
            'For a guided tour that opens <strong>Add Subscriber</strong> and walks Planning Center search, open <strong>Admin help</strong> again and start <strong>Email subscribers &amp; Planning Center</strong>.',
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
