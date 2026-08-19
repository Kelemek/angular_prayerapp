import { Injectable } from "@angular/core";
import { firstValueFrom, take } from "rxjs";
import type { HelpSection } from "../types/help-content";
import {
  FULL_GUIDED_TOUR_QUEUE_KEY,
  HelpDriverTourService,
  parseFullGuidedTourQueue,
  type PresentationHelpTourSessionPayload,
} from "./help-driver-tour.service";

import { HelpContentService } from "./help-content.service";
import type { HomeHelpTourHost } from "./home-help-tour-host.adapter";

import { dispatchHomeHelpSectionTour, HELP_SECTION_ID_PRESENTATION } from "../lib/home-help-tour-dispatch";
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
    const host = this.host;
    if (!host) {
      return false;
    }
    return dispatchHomeHelpSectionTour(section, {
      host,
      helpDriverTourService: this.helpDriverTourService,
    });
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

}
