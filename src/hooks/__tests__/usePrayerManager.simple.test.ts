import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase module
vi.mock("../../lib/supabase", async () => {
  const mod = await import("../../testUtils/supabaseMock");
  const createSupabaseMock = mod.default ?? mod.createSupabaseMock;
  const supabase = createSupabaseMock({ fromData: {} });
  return {
    supabase,
    handleSupabaseError: vi.fn((err: any) => {
      console.error('Supabase error:', err);
      return err?.message || "Unknown error";
    }),
  } as any;
});

// Mock email notifications
vi.mock("../../lib/emailNotifications", () => ({
  sendAdminNotification: vi.fn().mockResolvedValue(null),
}));

// Mock error logger
vi.mock("../../lib/errorLogger", () => ({
  logError: vi.fn(),
  logWarning: vi.fn(),
}));

import { supabase, handleSupabaseError } from "../../lib/supabase";
import { usePrayerManager } from "../usePrayerManager";
import { PrayerStatus } from "../../types/prayer";
import { sendAdminNotification } from "../../lib/emailNotifications";
import { logError } from "../../lib/errorLogger";

// Helper to create a complete mock chain
const createMockChain = (resolveData: any = [], resolveError: any = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError }),
  single: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError }),
  then: vi.fn((callback: any) =>
    callback({ data: resolveData, error: resolveError })
  ),
});

describe("usePrayerManager - Simple Coverage Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles timeout/abort error gracefully", async () => {
    const abortError = new Error("AbortError");
    abortError.name = "AbortError";

    const mockChain = createMockChain();
    mockChain.order = vi.fn().mockRejectedValue(abortError);

    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain("timed out");
  });

  it("handles visibility change event", async () => {
    const mockPrayers = [
      {
        id: "1",
        title: "Test",
        description: "Test",
        status: "current",
        requester: "John",
        prayer_for: "Friend",
        email: null,
        is_anonymous: false,
        approval_status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_requested: new Date().toISOString(),
        prayer_updates: [],
      },
    ];

    const mockChain = createMockChain(mockPrayers);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = vi.mocked(supabase.from).mock.calls.length;

    // Simulate visibility change
    Object.defineProperty(document, "visibilityState", {
      writable: true,
      configurable: true,
      value: "visible",
    });

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    // Give it a moment to trigger the reload
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(vi.mocked(supabase.from).mock.calls.length).toBeGreaterThan(initialCallCount);
  });

  it("searches in update content", async () => {
    const mockPrayers = [
      {
        id: "p1",
        title: "Test Prayer",
        description: "Test",
        status: "current",
        requester: "John",
        prayer_for: "Friend",
        email: null,
        is_anonymous: false,
        approval_status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_requested: new Date().toISOString(),
        prayer_updates: [
          {
            id: "u1",
            prayer_id: "p1",
            content: "Great news about the situation",
            author: "Admin",
            approval_status: "approved",
            created_at: new Date().toISOString(),
          },
        ],
      },
    ];

    const mockChain = createMockChain(mockPrayers);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const filtered = result.current.getFilteredPrayers(undefined, "situation");
    expect(filtered.length).toBe(1);
  });

  it("handles updates sorting", async () => {
    const now = Date.now();
    const mockPrayers = [
      {
        id: "p1",
        title: "Test",
        description: "Test",
        status: "current",
        requester: "John",
        prayer_for: "Friend",
        email: null,
        is_anonymous: false,
        approval_status: "approved",
        created_at: new Date(now - 10000).toISOString(),
        updated_at: new Date(now - 10000).toISOString(),
        date_requested: new Date(now - 10000).toISOString(),
        prayer_updates: [
          {
            id: "u1",
            prayer_id: "p1",
            content: "Old update",
            author: "John",
            approval_status: "approved",
            created_at: new Date(now - 5000).toISOString(),
          },
          {
            id: "u2",
            prayer_id: "p1",
            content: "Newer update",
            author: "Jane",
            approval_status: "approved",
            created_at: new Date(now - 1000).toISOString(),
          },
        ],
      },
    ];

    const mockChain = createMockChain(mockPrayers);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have updates sorted newest first
    expect(result.current.prayers[0].updates[0].id).toBe("u2");
    expect(result.current.prayers[0].updates[1].id).toBe("u1");
  });

  it("deletes prayer update successfully", async () => {
    const mockPrayers = [
      {
        id: "p1",
        title: "Test",
        description: "Test",
        status: "current",
        requester: "John",
        prayer_for: "Friend",
        email: null,
        is_anonymous: false,
        approval_status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_requested: new Date().toISOString(),
        prayer_updates: [],
      },
    ];

    const mockChain = createMockChain(mockPrayers);
    mockChain.eq = vi.fn().mockResolvedValue({ data: null, error: null });

    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deletePrayerUpdate("u1");
    });

    // Should call loadPrayers after delete
    expect(supabase.from).toHaveBeenCalledWith("prayer_updates");
  });

  it("handles non-Error in catch block", async () => {
    const mockChain = createMockChain();
    mockChain.order = vi.fn().mockRejectedValue("String error");

    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to load prayers");
  });

  it("logs error when load fails", async () => {
    const mockError = { message: "Database connection failed" };
    const mockChain = createMockChain(null, mockError);

    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to load prayers from Supabase",
        error: mockError,
      })
    );
  });
});
