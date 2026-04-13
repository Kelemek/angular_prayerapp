import { Injectable } from '@angular/core';
import { driver, type Driver, type DriveStep, type Config } from 'driver.js';
import { HelpDriverTourService } from './help-driver-tour.service';

export type AdminPrayerEditorCreateTourCallbacks = {
  /** Opens the Create New Prayer form (after the tour highlights the button). */
  openCreatePrayerForm: () => void;
};

/** Hooks for the Prayer Editor “manage” tour (opens edit + add-update UI, then cancels—no save). */
export type AdminPrayerEditorManageTourCallbacks = {
  openEditFormForTour: () => void;
  cancelEditForTour: () => void;
  openAddUpdateFormForTour: () => void;
  cancelAddUpdateForTour: () => void;
  /** If the user closes the tour early, exit edit / add-update so the UI is not left half-open. */
  resetTourUiState: () => void;
};

export type AdminEmailSubscribersTourCallbacks = {
  openAddForm: () => void;
  showPcSearchTab: () => void;
  /** Search Planning Center for “Mark Larson” and select a match when available (no add). May return a Promise. */
  runPlanningCenterSearchTourDemo?: () => void | Promise<void>;
  /** After results appear: select Mark (or first row) so Add Selected Subscriber is enabled. */
  selectTourPlanningCenterMatchFromDemoResults?: () => void;
  /** Tour only: run Add Selected Subscriber to show Manual Entry filled; does not save. */
  applyTourDemoPlanningCenterAdd?: () => void;
  /** After the Add Subscriber highlight: clear name/email so the user does not submit demo data by mistake. */
  clearEmailSubscribersTourDemoForm?: () => void;
};

/**
 * driver.js tours for the Admin Portal (distinct from main-app HelpDriverTourService).
 */
@Injectable({ providedIn: 'root' })
export class AdminHelpDriverTourService {
  private activeDriver: Driver | null = null;

  constructor(private helpDriverTour: HelpDriverTourService) {}

  destroy(): void {
    if (this.activeDriver) {
      this.activeDriver.destroy();
      this.activeDriver = null;
    }
  }

  /**
   * Walks Settings → Email → Email Subscribers → Add Subscriber → manual entry → PC tab → search →
   * first result row → Add Selected Subscriber → Manual Entry filled → Add Subscriber → closing popover.
   * Call after navigating to Admin Settings / Email and preparing {@link AdminEmailSubscribersTourCallbacks}.
   */
  startEmailSubscribersTour(callbacks: AdminEmailSubscribersTourCallbacks): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.destroy();
    this.helpDriverTour.interruptGuidedTours();

