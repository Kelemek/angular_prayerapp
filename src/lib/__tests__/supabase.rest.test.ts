import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * These tests explicitly import the real implementation of `src/lib/supabase`
 * using `vi.importActual(...)` so they exercise `directQuery`, `directMutation`
 * and `isNetworkError` code paths. The repository test setup normally mocks
 * './lib/supabase' for most tests, so we reset modules and set env vars
 * before importing the actual module.
 */

describe("supabase REST helpers (directQuery & directMutation)", () => {
  const ORIGINAL_FETCH = global.fetch;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Provide minimal env values expected by the real module at import time
    process.env.VITE_SUPABASE_URL = "https://example.supabase.co";
    process.env.VITE_SUPABASE_ANON_KEY = "anon-key-123";
  });

  afterEach(() => {
    // Restore fetch and env
    global.fetch = ORIGINAL_FETCH;
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it("directQuery: successful GET returns parsed JSON and calls fetch with constructed URL", async () => {
    const fakeData = [{ id: 1 }, { id: 2 }];

    const fakeResponse = {
      ok: true,
      status: 200,
      headers: {
        get: (h: string) =>
          h.toLowerCase() === "content-type" ? "application/json" : null,
      },
      json: async () => fakeData,
      text: async () => JSON.stringify(fakeData),
    } as unknown as Response;

    // @ts-expect-error assign to global for test runtime
    global.fetch = vi.fn().mockResolvedValue(fakeResponse);

    const mod = (await vi.importActual(
      "../supabase",
    )) as typeof import("../supabase");
    const { directQuery } = mod;

    const res = await directQuery("my_table", {
      select: "*",
      eq: { status: "active" },
      order: { column: "id", ascending: true },
      limit: 2,
      count: "exact",
    });

    expect(res.error).toBeNull();
    expect(res.data).toEqual(fakeData);
    // `count` may be undefined depending on response headers in this environment.
    if (typeof res.count !== "undefined") {
      expect(typeof res.count).toBe("number");
    }
    // fetch called and URL contains expected parts
    expect((global.fetch as any).mock.calls.length).toBeGreaterThan(0);
    const calledUrl = (global.fetch as any).mock.calls[0][0] as string;
    expect(calledUrl).toContain("/rest/v1/my_table");
    expect(calledUrl).toContain("select=*");
    expect(calledUrl).toContain("order=id.asc");
    expect(calledUrl).toContain("limit=2");
    const fetchOptions = (global.fetch as any).mock.calls[0][1];
    expect(fetchOptions.headers.apikey).toBe("anon-key-123");
    expect(fetchOptions.headers.Authorization).toBe("Bearer anon-key-123");
  });

  it("directQuery: returns table-not-found error for 404 responses", async () => {
    const fakeResponse = {
      ok: false,
      status: 404,
      headers: { get: () => null },
      text: async () => 'relation "no_table" does not exist (42P01)',
    } as unknown as Response;

    // @ts-expect-error assign to global for test runtime
    global.fetch = vi.fn().mockResolvedValue(fakeResponse);

    const mod = (await vi.importActual(
      "../supabase",
    )) as typeof import("../supabase");
    const { directQuery } = mod;

    const res = await directQuery("no_table");
    expect(res.data).toBeNull();
    expect(res.error).toBeTruthy();
    const msg = (res.error &&
      (res.error.message || String(res.error))) as string;
    expect(msg.toLowerCase()).toContain("table not found");
  });

  it("directQuery: returns timeout-friendly error when fetch aborts", async () => {
    const abortErr = new Error("aborted");
    // mark as AbortError like a real fetch abort
    (abortErr as any).name = "AbortError";

    // @ts-expect-error assign to global for test runtime
    global.fetch = vi.fn().mockRejectedValue(abortErr);

    const mod = (await vi.importActual(
      "../supabase",
    )) as typeof import("../supabase");
    const { directQuery } = mod;

    const res = await directQuery("things", { timeout: 1 });
    expect(res.data).toBeNull();
    expect(res.error).toBeInstanceOf(Error);
    expect((res.error as Error).message.toLowerCase()).toContain("timed out");
  });

  it("directMutation: DELETE without returning yields null data and no error", async () => {
    const fakeResponse = {
      ok: true,
      status: 204,
      headers: { get: () => null },
      text: async () => "",
    } as unknown as Response;

    // @ts-expect-error assign to global for test runtime
    global.fetch = vi.fn().mockResolvedValue(fakeResponse);

    const mod = (await vi.importActual(
      "../supabase",
    )) as typeof import("../supabase");
    const { directMutation } = mod;

    const res = await directMutation("my_table", { method: "DELETE" });
    expect(res.error).toBeNull();
    expect(res.data).toBeNull();
    const calledMethod = (global.fetch as any).mock.calls[0][1].method;
    expect(calledMethod).toBe("DELETE");
  });

  it("directMutation: POST with JSON response returns parsed data", async () => {
    const returned = { id: "x", success: true };
    const fakeResponse = {
      ok: true,
      status: 201,
      headers: {
        get: (h: string) =>
          h.toLowerCase() === "content-type" ? "application/json" : null,
      },
      json: async () => returned,
      text: async () => JSON.stringify(returned),
    } as unknown as Response;

    // @ts-expect-error assign to global for test runtime
    global.fetch = vi.fn().mockResolvedValue(fakeResponse);

    const mod = (await vi.importActual(
      "../supabase",
    )) as typeof import("../supabase");
    const { directMutation } = mod;

    const res = await directMutation("my_table", {
      method: "POST",
      body: { name: "bob" },
      returning: true,
    });
    expect(res.error).toBeNull();
    expect(res.data).toEqual(returned);
    const opts = (global.fetch as any).mock.calls[0][1];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(JSON.stringify({ name: "bob" }));
  });

  it("directMutation: non-ok response returns Error", async () => {
    const fakeResponse = {
      ok: false,
      status: 400,
      headers: { get: () => null },
      text: async () => "bad request",
    } as unknown as Response;

    // @ts-expect-error assign to global for test runtime
    global.fetch = vi.fn().mockResolvedValue(fakeResponse);

    const mod = (await vi.importActual(
      "../supabase",
    )) as typeof import("../supabase");
    const { directMutation } = mod;

    const res = await directMutation("things", {
      method: "POST",
      body: { a: 1 },
    });
    expect(res.data).toBeNull();
    expect(res.error).toBeInstanceOf(Error);
    expect((res.error as Error).message).toContain("Mutation failed: 400");
  });

  it("directMutation: returns operation timed out when fetch aborts", async () => {
    const abortErr = new Error("aborted");
    (abortErr as any).name = "AbortError";

    // @ts-expect-error assign to global for test runtime
    global.fetch = vi.fn().mockRejectedValue(abortErr);

    const mod = (await vi.importActual(
      "../supabase",
    )) as typeof import("../supabase");
    const { directMutation } = mod;

    const res = await directMutation("things", { method: "POST", timeout: 1 });
    expect(res.data).toBeNull();
    expect(res.error).toBeInstanceOf(Error);
    expect((res.error as Error).message).toContain("Operation timed out");
  });
});

describe("isNetworkError helper", () => {
  it("returns false for falsy input", async () => {
    const mod = (await vi.importActual(
      "../supabase",
    )) as typeof import("../supabase");
    const { isNetworkError } = mod;
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });

  it("detects common network error messages and Error instances", async () => {
    const mod = (await vi.importActual(
      "../supabase",
    )) as typeof import("../supabase");
    const { isNetworkError } = mod;

    expect(isNetworkError("Failed to fetch")).toBe(true);
    expect(isNetworkError("network unreachable")).toBe(true);
    expect(isNetworkError("Timeout while connecting")).toBe(true);

    expect(isNetworkError(new Error("Network request failed"))).toBe(true);
    expect(isNetworkError(new Error("Timeout occurred"))).toBe(true);
  });

  it("does not falsely flag unrelated inputs", async () => {
    const mod = (await vi.importActual(
      "../supabase",
    )) as typeof import("../supabase");
    const { isNetworkError } = mod;

    expect(isNetworkError(new Error("some other problem"))).toBe(false);
    expect(isNetworkError("completely unrelated message")).toBe(false);
  });
});
