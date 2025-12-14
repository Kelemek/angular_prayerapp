import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// createSupabaseMock import removed (not used in this test)

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
    fromData: { email_subscribers: [] },
  }) as any;

  const mockDirectQuery = vi.fn();
  const mockDirectMutation = vi.fn();

  return {
    supabase: supabaseMock,
    // Keep top-level helpers that some modules import directly
    directQuery: mockDirectQuery,
    directMutation: mockDirectMutation,
    functions: { invoke: supabaseMock.functions.invoke },
  } as any;
});

// Import the mocked binding used by the component under test
import { EmailSubscribers } from "../EmailSubscribers";
// Mutable supabase reference; will be set in beforeEach to the mocked instance
let currentSupabase: any;

// Helper: set in-memory subscriber rows and also mock global.fetch which
// the component uses for the REST-powered search path.
// Use `currentSupabase` so tests can rebind the supabase mock in beforeEach.
const setMockSubscriberData = (data: any[]) => {
  (currentSupabase as any).__testData.email_subscribers = data.slice();
  global.fetch = vi.fn().mockImplementation((url: string) => {
    // Simulate a simple REST endpoint that supports query params "q" (search)
    try {
      const urlObj = new URL(url);
      const q = urlObj.searchParams.get("q") || "";
      // Read the current test data at the time fetch is called so tests that
      // mutate __testData after calling setMockSubscriberData are reflected.
      const all = (currentSupabase as any).__testData.email_subscribers || [];
      const filtered = all.filter((s) => {
        if (!q) return true;
        const token = q.toLowerCase();
        return (
          (s.name || "").toLowerCase().includes(token) ||
          (s.email || "").toLowerCase().includes(token)
        );
      });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(filtered),
      });
    } catch {
      const all = (currentSupabase as any).__testData.email_subscribers || [];
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(all),
      });
    }
  });
};

