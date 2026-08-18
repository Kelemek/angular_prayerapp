import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { driver, type Driver, type DriverHook, type Config } from 'driver.js';
import type { HelpContent, HelpSection } from '../types/help-content';
import type { HelpTourDriverHost } from '../lib/help-tour-driver-host';
import {
  FULL_GUIDED_TOUR_QUEUE_KEY,
  FULL_GUIDED_TOUR_CLOSING_SENTINEL,
  PRESENTATION_HELP_TOUR_SESSION_KEY,
  parseFullGuidedTourQueue,
  type FullGuidedTourProgress,
  type ParsedFullGuidedTourQueue,
  type PresentationHelpTourSessionPayload,
} from '../lib/help-tour-ids';
import type {
  AppSettingsHelpTourHooks,
  CreatingPrayersHelpSectionTourHooks,
  EmailSubscriptionHelpTourHooks,
  FeedbackHelpTourHooks,
  FilteringHelpSectionTourHooks,
  ManagingPrayerViewsTourHooks,
  MemorizeHelpSectionTourHooks,
  MemorizeHelpSectionTourOptions,
  NewPrayerRequestTourHooks,
  PersonalPrayerTourHooks,
  PersonalPrayersHelpSectionTourHooks,
  PrayerEncouragementTourHooks,
  PrayerEncouragementTourOptions,
  PrayerPromptsTourHooks,
  PrayerPromptsTourOptions,
  PrayerRemindersHelpTourHooks,
  PrayerRemindersHelpTourOptions,
  PresentationModePrayButtonPreludeHooks,
  PresentationModeTourHooks,
  PrintingHelpTourHooks,
  UpdatingPrayerTourOptions,
} from '../lib/help-tour-hooks';
import {
  runAppSettingsHelpSectionTour,
  runCreatingPrayersHelpSectionTour,
  runEmailSubscriptionHelpSectionTour,
  runFeedbackHelpSectionTour,
  runFilteringHelpSectionTour,
  runManagingPrayerViewsTour,
  runMemorizeHelpSectionTour,
  runNewPrayerRequestTour,
  runPersonalPrayerTour,
  runPersonalPrayersHelpSectionTour,
  runPrayerEncouragementTour,
  runPrayerPromptsTour,
  runPrayerRemindersHelpSectionTour,
  runPresentationModePrayButtonPreludeTour,
  runPresentationModeTour,
  runPrintingHelpSectionTour,
  runSearchPrayersTour,
  runUpdatingPrayerTour,
} from '../lib/help-tour-catalog';

export {
  parseFullGuidedTourQueue,
  FULL_GUIDED_TOUR_QUEUE_KEY,
  FULL_GUIDED_TOUR_CLOSING_SENTINEL,
  PRESENTATION_HELP_TOUR_SESSION_KEY,
  type FullGuidedTourProgress,
  type ParsedFullGuidedTourQueue,
  type PresentationHelpTourSessionPayload,
} from '../lib/help-tour-ids';
export * from '../lib/help-tour-ids';
export type * from '../lib/help-tour-hooks';

@Injectable({
  providedIn: 'root',
})
export class HelpDriverTourService {
  private activeDriver: Driver | null = null;
  /** Fired once when the active driver is destroyed (finished, closed, or `destroy()`). */
  private tourFinishedCallback: (() => void) | null = null;
  /** Drives how `tourFinishedCallback` runs when the **full guided tour** advances between sections. */
  private tourChainMode: 'off' | 'sectionAdvance' | 'welcome' = 'off';
  /** Set only when ending the driver via `killActiveDriver()` (tour code), not × / overlay / escape. */
  private lastDriverDestroyWasProgrammatic = false;
  /** User closed the overlay or popover close control during a chained section tour. */
  private tourAbortedFullChainByUser = false;

  private readonly fullGuidedTourProgressSubject = new BehaviorSubject<FullGuidedTourProgress | null>(null);
  /** Emits while **Full guided tour** is active (`null` when hidden). */
  readonly fullGuidedTourProgress$ = this.fullGuidedTourProgressSubject.asObservable();

