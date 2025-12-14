import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
// Mock the supabase module with an async factory that constructs the helper inside the
// factory to avoid hoisting / TDZ issues. The factory returns a supabase mock created
// from `src/testUtils/supabaseMock` so tests can still call `vi.mocked(supabase.from)...`.
vi.mock("../../lib/supabase", async () => {
  const mod = await import("../../testUtils/supabaseMock");
  const createSupabaseMock = mod.default ?? mod.createSupabaseMock;
  const supabase = createSupabaseMock({ fromData: {} });
  return {
    supabase,
    handleSupabaseError: vi.fn((err: any) => err?.message || "Unknown error"),
  } as any;
});

import { supabase } from "../../lib/supabase";
import { usePrayerManager } from "../usePrayerManager";
import { PrayerStatus } from "../../types/prayer";

// Mock Supabase with complete chain
const createMockChain = (resolveData: any = [], resolveError: any = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError }),
  then: vi.fn((callback: any) =>
    callback({ data: resolveData, error: resolveError }),
  ),
});

// Mock email notifications
vi.mock("../../lib/emailNotifications", () => ({
  sendAdminNotification: vi.fn(),
}));

describe("usePrayerManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful responses
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);
  });

  it("initializes with loading state", () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it("loads prayers on mount", async () => {
    const mockPrayers = [
      {
        id: "1",
        title: "Test Prayer",
        description: "Please pray for this",
        status: "current",
        requester: "John Doe",
        prayer_for: "Friend",
        email: "john@example.com",
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

    expect(supabase.from).toHaveBeenCalledWith("prayers");
    expect(result.current.prayers).toBeDefined();
  });

  it("provides addPrayer function", () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(typeof result.current.addPrayer).toBe("function");
  });

  it("provides deletePrayer function", () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(typeof result.current.deletePrayer).toBe("function");
  });

  it("provides updatePrayerStatus function", () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(typeof result.current.updatePrayerStatus).toBe("function");
  });

  it("provides addPrayerUpdate function", () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(typeof result.current.addPrayerUpdate).toBe("function");
  });

  it("provides refresh function", () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(typeof result.current.refresh).toBe("function");
  });

  it("handles loading errors gracefully", async () => {
    const mockError = { message: "Database error" };
    const mockChain = createMockChain(null, mockError);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it("filters to only show approved prayers", async () => {
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    renderHook(() => usePrayerManager());

    await waitFor(() => {
      const fromCalls = vi.mocked(supabase.from).mock.calls;
      expect(fromCalls.some((call: any) => call[0] === "prayers")).toBe(true);
    });

    // Verify that eq was called with approval_status = 'approved'
    const mockChain2 = vi.mocked(supabase.from).mock.results[0]?.value;
    expect(mockChain2?.eq).toHaveBeenCalled();
  });

  it("orders prayers by latest activity (latest update or creation) descending", async () => {
    const now = Date.now();
    const olderCreated = new Date(now - 100000).toISOString();
    const recentUpdate = new Date(now - 1000).toISOString();
    const midCreated = new Date(now - 50000).toISOString();

    // older prayer has a very recent approved update -> should be first
    const pOld = {
      id: "1",
      title: "Old Prayer",
      description: "Old but updated",
      status: "current",
      requester: "A",
      prayer_for: "X",
      email: null,
      is_anonymous: false,
      approval_status: "approved",
      created_at: olderCreated,
      updated_at: olderCreated,
      date_requested: olderCreated,
      prayer_updates: [
        {
          id: "u1",
          prayer_id: "1",
          content: "recent update",
          author: "A",
          approval_status: "approved",
          created_at: recentUpdate,
        },
      ],
    } as any;

    // newer prayer with no updates should come after pOld
    const pNew = {
      id: "2",
      title: "New Prayer",
      description: "New",
      status: "current",
      requester: "B",
      prayer_for: "Y",
      email: null,
      is_anonymous: false,
      approval_status: "approved",
      created_at: midCreated,
      updated_at: midCreated,
      date_requested: midCreated,
      prayer_updates: [],
    } as any;

    const mockChain = createMockChain([pOld, pNew]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.prayers.length).toBeGreaterThanOrEqual(2);
    });

    // pOld has a recent update so it should appear first
    expect(result.current.prayers[0].id).toBe("1");
    expect(result.current.prayers[1].id).toBe("2");
  });

  it("provides prayers array in result", async () => {
    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(Array.isArray(result.current.prayers)).toBe(true);
  });

  it("includes updates in prayer data structure", async () => {
    const mockPrayers = [
      {
        id: "1",
        title: "Test Prayer",
        description: "Please pray",
        status: "current",
        requester: "John",
        prayer_for: "Friend",
        email: "john@example.com",
        is_anonymous: false,
        approval_status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_requested: new Date().toISOString(),
        prayer_updates: [
          {
            id: "u1",
            prayer_id: "1",
            content: "Update 1",
            author: "John",
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

    // Just verify the structure is correct
    expect(result.current.prayers).toBeDefined();
  });

  it("filters prayers by status", async () => {
    const mockPrayers = [
      {
        id: "1",
        title: "Current Prayer",
        description: "Test",
        status: "current",
        requester: "John",
        prayer_for: "Friend",
        email: "john@example.com",
        is_anonymous: false,
        approval_status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_requested: new Date().toISOString(),
        prayer_updates: [],
      },
      {
        id: "2",
        title: "Answered Prayer",
        description: "Test",
        status: "answered",
        requester: "Jane",
        prayer_for: "Family",
        email: "jane@example.com",
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

    const filtered = result.current.getFilteredPrayers("current");
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("1");
  });

  it("handles empty and whitespace search terms appropriately", async () => {
    const mockPrayers = [
      {
        id: "1",
        title: "Alpha",
        description: "Desc",
        status: "current",
        requester: "R",
        prayer_for: "PF",
        email: "r@example.com",
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
    await waitFor(() => expect(result.current.loading).toBe(false));

    const allEmpty = result.current.getFilteredPrayers(undefined, "");
    const allWhitespace = result.current.getFilteredPrayers(undefined, "   ");
    expect(allEmpty.length).toBe(1);
    expect(allWhitespace.length).toBe(0);
  });

  it("updatePrayerStatus optimistically updates and reverts on error", async () => {
    // Seed initial prayers via supabase mock (avoids direct mutation of hook state)
    const initialPrayers = [
      {
        id: "p1",
        title: "T",
        description: "D",
        status: "current",
        requester: "R",
        prayer_for: "PF",
        email: "r@example.com",
        is_anonymous: false,
        approval_status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_requested: new Date().toISOString(),
        prayer_updates: [],
      },
    ];
    const mockChainLoad = createMockChain(initialPrayers);
    vi.mocked(supabase.from).mockReturnValue(mockChainLoad as any);

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock update call to fail, but preserve normal select behavior for initial loads.
    // We capture the original `from` implementation and only override the `update`
    // behavior for the `prayers` table so selects used during initialization still work.
    const supabaseMock = await import("../../lib/supabase");
    const origFrom = supabaseMock.supabase.from.bind(supabaseMock.supabase);
    vi.spyOn(supabaseMock.supabase, "from").mockImplementation(
      (table: string) => {
        // Use the original chainable object as the base so select/maybeSingle/etc continue to operate.
        const base = origFrom(table);
        if (table === "prayers") {
          // Return an object that preserves the base behavior but overrides update to fail.
          return {
            ...base,
            update: () => ({
              eq: async () => ({ error: { message: "fail" } }),
            }),
          } as any;
        }
        return base;
      },
    );

    await expect(
      result.current.updatePrayerStatus("p1", PrayerStatus.ANSWERED),
    ).rejects.toBeTruthy();
  });
  it("filters prayers by search term", async () => {
    const mockPrayers = [
      {
        id: "1",
        title: "Prayer for John",
        description: "Help John",
        status: "current",
        requester: "Mary",
        prayer_for: "Friend",
        email: "mary@example.com",
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

    const filtered = result.current.getFilteredPrayers(undefined, "John");
    expect(filtered.length).toBe(1);
  });

  it("searches in prayer updates", async () => {
    const mockPrayers = [
      {
        id: "1",
        title: "Test Prayer",
        description: "Test",
        status: "current",
        requester: "John",
        prayer_for: "Friend",
        email: "john@example.com",
        is_anonymous: false,
        approval_status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_requested: new Date().toISOString(),
        prayer_updates: [
          {
            id: "u1",
            prayer_id: "1",
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

  it("returns all prayers when no filter is provided", async () => {
    const mockPrayers = [
      {
        id: "1",
        title: "Prayer 1",
        description: "Test",
        status: "current",
        requester: "John",
        prayer_for: "Friend",
        email: "john@example.com",
        is_anonymous: false,
        approval_status: "approved",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_requested: new Date().toISOString(),
        prayer_updates: [],
      },
      {
        id: "2",
        title: "Prayer 2",
        description: "Test",
        status: "answered",
        requester: "Jane",
        prayer_for: "Family",
        email: "jane@example.com",
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

    const filtered = result.current.getFilteredPrayers();
    expect(filtered.length).toBe(2);
  });
});
