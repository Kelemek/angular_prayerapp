import { describe, it, expect, vi, beforeEach } from "vitest";
import { wireGatedSupabaseMock } from '../testing/supabase-service-mock';
import { LoginAuthCoordinator } from "./login-auth.coordinator";

function mockLoginFromTables(
  supabaseService: { client: { from: ReturnType<typeof vi.fn> } },
  options: {
    approvalRow?: Record<string, unknown> | null;
    subscriberRow?: Record<string, unknown> | null;
  } = {}
) {
  const approvalRow = options.approvalRow ?? null;
  const subscriberRow = options.subscriberRow ?? null;
  supabaseService.client.from = vi.fn((table: string) => {
    if (table === "account_approval_requests") {
      const chain = {
        eq: vi.fn(function eq() {
          return chain;
        }),
        maybeSingle: vi.fn(async () => ({ data: approvalRow, error: null })),
      };
      return { select: vi.fn(() => chain) };
    }
    if (table === "email_subscribers") {
      const chain = {
        eq: vi.fn(function eq() {
          return chain;
        }),
        maybeSingle: vi.fn(async () => ({ data: subscriberRow, error: null })),
      };
      return { select: vi.fn(() => chain) };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: { verification_code_length: 6 },
            error: null,
          })),
        })),
      })),
    };
  }) as any;
  const existingRpc = supabaseService.client.rpc;
  supabaseService.client.rpc = vi.fn(async (fn: string, args?: Record<string, unknown>) => {
    if (fn === "has_pending_account_approval") {
      return { data: approvalRow != null, error: null };
    }
    if (typeof existingRpc === "function") {
      return existingRpc(fn, args);
    }
    return { data: null, error: null };
  }) as any;
}

const makeDeps = () => {
  const adminAuthService = {
    logout: vi.fn(async () => undefined),
    prepareLoginDataAccess: vi.fn(async () => undefined),
  };
  const supabaseService = wireGatedSupabaseMock({
    client: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: { verification_code_length: 6 },
              error: null,
            })),
          })),
        })),
      })),
      rpc: vi.fn(async (fn: string) => {
        if (fn === "has_pending_account_approval") {
          return { data: false, error: null };
        }
        return { data: "req-1", error: null };
      }),
    },
    directQuery: vi.fn(async () => ({ data: [], error: null })),
    directMutation: vi.fn(async () => ({ data: [{ id: "1" }], error: null })),
  }) as unknown as SupabaseService;
  wireGatedSupabaseMock(supabaseService);
  const emailNotificationService = {
    sendAccountApprovalNotification: vi.fn(async () => true),
    sendSubscriberWelcomeNotification: vi.fn(async () => true),
  };
  const userSessionService = {
    loadUserSession: vi.fn(async () => undefined),
  };
  const planningCenterRest = {
    lookupPersonByEmail: vi.fn(async () => ({ count: 0, people: [] })),
  };

  return {
    coordinator: new LoginAuthCoordinator(
      supabaseService as any,
      emailNotificationService as any,
      adminAuthService as any,
      userSessionService as any,
      planningCenterRest as any
    ),
    adminAuthService,
    supabaseService,
    emailNotificationService,
    userSessionService,
    planningCenterRest,
  };
};

