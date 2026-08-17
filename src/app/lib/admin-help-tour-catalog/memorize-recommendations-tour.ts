import type { DriveStep } from 'driver.js';

export function buildMemorizeRecommendationsTourSteps(hasCategories: boolean): DriveStep[] {
    const categorySteps: DriveStep[] = hasCategories
      ? [
          {
            element: '#tour-memorize-rec-categories-list',
            popover: {
              title: 'Categories list',
              description:
                'Each row shows the category name and verse count. Drag the handle to reorder how categories appear in the app. Use <strong>Rename</strong> or <strong>Delete</strong> (only when empty). Click a category name to select it for adding verses—the selected row gets a blue ring.',
              side: 'bottom',
              align: 'start',
            },
          },
        ]
      : [
          {
            element: '#tour-memorize-rec-categories-toolbar',
            popover: {
              title: 'No categories yet',
              description:
                'Create at least one category with <strong>Add Category</strong> before you can add verses. Categories group verses in the main app’s <strong>Recommended</strong> modal.',
              side: 'bottom',
              align: 'start',
            },
          },
        ];

    const verseSteps: DriveStep[] = hasCategories
      ? [
          {
            element: '#tour-memorize-rec-verses-list',
            popover: {
              title: 'Verses by category',
              description:
                'Each section lists curated passages for that category. Drag verses to reorder within a category or drop them into another category’s list. Hover or long-press a reference to preview passage text. Use the trash icon to remove a recommendation.',
              side: 'top',
              align: 'start',
            },
          },
        ]
      : [];

    const steps: DriveStep[] = [
      {
        popover: {
          title: 'Memorize Recommendations',
          description:
            'This tour walks <strong>Admin Settings</strong> → <strong>Content</strong> → <strong>Memorize Recommendations</strong>: curated verses users see under <strong>Recommended</strong> on the Memorize tab. It does <strong>not</strong> open add forms—just the layout and actions.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#admin-settings-tab-content',
        popover: {
          title: 'Content tab',
          description:
            'Open <strong>Content</strong> for prompts, types, branding, and Memorize recommendations.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#memorization-recommendations-manager-trigger',
        popover: {
          title: 'Memorize Recommendations',
          description:
            'Expand this section to manage topic categories and the verses offered in the app’s <strong>Recommended</strong> picker.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-memorize-rec-intro',
        popover: {
          title: 'What this controls',
          description:
            'Every recommended verse must belong to a category. Users browse categories in accordions on the Memorize tab; admins curate both the categories and the verses here.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '#tour-memorize-rec-categories-toolbar',
        popover: {
          title: 'Add categories',
          description:
            '<strong>Add Category</strong> creates a new topic group (for example <em>Comfort</em> or <em>Salvation</em>). You need at least one category before adding verses.',
          side: 'bottom',
          align: 'start',
        },
      },
      ...categorySteps,
      {
        element: '#tour-memorize-rec-verses-toolbar',
        popover: {
          title: 'Add recommendations',
          description:
            'Select a category first (click its name in the list above), then use <strong>Add Recommendation</strong> to pick a Bible passage with the passage picker. Duplicates are rejected.',
          side: 'bottom',
          align: 'start',
        },
      },
      ...verseSteps,
      {
        popover: {
          title: 'Done',
          description:
            hasCategories
              ? 'Saved changes appear in the main app under Memorize → <strong>Recommended</strong>. Use the main app’s <strong>Help &amp; Guidance</strong> → <strong>Memorize Scripture</strong> tour if you want to see how subscribers experience recommendations.'
              : 'After you add categories and verses, run this tour again to walk the full lists.',
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
