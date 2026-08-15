import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HomePersonalCategoryController } from "./home-personal-category.controller";
import type { PrayerRequest } from "./prayer.service";
import { HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_CLASS } from "../lib/personal-category-drag-scroll";
import * as personalCategoryLongPress from "../lib/personal-category-long-press";
import { PERSONAL_CATEGORY_LONG_PRESS_MS } from "../lib/personal-category-long-press";

function prayersWithCategoryOrder(
  entries: Array<{ category: string; display_order: number }>
): PrayerRequest[] {
  return entries.map((entry, index) => ({
    id: String(index + 1),
    category: entry.category,
    display_order: entry.display_order,
  })) as PrayerRequest[];
}

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
    getPersonalPrayersSnapshot: ReturnType<typeof vi.fn>;
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
      getPersonalPrayersSnapshot: vi.fn(() => []),
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

  it("derives named categories from prayer snapshot excluding Answered", () => {
    prayerService.getPersonalPrayersSnapshot.mockReturnValue(
      prayersWithCategoryOrder([
        { category: "Health", display_order: 2000 },
        { category: "Answered", display_order: 1500 },
        { category: "Family", display_order: 1000 },
      ])
    );
    expect(controller.uniquePersonalCategories).toEqual(["Health", "Family"]);
  });

  it("onCategoryDrop uses swapCategoryRanges for adjacent swap", async () => {
    prayerService.getPersonalPrayersSnapshot.mockReturnValue(
      prayersWithCategoryOrder([
        { category: "Members", display_order: 2000 },
        { category: "Leaders", display_order: 1000 },
      ])
    );
    prayerService.swapCategoryRanges.mockResolvedValue(true);

    await controller.onCategoryDrop({
      previousIndex: 0,
      currentIndex: 1,
    } as any);

    expect(prayerService.swapCategoryRanges).toHaveBeenCalledWith(
      "Members",
      "Leaders"
    );
    expect(host.getPersonalPrayers).not.toHaveBeenCalled();
    expect(controller.isCategoryDropListDisabled).toBe(false);
  });

  it("onCategoryDrop rolls back optimistic order when swap fails", async () => {
    prayerService.getPersonalPrayersSnapshot.mockReturnValue(
      prayersWithCategoryOrder([
        { category: "Members", display_order: 2000 },
        { category: "Leaders", display_order: 1000 },
      ])
    );
    prayerService.swapCategoryRanges.mockResolvedValue(false);

    await controller.onCategoryDrop({
      previousIndex: 0,
      currentIndex: 1,
    } as any);

    expect(toastService.error).toHaveBeenCalledWith(
      "Failed to reorder categories"
    );
    expect(controller.uniquePersonalCategories).toEqual(["Members", "Leaders"]);
  });

  it("syncCategoriesFromPrayers clears pending optimistic order", async () => {
    prayerService.getPersonalPrayersSnapshot.mockReturnValue(
      prayersWithCategoryOrder([{ category: "Health", display_order: 1000 }])
    );
    await controller.syncCategoriesFromPrayers([]);
    expect(controller.uniquePersonalCategories).toEqual(["Health"]);
    expect(host.markForCheck).toHaveBeenCalled();
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

  describe("personal category long-press rename", () => {
    it("opens rename modal after long-press and swallows the release gesture", () => {
      vi.useFakeTimers();
      const clearSelectionSpy = vi.spyOn(
        personalCategoryLongPress,
        "clearBrowserTextSelection"
      );
      const addListenerSpy = vi.spyOn(document, "addEventListener");

      controller.onPersonalCategoryPointerDown(
        {
          button: 0,
          clientX: 10,
          clientY: 10,
          target: document.createElement("button"),
        } as unknown as PointerEvent,
        "Health"
      );

      vi.advanceTimersByTime(PERSONAL_CATEGORY_LONG_PRESS_MS);

      expect(controller.showRenamePersonalCategory).toBe(true);
      expect(controller.renamingPersonalCategory).toBe("Health");
      expect(clearSelectionSpy).toHaveBeenCalled();
      expect(addListenerSpy).toHaveBeenCalledWith(
        "pointerup",
        expect.any(Function),
        expect.objectContaining({ capture: true, passive: false })
      );

      const releaseEvent = {
        cancelable: true,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as PointerEvent;
      controller.onPersonalCategoryPointerUp(releaseEvent);

      expect(releaseEvent.preventDefault).toHaveBeenCalled();
      expect(releaseEvent.stopPropagation).toHaveBeenCalled();

      vi.useRealTimers();
      clearSelectionSpy.mockRestore();
      addListenerSpy.mockRestore();
    });
  });

  describe("category drag scroll lock", () => {
    let viewport: HTMLElement;

    beforeEach(() => {
      const shell = document.createElement("div");
      shell.className = "main-page-shell";
      viewport = document.createElement("div");
      viewport.className = "safe-area-viewport";
      shell.appendChild(viewport);
      document.body.appendChild(shell);
    });

    afterEach(() => {
      document.body.innerHTML = "";
      document.body.style.cursor = "";
    });

    it("locks home scroll on drag start and unlocks on drag end", () => {
      controller.onCategoryDragStarted();
      expect(controller.isCategoryDragging).toBe(true);
      expect(document.body.style.cursor).toBe("grabbing");
      expect(
        viewport.classList.contains(HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_CLASS)
      ).toBe(true);

      controller.onCategoryDragEnded();
      expect(controller.isCategoryDragging).toBe(false);
      expect(document.body.style.cursor).toBe("");
      expect(
        viewport.classList.contains(HOME_PERSONAL_CATEGORY_DRAG_SCROLL_LOCK_CLASS)
      ).toBe(false);
    });
  });
});