describe("EmailSubscribers Component", () => {
  beforeEach(async () => {
    // Reset module registry so any module-level cached state (like __testData)
    // is cleared between tests. Then re-import the mocked supabase module so
    // we can point `currentSupabase` at the fresh mock instance.
    vi.resetModules();
    // Re-import the mocked binding; because we have a vi.mock factory above,
    // this import will return the mocked module instance for this test run.
    const mod = await import("../../lib/supabase");
    // Update our mutable reference to point at the (mocked) supabase instance.
    // @ts-ignore
    currentSupabase = (mod as any).supabase ?? currentSupabase;

    // Clear any spies/mocks and set defaults
    vi.clearAllMocks();
    // default empty fetch result
    setMockSubscriberData([]);
    // safe default for confirm dialogs
    // @ts-ignore
    global.confirm = vi.fn(() => true);
  });

  it("renders the component with header and controls", () => {
    render(<EmailSubscribers />);

    expect(
      screen.getByRole("heading", { name: /email notification subscribers/i }),
    ).toBeDefined();
    expect(
      screen.getByPlaceholderText(/search by name or email/i),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /upload csv/i })).toBeDefined();
    expect(
      screen.getByRole("button", { name: /add subscriber/i }),
    ).toBeDefined();
  });

  it("performs search via fetch and displays results", async () => {
    const user = userEvent.setup();
    const mockSubscribers = [
      {
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        is_active: true,
        created_at: "2025-01-01T00:00:00Z",
      },
    ];
    setMockSubscriberData(mockSubscribers);

    render(<EmailSubscribers />);

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    const searchButton = screen.getByRole("button", { name: /^search$/i });

    await user.type(searchInput, "John");
    await user.click(searchButton);

    await waitFor(() => {
      // Confirm we called the REST endpoint via fetch
      expect(global.fetch).toHaveBeenCalled();
      // And results are rendered
      expect(screen.getByText("John Doe")).toBeDefined();
      expect(screen.getByText("john@example.com")).toBeDefined();
    });
  });

  it('shows "no subscribers found" when the search returns empty', async () => {
    const user = userEvent.setup();
    setMockSubscriberData([]);

    render(<EmailSubscribers />);

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    const searchButton = screen.getByRole("button", { name: /^search$/i });

    await user.type(searchInput, "Nobody");
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/no subscribers found/i)).toBeDefined();
    });
  });

  it("adds a subscriber using the shared supabase mock", async () => {
    const user = userEvent.setup();
    // start with empty table
    setMockSubscriberData([]);

    render(<EmailSubscribers />);

    // Open add-subscriber UI
    const addButton = screen.getAllByRole("button", {
      name: /add subscriber/i,
    })[0];
    await user.click(addButton);

    // Fill and submit form (component labels/placeholder used by UI)
    const nameInput = screen.getByPlaceholderText(/john doe/i);
    const emailInput = screen.getByPlaceholderText(/john@example.com/i);
    await user.type(nameInput, "New User");
    await user.type(emailInput, "newuser@example.com");

    // Click the add button in the form (there may be multiple Add buttons; pick the visible one)
    // Click the add button in the form (component labels/placeholder used by UI)
    const submitButtons = screen.getAllByRole("button", {
      name: /add subscriber/i,
    });
    const submit =
      submitButtons.find((b) => b !== addButton) || submitButtons[0];
    await user.click(submit);

    // Wait for the component to call supabase.insert(...) and for our factory to persist the row
    await waitFor(() => {
      // The factory mutates __testData when insert/select is used
      const rows = (currentSupabase as any).__testData.email_subscribers || [];
      expect(rows.some((r: any) => r.email === "newuser@example.com")).toBe(
        true,
      );
    });

    // Trigger a search so the component renders the subscribers list (the UI only shows results after a search)
    const searchButton = screen.getByRole("button", { name: /^search$/i });
    await user.click(searchButton);

    // UI should show the new subscriber in the list (component reloads from DB or fetch)
    await waitFor(() => {
      expect(screen.getByText("New User")).toBeDefined();
      expect(screen.getByText("newuser@example.com")).toBeDefined();
    });
  });

  it("removes a subscriber when confirmed", async () => {
    const user = userEvent.setup();
    const existing = {
      id: "del-1",
      name: "Removable",
      email: "remove@example.com",
      is_active: true,
      created_at: "2025-01-02T00:00:00Z",
    };
    setMockSubscriberData([existing]);

    render(<EmailSubscribers />);

    // Trigger initial search/listing so the item is visible
    const searchButton = screen.getByRole("button", { name: /^search$/i });
    await user.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText("Removable")).toBeDefined();
    });

    // Click delete icon/button - try several robust selectors so tests don't
    // fail when the component uses slightly different title/labels.
    // Locate the subscriber name node so we can scope searches to its row.
    const nameNode = screen.getByText("Removable");
    const row =
      nameNode &&
      (nameNode.closest && nameNode.closest("tr")
        ? (nameNode.closest("tr") as HTMLElement)
        : (nameNode.parentElement as HTMLElement));
    let clicked = false;

    // 1) Non-throwing title query
    const titleButtons = screen.queryAllByTitle
      ? screen.queryAllByTitle(/remove|delete subscriber|delete/i)
      : [];
    if (titleButtons.length) {
      await user.click(titleButtons[0]);
      clicked = true;
    }

    // 2) Look for buttons inside the subscriber row by accessible name or label
    if (!clicked && row) {
      const byName =
        within(row).queryByRole("button", { name: /remove|delete/i }) ||
        within(row).queryByLabelText?.(/remove|delete/i);
      if (byName) {
        await user.click(byName as HTMLElement);
        clicked = true;
      }
    }

    // 3) Global queries: role with name
    if (!clicked) {
      const globalBtn =
        screen.queryByRole("button", { name: /remove|delete/i }) ||
        screen.queryByRole("button", { name: /delete subscriber/i });
      if (globalBtn) {
        await user.click(globalBtn);
        clicked = true;
      }
    }

    // 4) Data-testid fallbacks
    if (!clicked) {
      const testIdBtn = (screen.queryByTestId &&
        (screen.queryByTestId("delete-subscriber") ||
          screen.queryByTestId("remove-subscriber"))) as HTMLElement | null;
      if (testIdBtn) {
        await user.click(testIdBtn);
        clicked = true;
      }
    }

    // 5) Last resort: click the first button whose title/aria-label/text looks like remove/delete
    if (!clicked) {
      const allButtons = screen.queryAllByRole("button");
      const candidate = allButtons.find((b) =>
        /remove|delete/i.test(
          (
            b.title ||
            b.getAttribute("aria-label") ||
            b.textContent ||
            ""
          ).toString(),
        ),
      );
      if (candidate) {
        await user.click(candidate);
        clicked = true;
      }
    }

    // Confirm was called (we stubbed confirm to true in beforeEach)
    expect(global.confirm).toHaveBeenCalled();

    // After deletion the factory should have removed the row
    await waitFor(() => {
      const rows = (currentSupabase as any).__testData.email_subscribers || [];
      expect(rows.find((r: any) => r.id === "del-1")).toBeUndefined();
    });

    // UI should no longer contain the removed subscriber
    await waitFor(() => {
      expect(screen.queryByText("Removable")).toBeNull();
    });
  });
});
