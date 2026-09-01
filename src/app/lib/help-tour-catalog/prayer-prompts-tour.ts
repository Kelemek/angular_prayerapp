import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from '../help-filter-tour-excerpt';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import type { PrayerPromptsTourOptions, PrayerPromptsTourHooks } from '../help-tour-hooks';

export function runPrayerPromptsTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    options: PrayerPromptsTourOptions,
    hooks: PrayerPromptsTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getPromptsFilterEl() || !dom.getPrayerModeButtonEl()) {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(section.title);
  const desc0 = formatHelpContentHtml(section.description);

  const step0: DriveStep = {
    element: () => dom.getPromptsFilterEl()!,
    popover: {
      title: title0,
      description: `${desc0}<br><br><strong>Prayer prompts</strong> are ideas to guide what you pray. The <strong>Prompts</strong> chip under <strong>Church</strong> shows a colored border when active; type chips appear in the row below. Tap <strong>Show prompts</strong> to open the prompts view (or tap the chip yourself).`,
      side: 'bottom',
      align: 'start',
      nextBtnText: 'Show prompts &rarr;',
      onNextClick: host.advanceAfterOrKill(hooks.switchToPrompts),
    },
  };

  const steps: DriveStep[] = [step0];

  if (options.hasPrompts) {
    steps.push(
      {
        element: () => dom.getPromptTypeFiltersEl()!,
        popover: {
          title: 'Filter by type',
          description:
            'Use <strong>All Types</strong> to see every prompt. Tap a <strong>type chip</strong> in this row to narrow the list (chips share each row when they fit and wrap when needed). On each card, the type badge also toggles that filter.',
          side: 'bottom',
          align: 'start',
          nextBtnText: 'Next &rarr;',
          onNextClick: host.advanceAfterOrKill(hooks.clearPromptTypes),
        },
      },
      {
        element: () => dom.getSamplePromptCardEl()!,
        popover: {
          title: 'Prompt cards',
          description:
            'Each card is a suggestion you can pray through. Unread prompts may show a badge you can clear.',
          side: 'top',
          align: 'start',
        },
      }
    );
  } else {
    steps.push({
      element: () => dom.getPromptEmptyStateEl()!,
      popover: {
        title: 'No prompts yet',
        description:
          'When your church adds prayer prompts, they will appear here. You can still use <strong>Pray</strong> mode and print prompts from <strong>Settings</strong> when they are available.',
        side: 'top',
        align: 'start',
      },
    });
  }

  steps.push({
    element: () => dom.getPrayerModeButtonEl()!,
    popover: {
      title: 'Prayer mode and print',
      description:
        'Tap <strong>Pray</strong> for a focused presentation-style view of prompts. To print prompts, open <strong>Settings</strong> and use <strong>Print Prompts</strong>.',
      side: 'bottom',
      align: 'end',
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
