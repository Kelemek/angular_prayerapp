import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { BadgeService } from "../../services/badge.service";
import {
  HOME_SUB_FILTER_CHIP_ROW_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
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

  it("marks each sub-filter chip host for mobile nav text lock", () => {
    const chips = fixture.nativeElement.querySelectorAll(
      "app-home-sub-filter-chip"
    );
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect((chip as HTMLElement).className).toContain(
        "home-nav-chip-text-lock"
      );
    }
  });

  it("keeps Church status chips on two rows that still match the mobile text lock", () => {
    const root = fixture.nativeElement as HTMLElement;
    const button = (id: string) =>
      root.querySelector(`#${id}`) as HTMLButtonElement;
    const rowOf = (id: string) =>
      button(id).closest(".flex.w-full.flex-wrap.items-center.gap-2") as HTMLElement;

    const statusRow = rowOf("tour-filter-current");
    const secondaryRow = rowOf("tour-filter-archived");
    expect(statusRow).toBeTruthy();
    expect(secondaryRow).toBeTruthy();
    expect(statusRow).not.toBe(secondaryRow);
    expect(secondaryRow.className).toContain("mt-2");
    for (const token of HOME_SUB_FILTER_CHIP_ROW_CLASS.split(" ")) {
      expect(statusRow.className.split(/\s+/)).toContain(token);
      expect(secondaryRow.className.split(/\s+/)).toContain(token);
    }

    const row1Ids = [
      ...statusRow.querySelectorAll("app-home-sub-filter-chip"),
    ].map((chip) => chip.querySelector("button")?.id);
    expect(row1Ids).toEqual([
      "tour-filter-add-church-prayer",
      "tour-filter-current",
      "tour-filter-answered",
      "tour-filter-total",
    ]);
    expect(
      [...secondaryRow.querySelectorAll("button")].map((el) => el.id)
    ).toEqual([
      "tour-filter-archived",
      "tour-filter-prompts",
      "tour-filter-members",
    ]);

    const addHost = button("tour-filter-add-church-prayer").closest(
      "app-home-sub-filter-chip"
    ) as HTMLElement;
    expect(addHost.classList.contains("flex-1")).toBe(false);
    expect(addHost.parentElement).toBe(statusRow);

    for (const id of [
      "tour-filter-current",
      "tour-filter-answered",
      "tour-filter-total",
    ]) {
      const host = button(id).closest("app-home-sub-filter-chip") as HTMLElement;
      expect(host.classList.contains("flex-1")).toBe(true);
      expect(host.parentElement).toBe(statusRow);
      expect(button(id).className).not.toContain("min-w-max");
    }

    for (const id of [
      "tour-filter-archived",
      "tour-filter-prompts",
      "tour-filter-members",
    ]) {
      const chipButton = button(id);
      const host = chipButton.parentElement?.parentElement as HTMLElement;
      expect(host.className).toContain("flex-[1_1_0]");
      expect(host.className).toContain("min-w-max");
      expect(chipButton.className).toContain(
        HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS.split(" ")[0]
      );
    }

    const panel = statusRow.parentElement as HTMLElement;
    expect(panel.className).toContain("rounded-b-lg");
    expect(panel.className).not.toContain("flex-wrap");
  });

  it("omits Members from the second row when the Planning Center filter is off", () => {
    fixture.componentRef.setInput("showPlanningCenterMembersFilter", false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector("#tour-filter-members")
    ).toBeNull();
    const archived = fixture.nativeElement.querySelector(
      "#tour-filter-archived"
    ) as HTMLButtonElement;
    const prompts = fixture.nativeElement.querySelector(
      "#tour-filter-prompts"
    ) as HTMLButtonElement;
    const row = archived.closest(
      ".flex.w-full.flex-wrap.items-center.gap-2"
    ) as HTMLElement;
    expect(prompts.closest(".flex.w-full.flex-wrap.items-center.gap-2")).toBe(
      row
    );
    expect(
      [...row.querySelectorAll("button")].map((el) => el.id)
    ).toEqual(["tour-filter-archived", "tour-filter-prompts"]);
  });

  it("emits addPrayer when the church add chip is clicked", () => {
    const addPrayer = vi.fn();
    fixture.componentInstance.addPrayer.subscribe(addPrayer);

    const addChip = fixture.nativeElement.querySelector(
      "#tour-filter-add-church-prayer"
    ) as HTMLButtonElement;
    expect(addChip).toBeTruthy();
    addChip.click();

    expect(addPrayer).toHaveBeenCalledTimes(1);
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

    const panel = fixture.nativeElement.querySelector(
      ".rounded-b-none"
    ) as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.className).not.toContain("flex-wrap");
    expect(
      panel.querySelectorAll(":scope > .flex.w-full.flex-wrap.items-center.gap-2")
    ).toHaveLength(2);
  });
});
