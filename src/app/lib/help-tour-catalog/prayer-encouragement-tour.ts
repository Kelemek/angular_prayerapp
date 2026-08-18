import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from '../help-filter-tour-excerpt';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import type { PrayerEncouragementTourOptions, PrayerEncouragementTourHooks } from '../help-tour-hooks';

export function runPrayerEncouragementTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    options: PrayerEncouragementTourOptions,
    hooks: PrayerEncouragementTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getPublicFilterEl()) {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(section.title);
  const desc0 = formatHelpContentHtml(section.description);

  const steps: DriveStep[] = [
    {
      element: () => dom.getPublicFilterEl()!,
      popover: {
        title: title0,
        description: `${desc0}<br><br>Community prayer requests live under the <strong>Public</strong> tab—use the <strong>Current</strong>, <strong>Answered</strong>, or <strong>Total</strong> chips below it (not Personal or member-list views). Tap <strong>Show current</strong> to jump to active requests.`,
        side: 'bottom',
        align: 'start',
        nextBtnText: 'Show current &rarr;',
        onNextClick: host.advanceAfterOrKill(hooks.switchToCurrent),
      },
    },
  ];

  if (options.hasCommunityPrayer) {
    steps.push({
      element: () => dom.getPrayerEncouragementPrayForButtonEl()!,
      popover: {
        title: 'Pray For',
        description:
          'Tap <strong>Pray For</strong> to record that you prayed; the requester only sees a total count, not who tapped. If you already prayed recently, you may see <strong>Prayed For</strong> until the cooldown ends. The next step summarizes settings and privacy.',
        side: 'top',
        align: 'start',
      },
    });
  }

  steps.push({
    popover: {
      title: 'What is Pray For?',
      description:
        'When Prayer Encouragement is enabled, <strong>Pray For</strong> lets you record that you prayed for a community, personal, Planning Center member, or prayer prompt (and on presentation slides). On community and member cards viewers only see a <strong>total count</strong>—your tap is anonymous. On personal and prompt cards you track your own <strong>{n} Prayers</strong> count. Members still appear only if you have a Planning Center list applied.<br><br>You can turn the button or the praying count off for yourself in <strong>Settings</strong> under prayer encouragement on cards. After you tap Pray For, a <strong>cooldown</strong> applies before you can tap again for the same request (personal / member / prompt cooldown in Settings; community uses the church-wide setting).',
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
