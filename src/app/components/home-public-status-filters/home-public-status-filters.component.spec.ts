import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { BadgeService } from "../../services/badge.service";
import { HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS } from "../../lib/home-sub-filter-chip-classes";
import { HomePublicStatusFiltersComponent } from "./home-public-status-filters.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("HomePublicStatusFiltersComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<HomePublicStatusFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePublicStatusFiltersComponent],
    })
      .overrideProvider(BadgeService, {
        useValue: {
          getBadgeFunctionalityEnabled$: () => of(false),
          markAllAsReadByStatus: vi.fn(),
          markAllAsRead: vi.fn(),
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomePublicStatusFiltersComponent);
    fixture.componentInstance.activeFilter = "current";
    fixture.componentInstance.currentPrayersCount = 4;
    fixture.componentInstance.answeredPrayersCount = 3;
    fixture.componentInstance.archivedPrayersCount = 15;
    fixture.componentInstance.totalPrayersCount = 22;
    fixture.componentInstance.promptsCount = 8;
    fixture.componentInstance.currentPrayerBadge$ = of(0);
    fixture.componentInstance.answeredPrayerBadge$ = of(0);
    fixture.componentInstance.promptBadge$ = of(0);
    fixture.componentInstance.showPlanningCenterMembersFilter = true;
    fixture.componentInstance.planningCenterMembersDisplayCount = 19;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("wraps each public status chip with the same flex-wrap host as prompt types", () => {
    const chipIds = [
      "tour-filter-current",
      "tour-filter-answered",
      "tour-filter-archived",
      "tour-filter-total",
      "tour-filter-prompts",
      "tour-filter-members",
    ];
    for (const id of chipIds) {
      const button = fixture.nativeElement.querySelector(
        `#${id}`
      ) as HTMLButtonElement;
      expect(button).toBeTruthy();
      const host = button.closest("div") as HTMLElement;
      expect(host.className).toContain("flex-[1_1_0]");
      expect(host.className).toContain("min-w-max");
      expect(button.className).toContain(
        HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS.split(" ")[0]
      );
    }
  });

  it("emits prompts when the Prompts chip is clicked", () => {
    const emitted: string[] = [];
    fixture.componentInstance.selectFilter.subscribe((value) =>
      emitted.push(value)
    );

    const promptsChip = fixture.nativeElement.querySelector(
      "#tour-filter-prompts"
    ) as HTMLButtonElement;
    expect(promptsChip.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Prompts (8)"
    );
    promptsChip.click();

    expect(emitted).toEqual(["prompts"]);
  });

  it("removes bottom rounding when prompts panel is expanded", () => {
    fixture.componentRef.setInput("promptsPanelExpanded", true);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector(
      ".rounded-b-none"
    ) as HTMLElement;
    expect(row).toBeTruthy();
  });
});
