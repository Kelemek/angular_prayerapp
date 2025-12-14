import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrayerSearch } from "../PrayerSearch";

/**
 * Replace the ad-hoc builder-style mock with the shared, chainable
 * `createSupabaseMock` factory. Tests call `setMockPrayerData` to update
 * the in-memory table used by the mock; the mock also exposes a
 * `__testData` field so tests can inspect/replace it directly.
 */

let mockPrayerData: any[] = [];

/*
  Create the supabase mock inside a vi.mock factory so Vitest's hoisting
  does not cause initialization-order ReferenceErrors. The factory
  will synchronously create a fresh mock and named helpers for modules
  that import them.
*/
vi.mock("../../lib/supabase", async () => {
  const mod = await import("../../testUtils/supabaseMock");
  const createSupabaseMock =
    (mod as any).default ?? (mod as any).createSupabaseMock;
  const supabaseMock = createSupabaseMock({
    fromData: { prayers: [] },
    functionsInvoke: async () => ({ data: null, error: null }),
  }) as any;

  // Initialize the internal table data. Tests will update this via setMockPrayerData.
  supabaseMock.__testData.prayers = [];

  const mockDirectQuery = vi.fn();
  const mockDirectMutation = vi.fn();

  return {
    supabase: supabaseMock,
    directQuery: mockDirectQuery,
    directMutation: mockDirectMutation,
  } as any;
});

// Import the mocked module used by the application code.
import { supabase } from "../../lib/supabase";

// Helper to update test data and the global fetch mock (some code uses both)
const setMockPrayerData = (data: any[]) => {
  mockPrayerData = data;
  (supabase as any).__testData.prayers = mockPrayerData;

  // Keep the fetch mock compatible with code paths that call the REST endpoint.
  global.fetch = vi.fn().mockImplementation((url: string) => {
    let filteredData = [...mockPrayerData];

    // Try to parse query params and apply simple filters used by the component.
    try {
      const urlObj = new URL(url);
      const statusParam = urlObj.searchParams.get("status");
      const approvalParam = urlObj.searchParams.get("approval_status");

      if (statusParam && statusParam.startsWith("eq.")) {
        const val = statusParam.replace("eq.", "");
        filteredData = filteredData.filter((p) => p.status === val);
      }
      if (approvalParam && approvalParam.startsWith("eq.")) {
        const val = approvalParam.replace("eq.", "");
        filteredData = filteredData.filter((p) => p.approval_status === val);
      }
    } catch (e) {
      // ignore URL parsing failures in tests
    }

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(filteredData),
    });
  });
};

describe("PrayerSearch Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to empty data
    setMockPrayerData([]);

    // Safe defaults for browser APIs used by the component
    // @ts-ignore
    global.confirm = vi.fn(() => true);
  });

  it("renders the search component with header and input", () => {
    render(<PrayerSearch />);
    expect(
      screen.getByRole("heading", { name: /prayer editor/i }),
    ).toBeDefined();
    expect(
      screen.getByPlaceholderText(
        /Search by title, requester, email, description, or denial reasons/i,
      ),
    ).toBeDefined();
    const searchButton = screen.getByRole("button", { name: /^search$/i });
    expect(searchButton).toBeDefined();
  });

  it("allows typing in the search input", async () => {
    const user = userEvent.setup();
    render(<PrayerSearch />);
    const searchInput = screen.getByPlaceholderText(
      /Search by title, requester, email, description, or denial reasons/i,
    ) as HTMLInputElement;
    await user.type(searchInput, "John");
    expect(searchInput.value).toBe("John");
  });

  it("performs search and displays results from supabase mock", async () => {
    const user = userEvent.setup();
    const mockPrayers = [
      {
        id: "1",
        title: "Test Prayer",
        requester: "John Doe",
        email: "john@example.com",
        status: "current",
        approval_status: "approved",
        created_at: "2025-01-01T00:00:00Z",
        prayer_updates: [],
      },
    ];

    setMockPrayerData(mockPrayers);
    render(<PrayerSearch />);

    const searchInput = screen.getByPlaceholderText(
      /Search by title, requester, email, description, or denial reasons/i,
    );
    const searchButton = screen.getByRole("button", { name: /^search$/i });

    await user.type(searchInput, "John");
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Test Prayer")).toBeDefined();
      expect(screen.getByText(/John Doe/)).toBeDefined();
    });
  });

  it("performs search on Enter key and shows single result", async () => {
    const user = userEvent.setup();
    const mockPrayers = [
      {
        id: "1",
        title: "Test Prayer",
        requester: "John Doe",
        email: "john@example.com",
        status: "current",
        approval_status: "approved",
        created_at: "2025-01-01T00:00:00Z",
        prayer_updates: [],
      },
    ];

    setMockPrayerData(mockPrayers);
    render(<PrayerSearch />);
    const searchInput = screen.getByPlaceholderText(
      /Search by title, requester, email, description, or denial reasons/i,
    );
    await user.type(searchInput, "John{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Test Prayer")).toBeDefined();
    });
  });

  it('displays "no prayers found" message when search returns empty', async () => {
    const user = userEvent.setup();
    setMockPrayerData([]);
    render(<PrayerSearch />);
    const searchInput = screen.getByPlaceholderText(
      /Search by title, requester, email, description, or denial reasons/i,
    );
    const searchButton = screen.getByRole("button", { name: /^search$/i });
    await user.type(searchInput, "NonexistentUser");
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/no prayers found/i)).toBeDefined();
    });
  });
});
