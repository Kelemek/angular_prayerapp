import { describe, it, expect, beforeEach, vi } from "vitest";
import { PresentationControlsInputController } from "./presentation-controls-input.controller";

function createHost(overrides: Partial<{
  showControls: boolean;
  initialPeriodElapsed: boolean;
}> = {}) {
  const state = {
    showControls: overrides.showControls ?? true,
    initialPeriodElapsed: overrides.initialPeriodElapsed ?? false,
    next: vi.fn(),
    previous: vi.fn(),
    toggle: vi.fn(),
    exit: vi.fn(),
  };
  return {
    get showControls() {
      return state.showControls;
    },
    set showControls(value: boolean) {
      state.showControls = value;
    },
    get initialPeriodElapsed() {
      return state.initialPeriodElapsed;
    },
    set initialPeriodElapsed(value: boolean) {
      state.initialPeriodElapsed = value;
    },
    onNextSlide: () => state.next(),
    onPreviousSlide: () => state.previous(),
    onTogglePlay: () => state.toggle(),
    onExitPresentation: () => state.exit(),
    spies: state,
  };
}

describe("PresentationControlsInputController", () => {
  let controller: PresentationControlsInputController;

  beforeEach(() => {
    controller = new PresentationControlsInputController();
  });

  it("sets initialPeriodElapsed immediately on mobile", () => {
    const host = createHost();
    (globalThis as any).ontouchstart = true;
    controller.setupAutoHide(host);
    expect(host.initialPeriodElapsed).toBe(true);
    delete (globalThis as any).ontouchstart;
  });

  it("handleMouseMove shows controls near bottom of screen", () => {
    const host = createHost({ initialPeriodElapsed: true, showControls: false });
    vi.stubGlobal("innerHeight", 100);
    controller.handleMouseMove({ clientY: 85 } as MouseEvent, host);
    expect(host.showControls).toBe(true);
  });

  it("onTouchEnd triggers next slide on left swipe", () => {
    const host = createHost();
    controller.onTouchStart({ touches: [{ clientX: 200 }] } as unknown as TouchEvent, host);
    controller.onTouchMove({ touches: [{ clientX: 100 }] } as unknown as TouchEvent);
    controller.onTouchEnd(host);
    expect(host.spies.next).toHaveBeenCalled();
  });

  it("handleKeyboard maps space to next slide", () => {
    const host = createHost();
    const preventDefault = vi.fn();
    controller.handleKeyboard(
      { key: " ", preventDefault } as unknown as KeyboardEvent,
      host
    );
    expect(preventDefault).toHaveBeenCalled();
    expect(host.spies.next).toHaveBeenCalled();
  });

  it("handleMouseMove does nothing when mouse is between 75-80% of screen", () => {
    const host = createHost({ initialPeriodElapsed: true, showControls: true });
    vi.stubGlobal("innerHeight", 100);
    controller.handleMouseMove({ clientY: 77 } as MouseEvent, host);
    expect(host.showControls).toBe(true);
  });

  it("onTouchMove updates touchEnd value", () => {
    (controller as any).touchEnd = null;
    controller.onTouchMove({ touches: [{ clientX: 123 }] } as unknown as TouchEvent);
    expect((controller as any).touchEnd).toBe(123);
  });

  it("onTouchStart sets lastTap for a single tap", () => {
    (controller as any).lastTap = 0;
    const host = createHost();
    controller.onTouchStart(
      { touches: [{ clientX: 50 }] } as unknown as TouchEvent,
      host
    );
    expect((controller as any).lastTap).toBeGreaterThan(0);
  });

  it("onTouchStart resets lastTap on double tap", () => {
    (controller as any).lastTap = Date.now() - 100;
    const host = createHost({ showControls: true });
    controller.onTouchStart(
      { touches: [{ clientX: 50 }] } as unknown as TouchEvent,
      host
    );
    expect((controller as any).lastTap).toBe(0);
  });

  it("handleKeyboard ignores unknown keys", () => {
    const host = createHost();
    controller.handleKeyboard(
      { key: "Unknown", preventDefault: () => {} } as unknown as KeyboardEvent,
      host
    );
    expect(host.spies.next).not.toHaveBeenCalled();
  });

  it("handleKeyboard maps arrow keys, escape, and p", () => {
    const host = createHost();
    controller.handleKeyboard(
      { key: "ArrowLeft", preventDefault: () => {} } as unknown as KeyboardEvent,
      host
    );
    controller.handleKeyboard(
      { key: "ArrowRight", preventDefault: () => {} } as unknown as KeyboardEvent,
      host
    );
    controller.handleKeyboard(
      { key: "Escape", preventDefault: () => {} } as unknown as KeyboardEvent,
      host
    );
    controller.handleKeyboard(
      { key: "p", preventDefault: () => {} } as unknown as KeyboardEvent,
      host
    );
    expect(host.spies.previous).toHaveBeenCalled();
    expect(host.spies.next).toHaveBeenCalled();
    expect(host.spies.exit).toHaveBeenCalled();
    expect(host.spies.toggle).toHaveBeenCalled();
  });

  it("handleMouseMove does nothing during the initial period", () => {
    const host = createHost({ initialPeriodElapsed: false, showControls: false });
    vi.stubGlobal("innerHeight", 100);
    controller.handleMouseMove({ clientY: 90 } as MouseEvent, host);
    expect(host.showControls).toBe(false);
  });

  it("onTouchEnd ignores swipes when touchStart is null", () => {
    const host = createHost();
    (controller as any).touchStart = null;
    (controller as any).touchEnd = 100;
    controller.onTouchEnd(host);
    expect(host.spies.next).not.toHaveBeenCalled();
  });

  it("onTouchEnd ignores swipes when touchEnd is null", () => {
    const host = createHost();
    (controller as any).touchStart = 100;
    (controller as any).touchEnd = null;
    controller.onTouchEnd(host);
    expect(host.spies.next).not.toHaveBeenCalled();
  });

  it("onTouchEnd ignores swipes that are too small", () => {
    const host = createHost();
    controller.onTouchStart({ touches: [{ clientX: 100 }] } as unknown as TouchEvent, host);
    controller.onTouchMove({ touches: [{ clientX: 95 }] } as unknown as TouchEvent);
    controller.onTouchEnd(host);
    expect(host.spies.next).not.toHaveBeenCalled();
  });

  it("setupAutoHide hides controls after the initial period on non-mobile", () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      ...(globalThis as any).navigator,
      maxTouchPoints: 0,
    });
    if ((globalThis as any).ontouchstart !== undefined) {
      delete (globalThis as any).ontouchstart;
    }
    const host = createHost({ showControls: true, initialPeriodElapsed: false });
    controller.setupAutoHide(host);
    vi.runAllTimers();
    expect(host.initialPeriodElapsed).toBe(true);
    expect(host.showControls).toBe(false);
    vi.useRealTimers();
  });

  it("onTouchEnd triggers previous slide on right swipe", () => {
    const host = createHost();
    controller.onTouchStart({ touches: [{ clientX: 100 }] } as unknown as TouchEvent, host);
    controller.onTouchMove({ touches: [{ clientX: 200 }] } as unknown as TouchEvent);
    controller.onTouchEnd(host);
    expect(host.spies.previous).toHaveBeenCalled();
  });
});
