import type { DriveStep, DriverHook } from 'driver.js';
import { formatHelpContentHtml } from '../help-content-html';
import { excerptForNamedFilter, isDescriptiveFilterTourExcerpt } from '../help-filter-tour-excerpt';
import {
  getCardActionsOverflowTriggerEl,
  openCardActionsOverflowMenu,
} from '../help-card-actions-menu-tour';
import * as dom from '../help-tour-dom';
import type { HelpTourDriverHost } from '../help-tour-driver-host';
import type { PresentationModePrayButtonPreludeHooks } from '../help-tour-hooks';

export function runPresentationModePrayButtonPreludeTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string },
    hooks: PresentationModePrayButtonPreludeHooks,
    opts?: { fullGuidedTourPrelude?: boolean }
): void {
if (typeof document === 'undefined') {
    return;
  }

  host.killActiveDriver();

  const title0 = dom.escapeHtml(section.title);
  const desc0 = formatHelpContentHtml(section.description);
  const pray = (): HTMLElement | null => dom.getPrayerModeButtonEl();

  const abortFullTourPrelude = (): void => {
    host.clearFullGuidedTourNavigationState();
    host.clearFullGuidedTourProgress();
  };

  const preludeCloseClick: DriverHook | undefined = opts?.fullGuidedTourPrelude
    ? (_element, _step, opts2) => {
        abortFullTourPrelude();
        opts2.driver.destroy();
      }
    : undefined;

  const step: DriveStep = pray()
    ? {
        element: () => pray()!,
        popover: {
          title: title0,
          description: `${desc0 ? `${desc0}<br><br>` : ''}Tap the <strong>Pray</strong> button in the header (highlighted) anytime to open <strong>presentation mode</strong> for a group or shared screen. Tap <strong>Next</strong> and we’ll open it for you to continue the guided tour.`,
          side: 'bottom',
          align: 'center',
          onNextClick: (_e, _s) => {
            hooks.continueToPresentation();
            hooks.markForCheck();
            host.killActiveDriver();
          },
          ...(preludeCloseClick ? { onCloseClick: preludeCloseClick } : {}),
        },
      }
    : {
        popover: {
          title: title0,
          description: `${desc0 ? `${desc0}<br><br>` : ''}Use the <strong>Pray</strong> button in the header to open <strong>presentation mode</strong>. Tap <strong>Next</strong> to open it now and continue the tour.`,
          side: 'bottom',
          align: 'center',
          onNextClick: (_e, _s) => {
            hooks.continueToPresentation();
            hooks.markForCheck();
            host.killActiveDriver();
          },
          ...(preludeCloseClick ? { onCloseClick: preludeCloseClick } : {}),
        },
      };

  const d = host.startTourDriver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    smoothScroll: true,
    allowClose: true,
    popoverClass: 'help-driver-popover',
    steps: [step],
    ...(opts?.fullGuidedTourPrelude
      ? {
          onDestroyStarted: (_element, _step, opts2) => {
            abortFullTourPrelude();
            opts2.driver.destroy();
          },
        }
      : {}),
  });

  d.drive(0);
}
