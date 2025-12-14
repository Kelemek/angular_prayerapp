import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Use a hoisted mock for '@sentry/react' so tests can control the exported
 * `init` function without attempting to spy on an ESM namespace object.
 *
 * The mock exposes a simple `init` function (vi.fn) and `captureException`.
 * Tests can import the mocked module and inspect/mock its `init` implementation.
 */
const initMock = vi.fn();
const captureExceptionMock = vi.fn();
vi.mock("@sentry/react", () => ({
  init: initMock,
  captureException: captureExceptionMock,
}));

describe("initializeSentry behavior", () => {
  beforeEach(() => {
    vi.resetModules();
    initMock.mockReset();
    captureExceptionMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not initialize Sentry when VITE_SENTRY_DSN is not set", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "");

    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Import module under test — it will use the hoisted mock above
    const mod = await import("../sentry");
    // Should run without throwing
    expect(() => mod.initializeSentry()).not.toThrow();

    // Our mock `init` should not have been called
    expect(initMock).not.toHaveBeenCalled();
    // Expect a warning about DSN missing
    expect(consoleWarn).toHaveBeenCalled();

    consoleWarn.mockRestore();
  });

  it("calls Sentry.init with expected options when DSN is provided", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://exampledsn/123");
    vi.stubEnv("VITE_APP_VERSION", "2.3.4");

    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const mod = await import("../sentry");

    // Call initialization (should call our mocked init)
    expect(() => mod.initializeSentry()).not.toThrow();

    expect(initMock).toHaveBeenCalledTimes(1);
    const initArg = initMock.mock.calls[0][0];
    expect(initArg).toBeTruthy();
    expect(initArg.dsn).toBe("https://exampledsn/123");
    expect(initArg.environment).toBeDefined();
    expect(typeof initArg.beforeSend).toBe("function");

    // beforeSend should return the event in test environment
    const sampleEvent = { message: "test" };
    const beforeSendResult = initArg.beforeSend(sampleEvent);
    expect(beforeSendResult).toBe(sampleEvent);

    // Module attempts to expose Sentry on window; our mock object doesn't do that,
    // but we at least ensure init was called with correct args.
    consoleLog.mockRestore();
    consoleWarn.mockRestore();
  });

  it("catches and logs errors thrown by Sentry.init", async () => {
    vi.stubEnv("VITE_SENTRY_DSN", "https://will-throw/1");

    // Make our hoisted init mock throw for this test
    initMock.mockImplementationOnce(() => {
      throw new Error("init failed");
    });

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const mod = await import("../sentry");

    // initializeSentry should swallow the thrown error and not propagate
    expect(() => mod.initializeSentry()).not.toThrow();
    // And should have logged the error
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
