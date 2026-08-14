import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomeModalController } from "./home-modal.controller";
import type { PrayerRequest } from "./prayer.service";

describe("HomeModalController", () => {
  let controller: HomeModalController;
  let host: { markForCheck: ReturnType<typeof vi.fn> };
  let adminAuthService: { logout: ReturnType<typeof vi.fn> };
  let reloadMemberPrayerUpdates: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    controller = new HomeModalController();
    host = { markForCheck: vi.fn() };
    adminAuthService = { logout: vi.fn().mockResolvedValue(undefined) };
    reloadMemberPrayerUpdates = vi.fn();
    controller.bindHost(host, {
      adminAuthService: adminAuthService as any,
      reloadMemberPrayerUpdates,
    });
  });

  it("opens and closes user settings with scroll target", () => {
    controller.openUserSettings("tour-settings-print-buttons");
    expect(controller.showSettings).toBe(true);
    expect(controller.settingsScrollToSectionId).toBe(
      "tour-settings-print-buttons"
    );

    controller.closeUserSettings();
    expect(controller.showSettings).toBe(false);
    expect(controller.settingsScrollToSectionId).toBeNull();
    expect(host.markForCheck).toHaveBeenCalled();
  });

  it("opens personal prayer edit modal", () => {
    const prayer = { id: "p1", prayer_for: "Test" } as PrayerRequest;
    controller.openEditModal(prayer);
    expect(controller.editingPrayer).toEqual(prayer);
    expect(controller.showEditPersonalPrayer).toBe(true);
  });

  it("clears personal prayer edit state on save", () => {
    controller.editingPrayer = { id: "p1" } as PrayerRequest;
    controller.showEditPersonalPrayer = true;
    controller.onPersonalPrayerSaved();
    expect(controller.showEditPersonalPrayer).toBe(false);
    expect(controller.editingPrayer).toBeNull();
  });

  it("logs out after confirmation", async () => {
    controller.showLogoutConfirmation = true;
    await controller.handleLogout();
    expect(controller.showLogoutConfirmation).toBe(false);
    expect(adminAuthService.logout).toHaveBeenCalled();
  });

  it("reloads member updates after member update save", () => {
    vi.useFakeTimers();
    controller.editingMemberUpdatePrayerId = "pc-member-abc";
    controller.showEditMemberUpdate = true;

    controller.onMemberUpdateSaved();
    expect(controller.showEditMemberUpdate).toBe(false);

    vi.advanceTimersByTime(100);
    expect(reloadMemberPrayerUpdates).toHaveBeenCalledWith("abc");
    vi.useRealTimers();
  });
});
