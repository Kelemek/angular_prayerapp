import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from '../help-filter-tour-excerpt';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import type { MemorizeHelpSectionTourOptions, MemorizeHelpSectionTourHooks } from '../help-tour-hooks';

export function runMemorizeHelpSectionTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    options: MemorizeHelpSectionTourOptions,
    hooks: MemorizeHelpSectionTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getMemorizeFilterEl()) {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(section.title);
  const desc0 = formatHelpContentHtml(section.description);

  const step0: DriveStep = {
    element: () => dom.getMemorizeFilterEl()!,
    popover: {
      title: title0,
      description: `${desc0}<br><br>Tap <strong>Memorize</strong> to open your personal scripture list (or tap the tile yourself).`,
      side: 'bottom',
      align: 'start',
      nextBtnText: 'Show Memorize &rarr;',
      onNextClick: host.advanceAfterOrKill(hooks.switchToMemorize),
    },
  };

  const steps: DriveStep[] = [
    step0,
    {
      element: () => dom.getMemorizeActionBarEl()!,
      popover: {
        title: 'Add passages',
        description:
          'Use <strong>Add Verses</strong> to pick a Bible reference, or <strong>Bible Books</strong> to memorize the names of the books of the Bible in order. Your list is private to your account.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => dom.getMemorizeRecommendedEl()!,
      popover: {
        title: 'Recommended verses',
        description:
          'Tap <strong>Recommended</strong> for curated passages grouped by topic. Expand a category, then tap a verse to add it. Verses already on your list show <strong>Already added</strong>.',
        side: 'bottom',
        align: 'start',
      },
    },
  ];

  if (options.hasMemorizedItems) {
    const preferTable = options.listView === 'table';
    steps.push({
      element: () =>
        dom.getMemorizePassageListEl(preferTable ? 'table' : 'cards')!,
      popover: {
        title: preferTable
          ? dom.MEMORIZE_PASSAGE_TABLE_TITLE
          : dom.MEMORIZE_PASSAGE_CARDS_TITLE,
        description: preferTable
          ? dom.MEMORIZE_PASSAGE_TABLE_DESCRIPTION
          : dom.MEMORIZE_PASSAGE_CARDS_DESCRIPTION,
        side: 'top',
        align: 'start',
        onPopoverRender: (popover) => {
          dom.applyMemorizePassageListPopover(popover);
        },
      },
    });
  } else {
    steps.push({
      element: () => dom.getMemorizeEmptyStateEl()!,
      popover: {
        title: 'No passages yet',
        description:
          'When you add a verse, Bible books list, or Recommended passage, it appears here. Use the buttons above to get started.',
        side: 'top',
        align: 'start',
      },
    });
  }

  steps.push({
    popover: {
      title: 'Practice modes',
      description:
        'Each session offers modes such as <strong>Type</strong>, <strong>Word</strong>, <strong>Reorder</strong>, and <strong>First letters</strong>. When your church enables it, <strong>Recite mode (beta)</strong> records your voice and shows word-by-word accuracy. You can also <strong>Listen</strong> to ESV audio while you practice. In <strong>Settings → Memorization practice</strong>, choose <strong>Standard</strong> (auto-reveal after three wrong attempts) or <strong>Strict</strong> (no auto-reveal; finish each round with zero errors before <strong>Next round</strong>). Progress saves automatically.',
      side: 'bottom',
      align: 'center',
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
