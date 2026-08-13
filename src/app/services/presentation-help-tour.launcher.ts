import { Injectable } from "@angular/core";
import type { ChangeDetectorRef } from "@angular/core";
import {
  FULL_GUIDED_TOUR_CLOSING_SENTINEL,
  FULL_GUIDED_TOUR_QUEUE_KEY,
  HelpDriverTourService,
  PRESENTATION_HELP_TOUR_SESSION_KEY,
  type PresentationHelpTourSessionPayload,
} from "./help-driver-tour.service";

export interface PresentationHelpTourHost {
  showControls: boolean;
  showSettings: boolean;
  markForCheck(): void;
  exitPresentation(): void;
  cancelControlsInitialTimer(): void;
}

@Injectable()
export class PresentationHelpTourLauncher {
  private fullGuidedTourRemainingSectionIds: string[] | null = null;
  private fullGuidedTourFromFullChain = false;
  private fullGuidedTourTotalSteps: number | null = null;
  private fullGuidedTourResumeStartGlobalSectionIndex: number | null = null;

  constructor(private readonly helpDriverTourService: HelpDriverTourService) {}

  maybeStartFromSession(host: PresentationHelpTourHost, cdr: ChangeDetectorRef): void {
    if (typeof sessionStorage === "undefined") {
      return;
    }
    const raw = sessionStorage.getItem(PRESENTATION_HELP_TOUR_SESSION_KEY);
    if (!raw) {
      return;
    }
    sessionStorage.removeItem(PRESENTATION_HELP_TOUR_SESSION_KEY);
    let payload: PresentationHelpTourSessionPayload;
    try {
      payload = JSON.parse(raw) as PresentationHelpTourSessionPayload;
    } catch {
      return;
    }
    if (!payload?.title) {
      return;
    }

    this.fullGuidedTourFromFullChain =
      payload.fullGuidedTourFromFullChain === true;
    const remaining = payload.fullGuidedTourRemainingSectionIds;
    this.fullGuidedTourRemainingSectionIds = Array.isArray(remaining)
      ? remaining
      : null;
    this.fullGuidedTourTotalSteps =
      typeof payload.fullGuidedTourTotalSteps === "number" &&
      payload.fullGuidedTourTotalSteps >= 2
        ? payload.fullGuidedTourTotalSteps
        : null;
    this.fullGuidedTourResumeStartGlobalSectionIndex =
      typeof payload.fullGuidedTourResumeStartGlobalSectionIndex === "number"
        ? payload.fullGuidedTourResumeStartGlobalSectionIndex
        : null;

    host.cancelControlsInitialTimer();
    host.showControls = true;
    host.markForCheck();

    window.setTimeout(() => {
      this.helpDriverTourService.startPresentationModeTour(
        { title: payload.title!, description: payload.description ?? "" },
        {
          openSettings: () => {
            host.showSettings = true;
            host.markForCheck();
          },
          closeSettings: () => {
            host.showSettings = false;
            host.markForCheck();
          },
          exitPresentation: () => host.exitPresentation(),
          markForCheck: () => host.markForCheck(),
          onFullGuidedTourInterrupted: () => {
            if (!this.fullGuidedTourFromFullChain) {
              return;
            }
            this.fullGuidedTourFromFullChain = false;
            this.fullGuidedTourRemainingSectionIds = null;
            this.fullGuidedTourTotalSteps = null;
            this.fullGuidedTourResumeStartGlobalSectionIndex = null;
            this.helpDriverTourService.clearFullGuidedTourNavigationState();
            this.helpDriverTourService.clearFullGuidedTourProgress();
          },
          persistFullGuidedTourQueue: () => {
            if (
              !this.fullGuidedTourFromFullChain ||
              typeof sessionStorage === "undefined"
            ) {
              return;
            }
            const ids = this.fullGuidedTourRemainingSectionIds;
            const totalSteps = this.fullGuidedTourTotalSteps;
            const resumeStart =
              this.fullGuidedTourResumeStartGlobalSectionIndex ?? 0;
            try {
              if (totalSteps != null && totalSteps >= 2) {
                if (ids && ids.length > 0) {
                  sessionStorage.setItem(
                    FULL_GUIDED_TOUR_QUEUE_KEY,
                    JSON.stringify({
                      v: 1,
                      totalSteps,
                      ids,
                      resumeStartGlobalSectionIndex: resumeStart,
                    })
                  );
                } else {
                  sessionStorage.setItem(
                    FULL_GUIDED_TOUR_QUEUE_KEY,
                    JSON.stringify({ v: 1, totalSteps, mode: "closing" })
                  );
                }
              } else {
                const toStore =
                  ids && ids.length > 0
                    ? ids
                    : [FULL_GUIDED_TOUR_CLOSING_SENTINEL];
                sessionStorage.setItem(
                  FULL_GUIDED_TOUR_QUEUE_KEY,
                  JSON.stringify(toStore)
                );
              }
            } catch {
              /* ignore quota / private mode */
            }
          },
        }
      );
      cdr.markForCheck();
    }, 400);
  }
}
