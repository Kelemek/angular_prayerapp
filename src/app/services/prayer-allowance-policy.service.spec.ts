import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrayerAllowancePolicyService } from "./prayer-allowance-policy.service";

describe("PrayerAllowancePolicyService", () => {
  const makeService = (maybeSingle: ReturnType<typeof vi.fn>) => {
    const supabaseService: any = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle,
            }),
          }),
        }),
      },
    };
    return new PrayerAllowancePolicyService(supabaseService);
  };

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("load sets deletion and update policies", async () => {
    const service = makeService(
      vi.fn().mockResolvedValue({
        data: {
          deletions_allowed: "original-requestor",
          updates_allowed: "admin-only",
        },
        error: null,
      })
    );

    await service.load();

    expect(service.deletionsAllowed).toBe("original-requestor");
    expect(service.updatesAllowed).toBe("admin-only");
  });

  it("load keeps defaults when the query errors", async () => {
    const service = makeService(
      vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Database error"),
      })
    );

    await service.load();

    expect(service.deletionsAllowed).toBe("everyone");
    expect(service.updatesAllowed).toBe("everyone");
  });

  it("load keeps defaults when the query throws", async () => {
    const service = makeService(
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    await service.load();

    expect(service.deletionsAllowed).toBe("everyone");
    expect(service.updatesAllowed).toBe("everyone");
  });

  it("load keeps defaults when data is null", async () => {
    const service = makeService(
      vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })
    );

    await service.load();

    expect(service.deletionsAllowed).toBe("everyone");
    expect(service.updatesAllowed).toBe("everyone");
  });

  it("load falls back when policy values are null", async () => {
    const service = makeService(
      vi.fn().mockResolvedValue({
        data: {
          deletions_allowed: null,
          updates_allowed: undefined,
        },
        error: null,
      })
    );

    await service.load();

    expect(service.deletionsAllowed).toBe("everyone");
    expect(service.updatesAllowed).toBe("everyone");
  });
});
