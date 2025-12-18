import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePrayerManager } from "../usePrayerManager";
import { supabase } from "../../lib/supabase";

// Mock Supabase and dependencies
vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
          maybeSingle: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
        single: vi.fn(() => ({
          data: null,
          error: null,
        })),
        maybeSingle: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: "test-id" },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
  },
  handleSupabaseError: vi.fn((error: any) => error?.message || "Unknown error"),
}));

vi.mock("../../lib/errorLogger", () => ({
  logError: vi.fn(),
  logWarning: vi.fn(),
}));

vi.mock("../../lib/emailNotifications", () => ({
  sendAdminNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("usePrayerManager - Coverage Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("requestUpdateDeletion error paths", () => {
    it("handles error when notification details cannot be fetched", async () => {
      const mockEq2 = vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      }));

      const mockEq1 = vi.fn(() => ({
        eq: mockEq2,
      }));

      // Mock initial load
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "prayers") {
          return {
            select: vi.fn(() => ({
              eq: mockEq1,
            })),
          };
        }
        if (table === "update_deletion_requests") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: { id: "req-123" },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === "prayer_updates") {
          // Simulate error fetching update details
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: null,
                  error: { message: "Update not found" },
                })),
              })),
            })),
          };
        }
        if (table === "email_subscribers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    data: [],
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
      });

      const { result } = renderHook(() => usePrayerManager());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Request update deletion - should handle error gracefully
      let response;
      await act(async () => {
        response = await result.current.requestUpdateDeletion(
          "update-123",
          "Spam",
          "User",
          "user@example.com"
        );
      });

      // Should still return success even if notification fails
      expect(response).toEqual({ ok: true, data: { id: "req-123" } });
    });

    it("handles sendAdminNotification failure gracefully", async () => {
      const { sendAdminNotification } = await import("../../lib/emailNotifications");
      
      // Mock sendAdminNotification to reject
      vi.mocked(sendAdminNotification).mockRejectedValueOnce(new Error("Email service down"));

      const mockEq2 = vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      }));

      const mockEq1 = vi.fn(() => ({
        eq: mockEq2,
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "prayers") {
          return {
            select: vi.fn(() => ({
              eq: mockEq1,
            })),
          };
        }
        if (table === "update_deletion_requests") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: { id: "req-456" },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === "prayer_updates") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: {
                    id: "update-123",
                    content: "Update content",
                    author: "Author",
                    prayer_id: "prayer-123",
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === "email_subscribers") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    data: [{ email: "admin@example.com" }],
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
      });

      const { result } = renderHook(() => usePrayerManager());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Request update deletion - should succeed even if email fails
      let response;
      await act(async () => {
        response = await result.current.requestUpdateDeletion(
          "update-123",
          "Spam",
          "User",
          "user@example.com"
        );
      });

      // Should return success despite email failure
      expect(response).toEqual({ ok: true, data: { id: "req-456" } });
    });

    it("handles error in requestUpdateDeletion", async () => {
      const mockEq2 = vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      }));

      const mockEq1 = vi.fn(() => ({
        eq: mockEq2,
      }));

      // Mock to throw error on insert
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "prayers") {
          return {
            select: vi.fn(() => ({
              eq: mockEq1,
            })),
          };
        }
        if (table === "update_deletion_requests") {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => ({
                  data: null,
                  error: { message: "Database error" },
                })),
              })),
            })),
          };
        }
      });

      const { result } = renderHook(() => usePrayerManager());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.requestUpdateDeletion(
          "update-123",
          "Test reason",
          "User"
        );
      });

      expect(response).toEqual({ ok: false, error: "Database error" });
    });

    it("handles non-Error object in requestUpdateDeletion catch block", async () => {
      const mockEq2 = vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      }));

      const mockEq1 = vi.fn(() => ({
        eq: mockEq2,
      }));

      // Mock to throw a string error
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "prayers") {
          return {
            select: vi.fn(() => ({
              eq: mockEq1,
            })),
          };
        }
        if (table === "update_deletion_requests") {
          return {
            insert: vi.fn(() => {
              throw "String error"; // Non-Error object
            }),
          };
        }
      });

      const { result } = renderHook(() => usePrayerManager());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let response;
      await act(async () => {
        response = await result.current.requestUpdateDeletion(
          "update-123",
          "Test reason",
          "User"
        );
      });

      expect(response).toEqual({ ok: false, error: "String error" });
    });
  });

  describe("deletePrayerUpdate error handling", () => {
    it("throws error when delete fails", async () => {
      const mockEq2 = vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      }));

      const mockEq1 = vi.fn(() => ({
        eq: mockEq2,
      }));

      // Mock delete to fail
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "prayers") {
          return {
            select: vi.fn(() => ({
              eq: mockEq1,
            })),
          };
        }
        if (table === "prayer_updates") {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: { message: "Delete failed" },
              })),
            })),
          };
        }
      });

      const { result } = renderHook(() => usePrayerManager());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should throw error
      await expect(async () => {
        await act(async () => {
          await result.current.deletePrayerUpdate("update-123");
        });
      }).rejects.toThrow();
    });

    it("successfully deletes prayer update and reloads", async () => {
      let loadCallCount = 0;

      const mockEq2 = vi.fn(() => ({
        order: vi.fn(() => {
          loadCallCount++;
          return {
            data: [],
            error: null,
          };
        }),
      }));

      const mockEq1 = vi.fn(() => ({
        eq: mockEq2,
      }));

      // Mock successful delete
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "prayers") {
          return {
            select: vi.fn(() => ({
              eq: mockEq1,
            })),
          };
        }
        if (table === "prayer_updates") {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                data: null,
                error: null,
              })),
            })),
          };
        }
      });

      const { result } = renderHook(() => usePrayerManager());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialLoadCount = loadCallCount;

      await act(async () => {
        await result.current.deletePrayerUpdate("update-123");
      });

      // Should have triggered a reload
      expect(loadCallCount).toBeGreaterThan(initialLoadCount);
    });
  });

  describe("getFilteredPrayers with non-array updates", () => {
    it("handles prayers where updates is not an array", async () => {
      const mockPrayers = [
        {
          id: "1",
          title: "Prayer One",
          description: "Description one",
          status: "active" as const,
          requester: "John",
          prayer_for: "Jane",
          email: null,
          is_anonymous: false,
          date_requested: "2024-01-01",
          date_answered: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          prayer_updates: null as any, // Not an array
        },
        {
          id: "2",
          title: "Prayer with matching term",
          description: "This has the healing keyword",
          status: "active" as const,
          requester: "Bob",
          prayer_for: "Alice",
          email: null,
          is_anonymous: false,
          date_requested: "2024-01-01",
          date_answered: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          prayer_updates: [],
        },
      ];

      const mockEq2 = vi.fn(() => ({
        order: vi.fn(() => ({
          data: mockPrayers,
          error: null,
        })),
      }));

      const mockEq1 = vi.fn(() => ({
        eq: mockEq2,
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "prayers") {
          return {
            select: vi.fn(() => ({
              eq: mockEq1,
            })),
          };
        }
      });

      const { result } = renderHook(() => usePrayerManager());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.prayers.length).toBe(2);
      });

      // Filter with a search term - should handle null updates gracefully
      const filtered = result.current.getFilteredPrayers(undefined, "healing");

      // Should find the prayer with matching title/description, not crash on null updates
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("2");
    });
  });

  describe("visibilitychange event handling", () => {
    it("reloads prayers when document becomes visible", async () => {
      let loadCallCount = 0;

      const mockEq2 = vi.fn(() => ({
        order: vi.fn(() => {
          loadCallCount++;
          return {
            data: [],
            error: null,
          };
        }),
      }));

      const mockEq1 = vi.fn(() => ({
        eq: mockEq2,
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "prayers") {
          return {
            select: vi.fn(() => ({
              eq: mockEq1,
            })),
          };
        }
      });

      const { unmount } = renderHook(() => usePrayerManager());

      await waitFor(() => {
        expect(loadCallCount).toBeGreaterThanOrEqual(1);
      });

      const initialLoadCount = loadCallCount;

      // Simulate document becoming visible
      Object.defineProperty(document, "visibilityState", {
        writable: true,
        value: "visible",
      });

      // Dispatch visibilitychange event
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      await waitFor(() => {
        expect(loadCallCount).toBeGreaterThan(initialLoadCount);
      });

      // Cleanup
      unmount();
    });

    it("removes event listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(
        document,
        "removeEventListener"
      );

      const mockEq2 = vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
      }));

      const mockEq1 = vi.fn(() => ({
        eq: mockEq2,
      }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === "prayers") {
          return {
            select: vi.fn(() => ({
              eq: mockEq1,
            })),
          };
        }
      });

      const { unmount } = renderHook(() => usePrayerManager());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});
