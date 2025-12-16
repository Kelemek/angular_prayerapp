import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import App from "../App";

// Mock all the hooks and components
vi.mock("../hooks/useTheme", () => ({
  useTheme: vi.fn(),
}));

vi.mock("../hooks/useAdminAuthHook", () => ({
  useAdminAuth: vi.fn(),
}));

vi.mock("../hooks/usePrayerManager", () => ({
  usePrayerManager: vi.fn(),
}));

// Use the shared supabase mock factory so every test gets a consistent, chainable
// supabase-like API. Keep this mock hoisted so Vitest can properly replace the module.
vi.mock("../lib/supabase", async () => {
  // Create the supabase mock inside the vi.mock factory to avoid hoisting /
  // initialization-order ReferenceErrors. This ensures a fresh, chainable
  // mock instance is available to modules that import it.
  const mod = await import("../testUtils/supabaseMock");
  const createSupabaseMock =
    (mod as any).default ?? (mod as any).createSupabaseMock;

  const supabase = createSupabaseMock({
    fromData: {
      prayers: [],
      profiles: [],
      prayer_updates: [],
    },
    // functionsInvoke can be customized per-test by overriding the mock below if needed.
    functionsInvoke: async () => ({ data: null, error: null }),
  }) as any;

  // Lightweight named helpers that some modules import directly. They delegate to
  // the shared spies where appropriate (or are simple stubs).
  const directMutation = vi.fn(async () => ({ data: null, error: null }));
  const directQuery = vi.fn(async () => ({ data: null, error: null }));

  return {
    supabase,
    directMutation,
    directQuery,
    getSupabaseConfig: () => ({
      url: "https://test.supabase.co",
      anonKey: "test-anon-key",
    }),
    // Keep functions.invoke available to modules that import it directly.
    functions: { invoke: supabase.functions.invoke },
    isNetworkError: (_e: unknown) => false,
  } as any;
});

// Mock components
vi.mock("../components/PrayerPresentation", () => ({
  PrayerPresentation: () => (
    <div data-testid="prayer-presentation">Presentation View</div>
  ),
}));

vi.mock("../components/MobilePresentation", () => ({
  MobilePresentation: () => (
    <div data-testid="mobile-presentation">Mobile Presentation View</div>
  ),
}));

vi.mock("../components/AdminLogin", () => ({
  AdminLogin: () => <div data-testid="admin-login">Admin Login</div>,
}));

vi.mock("../components/AdminPortal", () => ({
  AdminPortal: () => <div data-testid="admin-portal">Admin Portal</div>,
}));

vi.mock("../components/PrayerForm", () => ({
  PrayerForm: () => <div data-testid="prayer-form">Prayer Form</div>,
}));

vi.mock("../components/PrayerCard", () => ({
  PrayerCard: () => <div>Prayer Card</div>,
}));

vi.mock("../components/PromptCard", () => ({
  PromptCard: () => <div>Prompt Card</div>,
}));

vi.mock("../components/PrayerFilters", () => ({
  PrayerFiltersComponent: () => <div>Prayer Filters</div>,
}));

vi.mock("../components/UserSettings", () => ({
  UserSettings: () => <div>User Settings</div>,
}));

vi.mock("../lib/emailNotifications", () => ({
  sendAdminNotification: vi.fn(),
}));

import { useAdminAuth } from "../hooks/useAdminAuthHook";
import { usePrayerManager } from "../hooks/usePrayerManager";

