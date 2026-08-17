import type { DriveStep } from 'driver.js';
import type { AdminEmailSubscribersTourCallbacks } from '../../types/admin-help-tour';

export function buildEmailSubscribersTourSteps(callbacks: AdminEmailSubscribersTourCallbacks): DriveStep[] {
    const steps: DriveStep[] = [
      {
        popover: {
          title: 'Email subscribers tutorial',
          description:
            'This tour uses the real Admin Portal: <strong>Settings</strong> → <strong>Email</strong> → <strong>Email Subscribers</strong>, then <strong>Add Subscriber</strong>. You can add someone <strong>either</strong> by typing name and email manually <strong>or</strong> by searching Planning Center—both are covered here.',
          side: 'bottom',
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