  private createTourHost(): HelpTourDriverHost {
    return {
      killActiveDriver: () => this.killActiveDriver(),
      advanceAfterOrKill: (fn, delayMs) => this.advanceAfterOrKill(fn, delayMs),
      popoverNextKillsTour: () => this.popoverNextKillsTour(),
      startTourDriver: (config) => this.startTourDriver(config),
      clearFullGuidedTourNavigationState: () => this.clearFullGuidedTourNavigationState(),
      clearFullGuidedTourProgress: () => this.clearFullGuidedTourProgress(),
      getLastDriverDestroyWasProgrammatic: () => this.lastDriverDestroyWasProgrammatic,
    };
  }

  setFullGuidedTourProgress(current: number, total: number): void {
    if (total < 1) {
      this.clearFullGuidedTourProgress();
      return;
    }
    const c = Math.max(0, Math.min(current, total - 1));
    this.fullGuidedTourProgressSubject.next({ current: c, total });
  }

  clearFullGuidedTourProgress(): void {
    this.fullGuidedTourProgressSubject.next(null);
  }

  clearFullGuidedTourNavigationState(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    try {
      sessionStorage.removeItem(FULL_GUIDED_TOUR_QUEUE_KEY);
      const raw = sessionStorage.getItem(PRESENTATION_HELP_TOUR_SESSION_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { fullGuidedTourFromFullChain?: boolean };
        if (p?.fullGuidedTourFromFullChain === true) {
          sessionStorage.removeItem(PRESENTATION_HELP_TOUR_SESSION_KEY);
        }
      }
    } catch {
      /* ignore */
    }
  }

  interruptGuidedTours(): void {
    this.clearFullGuidedTourNavigationState();
    this.clearFullGuidedTourProgress();
    this.destroy();
  }

  queueTourFinishedCallback(fn: (() => void) | null): void {
    this.tourFinishedCallback = fn;
    this.tourChainMode = fn ? 'sectionAdvance' : 'off';
  }

  private killActiveDriver(): void {
    if (this.activeDriver) {
      this.lastDriverDestroyWasProgrammatic = true;
      this.activeDriver.destroy();
      this.activeDriver = null;
    }
  }

  private advanceAfterOrKill(fn: () => void, delayMs = 200): DriverHook {
    return (_element, _step, { driver: drv }) => {
      fn();
      window.setTimeout(() => {
        drv.refresh();
        const cfg = typeof drv.getConfig === 'function' ? drv.getConfig() : undefined;
        const len = cfg?.steps?.length ?? 0;
        const i =
          typeof drv.getActiveIndex === 'function' ? (drv.getActiveIndex() ?? 0) : 0;
        if (len > 0 && i >= len - 1) {
          this.killActiveDriver();
        } else {
          drv.moveNext();
        }
      }, delayMs);
    };
  }

  private popoverNextKillsTour(): DriverHook {
    return () => {
      this.killActiveDriver();
    };
  }

  private startTourDriver(config: Config): Driver {
    const userOnDestroyed = config.onDestroyed;
    const userOnCloseClick = config.onCloseClick;
    const userOverlay = config.overlayClickBehavior;
    const chainSection = this.tourChainMode === 'sectionAdvance';
    const overlayClickBehavior: Config['overlayClickBehavior'] =
      chainSection && userOverlay !== 'nextStep'
        ? typeof userOverlay === 'function'
          ? (element, step, opts) => {
              this.tourAbortedFullChainByUser = true;
              userOverlay(element, step, opts);
            }
          : (_element, _step, opts) => {
              this.tourAbortedFullChainByUser = true;
              opts.driver.destroy();
            }
        : userOverlay;

    const d = driver({
      ...config,
      overlayClickBehavior,
      onCloseClick: (element, step, opts) => {
        if (chainSection) {
          this.tourAbortedFullChainByUser = true;
        }
        if (userOnCloseClick) {
          userOnCloseClick(element, step, opts);
        } else {
          opts.driver.destroy();
        }
      },
      onDestroyed: (element, step, opts) => {
        userOnDestroyed?.(element, step, opts);
        const mode = this.tourChainMode;
        const cb = this.tourFinishedCallback;
        const steps = opts.config.steps ?? [];
        const idx = opts.state.activeIndex;
        const onLastIndex =
          steps.length > 0 && typeof idx === 'number' && idx === steps.length - 1;
        const programmatic = this.lastDriverDestroyWasProgrammatic;
        this.lastDriverDestroyWasProgrammatic = false;

        let runCallback = false;
        if (cb) {
          if (mode === 'sectionAdvance') {
            const userAbort = this.tourAbortedFullChainByUser;
            this.tourAbortedFullChainByUser = false;
            if (programmatic) {
              runCallback = true;
            } else if (userAbort) {
              runCallback = false;
            } else {
              runCallback = onLastIndex;
            }
            if (!runCallback) {
              this.clearFullGuidedTourNavigationState();
              this.clearFullGuidedTourProgress();
            }
          } else if (mode === 'welcome') {
            runCallback = true;
          } else {
            runCallback = true;
          }
        }

        this.tourFinishedCallback = null;
        this.tourChainMode = 'off';
        this.activeDriver = null;

        if (runCallback && cb) {
          window.setTimeout(() => {
            try {
              cb();
            } catch {
              /* ignore */
            }
          }, 0);
        }
      },
    });
    this.activeDriver = d;
    return d;
  }