describe("LoginAuthCoordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetchVerificationCodeLength returns admin setting", async () => {
    const { coordinator } = makeDeps();
    await expect(coordinator.fetchVerificationCodeLength()).resolves.toBe(6);
  });

  it("fetchVerificationCodeLength defaults to 4 when missing", async () => {
    const { coordinator, supabaseService } = makeDeps();
    supabaseService.client.from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })) as any;
    await expect(coordinator.fetchVerificationCodeLength()).resolves.toBe(4);
  });

  it("resolvePostVerificationFlow returns pending approval and logs out", async () => {
    const { coordinator, supabaseService, adminAuthService } = makeDeps();
    mockLoginFromTables(supabaseService, {
      approvalRow: { id: "pending", approval_status: "pending" },
    });

    const result = await coordinator.resolvePostVerificationFlow(
      "user@example.com",
      "/"
    );

    expect(result).toEqual({ kind: "pending_approval" });
    expect(adminAuthService.logout).toHaveBeenCalled();
  });

  it("resolvePostVerificationFlow returns registration when not a subscriber", async () => {
    const { coordinator, supabaseService, planningCenterRest } = makeDeps();
    mockLoginFromTables(supabaseService, { subscriberRow: null });
    planningCenterRest.lookupPersonByEmail.mockResolvedValue({
      count: 0,
      people: [],
    } as any);

    const result = await coordinator.resolvePostVerificationFlow(
      "new@example.com",
      "/"
    );

    expect(result).toEqual({
      kind: "show_registration",
      requiresApproval: true,
    });
  });

  it("resolvePostVerificationFlow navigates existing subscribers", async () => {
    const { coordinator, supabaseService, userSessionService } = makeDeps();
    mockLoginFromTables(supabaseService, {
      subscriberRow: { id: "sub", email: "user@example.com", is_blocked: false },
    });

    const result = await coordinator.resolvePostVerificationFlow(
      "user@example.com",
      "/admin/dashboard"
    );

    expect(result).toEqual({
      kind: "navigate",
      destination: "/admin/dashboard",
    });
    expect(userSessionService.loadUserSession).toHaveBeenCalledWith(
      "user@example.com"
    );
  });

  it("resolvePostVerificationFlow throws when subscriber is blocked", async () => {
    const { coordinator, supabaseService } = makeDeps();
    mockLoginFromTables(supabaseService, {
      subscriberRow: {
        id: "1",
        email: "blocked@example.com",
        is_blocked: true,
      },
    });

    await expect(
      coordinator.resolvePostVerificationFlow("blocked@example.com", "/")
    ).rejects.toThrow("blocked");
  });

  it("saveNewSubscriber returns error when names are missing", async () => {
    const { coordinator } = makeDeps();
    const result = await coordinator.saveNewSubscriber({
      email: "x@y.com",
      firstName: "",
      lastName: "",
      affiliationReason: "",
      requiresApproval: false,
      returnUrl: "/",
    });
    expect(result).toEqual({
      kind: "error",
      message: "Please enter your first and last name",
    });
  });

  it("saveNewSubscriber returns pending approval after RPC success", async () => {
    const { coordinator, adminAuthService } = makeDeps();
    const result = await coordinator.saveNewSubscriber({
      email: "x@y.com",
      firstName: "A",
      lastName: "B",
      affiliationReason: "Visitor",
      requiresApproval: true,
      returnUrl: "/",
    });
    expect(result).toEqual({ kind: "pending_approval" });
    expect(adminAuthService.logout).toHaveBeenCalled();
  });

  it("saveNewSubscriber returns duplicate approval error message", async () => {
    const { coordinator, supabaseService } = makeDeps();
    supabaseService.client.rpc = vi.fn(async () => ({
      data: null,
      error: { message: "duplicate key value violates unique constraint" },
    }));

    const result = await coordinator.saveNewSubscriber({
      email: "dup@y.com",
      firstName: "A",
      lastName: "B",
      affiliationReason: "",
      requiresApproval: true,
      returnUrl: "/",
    });

    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toContain("approval request already exists");
    }
  });

  it("saveNewSubscriber returns generic approval RPC error message", async () => {
    const { coordinator, supabaseService } = makeDeps();
    supabaseService.client.rpc = vi.fn(async () => ({
      data: null,
      error: { message: "some other error occurred" },
    }));

    const result = await coordinator.saveNewSubscriber({
      email: "generic@y.com",
      firstName: "A",
      lastName: "B",
      affiliationReason: "",
      requiresApproval: true,
      returnUrl: "/",
    });

    expect(result).toEqual({
      kind: "error",
      message: "Failed to submit approval request: some other error occurred",
    });
  });

  it("saveNewSubscriber still returns pending approval when admin email fails", async () => {
    const { coordinator, emailNotificationService } = makeDeps();
    emailNotificationService.sendAccountApprovalNotification = vi.fn(async () => {
      throw new Error("smtp fail");
    });

    const result = await coordinator.saveNewSubscriber({
      email: "notify@x.com",
      firstName: "A",
      lastName: "B",
      affiliationReason: "",
      requiresApproval: true,
      returnUrl: "/",
    });

    expect(result).toEqual({ kind: "pending_approval" });
  });

  it("saveNewSubscriber returns directMutation error for normal signup", async () => {
    const { coordinator, supabaseService } = makeDeps();
    supabaseService.directMutation = vi.fn(async () => ({
      data: null,
      error: { message: "Insert failed" },
    }));

    const result = await coordinator.saveNewSubscriber({
      email: "savefail@x.com",
      firstName: "A",
      lastName: "B",
      affiliationReason: "",
      requiresApproval: false,
      returnUrl: "/",
    });

    expect(result).toEqual({
      kind: "error",
      message: "Failed to save subscriber: Insert failed",
    });
  });

  it("saveNewSubscriber navigates after successful directMutation", async () => {
    const { coordinator, userSessionService } = makeDeps();
    const result = await coordinator.saveNewSubscriber({
      email: "x3@y.com",
      firstName: "A",
      lastName: "B",
      affiliationReason: "",
      requiresApproval: false,
      returnUrl: "/admin/dashboard",
    });

    expect(result).toEqual({
      kind: "navigate",
      destination: "/admin/dashboard",
    });
    expect(userSessionService.loadUserSession).toHaveBeenCalledWith("x3@y.com");
  });
});
