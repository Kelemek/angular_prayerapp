import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  HOME_PERSONAL_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import { HomePersonalCategoryFiltersComponent } from "./home-personal-category-filters.component";
import {
  modalShellOverlayText,
  modalShellQueryAll,
} from "../modal-shell/modal-shell-test-dom";
import { resetModalShellScrollLockForTests } from "../modal-shell/modal-shell-scroll-lock";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("HomePersonalCategoryFiltersComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<HomePersonalCategoryFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePersonalCategoryFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePersonalCategoryFiltersComponent);
    fixture.componentInstance.personalPrayersCount = 8;
    fixture.componentInstance.filterMode = "current";
    fixture.componentInstance.personalCategoryActiveClass = "active-class";
    fixture.componentInstance.uniqueCategories = ["Family", "Health"];
    fixture.componentInstance.isCategoryDropListDisabled = false;
    fixture.componentInstance.personalCurrentCount = 5;
    fixture.componentInstance.personalAnsweredCount = 2;
    fixture.componentInstance.isCategorySwapping = () => false;
    fixture.componentInstance.isPersonalCategorySelected = () => false;
    fixture.componentInstance.getCategoryCount = (category) =>
      category === "Family" ? 3 : 1;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    resetModalShellScrollLockForTests();
    document.body.style.overflow = "";
  });

  function choiceButton(label: string): HTMLButtonElement {
    const match = modalShellQueryAll<HTMLButtonElement>("button").find((button) =>
      button.textContent?.includes(label)
    );
    if (!match) {
      throw new Error(`missing choice ${label}`);
    }
    return match;
  }

  function clickAddChip(): void {
    const add = fixture.nativeElement.querySelector(
      "#tour-filter-add-personal-category"
    ) as HTMLButtonElement;
    add.click();
    fixture.detectChanges();
  }

  it("shows an add-category control matching the Groups tab pattern", () => {
    const add = fixture.nativeElement.querySelector(
      "#tour-filter-add-personal-category"
    ) as HTMLButtonElement;
    expect(add).toBeTruthy();
    expect(add.getAttribute("aria-label")).toBe("Add a prayer or category");
  });

  it("opens a chooser from + and does not emit addCategory", () => {
    const addCategory = vi.fn();
    const addPrayer = vi.fn();
    fixture.componentInstance.addCategory.subscribe(addCategory);
    fixture.componentInstance.addPrayer.subscribe(addPrayer);
    clickAddChip();
    expect(addCategory).not.toHaveBeenCalled();
    expect(addPrayer).not.toHaveBeenCalled();
    expect(modalShellOverlayText()).toContain("Add to Personal");
    expect(modalShellOverlayText()).toContain("New category");
    expect(modalShellOverlayText()).toContain("New prayer");
  });

  it("emits addCategory when New category is chosen", () => {
    const addCategory = vi.fn();
    const addPrayer = vi.fn();
    fixture.componentInstance.addCategory.subscribe(addCategory);
    fixture.componentInstance.addPrayer.subscribe(addPrayer);
    clickAddChip();
    choiceButton("New category").click();
    fixture.detectChanges();
    expect(addCategory).toHaveBeenCalledTimes(1);
    expect(addPrayer).not.toHaveBeenCalled();
  });

  it("emits addPrayer when New prayer is chosen", () => {
    const addCategory = vi.fn();
    const addPrayer = vi.fn();
    fixture.componentInstance.addCategory.subscribe(addCategory);
    fixture.componentInstance.addPrayer.subscribe(addPrayer);
    clickAddChip();
    choiceButton("New prayer").click();
    fixture.detectChanges();
    expect(addPrayer).toHaveBeenCalledTimes(1);
    expect(addCategory).not.toHaveBeenCalled();
  });

  it("wraps status and category filters in the Personal folder panel", () => {
    const group = fixture.nativeElement.querySelector(
      "#tour-personal-category-filters > div"
    ) as HTMLElement;
    for (const token of HOME_PERSONAL_SUB_FILTER_GROUP_CLASS.split(" ")) {
      expect(group.className).toContain(token);
    }
  });

  it("wraps each category filter with shared wrap-row host classes like prompt types", () => {
    const hosts = fixture.nativeElement.querySelectorAll(
      "[data-personal-category-chip]"
    );
    expect(hosts.length).toBe(2);
    for (const host of hosts) {
      expect(host.className).toContain(
        HOME_WRAP_FILTER_CHIP_FLEX_CLASS.split(" ")[0]
      );
    }
  });

  it("uses drag stretch shell classes on category chips", () => {
    const chip = fixture.nativeElement.querySelector(
      "[data-personal-category-chip='Family'] > div"
    ) as HTMLElement;
    const button = chip.querySelector("button") as HTMLButtonElement;
    expect(button.textContent).toContain("Family (3)");
    expect(chip.className).toContain(
      HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS.split(" ")[0]
    );
    expect(
      chip.querySelector("[data-testid=card-actions-overflow-trigger]")
    ).toBeTruthy();
  });
});