  destroy(): void {
    this.tourFinishedCallback = null;
    this.tourChainMode = 'off';
    this.lastDriverDestroyWasProgrammatic = false;
    this.tourAbortedFullChainByUser = false;
    this.killActiveDriver();
  }

  startFullGuidedTourWelcome(onBegin: () => void, opts?: { totalSteps: number }): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.destroy();
    if (opts?.totalSteps != null && opts.totalSteps >= 2) {
      this.setFullGuidedTourProgress(0, opts.totalSteps);
    } else {
      this.clearFullGuidedTourProgress();
    }
    this.tourFinishedCallback = onBegin;
    this.tourChainMode = 'welcome';

    const dismissWelcome = (): void => {
      this.tourFinishedCallback = null;
      this.clearFullGuidedTourNavigationState();
      this.clearFullGuidedTourProgress();
    };

    const d = this.startTourDriver({
      showProgress: true,
      showButtons: ['next', 'close'],
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      onDestroyStarted: (_element, _step, opts) => {
        dismissWelcome();
        opts.driver.destroy();
      },
      steps: [
        {
          popover: {
            title: 'Welcome',
            description:
              'This <strong>full guided tour</strong> walks through each Help topic on the real app, one after another. <strong>Close</strong>, the dimmed overlay, or <strong>Escape</strong> ends the <em>entire</em> tour at any time. Within each topic you can still use <strong>Previous</strong>.<br><br>Tap <strong>Begin</strong> when you’re ready to start.',
            side: 'bottom',
            align: 'center',
            nextBtnText: 'Begin',
            onNextClick: (_element, _step, opts) => {
              opts.driver.destroy();
            },
            onCloseClick: (_element, _step, opts) => {
              dismissWelcome();
              opts.driver.destroy();
            },
          },
        },
      ],
    });
    d.drive(0);
  }

  startFullGuidedTourClosing(opts?: { totalSteps?: number }): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.destroy();
    if (opts?.totalSteps != null && opts.totalSteps >= 2) {
      this.setFullGuidedTourProgress(opts.totalSteps - 1, opts.totalSteps);
    } else {
      this.clearFullGuidedTourProgress();
    }
    const d = this.startTourDriver({
      showProgress: false,
      showButtons: ['next', 'close'],
      doneBtnText: 'Close',
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'help-driver-popover',
      onDestroyed: () => {
        this.clearFullGuidedTourProgress();
      },
      steps: [
        {
          popover: {
            title: 'Thank you',
            description:
              'You’ve reached the end of the full tour. We hope this helps you pray with your church and grow in faith.<br><br>' +
              'Remember: each topic in <strong>Help &amp; Guidance</strong> has its own <strong>Start guided tour</strong> if you ever want to revisit just that part of the app.<br><br>' +
              '<strong>Thank you and God bless.</strong>',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    });
    d.drive(0);
  }

  startNewPrayerRequestTour(helpContent: HelpContent, hooks: NewPrayerRequestTourHooks): void {
    runNewPrayerRequestTour(this.createTourHost(), helpContent, hooks);
  }

  startPersonalPrayerTour(helpContent: HelpContent, hooks: PersonalPrayerTourHooks): void {
    runPersonalPrayerTour(this.createTourHost(), helpContent, hooks);
  }

  startUpdatingPrayerTour(helpContent: HelpContent, options: UpdatingPrayerTourOptions = {}): void {
    runUpdatingPrayerTour(this.createTourHost(), helpContent, options);
  }

  startManagingPrayerViewsTour(helpContent: HelpContent, hooks: ManagingPrayerViewsTourHooks): void {
    runManagingPrayerViewsTour(this.createTourHost(), helpContent, hooks);
  }

  startCreatingPrayersHelpSectionTour(
    section: { title: string; description: string },
    hooks: CreatingPrayersHelpSectionTourHooks,
    options: UpdatingPrayerTourOptions = {},
  ): void {
    runCreatingPrayersHelpSectionTour(this.createTourHost(), section, hooks, options);
  }

  startFilteringHelpSectionTour(section: HelpSection, hooks: FilteringHelpSectionTourHooks): void {
    runFilteringHelpSectionTour(this.createTourHost(), section, hooks);
  }

  startPrayerPromptsTour(
    section: { title: string; description: string },
    options: PrayerPromptsTourOptions,
    hooks: PrayerPromptsTourHooks,
  ): void {
    runPrayerPromptsTour(this.createTourHost(), section, options, hooks);
  }

  startMemorizeHelpSectionTour(
    section: { title: string; description: string },
    options: MemorizeHelpSectionTourOptions,
    hooks: MemorizeHelpSectionTourHooks,
  ): void {
    runMemorizeHelpSectionTour(this.createTourHost(), section, options, hooks);
  }

  startPrayerEncouragementTour(
    section: { title: string; description: string },
    options: PrayerEncouragementTourOptions,
    hooks: PrayerEncouragementTourHooks,
  ): void {
    runPrayerEncouragementTour(this.createTourHost(), section, options, hooks);
  }

  startSearchPrayersTour(section: { title: string; description: string }): void {
    runSearchPrayersTour(this.createTourHost(), section);
  }

  startPrintingHelpSectionTour(
    section: { title: string; description: string },
    hooks: PrintingHelpTourHooks,
  ): void {
    runPrintingHelpSectionTour(this.createTourHost(), section, hooks);
  }

  startEmailSubscriptionHelpSectionTour(
    section: { title: string; description: string },
    hooks: EmailSubscriptionHelpTourHooks,
  ): void {
    runEmailSubscriptionHelpSectionTour(this.createTourHost(), section, hooks);
  }

  startPrayerRemindersHelpSectionTour(
    section: { title: string; description: string },
    options: PrayerRemindersHelpTourOptions,
    hooks: PrayerRemindersHelpTourHooks,
  ): void {
    runPrayerRemindersHelpSectionTour(this.createTourHost(), section, options, hooks);
  }

  startFeedbackHelpSectionTour(
    section: { title: string; description: string },
    hooks: FeedbackHelpTourHooks,
  ): void {
    runFeedbackHelpSectionTour(this.createTourHost(), section, hooks);
  }

  startAppSettingsHelpSectionTour(
    section: { title: string; description: string },
    hooks: AppSettingsHelpTourHooks,
  ): void {
    runAppSettingsHelpSectionTour(this.createTourHost(), section, hooks);
  }

  startPersonalPrayersHelpSectionTour(
    section: { title: string; description: string },
    hooks: PersonalPrayersHelpSectionTourHooks,
  ): void {
    runPersonalPrayersHelpSectionTour(this.createTourHost(), section, hooks);
  }

  startPresentationModePrayButtonPreludeTour(
    section: { title: string; description: string },
    hooks: PresentationModePrayButtonPreludeHooks,
    opts?: { fullGuidedTourPrelude?: boolean },
  ): void {
    runPresentationModePrayButtonPreludeTour(this.createTourHost(), section, hooks, opts);
  }

  startPresentationModeTour(
    section: { title: string; description: string },
    hooks: PresentationModeTourHooks,
  ): void {
    runPresentationModeTour(this.createTourHost(), section, hooks);
  }
}
