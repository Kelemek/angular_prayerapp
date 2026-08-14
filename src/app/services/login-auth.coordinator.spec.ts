import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoginAuthCoordinator } from "./login-auth.coordinator";

vi.mock("../../lib/planning-center", () => ({
  lookupPersonByEmail: vi.fn(),
}));

const makeDeps = () => {
  const adminAuthService = {
    logout: vi.fn(async () => undefined),
  };
  const supabaseService = {
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
      rpc: vi.fn(async () => ({ data: "req-1", error: null })),
    },
    directQuery: vi.fn(async () => ({ data: [], error: null })),
    directMutation: vi.fn(async () => ({ data: [{ id: "1" }], error: null })),
  };
  const emailNotificationService = {
    sendAccountApprovalNotification: vi.fn(async () => true),
    sendSubscriberWelcomeNotification: vi.fn(async () => true),
  };
  const userSessionService = {
    loadUserSession: vi.fn(async () => undefined),
  };

  return {
    coordinator: new LoginAuthCoordinator(
      supabaseService as any,
      emailNotificationService as any,
      adminAuthService as any,
      userSessionService as any
    ),
    adminAuthService,
    supabaseService,
    emailNotificationService,
    userSessionService,
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
    supabaseService.directQuery = vi.fn(async () => ({
      data: [{ id: "pending" }],
      error: null,
    }));

    const result = await coordinator.resolvePostVerificationFlow(
      "user@example.com",
      "/"
    );

    expect(result).toEqual({ kind: "pending_approval" });
    expect(adminAuthService.logout).toHaveBeenCalled();
  });

  it("resolvePostVerificationFlow returns registration when not a subscriber", async () => {
    const { coordinator } = makeDeps();
    const pc = await import("../../lib/planning-center");
    vi.mocked(pc.lookupPersonByEmail).mockResolvedValue({
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
    supabaseService.directQuery = vi.fn(async (table: string) => {
      if (table === "account_approval_requests") {
        return { data: [], error: null };
      }
      return { data: [{ id: "sub", is_blocked: false }], error: null };
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
    supabaseService.directQuery = vi.fn(async (table: string) => {
      if (table === "account_approval_requests") {
        return { data: [], error: null };
      }
      return { data: [{ id: "1", is_blocked: true }], error: null };
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
