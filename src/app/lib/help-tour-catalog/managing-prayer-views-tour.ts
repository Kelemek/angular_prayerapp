import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from '../help-filter-tour-excerpt';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpContent } from '../../types/help-content';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import type { ManagingPrayerViewsTourHooks } from '../help-tour-hooks';

export function runManagingPrayerViewsTour(
  host: HelpTourDriverHost,
  helpContent: HelpContent, hooks: ManagingPrayerViewsTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getPersonalFilterEl() || !dom.getPublicFilterEl()) {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(helpContent.subtitle);
  const body0 = formatHelpContentHtml(helpContent.text);

  const steps: DriveStep[] = [
    {
      element: () => dom.getPersonalFilterEl()!,
      popover: {
        title: title0,
        description: `${body0}<br><br>The <strong>Personal</strong> tab is for prayers only you can see (highlighted when active). Sub-chips for <strong>Current</strong>, <strong>Answered</strong>, and <strong>Total</strong> appear below when it is selected. Tap <strong>Show Public</strong> next to switch to the shared community list.`,
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Show Public &rarr;',
        onNextClick: host.advanceAfterOrKill(hooks.switchToCurrent),
      },
    },
    {
      element: () => dom.getCurrentFilterEl()!,
      popover: {
        title: 'Current (community)',
        description:
          '<strong>Current</strong> shows active prayer requests shared with your church. Next: <strong>Answered</strong> prayers.',
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Show Answered &rarr;',
        onNextClick: host.advanceAfterOrKill(hooks.switchToAnswered),
      },
    },
    {
      element: () => dom.getAnsweredFilterEl()!,
      popover: {
        title: 'Answered (community)',
        description:
          '<strong>Answered</strong> lists prayers marked as answered. Next: <strong>Archived</strong> prayers.',
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Show Archived &rarr;',
        onNextClick: host.advanceAfterOrKill(hooks.switchToArchived),
      },
    },
    {
      element: () => dom.getArchivedFilterEl()!,
      popover: {
        title: 'Archived (community)',
        description:
          '<strong>Archived</strong> shows only archived community prayers. Tap <strong>Show Total</strong> to see every community prayer in one place.',
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Show Total &rarr;',
        onNextClick: host.advanceAfterOrKill(hooks.switchToTotal),
      },
    },
    {
      element: () => dom.getTotalFilterEl()!,
      popover: {
        title: 'Total (community)',
        description:
          '<strong>Total</strong> includes all community prayers—current, answered, and archived. Tap <strong>Personal</strong> anytime to return to your private list.',
        side: 'bottom',
        align: 'start',
        onNextClick: host.popoverNextKillsTour(),
      },
    },
  ];

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
