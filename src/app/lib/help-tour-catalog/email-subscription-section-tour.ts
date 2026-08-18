import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from '../help-filter-tour-excerpt';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpContent, HelpSection } from '../../types/help-content';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import { TOUR_SETTINGS_EMAIL_SUBSCRIPTION_ID } from '../help-tour-ids';
import type { EmailSubscriptionHelpTourHooks } from '../help-tour-hooks';

export function runEmailSubscriptionHelpSectionTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    hooks: EmailSubscriptionHelpTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getSettingsHeaderButtonEl()) {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(section.title);
  const desc0 = formatHelpContentHtml(section.description);

  const advance = (fn: () => void, delayMs: number): DriverHook => {
    return (_element, _step, { driver: drv }) => {
      fn();
      window.setTimeout(() => {
        hooks.markForCheck();
        drv.refresh();
        drv.moveNext();
      }, delayMs);
    };
  };

  const gear = (): HTMLElement => dom.getSettingsHeaderButtonEl()!;
  const emailBlock = (): HTMLElement =>
    document.getElementById(TOUR_SETTINGS_EMAIL_SUBSCRIPTION_ID) ?? gear();

  const steps: DriveStep[] = [
    {
      element: () => gear(),
      popover: {
        title: title0,
        description: `${desc0}<br><br>Use the <strong>Settings</strong> gear in the header to manage email notifications. Tap <strong>Next</strong> to open Settings.`,
        side: 'bottom',
        align: 'center',
        onNextClick: advance(() => hooks.openSettings(), 420),
      },
    },
    {
      element: () => emailBlock(),
      popover: {
        title: 'Email subscription',
        description:
          'Choose <strong>Enabled</strong> or <strong>Disabled</strong> for <strong>mass email</strong> about new prayers and updates from your community. Turn it <strong>off</strong> to stop those blasts while still using the app. Changes save automatically.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'What stays separate',
        description:
          '<strong>Push notifications</strong> are a separate <strong>Enabled</strong> / <strong>Disabled</strong> control below (when available). Some <strong>direct</strong> emails—such as when a prayer you submitted is approved or needs attention—may still be sent when the app must reach you about your own content.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      popover: {
        title: 'Done',
        description: 'Tap <strong>Next</strong> to close Settings.',
        side: 'bottom',
        align: 'center',
        onNextClick: (_e, _s) => {
          hooks.closeSettings();
          hooks.markForCheck();
          host.killActiveDriver();
        },
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
