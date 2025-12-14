import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Hoisted mock for @microsoft/clarity so tests can control behavior.
 * We provide a spy `clarityInitSpy` and expose helper functions via the mock
 * so tests can inspect call history if needed.
 */
const clarityInitSpy = vi.fn();
vi.mock("@microsoft/clarity", () => ({
  default: {
    init: clarityInitSpy,
  },
  __getCalls: () => clarityInitSpy.mock.calls,
  __clear: () => clarityInitSpy.mockClear(),
}));

describe("Clarity initialization (extra tests)", () => {
  const ORIGINAL_WINDOW = { ...(globalThis as any).window } ?? undefined;

  beforeEach(() => {
    // Reset module cache and clear spy state so each test starts fresh
    vi.resetModules();
    clarityInitSpy.mockReset();
    delete process.env.VITE_CLARITY_PROJECT_ID;
  });

  afterEach(() => {
    // Restore original global window if it existed
    try {
      if (ORIGINAL_WINDOW && Object.keys(ORIGINAL_WINDOW).length) {
        (globalThis as any).window = ORIGINAL_WINDOW;
      } else {
        // @ts-ignore
        delete (globalThis as any).window;
      }
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  it("returns early when not running in a browser (no window)", async () => {
    // Simulate server environment
    // @ts-ignore
    delete (globalThis as any).window;

    const mod = await import("../clarity");
    // Should not throw and should not call clarity.init
    expect(() => mod.initializeClarity()).not.toThrow();
    expect(clarityInitSpy).not.toHaveBeenCalled();
  });

  it("skips initialization when project id is missing or empty", async () => {
    // Provide a minimal window so browser branches run
    (globalThis as any).window = { document: {}, navigator: {} } as any;

    process.env.VITE_CLARITY_PROJECT_ID = "";

    const mod = await import("../clarity");
    mod.initializeClarity();
    expect(clarityInitSpy).not.toHaveBeenCalled();
  });

  it("calls Clarity.init when VITE_CLARITY_PROJECT_ID is present", async () => {
    (globalThis as any).window = { document: {}, navigator: {} } as any;
    process.env.VITE_CLARITY_PROJECT_ID = "test-project-123";

    const mod = await import("../clarity");
    mod.initializeClarity();
    expect(clarityInitSpy).toHaveBeenCalledTimes(1);
    expect(clarityInitSpy).toHaveBeenCalledWith("test-project-123");
  });

  it("catches errors thrown by Clarity.init and logs them", async () => {
    (globalThis as any).window = { document: {}, navigator: {} } as any;
    process.env.VITE_CLARITY_PROJECT_ID = "will-throw";

    // Make the hoisted spy throw for this invocation
    clarityInitSpy.mockImplementationOnce(() => {
      throw new Error("init failed");
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mod = await import("../clarity");
    // Should not propagate the thrown error
    expect(() => mod.initializeClarity()).not.toThrow();
    expect(clarityInitSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe("supabaseHelpers integration sanity (extra)", () => {
  it("handleSupabaseError throws with the provided message and logs", async () => {
    // Ensure fresh module import state
    vi.resetModules();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { handleSupabaseError } = await import("../supabaseHelpers");
    expect(() => handleSupabaseError({ message: "boom" } as any)).toThrow(
      "boom",
    );
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
