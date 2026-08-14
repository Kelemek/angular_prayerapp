import { describe, it, expect, vi, beforeEach } from "vitest";
import { of } from "rxjs";
import { HomeAdminNavigationController } from "./home-admin-navigation.controller";

describe("HomeAdminNavigationController", () => {
  const router = { navigate: vi.fn() };
  const toastService = { error: vi.fn() };
  let userSessionService: { getUserEmail: ReturnType<typeof vi.fn> };
  let adminAuthService: { isAdmin$: ReturnType<typeof of> };
  let controller: HomeAdminNavigationController;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    userSessionService = { getUserEmail: vi.fn(() => null) };
    adminAuthService = { isAdmin$: of(false) };
    controller = new HomeAdminNavigationController(
      adminAuthService as any,
      router as any,
      toastService as any,
      userSessionService as any
    );
  });

  it("getUserEmail prefers cached session email", () => {
    userSessionService.getUserEmail.mockReturnValue("cached@example.com");
    expect(controller.getUserEmail()).toBe("cached@example.com");
  });

  it("getUserEmail falls back through localStorage keys", () => {
    localStorage.setItem("approvalAdminEmail", "a@b.com");
    expect(controller.getUserEmail()).toBe("a@b.com");
  });

  it("navigateToAdmin redirects to login when admin session expired", () => {
    localStorage.setItem("userEmail", "admin@example.com");
    controller.navigateToAdmin();
    expect(router.navigate).toHaveBeenCalledWith(["/login"], {
      queryParams: { email: "admin@example.com", sessionExpired: true },
    });
  });
});
