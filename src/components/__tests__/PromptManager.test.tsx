import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptManager } from "../PromptManager";
import { supabase, directQuery, directMutation } from "../../lib/supabase";

// Mock Supabase
vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(),
        })),
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
        order: vi.fn(),
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
  directQuery: vi.fn().mockResolvedValue({ data: [], error: null }),
  directMutation: vi.fn().mockResolvedValue({ data: null, error: null }),
  getSupabaseConfig: vi
    .fn()
    .mockReturnValue({ url: "https://test.supabase.co", anonKey: "test-key" }),
}));

describe("PromptManager Component", () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
    // Mock fetch for search functionality (uses native fetch)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
    // Set up directQuery mock for fetching prompts and prayer types
    vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
  });

  describe("Rendering", () => {
    it("renders the component with header", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /prayer prompts/i }),
        ).toBeDefined();
      });
    });

    it("displays the description text", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(
          screen.getByText(
            /search for prayer prompts by title, type, or description/i,
          ),
        ).toBeDefined();
      });
    });

    it("renders search input field", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search prompts/i);
        expect(searchInput).toBeDefined();
      });
    });

    it("renders Upload CSV button", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /upload csv/i }),
        ).toBeDefined();
      });
    });

    it("renders Add Prompt button", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add prompt/i }),
        ).toBeDefined();
      });
    });

    it("loads prayer types on mount", async () => {
      const mockTypes = [
        { id: "1", name: "Personal", display_order: 0, is_active: true },
        { id: "2", name: "Family", display_order: 1, is_active: true },
      ];

      vi.mocked(directQuery).mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(vi.mocked(directQuery)).toHaveBeenCalledWith(
          "prayer_types",
          expect.objectContaining({
            eq: expect.objectContaining({ is_active: true }),
          }),
        );
      });
    });
  });

  describe("Search Functionality", () => {
    it("performs search when search button is clicked", async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: "1",
          title: "Gratitude Prayer",
          type: "Personal",
          description: "Give thanks",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Mock directQuery for prayer types
      vi.mocked(directQuery).mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock fetch for search
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPrompts),
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/search prompts/i);
      const searchButton = screen.getByRole("button", { name: /^search$/i });

      await user.type(searchInput, "Gratitude");
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText("Gratitude Prayer")).toBeDefined();
      });
    });

    it("performs search when Enter key is pressed", async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: "1",
          title: "Gratitude Prayer",
          type: "Personal",
          description: "Give thanks",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Mock directQuery for prayer types
      vi.mocked(directQuery).mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock fetch for search
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPrompts),
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/search prompts/i);

      await user.type(searchInput, "Gratitude{Enter}");

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
        expect(screen.getByText("Gratitude Prayer")).toBeDefined();
      });
    });

    it('displays "no prompts found" message when search returns empty', async () => {
      const user = userEvent.setup();

      // Mock directQuery for prayer types
      vi.mocked(directQuery).mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock fetch to return empty
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/search prompts/i);
      const searchButton = screen.getByRole("button", { name: /^search$/i });

      await user.type(searchInput, "NonexistentPrompt");
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/no prayer prompts found/i)).toBeDefined();
      });
    });
  });

  describe("Prayer Type Filter", () => {
    it("filters prompts by selected prayer type", async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: "1",
          title: "Personal Prayer",
          type: "Personal",
          description: "Personal desc",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      const mockTypes = [
        { id: "1", name: "Personal", display_order: 0, is_active: true },
        { id: "2", name: "Family", display_order: 1, is_active: true },
      ];

      // Mock directQuery for prayer types
      vi.mocked(directQuery).mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      // Mock fetch for search
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPrompts),
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      // Trigger search to get results
      await user.type(screen.getByPlaceholderText(/search prompts/i), "Prayer");
      await user.click(screen.getByRole("button", { name: /^search$/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe("Add Prompt Functionality", () => {
    it("shows add form when Add Prompt button is clicked", async () => {
      const user = userEvent.setup();

      // Mock directQuery for prayer types
      vi.mocked(directQuery).mockResolvedValue({
        data: [
          { id: "1", name: "Personal", display_order: 0, is_active: true },
        ],
        error: null,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add prompt/i }),
        ).toBeDefined();
      });

      // Click the top Add Prompt button (not the submit button)
      const addButtons = screen.getAllByRole("button", { name: /add prompt/i });
      await user.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/add new prayer prompt/i)).toBeDefined();
      });
    });

    it("successfully creates a new prompt", async () => {
      const user = userEvent.setup();

      // Mock directQuery for prayer types
      vi.mocked(directQuery).mockResolvedValue({
        data: [
          { id: "1", name: "Personal", display_order: 0, is_active: true },
        ],
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });
      const insertResObj = { insert: mockInsert };

      (supabase.from as any).mockImplementation(
        (_table: string) => insertResObj,
      );

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add prompt/i }),
        ).toBeDefined();
      });

      // Click the top Add Prompt button
      const addButtons1 = screen.getAllByRole("button", {
        name: /add prompt/i,
      });
      await user.click(addButtons1[0]);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/pray for those in need/i),
        ).toBeDefined();
      });

      await user.type(
        screen.getByPlaceholderText(/pray for those in need/i),
        "New Prompt",
      );
      await user.type(
        screen.getByPlaceholderText(/write a prayer or meditation prompt/i),
        "Test description",
      );

      // Click the submit button in the form
      const addButtons2 = screen.getAllByRole("button", {
        name: /add prompt/i,
      });
      const submitBtn = addButtons2.find(
        (btn) => btn.getAttribute("type") === "submit",
      );
      if (submitBtn) await user.click(submitBtn);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "New Prompt",
            description: "Test description",
          }),
        );
      });
    });
  });

  describe("Edit Prompt Functionality", () => {
    it("shows edit button for each prompt", async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: "1",
          title: "Test Prompt",
          type: "Personal",
          description: "Test desc",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Mock directQuery for prayer_types
      vi.mocked(directQuery).mockResolvedValue({
        data: [
          { id: "1", name: "Personal", display_order: 0, is_active: true },
        ],
        error: null,
      });

      // Mock fetch for search
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPrompts),
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/search prompts/i), "Test");
      await user.click(screen.getByRole("button", { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText("Test Prompt")).toBeDefined();
        const editButtons = screen.getAllByRole("button");
        const hasEditButton = editButtons.some((btn) =>
          btn.getAttribute("title")?.toLowerCase().includes("edit"),
        );
        expect(hasEditButton).toBe(true);
      });
    });

    it("populates form with existing data when editing", async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: "1",
          title: "Test Prompt",
          type: "Personal",
          description: "Test description",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Mock directQuery for prayer_types
      vi.mocked(directQuery).mockResolvedValue({
        data: [
          { id: "1", name: "Personal", display_order: 0, is_active: true },
        ],
        error: null,
      });

      // Mock fetch for search
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPrompts),
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/search prompts/i), "Test");
      await user.click(screen.getByRole("button", { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText("Test Prompt")).toBeDefined();
      });

      const editButtons = screen.getAllByRole("button");
      const editButton = editButtons.find((btn) =>
        btn.getAttribute("title")?.toLowerCase().includes("edit"),
      );

      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const titleInput = screen.getByPlaceholderText(
            /pray for those in need/i,
          ) as HTMLInputElement;
          expect(titleInput.value).toBe("Test Prompt");
        });
      }
    });
  });

  describe("Delete Prompt Functionality", () => {
    it("shows delete button for each prompt", async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: "1",
          title: "Test Prompt",
          type: "Personal",
          description: "Test desc",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Mock directQuery for prayer_types
      vi.mocked(directQuery).mockResolvedValue({
        data: [
          { id: "1", name: "Personal", display_order: 0, is_active: true },
        ],
        error: null,
      });

      // Mock fetch for search (native fetch is used for search)
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockPrompts,
      } as Response);

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/search prompts/i), "Test");
      await user.click(screen.getByRole("button", { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText("Test Prompt")).toBeDefined();
        const deleteButtons = screen.getAllByRole("button");
        const hasDeleteButton = deleteButtons.some((btn) =>
          btn.getAttribute("title")?.toLowerCase().includes("delete"),
        );
        expect(hasDeleteButton).toBe(true);
      });
    });

    it("requires confirmation before deleting", async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: "1",
          title: "Test Prompt",
          type: "Personal",
          description: "Test desc",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      // Mock directQuery for prayer_types
      vi.mocked(directQuery).mockResolvedValue({
        data: [
          { id: "1", name: "Personal", display_order: 0, is_active: true },
        ],
        error: null,
      });

      // Mock fetch for search
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPrompts),
      });

      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn(() => ({ eq: mockEq }));
      const deleteResObj = { delete: mockDelete };

      (supabase.from as any).mockImplementation(
        (_table: string) => deleteResObj,
      );

      global.confirm = vi.fn(() => false);

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/search prompts/i), "Test");
      await user.click(screen.getByRole("button", { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText("Test Prompt")).toBeDefined();
      });

      const deleteButtons = screen.getAllByRole("button");
      const deleteButton = deleteButtons.find((btn) =>
        btn.getAttribute("title")?.toLowerCase().includes("delete"),
      );

      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(global.confirm).toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe("CSV Upload Functionality", () => {
    it("shows CSV upload form when Upload CSV button is clicked", async () => {
      const user = userEvent.setup();

      // Mock directQuery for prayer types
      vi.mocked(directQuery).mockResolvedValue({
        data: [
          { id: "1", name: "Personal", display_order: 0, is_active: true },
        ],
        error: null,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /upload csv/i }),
        ).toBeDefined();
      });

      await user.click(screen.getByRole("button", { name: /upload csv/i }));

      await waitFor(() => {
        expect(screen.getByText(/upload csv file/i)).toBeDefined();
      });
    });
  });

  describe("Success Callback", () => {
    it("calls onSuccess callback after successful operation", async () => {
      const user = userEvent.setup();

      // Mock directQuery for prayer types
      vi.mocked(directQuery).mockResolvedValue({
        data: [
          { id: "1", name: "Personal", display_order: 0, is_active: true },
        ],
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });
      const successResObj = { insert: mockInsert };

      (supabase.from as any).mockImplementation(
        (_table: string) => successResObj,
      );

      render(<PromptManager onSuccess={mockOnSuccess} />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add prompt/i }),
        ).toBeDefined();
      });

      // Click the top Add Prompt button
      const addButtons1 = screen.getAllByRole("button", {
        name: /add prompt/i,
      });
      await user.click(addButtons1[0]);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText(/pray for those in need/i),
        ).toBeDefined();
      });

      await user.type(
        screen.getByPlaceholderText(/pray for those in need/i),
        "Test Prompt",
      );
      await user.type(
        screen.getByPlaceholderText(/write a prayer or meditation prompt/i),
        "Test desc",
      );

      // Click the submit button in the form
      const addButtons2 = screen.getAllByRole("button", {
        name: /add prompt/i,
      });
      const submitBtn = addButtons2.find(
        (btn) => btn.getAttribute("type") === "submit",
      );
      if (submitBtn) await user.click(submitBtn);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});
