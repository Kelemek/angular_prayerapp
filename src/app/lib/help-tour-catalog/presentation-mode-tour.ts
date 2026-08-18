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
import { TOUR_PRESENTATION_SETTINGS_MODAL_ID, TOUR_PRESENTATION_SETTING_DURATION_ID, TOUR_PRESENTATION_SETTING_SMART_INFO_ID, TOUR_PRESENTATION_SETTING_SMART_ID, TOUR_PRESENTATION_PREV_ID, TOUR_PRESENTATION_PLAY_ID, TOUR_PRESENTATION_NEXT_ID, TOUR_PRESENTATION_SETTINGS_BTN_ID, TOUR_PRESENTATION_SETTING_THEME_ID, TOUR_PRESENTATION_SETTING_CONTENT_TYPE_ID, TOUR_PRESENTATION_SETTING_RANDOMIZE_ID, TOUR_PRESENTATION_SETTING_TIME_FILTER_ID, TOUR_PRESENTATION_SETTING_STATUS_ID, TOUR_PRESENTATION_SETTING_TIMER_ID, TOUR_PRESENTATION_EXIT_ID } from '../help-tour-ids';
import type { PresentationModeTourHooks } from '../help-tour-hooks';

export function runPresentationModeTour(
  host: HelpTourDriverHost,
  section: { title: string; description: string }, hooks: PresentationModeTourHooks
): void {
if (typeof document === 'undefined') {
    return;
  }

  if (!dom.getPresentationToolbarEl()) {
    return;
  }

  host.killActiveDriver();

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

  const bar = (): HTMLElement => dom.getPresentationToolbarEl()!;
  const modalOrBar = (): HTMLElement =>
    document.getElementById(TOUR_PRESENTATION_SETTINGS_MODAL_ID) ?? dom.getPresentationToolbarEl()!;

  const timingEl = (): HTMLElement =>
    document.getElementById(TOUR_PRESENTATION_SETTING_DURATION_ID) ??
    document.getElementById(TOUR_PRESENTATION_SETTING_SMART_INFO_ID) ??
    document.getElementById(TOUR_PRESENTATION_SETTING_SMART_ID) ??
    modalOrBar();

  const steps: DriveStep[] = [
    {
      element: () => bar(),
      popover: {
        title: 'Presentation toolbar',
        description:
          `${desc0 ? `${desc0}<br><br>` : ''}You’re in <strong>presentation mode</strong>. The toolbar is fixed at the bottom (on desktop, move the pointer to the lower edge to show it, or <strong>double-tap</strong> on touch). Left: navigation and play. Right: <strong>Settings</strong> and <strong>Exit</strong>. This tour walks each control and the settings panel.`,
        side: 'top',
        align: 'center',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_PREV_ID) ?? bar(),
      popover: {
        title: 'Previous',
        description: 'Go to the previous prayer, prompt, or slide. Same as swiping <strong>right</strong> on touch or the <strong>←</strong> arrow key.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_PLAY_ID) ?? bar(),
      popover: {
        title: 'Play / Pause',
        description:
          'Starts automatic advance. While playing, a <strong>countdown</strong> shows time left on the current slide. You can also press <strong>P</strong> to toggle play.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_NEXT_ID) ?? bar(),
      popover: {
        title: 'Next',
        description: 'Advance manually. Same as swiping <strong>left</strong>, <strong>→</strong>, or <strong>Space</strong>.',
        side: 'top',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'Touch & keyboard',
        description:
          '<strong>Swipe</strong> left/right to change slides. <strong>Escape</strong> exits presentation mode. On desktop without touch, use the toolbar or arrow keys as above.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_SETTINGS_BTN_ID) ?? bar(),
      popover: {
        title: 'Settings',
        description: 'Tap <strong>Next</strong> to open the settings panel and walk through options.',
        side: 'top',
        align: 'end',
        onNextClick: advance(() => hooks.openSettings(), 380),
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_SETTINGS_MODAL_ID) ?? bar(),
      popover: {
        title: 'Presentation settings',
        description:
          'Choose how content looks, how long each slide stays, what to include, and optional <strong>Prayer Timer</strong> blocks for focused prayer.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_SETTING_THEME_ID) ?? modalOrBar(),
      popover: {
        title: 'Theme',
        description: '<strong>Light</strong>, <strong>Dark</strong>, or follow the <strong>System</strong> appearance.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_SETTING_SMART_ID) ?? modalOrBar(),
      popover: {
        title: 'Smart Mode & timing',
        description:
          '<strong>Smart Mode</strong> adjusts display time from how much text is on each slide. Turn it off to set a fixed <strong>5–60 second</strong> interval with quick <strong>10s / 20s / 30s</strong> buttons.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => timingEl(),
      popover: {
        title: 'Reading time',
        description:
          'With Smart Mode on, see how timing is estimated. With it off, use the <strong>slider</strong> and presets for auto-advance.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_SETTING_CONTENT_TYPE_ID) ?? modalOrBar(),
      popover: {
        title: 'Content type',
        description:
          'Show <strong>Prayers</strong>, <strong>Prompts</strong>, <strong>Personal</strong>, <strong>Members</strong> (when your church maps a list), or <strong>All</strong> combined.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_SETTING_RANDOMIZE_ID) ?? modalOrBar(),
      popover: {
        title: 'Randomize order',
        description: 'Shuffle the sequence for variety in group settings.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_SETTING_TIME_FILTER_ID) ?? modalOrBar(),
      popover: {
        title: 'Time period',
        description:
          'For <strong>Prayers</strong> and <strong>Personal</strong>, limit how far back to pull requests (week through all time). Hidden for prompts-only content.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_SETTING_STATUS_ID) ?? modalOrBar(),
      popover: {
        title: 'Prayer status',
        description:
          'Include <strong>Current</strong>, <strong>Answered</strong>, and/or <strong>Archived</strong> community prayers—or all statuses. Open the dropdown to combine filters.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_SETTING_TIMER_ID) ?? modalOrBar(),
      popover: {
        title: 'Prayer timer',
        description:
          'Separate from slide auto-advance: set <strong>minutes</strong> for a focused prayer block, then <strong>Start Prayer Timer</strong>. You’ll get a full-screen notice when time is up.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      popover: {
        title: 'Close settings',
        description:
          'Use the <strong>X</strong> in the header to close, or tap <strong>Next</strong> here and we’ll close the panel for you.',
        side: 'bottom',
        align: 'center',
        onNextClick: advance(() => hooks.closeSettings(), 280),
      },
    },
    {
      element: () => document.getElementById(TOUR_PRESENTATION_EXIT_ID) ?? bar(),
      popover: {
        title: 'Exit presentation',
        description:
          'Tap <strong>Next</strong> to leave presentation mode and return home (same as this button or <strong>Escape</strong>).',
        side: 'top',
        align: 'end',
        onNextClick: (_e, _s) => {
          hooks.persistFullGuidedTourQueue?.();
          hooks.exitPresentation();
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
    onDestroyed: (_element, _step, opts) => {
      const stepsArr = opts.config.steps ?? [];
      const idx = opts.state.activeIndex;
      const onLast =
        stepsArr.length > 0 && typeof idx === 'number' && idx === stepsArr.length - 1;
      const prog = host.getLastDriverDestroyWasProgrammatic();
      if (!onLast && !prog) {
        hooks.onFullGuidedTourInterrupted?.();
      }
    },
  });

  d.drive(0);
}