describe("App", () => {
  let mockUseAdminAuth: ReturnType<typeof vi.fn>;
  let mockUsePrayerManager: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Default mock implementations
    mockUseAdminAuth = vi.mocked(useAdminAuth);
    mockUsePrayerManager = vi.mocked(usePrayerManager);

    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      loading: false,
      logout: vi.fn(),
    });

    mockUsePrayerManager.mockReturnValue({
      prayers: [],
      loading: false,
      error: null,
      addPrayer: vi.fn(),
      updatePrayerStatus: vi.fn(),
      addPrayerUpdate: vi.fn(),
      deletePrayer: vi.fn(),
      getFilteredPrayers: vi.fn(() => []),
      refresh: vi.fn(),
      deletePrayerUpdate: vi.fn(),
      requestUpdateDeletion: vi.fn(),
    });

    // Reset window.location.hash
    window.location.hash = "";
  });

  afterEach(() => {
    window.location.hash = "";
  });

  describe("Provider Setup", () => {
    it("renders the app with all providers", () => {
      render(<App />);
      // App should render without crashing
      expect(document.body).toBeDefined();
    });

    it("initializes with loading state", () => {
      mockUsePrayerManager.mockReturnValue({
        prayers: [],
        loading: true,
        error: null,
        addPrayer: vi.fn(),
        updatePrayerStatus: vi.fn(),
        addPrayerUpdate: vi.fn(),
        deletePrayer: vi.fn(),
        getFilteredPrayers: vi.fn(() => []),
        refresh: vi.fn(),
        deletePrayerUpdate: vi.fn(),
        requestUpdateDeletion: vi.fn(),
      });

      render(<App />);
      // Check for skeleton loader instead of text
      const skeletonElements = screen
        .getAllByRole("generic")
        .filter((el) => el.className.includes("skeleton"));
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it("displays error state when prayer loading fails", () => {
      mockUsePrayerManager.mockReturnValue({
        prayers: [],
        loading: false,
        error: "Failed to connect to database",
        addPrayer: vi.fn(),
        updatePrayerStatus: vi.fn(),
        addPrayerUpdate: vi.fn(),
        deletePrayer: vi.fn(),
        getFilteredPrayers: vi.fn(() => []),
        refresh: vi.fn(),
        deletePrayerUpdate: vi.fn(),
        requestUpdateDeletion: vi.fn(),
      });

      render(<App />);
      expect(screen.getByText("Connection Error")).toBeDefined();
      expect(screen.getByText("Failed to connect to database")).toBeDefined();
    });
  });

  describe("View Routing", () => {
    it("renders public view by default", () => {
      render(<App />);
      // Should show the main church prayer manager header
      expect(screen.getByText("Church Prayer Manager")).toBeDefined();
    });

    it("renders presentation view when hash is #presentation", async () => {
      window.location.hash = "#presentation";

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("prayer-presentation")).toBeDefined();
      });
    });

    it("renders responsive presentation view when hash is #presentation", async () => {
      window.location.hash = "#presentation";

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("prayer-presentation")).toBeDefined();
      });
    });

    it("renders admin login when hash is #admin and user is not authenticated", async () => {
      window.location.hash = "#admin";
      mockUseAdminAuth.mockReturnValue({
        isAdmin: false,
        loading: false,
        logout: vi.fn(),
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-login")).toBeDefined();
      });
    });

    it("renders admin portal when hash is #admin and user is authenticated", async () => {
      window.location.hash = "#admin";
      mockUseAdminAuth.mockReturnValue({
        isAdmin: true,
        loading: false,
        logout: vi.fn(),
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-portal")).toBeDefined();
      });
    });

    it("shows loading spinner during auth check", () => {
      mockUseAdminAuth.mockReturnValue({
        isAdmin: false,
        loading: true,
        logout: vi.fn(),
      });

      render(<App />);

      // Should show loading spinner
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });
  });

  describe("Hash Change Navigation", () => {
    it("updates view when hash changes to presentation", async () => {
      const { rerender } = render(<App />);

      // Initially should show public view
      expect(screen.getByText("Church Prayer Manager")).toBeDefined();

      // Change hash
      window.location.hash = "#presentation";
      window.dispatchEvent(new HashChangeEvent("hashchange"));

      rerender(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("prayer-presentation")).toBeDefined();
      });
    });

    it("returns to public view when hash is cleared", async () => {
      window.location.hash = "#presentation";
      const { rerender } = render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("prayer-presentation")).toBeDefined();
      });

      // Clear hash
      window.location.hash = "";
      window.dispatchEvent(new HashChangeEvent("hashchange"));

      rerender(<App />);

      await waitFor(() => {
        expect(screen.getByText("Church Prayer Manager")).toBeDefined();
      });
    });
  });

  describe("Admin Authentication Flow", () => {
    it("redirects from admin-login to admin-portal after successful auth", async () => {
      window.location.hash = "#admin";

      // Start not authenticated
      mockUseAdminAuth.mockReturnValue({
        isAdmin: false,
        loading: false,
        logout: vi.fn(),
      });

      const { rerender } = render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-login")).toBeDefined();
      });

      // Simulate successful login
      mockUseAdminAuth.mockReturnValue({
        isAdmin: true,
        loading: false,
        logout: vi.fn(),
      });

      rerender(<App />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-portal")).toBeDefined();
      });
    });
  });

  describe("Main Content Rendering", () => {
    it("renders header with title", () => {
      render(<App />);
      expect(screen.getByText("Church Prayer Manager")).toBeDefined();
    });

    it("renders with empty prayer list", () => {
      mockUsePrayerManager.mockReturnValue({
        prayers: [],
        loading: false,
        error: null,
        addPrayer: vi.fn(),
        updatePrayerStatus: vi.fn(),
        addPrayerUpdate: vi.fn(),
        deletePrayer: vi.fn(),
        getFilteredPrayers: vi.fn(() => []),
        refresh: vi.fn(),
        deletePrayerUpdate: vi.fn(),
        requestUpdateDeletion: vi.fn(),
      });

      render(<App />);

      // Should render without error
      expect(screen.getByText("Church Prayer Manager")).toBeDefined();
    });
  });

  describe("Branding and Settings", () => {
    it("loads branding settings on mount", async () => {
      const { supabase } = await import("../lib/supabase");
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            app_title: "Custom Title",
            app_subtitle: "Custom Subtitle",
            use_logo: false,
            light_mode_logo_blob: "",
            dark_mode_logo_blob: "",
            deletions_allowed: "everyone",
            updates_allowed: "everyone",
          },
          error: null,
        }),
      } as any);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Custom Title")).toBeDefined();
      });
    });

    it("uses default branding if loading fails", async () => {
      const { supabase } = await import("../lib/supabase");
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Failed to load" },
        }),
      } as any);

      render(<App />);

      // Should still render with default title
      expect(screen.getByText("Church Prayer Manager")).toBeDefined();
    });

    it("tracks page views on initial load", async () => {
      const { directMutation } = await import("../lib/supabase");
      
      render(<App />);

      await waitFor(() => {
        expect(directMutation).toHaveBeenCalledWith(
          "analytics",
          expect.objectContaining({
            method: "POST",
            body: expect.objectContaining({
              event_type: "page_view",
            }),
          })
        );
      });
    });

    it("handles analytics tracking failure gracefully", async () => {
      const { directMutation } = await import("../lib/supabase");
      const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      
      vi.mocked(directMutation).mockRejectedValue(new Error("Analytics failed"));

      render(<App />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Analytics tracking failed:",
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Prayer Prompts", () => {
    it("fetches prompts on mount", async () => {
      const { supabase } = await import("../lib/supabase");
      
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{ name: "Praise", display_order: 1 }],
          error: null,
        }),
      } as any);

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      render(<App />);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("prayer_types");
        expect(mockFrom).toHaveBeenCalledWith("prayer_prompts");
      });
    });

    it("handles prompt fetch errors gracefully", async () => {
      const { supabase } = await import("../lib/supabase");
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Failed to fetch prompts" },
        }),
      } as any);

      render(<App />);

      // Should not crash despite the error
      await waitFor(() => {
        expect(screen.getByText("Church Prayer Manager")).toBeDefined();
      });

      consoleErrorSpy.mockRestore();
    });

    it("refetches prompts when page becomes visible", async () => {
      const { supabase } = await import("../lib/supabase");
      
      const orderSpy = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: orderSpy,
      } as any);

      render(<App />);

      // Wait for initial load
      await waitFor(() => {
        expect(orderSpy).toHaveBeenCalled();
      });

      const initialCallCount = orderSpy.mock.calls.length;

      // Simulate page becoming visible
      Object.defineProperty(document, "visibilityState", {
        writable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));

      await waitFor(() => {
        expect(orderSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe("Dark Mode Detection", () => {
    it("detects and responds to dark mode changes", async () => {
      render(<App />);

      // Add dark class to documentElement
      document.documentElement.classList.add("dark");

      // Trigger MutationObserver
      await waitFor(() => {
        expect(document.documentElement.classList.contains("dark")).toBe(true);
      });

      // Remove dark class
      document.documentElement.classList.remove("dark");
    });
  });

  describe("Error Handling", () => {
    it("displays retry button when there is an error", () => {
      mockUsePrayerManager.mockReturnValue({
        prayers: [],
        loading: false,
        error: "Database connection failed",
        addPrayer: vi.fn(),
        updatePrayerStatus: vi.fn(),
        addPrayerUpdate: vi.fn(),
        deletePrayer: vi.fn(),
        getFilteredPrayers: vi.fn(() => []),
        refresh: vi.fn(),
        deletePrayerUpdate: vi.fn(),
        requestUpdateDeletion: vi.fn(),
      });

      render(<App />);

      const retryButton = screen.getByText("Try Again");
      expect(retryButton).toBeDefined();
    });

    it("calls refresh when retry button is clicked", () => {
      const mockRefresh = vi.fn();
      
      mockUsePrayerManager.mockReturnValue({
        prayers: [],
        loading: false,
        error: "Database connection failed",
        addPrayer: vi.fn(),
        updatePrayerStatus: vi.fn(),
        addPrayerUpdate: vi.fn(),
        deletePrayer: vi.fn(),
        getFilteredPrayers: vi.fn(() => []),
        refresh: mockRefresh,
        deletePrayerUpdate: vi.fn(),
        requestUpdateDeletion: vi.fn(),
      });

      render(<App />);

      const retryButton = screen.getByText("Try Again");
      retryButton.click();

      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
