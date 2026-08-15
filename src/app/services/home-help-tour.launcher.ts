import { Injectable } from "@angular/core";
import { firstValueFrom, take } from "rxjs";
import { loadMemorizeListView } from "../lib/memorization/memorization-list-prefs";
import type { HelpSection } from "../types/help-content";
import {
  FULL_GUIDED_TOUR_QUEUE_KEY,
  HelpDriverTourService,
  parseFullGuidedTourQueue,
  type PresentationHelpTourSessionPayload,
} from "./help-driver-tour.service";
import { getCardActionsOverflowTriggerEl } from "../lib/help-card-actions-menu-tour";
import { HelpContentService } from "./help-content.service";
import type { HomeHelpTourHost } from "./home-help-tour-host.adapter";

const HELP_SECTION_ID_PRESENTATION = "help_presentation";
const TOUR_START_DELAY_MS = 280;

@Injectable()
export class HomeHelpTourLauncher {
  private host: HomeHelpTourHost | null = null;
  private fullGuidedTourTotalSteps = 0;

  constructor(
    private readonly helpDriverTourService: HelpDriverTourService,
    private readonly helpContentService: HelpContentService
  ) {}

  bindHost(host: HomeHelpTourHost): void {
    this.host = host;
  }

  startSectionTour(section: HelpSection): void {
    const host = this.host;
    if (!host) {
      return;
    }
    host.closeHelp();
    host.markForCheck();
    window.setTimeout(() => this.dispatchSectionTour(section), TOUR_START_DELAY_MS);
  }

  startFullGuidedTour(sections: HelpSection[]): void {
    const host = this.host;
    if (!host) {
      return;
    }
    const sorted = [...sections]
      .filter((s) => s.isActive)
      .sort((a, b) => a.order - b.order);
    if (sorted.length === 0) {
      return;
    }
    this.fullGuidedTourTotalSteps = 2 + sorted.length;
    host.closeHelp();
    host.markForCheck();
    window.setTimeout(() => {
      this.helpDriverTourService.startFullGuidedTourWelcome(
        () => {
          window.setTimeout(() => this.runFullGuidedTourStep(sorted, 0, 0), 0);
        },
        { totalSteps: this.fullGuidedTourTotalSteps }
      );
    }, TOUR_START_DELAY_MS);
  }

  tryResumeQueue(): void {
    if (typeof sessionStorage === "undefined") {
      return;
    }
    const raw = sessionStorage.getItem(FULL_GUIDED_TOUR_QUEUE_KEY);
    if (!raw) {
      return;
    }
    const parsed = parseFullGuidedTourQueue(raw);
    if (parsed.kind === "empty") {
      return;
    }
    sessionStorage.removeItem(FULL_GUIDED_TOUR_QUEUE_KEY);

    switch (parsed.kind) {
      case "legacy_closing":
        window.setTimeout(
          () => this.helpDriverTourService.startFullGuidedTourClosing(),
          0
        );
        break;
      case "closing":
        this.fullGuidedTourTotalSteps = parsed.totalSteps;
        window.setTimeout(
          () =>
            this.helpDriverTourService.startFullGuidedTourClosing({
              totalSteps: parsed.totalSteps,
            }),
          0
        );
        break;
      case "legacy_section_ids":
      case "resume": {
        const ids = parsed.ids;
        void firstValueFrom(
          this.helpContentService.getSections().pipe(take(1))
        ).then((all) => {
          const byId = new Map(all.map((s) => [s.id, s]));
          const ordered: HelpSection[] = [];
          for (const id of ids) {
            const s = byId.get(id);
            if (s?.isActive) {
              ordered.push(s);
            }
          }
          if (ordered.length === 0) {
            return;
          }
          if (parsed.kind === "resume") {
            this.fullGuidedTourTotalSteps = parsed.totalSteps;
            window.setTimeout(
              () =>
                this.runFullGuidedTourStep(
                  ordered,
                  0,
                  parsed.resumeStartGlobalSectionIndex
                ),
              0
            );
          } else {
            this.fullGuidedTourTotalSteps = ordered.length + 2;
            window.setTimeout(
              () => this.runFullGuidedTourStep(ordered, 0, 0),
              0
            );
          }
        });
        break;
      }
    }
  }

