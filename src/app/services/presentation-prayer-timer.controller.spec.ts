import { describe, it, expect, beforeEach, vi } from "vitest";
import { NgZone } from "@angular/core";
import { PresentationPrayerTimerController } from "./presentation-prayer-timer.controller";

describe("PresentationPrayerTimerController", () => {
  let controller: PresentationPrayerTimerController;
  let host: {
    showTimerNotification: boolean;
    closeSettings: ReturnType<typeof vi.fn>;
    detectChanges: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new PresentationPrayerTimerController({
      run: (fn: () => void) => fn(),
    } as unknown as NgZone);
    host = {
      showTimerNotification: false,
      closeSettings: vi.fn(),
      detectChanges: vi.fn(),
    };
  });

  it("starts countdown and shows notification when complete", () => {
    vi.useFakeTimers();
    controller.start(0.001, host);
    expect(controller.active).toBe(true);
    expect(host.closeSettings).toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(controller.active).toBe(false);
    expect(host.showTimerNotification).toBe(true);
    vi.useRealTimers();
  });

  it("unsubscribes from existing subscription before starting new one", () => {
    vi.useFakeTimers();
    const stopSpy = vi.spyOn(controller, "stop");
    controller.start(0.001, host);
    expect(stopSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("destroy stops active timer", () => {
    vi.useFakeTimers();
    controller.start(1, host);
    controller.destroy();
    expect(controller.active).toBe(false);
    vi.useRealTimers();
  });

  it("converts minutes to seconds", () => {
    vi.useFakeTimers();
    controller.start(2, host);
    expect(controller.remainingSeconds).toBe(120);
    vi.useRealTimers();
  });
});
