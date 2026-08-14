import { describe, expect, it, vi } from "vitest";
import { ChangeDetectorRef } from "@angular/core";
import { wirePresentationControllers } from "./presentation-coordinator-wiring";
import { PresentationPlaybackController } from "./presentation-playback.controller";
import { PresentationControlsInputController } from "./presentation-controls-input.controller";

describe("wirePresentationControllers", () => {
  it("binds playback and returns host adapters for timer, controls, and help tour", () => {
    const page = {
      currentIndex: 0,
      loop: true,
      smartMode: true,
      displayDuration: 10,
      showSettings: false,
      showTimerNotification: false,
      showControls: true,
      initialPeriodElapsed: false,
      items: [],
      currentItem: undefined,
    };
    const cdr = { markForCheck: vi.fn() } as unknown as ChangeDetectorRef;
    const playback = new PresentationPlaybackController();
    const bindHost = vi.spyOn(playback, "bindHost");
    const controlsInput = {
      cancelInitialAutoHideTimer: vi.fn(),
    } as unknown as PresentationControlsInputController;
    const exitPresentation = vi.fn();

    const hosts = wirePresentationControllers({
      page,
      cdr,
      playback,
      controlsInput,
      exitPresentation,
    });

    expect(bindHost).toHaveBeenCalledOnce();
    expect(hosts.prayerTimerHost).toBeDefined();
    expect(hosts.controlsInputHost).toBeDefined();
    expect(hosts.helpTourHost).toBeDefined();

    hosts.controlsInputHost.onExitPresentation();
    expect(exitPresentation).toHaveBeenCalledOnce();

    hosts.helpTourHost.markForCheck();
    expect(cdr.markForCheck).toHaveBeenCalledOnce();
  });
});