  private runFullGuidedTourStep(
    sections: HelpSection[],
    index: number,
    globalSectionBase: number
  ): void {
    if (index >= sections.length) {
      window.setTimeout(() => {
        this.helpDriverTourService.startFullGuidedTourClosing({
          totalSteps:
            this.fullGuidedTourTotalSteps >= 2
              ? this.fullGuidedTourTotalSteps
              : undefined,
        });
      }, 200);
      return;
    }
    const section = sections[index];
    const globalSectionIndex = globalSectionBase + index;
    if (this.fullGuidedTourTotalSteps >= 2) {
      this.helpDriverTourService.setFullGuidedTourProgress(
        1 + globalSectionIndex,
        this.fullGuidedTourTotalSteps
      );
    }
    const advance = () =>
      this.runFullGuidedTourStep(sections, index + 1, globalSectionBase);

    if (section.id === HELP_SECTION_ID_PRESENTATION) {
      window.setTimeout(
        () =>
          this.startPresentationPreludeForFullTour(
            section,
            sections.slice(index + 1),
            globalSectionIndex
          ),
        0
      );
      return;
    }

    this.helpDriverTourService.queueTourFinishedCallback(advance);
    const host = this.host;
    if (!host) {
      return;
    }
    host.closeHelp();
    host.markForCheck();
    window.setTimeout(() => {
      if (!this.dispatchSectionTour(section)) {
        this.helpDriverTourService.queueTourFinishedCallback(null);
        window.setTimeout(advance, 0);
      }
    }, TOUR_START_DELAY_MS);
  }

  private dispatchSectionTour(section: HelpSection): boolean {
    switch (section.id) {
      case "help_prayers":
        this.startCreatingPrayersTour(section);
        return true;
      case "help_filtering":
        this.startFilteringTour(section);
        return true;
      case "help_prompts":
        this.startPrayerPromptsTour(section);
        return true;
      case "help_prayer_encouragement":
        void this.startPrayerEncouragementTour(section);
        return true;
      case "help_search":
        this.startSearchPrayersTour(section);
        return true;
      case "help_personal_prayers":
        this.startPersonalPrayersTour(section);
        return true;
      case "help_memorize":
        this.startMemorizeTour(section);
        return true;
      case "help_printing":
        this.startPrintingTour(section);
        return true;
      case "help_email_subscription":
        this.startEmailSubscriptionTour(section);
        return true;
      case "help_prayer_reminders":
        void this.startPrayerRemindersTour(section);
        return true;
      case "help_feedback":
        this.startFeedbackTour(section);
        return true;
      case "help_settings":
        this.startAppSettingsTour(section);
        return true;
      case HELP_SECTION_ID_PRESENTATION:
        this.startPresentationModeTour(section);
        return true;
      default:
        return false;
    }
  }

  private startPresentationPreludeForFullTour(
    section: HelpSection,
    remaining: HelpSection[],
    presentationGlobalSectionIndex: number
  ): void {
    const host = this.host;
    if (!host) {
      return;
    }
    const payload: PresentationHelpTourSessionPayload = {
      title: section.title,
      description: section.description,
      fullGuidedTourFromFullChain: true,
      fullGuidedTourRemainingSectionIds: remaining.map((s) => s.id),
      fullGuidedTourTotalSteps:
        this.fullGuidedTourTotalSteps >= 2
          ? this.fullGuidedTourTotalSteps
          : undefined,
      fullGuidedTourResumeStartGlobalSectionIndex:
        presentationGlobalSectionIndex + 1,
    };
    host.stashPresentationTourSession(JSON.stringify(payload));
    this.helpDriverTourService.startPresentationModePrayButtonPreludeTour(
      { title: section.title, description: section.description },
      {
        continueToPresentation: () => host.navigateToPresentation(),
        markForCheck: () => host.markForCheck(),
      },
      { fullGuidedTourPrelude: true }
    );
  }

