import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
  HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import { HomePersonalCategoryFiltersComponent } from "./home-personal-category-filters.component";

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
  });

  it("wraps each category chip with static flex row host classes like prompt types", () => {
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

  it("uses drag stretch button classes on category chips", () => {
    const button = fixture.nativeElement.querySelector(
      "[data-personal-category-chip='Family'] button"
    ) as HTMLButtonElement;
    expect(button.textContent).toContain("Family (3)");
    expect(button.className).toContain(
      HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS.split(" ")[0]
    );
  });
});
