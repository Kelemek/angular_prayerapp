import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createSupabaseMock } from "../../testUtils/supabaseMock";
import userEvent from "@testing-library/user-event";
import { UserSettings } from "../UserSettings";
import { supabase } from "../../lib/supabase";

// Mock dependencies
// Use the shared chainable supabase mock so .maybeSingle/.order exist in tests
vi.mock("../../lib/supabase", async () => {
  const mod = await import("../../testUtils/supabaseMock");
  const sup = mod.createSupabaseMock({
    fromData: {
      admin_settings: [{ id: 1, require_email_verification: false }],
    },
  }) as any;
  return { supabase: sup };
});

vi.mock("../../lib/emailNotifications", () => ({
  sendPreferenceChangeNotification: vi.fn(),
}));

vi.mock("../../utils/printablePrayerList", () => ({
  downloadPrintablePrayerList: vi.fn(),
}));

vi.mock("../../utils/printablePromptList", () => ({
  downloadPrintablePromptList: vi.fn(),
}));

vi.mock("../../utils/userInfoStorage", () => ({
  getUserInfo: vi.fn(() => ({
    firstName: "",
    lastName: "",
    email: "",
  })),
}));

describe("UserSettings", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock window.open
    window.open = vi.fn(() => ({
      close: vi.fn(),
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
    })) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("renders nothing when isOpen is false", () => {
      const { container } = render(
        <UserSettings isOpen={false} onClose={mockOnClose} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders the settings modal when isOpen is true", () => {
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText("Settings")).toBeDefined();
      expect(screen.getByText("Prayer Notification Settings")).toBeDefined();
      expect(
        screen.getByPlaceholderText("your.email@example.com"),
      ).toBeDefined();
    });

    it("displays all theme options", () => {
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText("Light")).toBeDefined();
      expect(screen.getByText("Dark")).toBeDefined();
      expect(screen.getByText("System")).toBeDefined();
    });

    it("displays print buttons", () => {
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText("Print Prayer List")).toBeDefined();
      expect(screen.getByText("Print Prompts")).toBeDefined();
    });

    it("shows name input only after email is entered", async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      // Name input should not be visible initially
      expect(screen.queryByPlaceholderText("John Doe")).toBeNull();

      // Enter email
      await user.type(
        screen.getByPlaceholderText("your.email@example.com"),
        "test@example.com",
      );

      // Name input should now be visible
      await waitFor(() => {
        expect(screen.getByPlaceholderText("John Doe")).toBeDefined();
      });
    });
  });

  describe("Close Button", () => {
    it("calls onClose when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      const closeButtons = screen.getAllByRole("button");
      const headerCloseButton = closeButtons.find((btn) =>
        btn.querySelector("svg"),
      );

      if (headerCloseButton) {
        await user.click(headerCloseButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it("calls onClose when Close button is clicked", async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.click(screen.getByText("Close"));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Theme Selection", () => {
    it("defaults to system theme if no saved preference", () => {
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      const systemButton = screen.getByText("System").closest("button");
      expect(systemButton?.className).toContain("border-blue-500");
    });

    it("applies light theme to document", async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.click(screen.getByText("Light"));

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("applies dark theme to document", async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.click(screen.getByText("Dark"));

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("applies system theme based on media query", async () => {
      const user = userEvent.setup();

      // Mock prefers-color-scheme: dark
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.click(screen.getByText("System"));

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Loading User Preferences", () => {
    it("loads user info from localStorage on open", async () => {
      const { getUserInfo } = await import("../../utils/userInfoStorage");
      vi.mocked(getUserInfo).mockReturnValue({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      });

      // Ensure prayer_types table exists for fetchPrayerTypes which chains .order(...)
      (supabase as any).__testData.prayer_types = [];

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("your.email@example.com"),
        ).toHaveProperty("value", "john@example.com");
      });
    });

    it("loads pending preference changes from database", async () => {
      const { getUserInfo } = await import("../../utils/userInfoStorage");
      vi.mocked(getUserInfo).mockReturnValue({
        firstName: "",
        lastName: "",
        email: "test@example.com",
      });

      // Populate factory test data for the tables used by UserSettings.
      // Using the shared factory's __testData avoids having to implement a
      // custom chainable mock for each call (select().eq().order()...).
      (supabase as any).__testData.admin_settings = [{ value: false }];
      (supabase as any).__testData.prayer_types = [];
      (supabase as any).__testData.pending_preference_changes = [
        {
          id: "pending-1",
          name: "Test User",
          email: "test@example.com",
          receive_new_prayer_notifications: false,
          approval_status: "pending",
        },
      ];
      (supabase as any).__testData.email_subscribers = [];

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await waitFor(
        () => {
          const checkbox = screen.getByRole("checkbox");
          expect(checkbox).toHaveProperty("checked", false);
        },
        { timeout: 2000 },
      );
    });

    it("loads approved subscriber preferences when no pending changes", async () => {
      const { getUserInfo } = await import("../../utils/userInfoStorage");
      vi.mocked(getUserInfo).mockReturnValue({
        firstName: "",
        lastName: "",
        email: "subscriber@example.com",
      });

      // Populate factory test data for the admin/subscriber and prayer types tables.
      (supabase as any).__testData.admin_settings = [{ value: false }];
      (supabase as any).__testData.prayer_types = [];
      (supabase as any).__testData.pending_preference_changes = [];
      (supabase as any).__testData.email_subscribers = [
        {
          id: "sub-1",
          email: "subscriber@example.com",
          receive_new_prayer_notifications: true,
        },
      ];

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await waitFor(
        () => {
          const checkbox = screen.getByRole("checkbox");
          expect(checkbox).toHaveProperty("checked", true);
        },
        { timeout: 3000 },
      );
    });
  });

  describe("Email and Name Input", () => {
    it("updates email value when typed", async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      const emailInput = screen.getByPlaceholderText("your.email@example.com");
      await user.type(emailInput, "new@example.com");

      expect(emailInput).toHaveProperty("value", "new@example.com");
    });

    it("updates name value when typed", async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      // First enter email to show name field
      await user.type(
        screen.getByPlaceholderText("your.email@example.com"),
        "test@example.com",
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("John Doe")).toBeDefined();
      });

      const nameInput = screen.getByPlaceholderText("John Doe");
      await user.type(nameInput, "Jane Smith");

      expect(nameInput).toHaveProperty("value", "Jane Smith");
    });

    it("clears success message when email is changed", async () => {
      const user = userEvent.setup();

      // Instead of replacing the factory implementation (which can cause recursive delegation),
      // create a fresh delegating sup instance that shares the same __testData for delegation.
      const delegSup = createSupabaseMock({
        fromData: (supabase as any).__testData,
      }) as any;

      // Spy on the factory's from() so we can intercept inserts for pending_preference_changes.
      // We avoid binding the existing spy to prevent recursion.
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "pending_preference_changes") {
          // return an object that mirrors the minimal chain used by the component:
          // insert(...).select()
          const mockSelectId = vi
            .fn()
            .mockResolvedValue({ data: [{ id: "test-id-123" }], error: null });
          const mockInsert = vi.fn().mockReturnValue({ select: mockSelectId });
          return { insert: mockInsert };
        }
        // Delegate to a fresh implementation backed by the same __testData
        return delegSup.from(table);
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      // Fill in form and submit
      await user.type(
        screen.getByPlaceholderText("your.email@example.com"),
        "test@example.com",
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("John Doe")).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText("John Doe"), "Test User");
      await user.click(screen.getByText("Submit for Approval"));

      await waitFor(() => {
        expect(
          screen.getByText(/Your preference change has been submitted/i),
        ).toBeDefined();
      });

      // Change email - success should clear
      const emailInput = screen.getByPlaceholderText("your.email@example.com");
      await user.clear(emailInput);
      await user.type(emailInput, "new@example.com");

      expect(
        screen.queryByText(/Your preference change has been submitted/i),
      ).toBeNull();
    });
  });

  describe("Notification Toggle", () => {
    it("toggles notification preference when checkbox is clicked", async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveProperty("checked", true);

      await user.click(checkbox);
      expect(checkbox).toHaveProperty("checked", false);

      await user.click(checkbox);
      expect(checkbox).toHaveProperty("checked", true);
    });
  });

  describe("Save Preferences", () => {
    it("shows error when email is empty", async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      const submitButton = screen.getByText("Submit for Approval");
      expect(submitButton).toHaveProperty("disabled", true);
    });

    it("shows error when name is empty but email is filled", async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.type(
        screen.getByPlaceholderText("your.email@example.com"),
        "test@example.com",
      );

      await waitFor(() => {
        const submitButton = screen.getByText("Submit for Approval");
        expect(submitButton).toHaveProperty("disabled", true);
      });
    });

    it("successfully saves preferences", async () => {
      const user = userEvent.setup();

      // Use a delegating sup instance for safe delegation (avoids binding the existing spy).
      const delegSup = createSupabaseMock({
        fromData: (supabase as any).__testData,
      }) as any;

      // Create a stable mock object so repeated calls to supabase.from('pending_preference_changes')
      // return the same spy instances. This ensures assertions that inspect the returned object
      // from supabase.from(...) see the exact spies used by the component.
      const pendingMockSelect = vi
        .fn()
        .mockResolvedValue({ data: [{ id: "test-id-123" }], error: null });
      const pendingMockInsert = vi
        .fn()
        .mockReturnValue({ select: pendingMockSelect });
      const pendingResObj = { insert: pendingMockInsert };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "pending_preference_changes") {
          return pendingResObj;
        }
        return delegSup.from(table);
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.type(
        screen.getByPlaceholderText("your.email@example.com"),
        "test@example.com",
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("John Doe")).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText("John Doe"), "Test User");
      await user.click(screen.getByText("Submit for Approval"));

      // Because we're intercepting insert, assert the insert spy was called by checking
      // the mock on the current implementation
      // Find the mock insert via calling from() to get the object we returned above
      const resObj: any = (supabase.from as any)("pending_preference_changes");
      expect(resObj.insert).toBeDefined();
      await waitFor(() => {
        expect(resObj.insert).toHaveBeenCalledWith({
          name: "Test User",
          email: "test@example.com",
          receive_new_prayer_notifications: true,
        });
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Your preference change has been submitted/i),
        ).toBeDefined();
      });
    });

    it("converts email to lowercase when saving", async () => {
      const user = userEvent.setup();

      const delegSup = createSupabaseMock({
        fromData: (supabase as any).__testData,
      }) as any;

      // Stable object for pending_preference_changes used in this test so assertions
      // that read the object see the same spies the component used.
      const lowercaseMockInsert = vi.fn().mockReturnValue({
        select: vi
          .fn()
          .mockResolvedValue({ data: [{ id: "test-id-123" }], error: null }),
      });
      const lowercaseMockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      }));
      const lowercaseResObj = {
        select: lowercaseMockSelect,
        insert: lowercaseMockInsert,
      };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "pending_preference_changes") {
          return lowercaseResObj;
        }
        return delegSup.from(table);
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.type(
        screen.getByPlaceholderText("your.email@example.com"),
        "TEST@EXAMPLE.COM",
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("John Doe")).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText("John Doe"), "Test User");
      await user.click(screen.getByText("Submit for Approval"));

      // Ensure insert was called with lowercase email by inspecting the mock insert we provided
      const resObj: any = (supabase.from as any)("pending_preference_changes");
      expect(resObj.insert).toBeDefined();
      await waitFor(() => {
        expect(resObj.insert).toHaveBeenCalledWith({
          name: "Test User",
          email: "test@example.com",
          receive_new_prayer_notifications: true,
        });
      });
    });

    it("trims whitespace from name and email", async () => {
      const user = userEvent.setup();

      const delegSup = createSupabaseMock({
        fromData: (supabase as any).__testData,
      }) as any;

      // Use a stable mock object for the insert spy so later inspection in the test sees
      // the same mock instance that the component invoked.
      const trimmedMockInsert = vi.fn().mockReturnValue({
        select: vi
          .fn()
          .mockResolvedValue({ data: [{ id: "test-id-123" }], error: null }),
      });
      const trimmedResObj = { select: vi.fn(), insert: trimmedMockInsert };

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "pending_preference_changes") {
          return trimmedResObj;
        }
        return delegSup.from(table);
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.type(
        screen.getByPlaceholderText("your.email@example.com"),
        "  test@example.com  ",
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("John Doe")).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText("John Doe"), "  Test User  ");
      await user.click(screen.getByText("Submit for Approval"));

      const resObj: any = (supabase.from as any)("pending_preference_changes");
      expect(resObj.insert).toBeDefined();
      await waitFor(() => {
        expect(resObj.insert).toHaveBeenCalledWith({
          name: "Test User",
          email: "test@example.com",
          receive_new_prayer_notifications: true,
        });
      });
    });

    it("displays error when save fails", async () => {
      const user = userEvent.setup();

      // Use delegating sup instance and return an insert that resolves to an error
      const delegSup = createSupabaseMock({
        fromData: (supabase as any).__testData,
      }) as any;

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "pending_preference_changes") {
          const mockSelect = vi.fn().mockResolvedValue({
            error: { message: "Database error" },
          });
          const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
          return { insert: mockInsert };
        }
        return delegSup.from(table);
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.type(
        screen.getByPlaceholderText("your.email@example.com"),
        "test@example.com",
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("John Doe")).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText("John Doe"), "Test User");
      await user.click(screen.getByText("Submit for Approval"));

      await waitFor(() => {
        expect(screen.getByText(/Database error/i)).toBeDefined();
      });
    });

    it("shows Submitting... text while saving", async () => {
      const user = userEvent.setup();

      let resolveSelect: () => void;
      const selectPromise = new Promise<void>((resolve) => {
        resolveSelect = resolve;
      });

      // Mock insert().select() to delay resolution
      const mockSelect = vi.fn().mockReturnValue(
        selectPromise.then(() => ({
          data: [{ id: "test-id" }],
          error: null,
        })),
      );
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      const delegSup = createSupabaseMock({
        fromData: (supabase as any).__testData,
      }) as any;

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "pending_preference_changes") {
          return { insert: mockInsert };
        }
        return delegSup.from(table);
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.type(
        screen.getByPlaceholderText("your.email@example.com"),
        "test@example.com",
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText("John Doe")).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText("John Doe"), "Test User");
      await user.click(screen.getByText("Submit for Approval"));

      // Should show "Submitting..."
      await waitFor(() => {
        expect(screen.getByText("Submitting...")).toBeDefined();
      });

      // Resolve the promise
      resolveSelect!();

      // Should show success
      await waitFor(() => {
        expect(
          screen.getByText(/Your preference change has been submitted/i),
        ).toBeDefined();
      });
    });
  });

  describe("Print Functionality", () => {
    it("opens print window for prayer list", async () => {
      const user = userEvent.setup();
      const { downloadPrintablePrayerList } =
        await import("../../utils/printablePrayerList");

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.click(screen.getByText("Print Prayer List"));

      await waitFor(() => {
        expect(window.open).toHaveBeenCalledWith("", "_blank");
        expect(downloadPrintablePrayerList).toHaveBeenCalled();
      });
    });

    it("opens print window for prompts", async () => {
      const user = userEvent.setup();
      const { downloadPrintablePromptList } =
        await import("../../utils/printablePromptList");

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.click(screen.getByText("Print Prompts"));

      await waitFor(() => {
        expect(window.open).toHaveBeenCalledWith("", "_blank");
        expect(downloadPrintablePromptList).toHaveBeenCalled();
      });
    });

    it("shows Generating... text while printing prayers", async () => {
      const user = userEvent.setup();

      let resolvePrint: () => void;
      const printPromise = new Promise<void>((resolve) => {
        resolvePrint = resolve;
      });

      const { downloadPrintablePrayerList } =
        await import("../../utils/printablePrayerList");
      vi.mocked(downloadPrintablePrayerList).mockReturnValue(
        printPromise as any,
      );

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.click(screen.getByText("Print Prayer List"));

      await waitFor(() => {
        expect(screen.getByText("Generating...")).toBeDefined();
      });

      resolvePrint!();

      await waitFor(() => {
        expect(screen.getByText("Print Prayer List")).toBeDefined();
      });
    });

    it("shows Generating... text while printing prompts", async () => {
      const user = userEvent.setup();

      let resolvePrint: () => void;
      const printPromise = new Promise<void>((resolve) => {
        resolvePrint = resolve;
      });

      const { downloadPrintablePromptList } =
        await import("../../utils/printablePromptList");
      vi.mocked(downloadPrintablePromptList).mockReturnValue(
        printPromise as any,
      );

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await user.click(screen.getByText("Print Prompts"));

      await waitFor(() => {
        expect(screen.getByText("Generating...")).toBeDefined();
      });

      resolvePrint!();

      await waitFor(() => {
        expect(screen.getByText("Print Prompts")).toBeDefined();
      });
    });
  });
});
