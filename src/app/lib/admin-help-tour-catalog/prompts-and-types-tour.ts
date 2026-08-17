import type { DriveStep } from 'driver.js';

export function buildPrayerPromptsAndTypesTourSteps(): DriveStep[] {
    const steps: DriveStep[] = [
      {
        popover: {
          title: 'Prayer Prompts & Prayer Types',
          description:
            'This tour walks the <strong>Content</strong> tab: <strong>Prayer Prompts</strong> (ideas people can use when posting) and <strong>Prayer Types</strong> (categories that prompts and filters use). It does <strong>not</strong> open add forms—just the layout and actions.',
          side: 'bottom',
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
