import React from "react";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "../../testUtils/supabaseMock";

/*
  Create the supabase mock inside the mock factory so Vitest's hoisting
  does not cause initialization-order ReferenceErrors. The factory
  will synchronously create a fresh mock and named helpers for modules
  that import them.
*/
vi.mock("../../lib/supabase", async () => {
  const mod = await import("../../testUtils/supabaseMock");
  const createSupabaseMock =
    (mod as any).default ?? (mod as any).createSupabaseMock;
  const supabaseMock = createSupabaseMock({ fromData: {} }) as any;
  const mockDirectQuery = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockDirectMutation = vi
    .fn()
    .mockResolvedValue({ data: null, error: null });

  return {
    supabase: supabaseMock,
    directQuery: mockDirectQuery,
    directMutation: mockDirectMutation,
    functions: { invoke: supabaseMock.functions.invoke },
  } as any;
});

import { supabase, directQuery } from "../../lib/supabase";

// Helper to construct a chainable response object for `supabase.from(...)` calls.
// Tests can reuse and customize this to resolve specific data or errors.
const createMockChain = (resolveData: any = [], resolveError: any = null) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi
      .fn()
      .mockResolvedValue({ data: resolveData, error: resolveError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  // Make select/eq chain back to the chain object
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
};

describe("AdminUserManagement", () => {
  beforeEach(async () => {
    // Reset module registry so each test gets a fresh module cache.
    // This avoids cross-test pollution from module-level state created by hoisted mocks.
    vi.resetModules();

    // Clear mocks as usual
    vi.clearAllMocks();

    // Attempt to set a safe default on the directQuery helper that many modules use.
    // After resetModules the top-level imported `directQuery` may refer to the prior binding,
    // so set default on both a freshly imported module and the local binding to be safe.
    try {
      // Import fresh module copy and set its directQuery if available
      const fresh = await import("../../lib/supabase");
      if (
        fresh &&
        fresh.directQuery &&
        typeof fresh.directQuery === "function"
      ) {
        vi.mocked(fresh.directQuery).mockResolvedValue({
          data: [],
          error: null,
        });
      }
    } catch (e) {
      // ignore - fallback to local binding
    }

    // Keep directQuery returning empty by default for tests that don't override it
    vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
  });

  // Helper to import a fresh copy of the component after any module-level resets
  const getComponent = async () => {
    const { AdminUserManagement } = await import("../AdminUserManagement");
    return AdminUserManagement;
  };

  it("loads and displays admin users", async () => {
    const AdminUserManagement = await getComponent();
    const admins = [
      {
        email: "alice@example.com",
        name: "Alice",
        created_at: new Date().toISOString(),
        last_sign_in_at: null,
      },
    ];

    // Mock directQuery for fetching admins
    vi.mocked(directQuery).mockResolvedValue({ data: admins, error: null });

    // Also mock supabase.from for any other operations the component may call
    const mockChain = createMockChain(admins);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    // Initially shows loading state
    expect(screen.getByText(/Loading admins/i)).toBeTruthy();

    await waitFor(() =>
      expect(screen.queryByText(/Loading admins/i)).toBeNull(),
    );

    // Admin should be rendered
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("alice@example.com")).toBeTruthy();
  });

  it("shows add admin form and validates input", async () => {
    const AdminUserManagement = await getComponent();
    vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    // Wait for load to finish
    await waitFor(() =>
      expect(screen.queryByText(/Loading admins/i)).toBeNull(),
    );

    // Click Add Admin
    fireEvent.click(screen.getByRole("button", { name: /Add Admin/i }));

    // Form fields should be visible
    const nameInput = screen.getByPlaceholderText(/Admin's full name/i);
    const emailInput = screen.getByPlaceholderText(/admin@example.com/i);

    // Enter invalid email and submit
    fireEvent.change(nameInput, { target: { value: "Bob" } });
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });

    fireEvent.click(
      screen.getByRole("button", { name: /Add & Send Invitation/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Please enter a valid email address/i),
      ).toBeTruthy();
    });
  });

  it("handles loading errors gracefully", async () => {
    const AdminUserManagement = await getComponent();
    vi.mocked(directQuery).mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });
    const mockChain = createMockChain(null, { message: "Database error" });
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load admin users/i)).toBeTruthy();
    });
  });

  it("shows empty state when no admins exist", async () => {
    const AdminUserManagement = await getComponent();
    vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() =>
      expect(screen.queryByText(/Loading admins/i)).toBeNull(),
    );

    expect(screen.getByText(/No admin users found/i)).toBeTruthy();
  });

  it("successfully adds a new admin", async () => {
    const AdminUserManagement = await getComponent();
    vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
    const mockChain = createMockChain([]);
    const upsertChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(upsertChain as any);

    render(<AdminUserManagement />);

    await waitFor(() =>
      expect(screen.queryByText(/Loading admins/i)).toBeNull(),
    );

    // Click Add Admin
    fireEvent.click(screen.getByRole("button", { name: /Add Admin/i }));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Admin's full name/i), {
      target: { value: "Bob Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText(/admin@example.com/i), {
      target: { value: "bob@example.com" },
    });

    // Submit
    fireEvent.click(
      screen.getByRole("button", { name: /Add & Send Invitation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Admin added successfully/i)).toBeTruthy();
    });
  });

  it("prevents adding admin with existing email", async () => {
    const AdminUserManagement = await getComponent();
    const existingAdmin = {
      email: "existing@example.com",
      name: "Existing",
      created_at: new Date().toISOString(),
    };
    vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
    const mockChain = createMockChain([]);
    const upsertChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: existingAdmin, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(upsertChain as any);

    render(<AdminUserManagement />);

    await waitFor(() =>
      expect(screen.queryByText(/Loading admins/i)).toBeNull(),
    );

    // Click Add Admin
    fireEvent.click(screen.getByRole("button", { name: /Add Admin/i }));

    // Fill form with existing email
    fireEvent.change(screen.getByPlaceholderText(/Admin's full name/i), {
      target: { value: "Bob Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText(/admin@example.com/i), {
      target: { value: "existing@example.com" },
    });

    // Submit
    fireEvent.click(
      screen.getByRole("button", { name: /Add & Send Invitation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/This email is already an admin/i)).toBeTruthy();
    });
  });

  it("handles add admin database error", async () => {
    const AdminUserManagement = await getComponent();
    vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
    const mockChain = createMockChain([]);
    const upsertChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi
        .fn()
        .mockResolvedValue({ error: { message: "Database error" } }),
      update: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(upsertChain as any);

    render(<AdminUserManagement />);

    await waitFor(() =>
      expect(screen.queryByText(/Loading admins/i)).toBeNull(),
    );

    // Click Add Admin
    fireEvent.click(screen.getByRole("button", { name: /Add Admin/i }));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Admin's full name/i), {
      target: { value: "Bob Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText(/admin@example.com/i), {
      target: { value: "bob@example.com" },
    });

    // Submit
    fireEvent.click(
      screen.getByRole("button", { name: /Add & Send Invitation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to add admin user/i)).toBeTruthy();
    });
  });

  it("validates required fields in add admin form", async () => {
    const AdminUserManagement = await getComponent();
    vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() =>
      expect(screen.queryByText(/Loading admins/i)).toBeNull(),
    );

    // Click Add Admin
    fireEvent.click(screen.getByRole("button", { name: /Add Admin/i }));

    // Submit without filling fields
    fireEvent.click(
      screen.getByRole("button", { name: /Add & Send Invitation/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Email and name are required/i)).toBeTruthy();
    });
  });
});
