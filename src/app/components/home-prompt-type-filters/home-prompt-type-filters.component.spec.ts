import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { BadgeService } from "../../services/badge.service";
import {
  HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import {
  PROMPT_TYPE_CHIP_ACTIVE_CLASS,
  PROMPT_TYPE_CHIP_INACTIVE_CLASS,
} from "../../lib/prompt-type-chip-classes";
import { HomePromptTypeFiltersComponent } from "./home-prompt-type-filters.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("HomePromptTypeFiltersComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<HomePromptTypeFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePromptTypeFiltersComponent],
    })
      .overrideProvider(BadgeService, {
        useValue: {
          getBadgeFunctionalityEnabled$: () => of(false),
          markAllAsReadByPromptType: vi.fn(),
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomePromptTypeFiltersComponent);
    fixture.componentInstance.promptsCount = 8;
    fixture.componentInstance.selectedPromptTypes = [];
    fixture.componentInstance.uniquePromptTypes = ["Prayer", "Praise"];
    fixture.componentInstance.promptTypeActiveClass = PROMPT_TYPE_CHIP_ACTIVE_CLASS;
    fixture.componentInstance.promptTypeInactiveClass =
      PROMPT_TYPE_CHIP_INACTIVE_CLASS;
    fixture.componentInstance.getPromptCountByType = (type) =>
      type === "Prayer" ? 5 : 3;
    fixture.componentInstance.getUnreadPromptCountByType = () => 0;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("wraps each chip with static flex row host classes", () => {
    const hosts = fixture.nativeElement.querySelectorAll(
      "#tour-prompt-type-filters > div"
    );
    expect(hosts.length).toBe(3);
    for (const host of hosts) {
      expect(host.className).toContain(
        HOME_WRAP_FILTER_CHIP_FLEX_CLASS.split(" ")[0]
      );
    }
  });

  it("uses stretch button classes with active styling on All Types when none selected", () => {
    const allTypesButton = fixture.nativeElement.querySelector(
      "button"
    ) as HTMLButtonElement;
    expect(allTypesButton.textContent).toContain("All Types (8)");
    expect(allTypesButton.className).toContain(
      HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS.split(" ")[0]
    );
    expect(allTypesButton.className).toContain("ring-[#988F83]");
    expect(allTypesButton.className).toContain("bg-stone-100");
  });

  it("emits toggleType when a type chip is clicked", () => {
    const toggleSpy = vi.fn();
    fixture.componentInstance.toggleType.subscribe(toggleSpy);

    const typeButtons = fixture.nativeElement.querySelectorAll("button");
    (typeButtons[1] as HTMLButtonElement).click();

    expect(toggleSpy).toHaveBeenCalledWith("Prayer");
  });
});
