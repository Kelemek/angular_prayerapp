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
import { TOUR_SETTINGS_FEEDBACK_SECTION_ID, TOUR_SETTINGS_FEEDBACK_TYPE_ID, TOUR_SETTINGS_FEEDBACK_DETAILS_ID } from '../help-tour-ids';
import type { FeedbackHelpTourHooks } from '../help-tour-hooks';
import { environment } from '../../../environments/environment';

export function runFeedbackHelpSectionTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    hooks: FeedbackHelpTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getSettingsHeaderButtonEl()) {
    return;
  }

  if (!environment.inAppFeedbackEnabled) {
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
  const feedbackCard = (): HTMLElement =>
    document.getElementById(TOUR_SETTINGS_FEEDBACK_SECTION_ID) ?? gear();
  const typeRow = (): HTMLElement =>
    document.getElementById(TOUR_SETTINGS_FEEDBACK_TYPE_ID) ?? feedbackCard();
  const detailsBlock = (): HTMLElement =>
    document.getElementById(TOUR_SETTINGS_FEEDBACK_DETAILS_ID) ?? feedbackCard();

  const steps: DriveStep[] = [
    {
      element: () => gear(),
      popover: {
        title: title0,
        description: `${desc0}<br><br><strong>Feedback</strong> is sent from <strong>Settings</strong>. Tap <strong>Next</strong> to open them.`,
        side: 'bottom',
        align: 'center',
        onNextClick: advance(() => hooks.openSettings(), 420),
      },
    },
    {
      element: () => feedbackCard(),
      popover: {
        title: 'Send Feedback',
        description: formatHelpContentHtml(
          'Use **Suggestion**, **Feature request**, or **Bug report** to tell the team what you need. Submissions go to the church’s feedback tracker.'
        ),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => typeRow(),
      popover: {
        title: 'Feedback type',
        description: formatHelpContentHtml(
          'Choose **Suggestion** for improvements, **Feature request** for new ideas, or **Bug report** if something broke.'
        ),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => detailsBlock(),
      popover: {
        title: 'Title & description',
        description: `${formatHelpContentHtml(
          'Give a clear **title** and enough **description** that the team can act on it.'
        )} When the fields look good, tap <strong>Send Feedback</strong>.`,
        side: 'top',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'Tips',
        description:
          'Your feedback is sent to the <strong>development team</strong> and will be <strong>reviewed</strong>. You’ll see a confirmation or error message under the form after sending.',
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
