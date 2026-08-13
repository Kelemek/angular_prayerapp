import { describe, it, expect, beforeEach, vi } from "vitest";
import { ChangeDetectorRef } from "@angular/core";
import {
  PRESENTATION_HELP_TOUR_SESSION_KEY,
} from "./help-driver-tour.service";
import { PresentationHelpTourLauncher } from "./presentation-help-tour.launcher";

describe("PresentationHelpTourLauncher", () => {
  let launcher: PresentationHelpTourLauncher;
  let helpDriverTourService: {
    startPresentationModeTour: ReturnType<typeof vi.fn>;
  };
  let host: {
    showControls: boolean;
    showSettings: boolean;
    markForCheck: ReturnType<typeof vi.fn>;
    exitPresentation: ReturnType<typeof vi.fn>;
    cancelControlsInitialTimer: ReturnType<typeof vi.fn>;
  };
  let cdr: ChangeDetectorRef;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    helpDriverTourService = {
      startPresentationModeTour: vi.fn(),
    };
    launcher = new PresentationHelpTourLauncher(helpDriverTourService as any);
    host = {
      showControls: false,
      showSettings: false,
      markForCheck: vi.fn(),
      exitPresentation: vi.fn(),
      cancelControlsInitialTimer: vi.fn(),
    };
    cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
  });

  it("starts presentation help tour from session payload", () => {
    vi.useFakeTimers();
    sessionStorage.setItem(
      PRESENTATION_HELP_TOUR_SESSION_KEY,
      JSON.stringify({ title: "Presentation", description: "Tour" })
    );

    launcher.maybeStartFromSession(host, cdr);
    vi.advanceTimersByTime(400);

    expect(sessionStorage.getItem(PRESENTATION_HELP_TOUR_SESSION_KEY)).toBeNull();
    expect(host.showControls).toBe(true);
    expect(host.cancelControlsInitialTimer).toHaveBeenCalled();
    expect(helpDriverTourService.startPresentationModeTour).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
