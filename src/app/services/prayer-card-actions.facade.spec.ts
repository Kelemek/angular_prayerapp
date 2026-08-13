import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrayerCardActionsFacade } from "./prayer-card-actions.facade";

const makeMocks = () => {
  const prayerService: any = {
    deletePrayer: vi.fn(),
    deletePersonalPrayer: vi.fn().mockResolvedValue(true),
    addUpdate: vi.fn().mockResolvedValue(undefined),
    addMemberPrayerUpdate: vi.fn().mockResolvedValue(true),
    addPersonalPrayerUpdate: vi.fn().mockResolvedValue(true),
    deleteUpdate: vi.fn().mockResolvedValue(undefined),
    deleteMemberPrayerUpdate: vi.fn().mockResolvedValue(true),
    deletePersonalPrayerUpdate: vi.fn().mockResolvedValue(true),
    requestDeletion: vi.fn().mockResolvedValue(undefined),
    requestUpdateDeletion: vi.fn().mockResolvedValue(undefined),
    updateMemberPrayerUpdate: vi.fn().mockResolvedValue(true),
    updatePersonalPrayer: vi.fn().mockResolvedValue(true),
  };

  const promptService: any = {
    deletePrompt: vi.fn().mockResolvedValue(true),
  };

  const toastService: any = {
    error: vi.fn(),
    success: vi.fn(),
  };

  const userSessionService: any = {
    getCurrentSession: vi.fn(() => ({
      fullName: "Test User",
      email: "test@example.com",
    })),
  };

  const adminAuthService: any = {
    getIsAdmin: vi.fn(() => true),
  };

  const planningCenterListService: any = {
    getCurrentListId: vi.fn(() => "list-1"),
    getCurrentMembers: vi.fn(() => [
      { id: "person-1", name: "Member One" },
    ]),
  };

  return {
    prayerService,
    promptService,
    toastService,
    userSessionService,
    adminAuthService,
    planningCenterListService,
  };
};

describe("PrayerCardActionsFacade", () => {
  let mocks: ReturnType<typeof makeMocks>;
  let facade: PrayerCardActionsFacade;

  beforeEach(() => {
    mocks = makeMocks();
    facade = new PrayerCardActionsFacade(
      mocks.prayerService,
      mocks.promptService,
      mocks.toastService,
      mocks.userSessionService,
      mocks.adminAuthService,
      mocks.planningCenterListService
    );
  });

  it("exposes isAdmin from AdminAuthService", () => {
    expect(facade.isAdmin).toBe(true);
    expect(mocks.adminAuthService.getIsAdmin).toHaveBeenCalled();
  });

  it("deleteCard routes personal prayers to deletePersonalPrayer", () => {
    facade.deleteCard({ id: "p1", user_email: "owner@example.com" });
    expect(mocks.prayerService.deletePersonalPrayer).toHaveBeenCalledWith("p1");
    expect(mocks.prayerService.deletePrayer).not.toHaveBeenCalled();
  });

  it("deleteCard routes community prayers to deletePrayer", () => {
    facade.deleteCard({ id: "p1" });
    expect(mocks.prayerService.deletePrayer).toHaveBeenCalledWith("p1");
  });

  it("deleteCardForCard returns false when community delete fails", async () => {
    mocks.prayerService.deletePrayer.mockResolvedValue(false);

    const ok = await facade.deleteCardForCard({ id: "p1" });

    expect(ok).toBe(false);
  });

  it("deleteCardForCard returns true when personal delete succeeds", async () => {
    mocks.prayerService.deletePersonalPrayer.mockResolvedValue(true);

    const ok = await facade.deleteCardForCard({
      id: "p1",
      user_email: "owner@example.com",
    });

    expect(ok).toBe(true);
  });

  it("deleteCard does not delete Planning Center member cards", () => {
    facade.deleteCard({ id: "pc-member-person-1" });
    expect(mocks.prayerService.deletePrayer).not.toHaveBeenCalled();
    expect(mocks.prayerService.deletePersonalPrayer).not.toHaveBeenCalled();
  });

  it("routes member addUpdate through addMemberPrayerUpdate", async () => {
    const ok = await facade.addUpdateForCard(
      { id: "pc-member-person-1" },
      {
        prayer_id: "pc-member-person-1",
        content: "Praying",
        author: "Test User",
        author_email: "test@example.com",
        is_anonymous: false,
        mark_as_answered: true,
      }
    );

    expect(ok).toBe(true);
    expect(mocks.prayerService.addMemberPrayerUpdate).toHaveBeenCalledWith(
      "person-1",
      "Member One",
      "Praying",
      "Test User",
      "test@example.com",
      true,
      "list-1"
    );
  });

  it("deletePrompt returns the PromptService result", async () => {
    mocks.promptService.deletePrompt.mockResolvedValue(false);

    const ok = await facade.deletePrompt("p1");

    expect(ok).toBe(false);
    expect(mocks.promptService.deletePrompt).toHaveBeenCalledWith("p1");
  });

  it("deleteUpdateForCard returns true after community delete", async () => {
    const ok = await facade.deleteUpdateForCard(
      { id: "p1" },
      { updateId: "u1", prayerId: "p1" }
    );

    expect(ok).toBe(true);
    expect(mocks.prayerService.deleteUpdate).toHaveBeenCalledWith("u1");
  });
});
