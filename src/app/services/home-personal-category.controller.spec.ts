import { describe, it, expect, vi, beforeEach } from "vitest";
import { HomePersonalCategoryController } from "./home-personal-category.controller";
import type { PrayerRequest } from "./prayer.service";

describe("HomePersonalCategoryController", () => {
  let controller: HomePersonalCategoryController;
  let host: {
    getPersonalPrayers: ReturnType<typeof vi.fn>;
    markForCheck: ReturnType<typeof vi.fn>;
    detectChanges: ReturnType<typeof vi.fn>;
    onFilterStateChanged: ReturnType<typeof vi.fn>;
  };
  let prayerService: {
    swapCategoryRanges: ReturnType<typeof vi.fn>;
    reorderCategories: ReturnType<typeof vi.fn>;
    getUniqueCategoriesForUser: ReturnType<typeof vi.fn>;
    renamePersonalCategory: ReturnType<typeof vi.fn>;
    updatePersonalPrayerOrder: ReturnType<typeof vi.fn>;
  };
  let personalCategoryColorService: {
    getColorsSnapshot: ReturnType<typeof vi.fn>;
    renameCategory: ReturnType<typeof vi.fn>;
  };
  let toastService: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    controller = new HomePersonalCategoryController();
    host = {
      getPersonalPrayers: vi.fn(() => []),
      setPersonalPrayers: vi.fn(),
      getFilteredPersonalPrayers: vi.fn(() => []),
      setIsReorderingPersonalPrayers: vi.fn(),
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
      onFilterStateChanged: vi.fn(),
    };
    prayerService = {
      swapCategoryRanges: vi.fn(),
      reorderCategories: vi.fn(),
      getUniqueCategoriesForUser: vi.fn().mockResolvedValue(["Health", "Family"]),
      renamePersonalCategory: vi.fn(),
      updatePersonalPrayerOrder: vi.fn(),
    };
    personalCategoryColorService = {
      getColorsSnapshot: vi.fn(() => ({})),
      renameCategory: vi.fn(),
    };
    toastService = { error: vi.fn(), success: vi.fn() };
    controller.bindHost(host, {
      prayerService: prayerService as any,
      personalCategoryColorService: personalCategoryColorService as any,
      toastService: toastService as any,
    });
  });

  it("togglePersonalCategory clears selection when already chosen", () => {
    controller.personalCategoryFilterMode = "named";
    controller.selectedPersonalCategories = ["Members"];
    controller.togglePersonalCategory("Members");
    expect(controller.selectedPersonalCategories).toEqual([]);
    expect(controller.personalCategoryFilterMode).toBe("current");
    expect(host.onFilterStateChanged).toHaveBeenCalled();
  });

  it("selectPersonalCategoryFilterMode switches fixed chips and clears named selection", () => {
    controller.personalCategoryFilterMode = "named";
    controller.selectedPersonalCategories = ["Health"];
    controller.selectPersonalCategoryFilterMode("answered");
    expect(controller.personalCategoryFilterMode).toBe("answered");
    expect(controller.selectedPersonalCategories).toEqual([]);
    controller.selectPersonalCategoryFilterMode("total");
    expect(controller.personalCategoryFilterMode).toBe("total");
  });

  it("onCategoryDrop uses swapCategoryRanges for adjacent swap", async () => {
    prayerService.swapCategoryRanges.mockResolvedValue(true);
    host.getPersonalPrayers.mockReturnValue([
      { id: "1", category: "Leaders" } as PrayerRequest,
    ]);

    controller.uniquePersonalCategories = ["Members", "Leaders"];
    await controller.onCategoryDrop({
      previousIndex: 0,
      currentIndex: 1,
    } as any);

    expect(prayerService.swapCategoryRanges).toHaveBeenCalledWith(
      "Members",
      "Leaders"
    );
    expect(controller.isSwappingCategories).toBe(false);
  });

  it("onCategoryDrop rolls back on failure", async () => {
    prayerService.swapCategoryRanges.mockResolvedValue(false);
    controller.uniquePersonalCategories = ["Members", "Leaders"];
    await controller.onCategoryDrop({
      previousIndex: 0,
      currentIndex: 1,
    } as any);
    expect(toastService.error).toHaveBeenCalledWith(
      "Failed to reorder categories"
    );
    expect(controller.uniquePersonalCategories).toEqual(["Members", "Leaders"]);
  });

  it("onPersonalPrayerDrop refreshes catalog after optimistic reorder", async () => {
    controller.personalCategoryFilterMode = "named";
    controller.selectedPersonalCategories = ["Health"];
    const prayers = [
      { id: "a", category: "Health" } as PrayerRequest,
      { id: "b", category: "Health" } as PrayerRequest,
    ];
    host.getPersonalPrayers.mockReturnValue(prayers);
    host.getFilteredPersonalPrayers.mockReturnValue([...prayers]);
    prayerService.updatePersonalPrayerOrder.mockResolvedValue(true);

    await controller.onPersonalPrayerDrop({
      previousIndex: 0,
      currentIndex: 1,
    } as any);

    expect(host.setPersonalPrayers).toHaveBeenCalled();
    expect(host.onFilterStateChanged).toHaveBeenCalled();
    expect(prayerService.updatePersonalPrayerOrder).toHaveBeenCalled();
  });

  it("onPersonalPrayerDrop rolls back catalog when reorder fails", async () => {
    controller.personalCategoryFilterMode = "named";
    controller.selectedPersonalCategories = ["Health"];
    const prayers = [
      { id: "a", category: "Health" } as PrayerRequest,
      { id: "b", category: "Health" } as PrayerRequest,
    ];
    host.getPersonalPrayers.mockReturnValue(prayers);
    host.getFilteredPersonalPrayers.mockReturnValue([...prayers]);
    prayerService.updatePersonalPrayerOrder.mockResolvedValue(false);

    await controller.onPersonalPrayerDrop({
      previousIndex: 0,
      currentIndex: 1,
    } as any);

    expect(host.setPersonalPrayers).toHaveBeenLastCalledWith(prayers);
    expect(host.onFilterStateChanged).toHaveBeenCalled();
  });
});