    const steps: DriveStep[] = [
      {
        popover: {
          title: 'Email subscribers tutorial',
          description:
            'This tour uses the real Admin Portal: <strong>Settings</strong> → <strong>Email</strong> → <strong>Email Subscribers</strong>, then <strong>Add Subscriber</strong>. You can add someone <strong>either</strong> by typing name and email manually <strong>or</strong> by searching Planning Center—both are covered here.',
          side: 'over',
          align: 'center',
        },
      },
      {
        element: '#admin-settings-tab-email',
        popover: {
          title: 'Email tab',
          description:
            'From <strong>Admin Settings</strong>, open the <strong>Email</strong> tab for subscribers, templates, and reminder options.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#email-subscribers-trigger',
        popover: {
          title: 'Email Subscribers',
          description:
            'Expand <strong>Email Subscribers</strong> to manage the list, search, import CSV, and add subscribers.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-email-add-subscriber-btn',
        popover: {
          title: 'Add Subscriber',
          description:
            'Click <strong>Add Subscriber</strong> to open the form. You’ll choose <strong>either</strong> <strong>Manual Entry</strong> (type name and email yourself) <strong>or</strong> <strong>Search Planning Center</strong> (look up someone already in your church database).',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Open form →',
          onNextClick: (_e, _s, { driver: drv }) => {
            callbacks.openAddForm();
            window.setTimeout(() => {
              drv.refresh();
              drv.moveNext();
            }, 300);
          },
        },
      },
      {
        element: '#tour-email-add-mode-tabs',
        popover: {
          title: 'Two ways to add someone',
          description:
            '<strong>Either</strong> use <strong>Manual Entry</strong> and type the person’s name and email yourself, <strong>or</strong> use <strong>Search Planning Center</strong> to find them by name in your church database (no typing email from scratch when they’re in Planning Center). Switch tabs anytime. Next, we show <strong>Manual Entry</strong> first.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-email-manual-entry-form',
        popover: {
          title: 'Manual entry',
          description:
            'This path is for when you already know the name and email. Enter <strong>Name</strong> and <strong>Email</strong>, then click <strong>Add Subscriber</strong> to save. After submit, you’ll be prompted to send a <strong>welcome email</strong>—they receive it when you confirm. Prefer not to type everything? Use <strong>Search Planning Center</strong> instead (next).',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Show Planning Center search →',
          onNextClick: (_e, _s, { driver: drv }) => {
            callbacks.showPcSearchTab();
            window.setTimeout(() => {
              drv.refresh();
              drv.moveNext();
            }, 300);
          },
        },
      },
      {
        element: '#tour-email-pc-search-tab',
        popover: {
          title: 'Search Planning Center',
          description:
            'This is the alternative to Manual Entry: find someone by name in Planning Center instead of typing their email yourself. <strong>Next</strong> runs a short demo search.',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Run demo search →',
          onNextClick: async (_e, _s, { driver: drv }) => {
            const pending = callbacks.runPlanningCenterSearchTourDemo?.();
            if (pending instanceof Promise) {
              await pending;
            }
            window.setTimeout(() => {
              drv.refresh();
              drv.moveNext();
            }, 200);
          },
        },
      },
      {
        element: '#pcSearchNameInput',
        popover: {
          title: 'Search by name',
          description:
            'Type at least two characters; Planning Center search runs after a short pause (or press Enter). The previous step already ran a demo search for <strong>Mark Larson</strong>. <strong>Next</strong> highlights the first result in the list.',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Show results →',
          onNextClick: (_e, _s, { driver: drv }) => {
            window.setTimeout(() => {
              drv.refresh();
              drv.moveNext();
            }, 200);
          },
        },
      },
      {
        element: '#tour-email-pc-search-result-mark',
        popover: {
          title: 'Search results',
          description:
            'Matches appear here—in this demo the first row is often <strong>Mark Larson</strong> when your Planning Center has that person. Click a row in real use; <strong>Next</strong> selects this row for the tour so you can use <strong>Add Selected Subscriber</strong>.',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Select for tour →',
          onNextClick: (_e, _s, { driver: drv }) => {
            callbacks.selectTourPlanningCenterMatchFromDemoResults?.();
            window.setTimeout(() => {
              drv.refresh();
              drv.moveNext();
            }, 250);
          },
        },
      },
      {
        element: '#tour-email-add-selected-pc-btn',
        popover: {
          title: 'Add Selected Subscriber',
          description:
            'After you’ve selected someone from the list, click <strong>Add Selected Subscriber</strong> to copy their name and email into the Manual Entry fields (you’ll switch tabs automatically). <strong>Next</strong> runs that step as a demo only—no subscriber is saved yet.',
          side: 'top',
          align: 'start',
          nextBtnText: 'Copy to Manual Entry (demo) →',
          onNextClick: (_e, _s, { driver: drv }) => {
            callbacks.applyTourDemoPlanningCenterAdd?.();
            window.setTimeout(() => {
              drv.refresh();
              drv.moveNext();
            }, 400);
          },
        },
      },
      {
        element: '#tour-email-manual-entry-form',
        popover: {
          title: 'Manual Entry (filled from Planning Center)',
          description:
            'Here are the <strong>Name</strong> and <strong>Email</strong> fields filled from Planning Center—same as if you had typed them yourself. The tour demo did <strong>not</strong> save a subscriber. <strong>Next</strong> shows the final <strong>Add Subscriber</strong> step.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-email-manual-add-subscriber-btn',
        popover: {
          title: 'Add Subscriber',
          description:
            'When you’re ready for real, <strong>Add Subscriber</strong> saves the person to the list. After submit, you’re prompted to send them a <strong>welcome email</strong>—they receive it when you confirm. This tour stays in preview: <strong>Next</strong> clears the demo name and email so you don’t submit them by mistake.',
          side: 'top',
          align: 'start',
          nextBtnText: 'Clear demo & continue →',
          onNextClick: (_e, _s, { driver: drv }) => {
            window.setTimeout(() => {
              drv.refresh();
              drv.moveNext();
              callbacks.clearEmailSubscribersTourDemoForm?.();
            }, 200);
          },
        },
      },
      {
        popover: {
          title: 'Tour demo complete',
          description:
            'This tour did <strong>not</strong> add anyone; the demo fields were cleared. Remember: add subscribers <strong>manually</strong> or via <strong>Planning Center</strong> search—whichever fits the situation. Close the add form if you like, or use <strong>Search subscribers</strong> on the list anytime to filter by name or email.',
          side: 'over',
          align: 'center',
          nextBtnText: 'Done',
          onNextClick: (_e, _s, { driver: drv }) => {
            drv.destroy();
          },
        },
      },
    ];

    const d = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
      onDestroyed: () => {
        this.activeDriver = null;
      },
    } as Config);
    this.activeDriver = d;
    d.drive(0);
  }

  /**
   * High-level walkthrough of Settings → Email → Email Subscribers: toolbar, search, and each column on a sample row.
   * Call after `prepareOverviewTourListState` so the search field contains **app-test** and matching rows load.
   * Does not open Add Subscriber or CSV upload—use {@link startEmailSubscribersTour} for the hands-on add flow.
   */
  startEmailSubscribersOverviewTour(): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.destroy();
    this.helpDriverTour.interruptGuidedTours();

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
          side: 'over',
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
          side: 'over',
          align: 'center',
          nextBtnText: 'Done',
          onNextClick: (_e, _s, { driver: drv }) => {
            drv.destroy();
          },
        },
      },
    ];

    const d = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
      onDestroyed: () => {
        this.activeDriver = null;
      },
    } as Config);
    this.activeDriver = d;
    d.drive(0);
  }

  /**
   * Admin Settings → Tools → Prayer Editor → Create New Prayer form fields → Create Prayer button.
   * Call after navigating to Tools and {@link AdminPrayerEditorCreateTourCallbacks} (expand Prayer Editor, form closed).
   */
  startPrayerEditorCreateTour(callbacks: AdminPrayerEditorCreateTourCallbacks): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.destroy();
    this.helpDriverTour.interruptGuidedTours();

    const steps: DriveStep[] = [
      {
        popover: {
          title: 'Prayer Editor — create a prayer',
          description:
            'This tour uses <strong>Admin Settings</strong> → <strong>Tools</strong> → <strong>Prayer Editor</strong>, then walks through the <strong>Create New Prayer</strong> form.',
          side: 'over',
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
          side: 'over',
          align: 'center',
          nextBtnText: 'Done',
          onNextClick: (_e, _s, { driver: drv }) => {
            drv.destroy();
          },
        },
      },
    ];

    const d = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
      onDestroyed: () => {
        this.activeDriver = null;
      },
    } as Config);
    this.activeDriver = d;
    d.drive(0);
  }

  /**
   * Admin Settings → Tools → Prayer Editor → first prayer: open edit (field walkthrough → cancel), open Add Update (field walkthrough → cancel). Does not save.
   * Pass `hasPrayerRow` from {@link PrayerSearchComponent.preparePrayerEditorManageTourInitialState}. Use `callbacks` to open/close UI; do not infer list presence from `document.querySelector` before paint.
   */
  startPrayerEditorManageTour(hasPrayerRow: boolean, callbacks: AdminPrayerEditorManageTourCallbacks): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.destroy();
    this.helpDriverTour.interruptGuidedTours();

    const tourUiDelayMs = 380;

    const baseSteps: DriveStep[] = [
      {
        popover: {
          title: 'Prayer Editor — edit & add update',
          description:
            'This tour uses the <strong>first prayer</strong> in your list. It will <strong>open</strong> the edit form and Add Update form, walk through the fields, then <strong>Cancel</strong> each—nothing is saved.',
          side: 'over',
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
              side: 'over',
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
        side: 'over',
        align: 'center',
        nextBtnText: 'Done',
        onNextClick: (_e, _s, { driver: drv }) => {
          drv.destroy();
        },
      },
    };

    const steps: DriveStep[] = [...baseSteps, ...rowSteps, closingStep];

    const d = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
      onDestroyed: () => {
        this.activeDriver = null;
        if (hasPrayerRow) {
          callbacks.resetTourUiState();
        }
      },
    } as Config);
    this.activeDriver = d;
    d.drive(0);
  }

  /**
   * Settings → Content → Prayer Prompts and Prayer Types: toolbar, search, lists (no add forms opened).
   * Call after navigating to Content and running `prepareTourInitialState` on both manager components.
   */
  startPrayerPromptsAndTypesTour(): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.destroy();
    this.helpDriverTour.interruptGuidedTours();

    const steps: DriveStep[] = [
      {
        popover: {
          title: 'Prayer Prompts & Prayer Types',
          description:
            'This tour walks the <strong>Content</strong> tab: <strong>Prayer Prompts</strong> (ideas people can use when posting) and <strong>Prayer Types</strong> (categories that prompts and filters use). It does <strong>not</strong> open add forms—just the layout and actions.',
          side: 'over',
          align: 'center',
        },
      },
      {
        element: '#admin-settings-tab-content',
        popover: {
          title: 'Content tab',
          description:
            'Open <strong>Content</strong> for prompts, types, branding, GitHub feedback, and related settings.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#prompt-manager-settings-trigger',
        popover: {
          title: 'Prayer Prompts',
          description:
            'Expand <strong>Prayer Prompts</strong> to manage the library of suggested prompts (shown in the app’s Prompts experience).',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prompt-manager-toolbar',
        popover: {
          title: 'Import and add prompts',
          description:
            '<strong>Upload CSV</strong> bulk-imports prompts with columns <strong>title</strong>, <strong>type</strong>, <strong>description</strong> (types must match your Prayer Types). <strong>Add Prompt</strong> creates a single prompt and picks a type from the list below.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prompt-manager-intro',
        popover: {
          title: 'How prompts load',
          description:
            'Prompts load when you open this section. The <strong>search</strong> box filters by title, type, or description after a short debounce.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prompt-manager-search',
        popover: {
          title: 'Search prompts',
          description:
            'Type a few characters to narrow the list; clear the field to show everything again after the debounce.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prompt-manager-list-area',
        popover: {
          title: 'Prompt list',
          description:
            'Each card shows title, <strong>type</strong> chip, description preview, and when it was added. Use <strong>Edit</strong> or <strong>Delete</strong> on a row. The footer shows how many prompts matched your filter.',
          side: 'top',
          align: 'start',
        },
      },
      {
        element: '#prayer-types-manager-trigger',
        popover: {
          title: 'Prayer Types',
          description:
            'Expand <strong>Prayer Types</strong> to define category names (for example Healing, Thanksgiving). Prompts reference these types; inactive types are hidden from dropdowns.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-types-toolbar',
        popover: {
          title: 'Add a type',
          description:
            '<strong>Add Type</strong> opens a form for name, display order, and <strong>Active</strong>—inactive types stay in the database but won’t appear when creating prompts.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-types-intro',
        popover: {
          title: 'Types and prompts',
          description:
            'Types drive the prompt <strong>type</strong> field and how content is organized. Reorder with drag handles, toggle active, edit, or remove a type.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-prayer-types-list-area',
        popover: {
          title: 'Types list',
          description:
            'While loading you’ll see a spinner; otherwise you get rows with drag-to-reorder, <strong>activate/deactivate</strong>, <strong>edit</strong>, and <strong>delete</strong>. The footer summarizes total and active counts.',
          side: 'top',
          align: 'start',
        },
      },
      {
        popover: {
          title: 'Done',
          description:
            'Edits here affect the main app after save. Use <strong>Prayer Editor</strong> help tours under Admin help if you need to walk creating or editing prayers.',
          side: 'over',
          align: 'center',
          nextBtnText: 'Done',
          onNextClick: (_e, _s, { driver: drv }) => {
            drv.destroy();
          },
        },
      },
    ];

    const d = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      steps,
      onDestroyed: () => {
        this.activeDriver = null;
      },
    } as Config);
    this.activeDriver = d;
    d.drive(0);
  }
}
