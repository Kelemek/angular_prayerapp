import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the supabase module
vi.mock("../../lib/supabase", async () => {
  const mod = await import("../../testUtils/supabaseMock");
  const createSupabaseMock = mod.default ?? mod.createSupabaseMock;
  const supabase = createSupabaseMock({ fromData: {} });
  return {
    supabase,
    handleSupabaseError: vi.fn((err: any) => err?.message || "Unknown error"),
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

    // Wait for the reload to be triggered
    await waitFor(() => {
      expect(vi.mocked(supabase.from).mock.calls.length).toBeGreaterThan(initialCallCount);
    });
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
    // Fix: eq should return this for chaining, then resolve at the end
    mockChain.eq = vi.fn().mockReturnValue(
      Promise.resolve({ data: null, error: null })
    );

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

  it("converts null description to default text", async () => {
    const mockPrayers = [
      {
        id: "p1",
        title: "Test",
        description: null, // Null description
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

    expect(result.current.prayers[0].description).toBe("No description provided");
  });

  it("handles prayer with single update object instead of array", async () => {
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
        // Single update object instead of array
        prayer_updates: {
          id: "u1",
          prayer_id: "p1",
          content: "Update",
          author: "John",
          approval_status: "approved",
          created_at: new Date().toISOString(),
        },
      },
    ];

    const mockChain = createMockChain(mockPrayers);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should handle single object and convert to array
    expect(result.current.prayers[0].updates).toHaveLength(1);
  });

  it("filters prayers by status correctly", async () => {
    const mockPrayers = [
      {
        id: "p1",
        title: "Current Prayer",
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
      {
        id: "p2",
        title: "Answered Prayer",
        description: "Test",
        status: "answered",
        requester: "Jane",
        prayer_for: "Family",
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

    const currentPrayers = result.current.getFilteredPrayers(PrayerStatus.CURRENT);
    expect(currentPrayers).toHaveLength(1);
    expect(currentPrayers[0].status).toBe(PrayerStatus.CURRENT);

    const answeredPrayers = result.current.getFilteredPrayers(PrayerStatus.ANSWERED);
    expect(answeredPrayers).toHaveLength(1);
    expect(answeredPrayers[0].status).toBe(PrayerStatus.ANSWERED);
  });

  it("returns all prayers when no search term or status filter provided", async () => {
    const mockPrayers = [
      {
        id: "p1",
        title: "Prayer 1",
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
      {
        id: "p2",
        title: "Prayer 2",
        description: "Test",
        status: "answered",
        requester: "Jane",
        prayer_for: "Family",
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

    const allPrayers = result.current.getFilteredPrayers();
    expect(allPrayers).toHaveLength(2);
  });

  it("filters prayers with non-string field values", async () => {
    const mockPrayers = [
      {
        id: "p1",
        title: "Test Prayer",
        description: "Description here",
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

    // Should match on string fields
    const filtered = result.current.getFilteredPrayers(undefined, "Description");
    expect(filtered).toHaveLength(1);

    // Should not match non-existent
    const notFiltered = result.current.getFilteredPrayers(undefined, "nonexistent");
    expect(notFiltered).toHaveLength(0);
  });
});
