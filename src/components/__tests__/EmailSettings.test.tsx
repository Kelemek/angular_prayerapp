import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createSupabaseMock } from "../../testUtils/supabaseMock";

/**
 * Tests for EmailSettings component.
 *
 * These tests use the shared `createSupabaseMock` factory so every test
 * gets a consistent, chainable supabase-like API. Tests mutate the
 * factory's `__testData` or stub `supabase.from` when they need to assert
 * on specific DB interactions (e.g. `upsert`).
 */

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
    fromData: {
      admin_settings: [],
    },
  }) as any;

  const mockDirectQuery = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockDirectMutation = vi
    .fn()
    .mockResolvedValue({ data: null, error: null });

  return {
    supabase: supabaseMock,
    directQuery: mockDirectQuery,
    directMutation: mockDirectMutation,
    // Keep functions.invoke available to modules that import it directly.
    functions: { invoke: supabaseMock.functions.invoke },
  } as any;
});

// Import the mocked supabase binding used by application modules
// We'll rebind `supabase` inside `beforeEach` so each test gets a fresh mocked instance
let supabase: any;

describe("EmailSettings Component", () => {
  beforeEach(async () => {
    // Clear module cache so any module-scoped cached state (eg. cachedEmailSettings)
    // in `EmailSettings` is reset between tests.
    vi.resetModules();

    // Re-import the mocked binding; the vi.mock factory above will provide the
    // mocked module instance for this test run.
    const mod = await import("../../lib/supabase");
    // @ts-ignore - assign the mocked supabase instance for tests to use
    supabase = (mod as any).supabase ?? (mod as any).default?.supabase;

    // Clear any spies/mocks and set defaults
    vi.clearAllMocks();
    // Reset test data to sensible defaults for each test
    (supabase as any).__testData.admin_settings = [];
  });

  // Helper to load the component fresh (in case module caches state)
  const getComponent = async () => {
    const mod = await import("../EmailSettings");
    return mod.EmailSettings;
  };

  it("renders loading state initially", async () => {
    const EmailSettings = await getComponent();

    // Ensure the admin_settings table returns no row (maybeSingle -> null)
    (supabase as any).__testData.admin_settings = [];

    render(<EmailSettings />);

    // The component initially shows a loading indicator text
    expect(screen.getByText("Loading email settings...")).toBeInTheDocument();
  });

  it("loads and displays settings correctly", async () => {
    const EmailSettings = await getComponent();

    // Provide a row in admin_settings so maybeSingle() returns the settings
    (supabase as any).__testData.admin_settings = [
      {
        id: 1,
        require_email_verification: true,
        verification_code_length: 6,
        verification_code_expiry_minutes: 15,
        enable_reminders: true,
        reminder_interval_days: 7,
        enable_auto_archive: true,
        days_before_archive: 14,
      },
    ];

    render(<EmailSettings />);

    // Wait for the component to finish loading and reflect settings in UI
    await waitFor(() => {
      const verificationCheckbox = screen.getByRole("checkbox", {
        name: /require email verification/i,
      });
      expect(verificationCheckbox).toBeChecked();
    });

    // Other controls should reflect provided settings
    const reminderCheckbox = screen.getByRole("checkbox", {
      name: /enable prayer update reminders/i,
    });
    expect(reminderCheckbox).toBeChecked();

    const archiveCheckbox = screen.getByRole("checkbox", {
      name: /auto-archive prayers after reminder/i,
    });
    expect(archiveCheckbox).toBeChecked();
  });

  it("saves verification settings successfully", async () => {
    const EmailSettings = await getComponent();
    const user = userEvent.setup();

    // Start with default settings (verification disabled)
    (supabase as any).__testData.admin_settings = [
      {
        id: 1,
        require_email_verification: false,
        verification_code_length: 6,
        verification_code_expiry_minutes: 15,
      },
    ];

    // Create an upsert mock so we can assert it is called with expected payload
    // Make upsert return a chainable object that supports .select()
    // so component code that calls .upsert(...).select(...) works with our mock.
    const mockUpsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: (supabase as any).__testData.admin_settings
          ? Array.isArray((supabase as any).__testData.admin_settings) &&
            (supabase as any).__testData.admin_settings.length
            ? [(supabase as any).__testData.admin_settings[0]]
            : []
          : [],
        error: null,
      }),
    });

    // Provide a chainable object for the `from('admin_settings')` path that
    // supports the `select` and `upsert` calls our component makes.
    const upsertChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: (supabase as any).__testData.admin_settings[0],
        error: null,
      }),
      upsert: mockUpsert,
    };
    // Ensure chainable methods return the chain
    upsertChain.select.mockReturnValue(upsertChain);
    upsertChain.eq.mockReturnValue(upsertChain);

    // Override supabase.from for this test to return our upsertChain
    (supabase as any).from = vi.fn(() => upsertChain);

    render(<EmailSettings />);

    // Wait for component to render the verification checkbox
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: /require email verification/i }),
      ).toBeInTheDocument(),
    );

    // Click the checkbox to enable verification
    const verificationCheckbox = screen.getByRole("checkbox", {
      name: /require email verification/i,
    });
    await user.click(verificationCheckbox);
    expect(verificationCheckbox).toBeChecked();

    // Change code length and expiry selects (selectOptions expects existing option labels)
    const lengthSelect = screen.getByDisplayValue("6 digits (recommended)");
    await user.selectOptions(lengthSelect, "8");

    const expirySelect = screen.getByDisplayValue("15 minutes (recommended)");
    await user.selectOptions(expirySelect, "30");

    // Click Save verification settings
    const saveButton = screen.getByRole("button", {
      name: /save verification settings/i,
    });
    await user.click(saveButton);

    // Assert upsert called with expected structure (id + updated fields + updated_at)
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled();
      const calledWith = mockUpsert.mock.calls[0][0];
      expect(calledWith).toMatchObject({
        id: 1,
        require_email_verification: true,
        verification_code_length: 8,
        verification_code_expiry_minutes: 30,
        updated_at: expect.any(String),
      });
    });
  });

  it("saves reminder settings successfully", async () => {
    const EmailSettings = await getComponent();
    const user = userEvent.setup();

    // Provide base settings
    (supabase as any).__testData.admin_settings = [
      {
        id: 1,
        enable_reminders: false,
        reminder_interval_days: 7,
        enable_auto_archive: false,
        days_before_archive: 7,
      },
    ];

    // Prepare upsert mock and chain like previous test
    const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

    const upsertChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: (supabase as any).__testData.admin_settings[0],
        error: null,
      }),
      upsert: mockUpsert,
    };
    upsertChain.select.mockReturnValue(upsertChain);
    upsertChain.eq.mockReturnValue(upsertChain);

    (supabase as any).from = vi.fn(() => upsertChain);

    render(<EmailSettings />);

    // Wait and enable reminders
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /save reminder settings/i }),
      ).toBeInTheDocument(),
    );

    const reminderCheckbox = screen.getByRole("checkbox", {
      name: /enable prayer update reminders/i,
    });
    await user.click(reminderCheckbox);
    expect(reminderCheckbox).toBeChecked();

    // Change days input
    const intervalInput = screen.getByLabelText(
      "Days of inactivity before sending reminder email",
    );
    // Use fireEvent.change for numeric inputs
    fireEvent.change(intervalInput, { target: { value: "10" } });
    expect((intervalInput as HTMLInputElement).value).toBe("10");

    // Click Save reminder settings
    const saveButton = screen.getByRole("button", {
      name: /save reminder settings/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled();
      const payload = mockUpsert.mock.calls[0][0];
      expect(payload).toMatchObject({
        id: 1,
        enable_reminders: true,
        reminder_interval_days: 10,
        updated_at: expect.any(String),
      });
    });
  });

  it("shows error state when save fails", async () => {
    const EmailSettings = await getComponent();
    const user = userEvent.setup();

    (supabase as any).__testData.admin_settings = [
      {
        id: 1,
        require_email_verification: false,
        verification_code_length: 6,
        verification_code_expiry_minutes: 15,
      },
    ];

    // Simulate upsert returning an error (chainable .select returns error)
    const mockSelectErr = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "save failed" },
    });
    const mockUpsert = vi.fn().mockReturnValue({ select: mockSelectErr });

    const upsertChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: (supabase as any).__testData.admin_settings[0],
        error: null,
      }),
      upsert: mockUpsert,
    };
    upsertChain.select.mockReturnValue(upsertChain);
    upsertChain.eq.mockReturnValue(upsertChain);
    (supabase as any).from = vi.fn(() => upsertChain);

    render(<EmailSettings />);

    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: /require email verification/i }),
      ).toBeInTheDocument(),
    );

    // Toggle verification and try to save
    const verificationCheckbox = screen.getByRole("checkbox", {
      name: /require email verification/i,
    });
    await user.click(verificationCheckbox);

    const saveButton = screen.getByRole("button", {
      name: /save verification settings/i,
    });
    await user.click(saveButton);

    // Expect the component to show an error message when save fails
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to save distribution settings/i),
      ).toBeInTheDocument();
    });
  });
});