  private startCreatingPrayersTour(section: HelpSection): void {
    const host = this.requireHost();
    const includeAnonymous =
      host.getActiveFilter() !== "personal" &&
      host.getActiveFilter() !== "planning_center_list";
    this.helpDriverTourService.startCreatingPrayersHelpSectionTour(
      { title: section.title, description: section.description },
      {
        openPrayerForm: () => {
          host.openPrayerForm();
          host.markForCheck();
        },
        closePrayerForm: () => {
          host.closePrayerForm();
          host.markForCheck();
        },
        switchToCurrent: () => {
          host.setFilter("current");
          host.markForCheck();
        },
      },
      { includeAnonymousUpdateStep: includeAnonymous }
    );
  }

  private startFilteringTour(section: HelpSection): void {
    const host = this.requireHost();
    this.helpDriverTourService.startFilteringHelpSectionTour(section, {
      switchToCurrent: () => {
        host.setFilter("current");
        host.markForCheck();
      },
      switchToAnswered: () => {
        host.setFilter("answered");
        host.markForCheck();
      },
      switchToArchived: () => {
        host.setFilter("archived");
        host.markForCheck();
      },
      switchToTotal: () => {
        host.setFilter("total");
        host.markForCheck();
      },
      switchToMembers: () => {
        host.setFilter("planning_center_list");
        host.markForCheck();
      },
      switchToPrompts: () => {
        host.setFilter("prompts");
        host.markForCheck();
      },
      switchToPersonal: () => {
        host.setFilter("personal");
        host.markForCheck();
      },
      openSearchPanel: () => {
        host.openSearchPanel();
        host.markForCheck();
      },
    });
  }

  private startPrayerPromptsTour(section: HelpSection): void {
    const host = this.requireHost();
    this.helpDriverTourService.startPrayerPromptsTour(
      { title: section.title, description: section.description },
      { hasPrompts: host.getPromptsCount() > 0 },
      {
        switchToPrompts: () => {
          host.setFilter("prompts");
          host.markForCheck();
        },
        clearPromptTypes: () => {
          host.clearSelectedPromptTypes();
          host.markForCheck();
        },
      }
    );
  }

  private async startPrayerEncouragementTour(section: HelpSection): Promise<void> {
    const host = this.requireHost();
    host.setFilter("current");
    host.markForCheck();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
    const list = await host.getCurrentPrayers();
    this.helpDriverTourService.startPrayerEncouragementTour(
      { title: section.title, description: section.description },
      { hasCommunityPrayer: list.length > 0 },
      {
        switchToCurrent: () => {
          host.setFilter("current");
          host.markForCheck();
        },
      }
    );
  }

  private startSearchPrayersTour(section: HelpSection): void {
    const host = this.requireHost();
    host.closeHelp();
    host.openSearchPanel();
    host.markForCheck();
    window.setTimeout(
      () =>
        this.helpDriverTourService.startSearchPrayersTour({
          title: section.title,
          description: section.description,
        }),
      280
    );
  }

  private startPersonalPrayersTour(section: HelpSection): void {
    const host = this.requireHost();
    const form = host.getPrayerFormHooks();
    this.helpDriverTourService.startPersonalPrayersHelpSectionTour(
      { title: section.title, description: section.description },
      {
        switchToPersonalFilter: () => {
          host.setFilter("personal");
          host.markForCheck();
        },
        openPrayerForm: () => {
          host.openPrayerForm();
          host.markForCheck();
        },
        markForCheck: () => host.markForCheck(),
        fillWalkthroughPrayerFor: () => form?.fillWalkthroughPrayerFor(),
        fillWalkthroughDescription: () => form?.fillWalkthroughDescription(),
        ensureWalkthroughPersonalSelected: () =>
          form?.ensureWalkthroughPersonalSelected(),
        fillWalkthroughCategory: () => form?.fillWalkthroughCategory(),
        submitWalkthroughPrayerForm: () => form?.submitWalkthroughPrayerForm(),
        openWalkthroughPersonalEdit: () => {
          const p = host.getWalkthroughPersonalPrayer();
          if (p) {
            host.openWalkthroughPersonalEdit(p);
          }
          host.markForCheck();
        },
        closeWalkthroughPersonalEdit: () => {
          host.closeWalkthroughPersonalEdit();
          host.markForCheck();
        },
        clickWalkthroughAddUpdate: () => host.clickWalkthroughAddUpdate(),
        narrowToWalkthroughCategoryFilter: () => {
          host.narrowToWalkthroughCategoryFilter();
          host.markForCheck();
        },
        deleteWalkthroughTestPrayer: () => host.deleteWalkthroughTestPrayer(),
      }
    );
  }

  private startMemorizeTour(section: HelpSection): void {
    const host = this.requireHost();
    this.helpDriverTourService.startMemorizeHelpSectionTour(
      { title: section.title, description: section.description },
      {
        hasMemorizedItems: host.getMemorizedItemsCount() > 0,
        listView: loadMemorizeListView(),
      },
      {
        switchToMemorize: () => {
          host.setFilter("memorize");
          host.markForCheck();
        },
      }
    );
  }

  private startSettingsTour(
    section: HelpSection,
    start: (
      copy: { title: string; description: string },
      hooks: {
        openSettings: () => void;
        closeSettings: () => void;
        markForCheck: () => void;
      }
    ) => void
  ): void {
    const host = this.requireHost();
    start(
      { title: section.title, description: section.description },
      {
        openSettings: () => host.openUserSettings(),
        closeSettings: () => host.closeUserSettings(),
        markForCheck: () => host.markForCheck(),
      }
    );
  }

  private startEmailSubscriptionTour(section: HelpSection): void {
    this.startSettingsTour(section, (copy, hooks) =>
      this.helpDriverTourService.startEmailSubscriptionHelpSectionTour(
        copy,
        hooks
      )
    );
  }

  private async startPrayerRemindersTour(section: HelpSection): Promise<void> {
    const host = this.requireHost();
    host.setFilter("current");
    host.markForCheck();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
    const hasEmail = host.hasSessionEmail();
    let hasReminderCardMenuTarget = false;
    if (hasEmail) {
      const list = await host.getCurrentPrayers();
      hasReminderCardMenuTarget = list.length > 0;
    }
    if (
      hasReminderCardMenuTarget &&
      typeof document !== "undefined" &&
      !getCardActionsOverflowTriggerEl(document)
    ) {
      hasReminderCardMenuTarget = false;
    }
    this.helpDriverTourService.startPrayerRemindersHelpSectionTour(
      { title: section.title, description: section.description },
      { hasReminderCardMenuTarget },
      {
        switchToCurrent: () => {
          host.setFilter("current");
          host.markForCheck();
        },
        openSettings: () => host.openUserSettings(),
        closeSettings: () => host.closeUserSettings(),
        markForCheck: () => host.markForCheck(),
      }
    );
  }

  private startFeedbackTour(section: HelpSection): void {
    this.startSettingsTour(section, (copy, hooks) =>
      this.helpDriverTourService.startFeedbackHelpSectionTour(copy, hooks)
    );
  }

  private startAppSettingsTour(section: HelpSection): void {
    this.startSettingsTour(section, (copy, hooks) =>
      this.helpDriverTourService.startAppSettingsHelpSectionTour(copy, hooks)
    );
  }

  private startPrintingTour(section: HelpSection): void {
    this.startSettingsTour(section, (copy, hooks) =>
      this.helpDriverTourService.startPrintingHelpSectionTour(copy, hooks)
    );
  }

  private startPresentationModeTour(section: HelpSection): void {
    const host = this.requireHost();
    this.helpDriverTourService.startPresentationModePrayButtonPreludeTour(
      { title: section.title, description: section.description },
      {
        continueToPresentation: () => {
          host.stashPresentationTourSession(
            JSON.stringify({
              title: section.title,
              description: section.description,
            })
          );
          host.navigateToPresentation();
        },
        markForCheck: () => host.markForCheck(),
      }
    );
  }

  private requireHost(): HomeHelpTourHost {
    if (!this.host) {
      throw new Error("HomeHelpTourLauncher host is not bound");
    }
    return this.host;
  }
}
