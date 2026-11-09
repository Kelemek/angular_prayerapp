import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoHomeFilterPreviewTabsComponent } from "./info-home-filter-preview-tabs.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";
import { HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS } from "../../lib/home-sub-filter-chip-classes";

describe("InfoHomeFilterPreviewTabsComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let component: InfoHomeFilterPreviewTabsComponent;
  let fixture: ComponentFixture<InfoHomeFilterPreviewTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoHomeFilterPreviewTabsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoHomeFilterPreviewTabsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("selectPublicPreviewTab emits current when not on community filter", () => {
    const emitted: string[] = [];
    component.previewFilterChange.subscribe((value) => emitted.push(value));
    component.previewFilter = "prompts";

    component.selectPublicPreviewTab();

    expect(emitted).toEqual(["current"]);
  });

  it("selectPublicPreviewTab does nothing when already on community filter", () => {
    const emitted: string[] = [];
    component.previewFilterChange.subscribe((value) => emitted.push(value));
    component.previewFilter = "current";

    component.selectPublicPreviewTab();

    expect(emitted).toEqual([]);
  });

  it("shows main preview tab labels without catalog counts", () => {
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector(
      ".flex.w-full.gap-1.mb-0"
    ) as HTMLElement;
    const topButtons = row.querySelectorAll(
      ":scope > button"
    ) as NodeListOf<HTMLButtonElement>;
    const normalize = (el: HTMLElement) =>
      el.textContent?.replace(/\s+/g, " ").trim() ?? "";

    expect(topButtons).toHaveLength(4);
    expect(normalize(topButtons[0]!)).toMatch(/Church/);
    expect(normalize(topButtons[0]!)).toContain("1");
    expect(normalize(topButtons[1]!)).toBe("Group");
    expect(normalize(topButtons[2]!)).toBe("Personal");
    expect(normalize(topButtons[3]!)).toBe("Memorize");
    for (const button of topButtons) {
      expect(button.className).toContain("home-nav-tab-text-lock");
      expect(button.className).toContain("flex-1");
    }
    const badge = topButtons[0]!.querySelector(
      'button[aria-label="About badges"]'
    ) as HTMLButtonElement;
    expect(badge).toBeTruthy();
  });

  it("highlights Church and shows a Prompts chip when previewFilter is prompts", () => {
    component.previewFilter = "prompts";
    fixture.detectChanges();
    const churchTab = [...fixture.nativeElement.querySelectorAll("button")].find(
      (button: HTMLButtonElement) => button.textContent?.includes("Church")
    ) as HTMLButtonElement;
    expect(churchTab.className).toContain("var(--home-tab-public-bg)");
    const promptsChip = [...fixture.nativeElement.querySelectorAll("button")].find(
      (button: HTMLButtonElement) =>
        button.textContent?.trim().startsWith("Prompts")
    ) as HTMLButtonElement | undefined;
    expect(promptsChip).toBeTruthy();
    expect(promptsChip!.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Prompts (12)"
    );
  });

  it("shows groups filters when Group tab is selected", () => {
    component.previewFilter = "groups-current";
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Larson Family");
    expect(fixture.nativeElement.textContent).toContain("Care Team");
    expect(
      fixture.nativeElement.querySelector(
        'button[aria-label="Add a prayer or group"]'
      )
    ).toBeTruthy();
  });

  it("selectGroupsPreviewTab emits groups-current when not on groups", () => {
    const emitted: string[] = [];
    component.previewFilterChange.subscribe((value) => emitted.push(value));
    component.previewFilter = "personal";
    component.selectGroupsPreviewTab();
    expect(emitted).toEqual(["groups-current"]);
  });

  it("wraps church status chips with flex-wrap hosts like Home public filters", () => {
    fixture.detectChanges();
    const statusLabels = [
      "Current (9)",
      "Answered (2)",
      "Archived (8)",
      "Total (19)",
      "Prompts (12)",
    ];
    for (const label of statusLabels) {
      const button = [...fixture.nativeElement.querySelectorAll("button")].find(
        (el: HTMLButtonElement) =>
          el.textContent?.replace(/\s+/g, " ").trim() === label
      ) as HTMLButtonElement;
      expect(button).toBeTruthy();
      const host = button.closest("div") as HTMLElement;
      expect(host.className).toContain("flex-[1_1_0]");
      expect(host.className).toContain("min-w-max");
      expect(button.className).toContain(
        HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS.split(" ")[0]
      );
    }
    const add = fixture.nativeElement.querySelector(
      'button[aria-label="Add a church prayer"]'
    ) as HTMLButtonElement;
    expect(add.className).toContain("size-9");
    expect(add.parentElement?.parentElement?.className).not.toContain(
      "flex-[1_1_0]"
    );
  });

  it("emits openAddChurchPrayer when church + is clicked", () => {
    const emitted: boolean[] = [];
    component.openAddChurchPrayer.subscribe(() => emitted.push(true));
    fixture.detectChanges();
    const add = fixture.nativeElement.querySelector(
      'button[aria-label="Add a church prayer"]'
    ) as HTMLButtonElement;
    add.click();
    expect(emitted).toEqual([true]);
  });

  it("does not show a Members chip", () => {
    fixture.detectChanges();
    const labels = [...fixture.nativeElement.querySelectorAll("button")].map(
      (button: HTMLButtonElement) => button.textContent?.replace(/\s+/g, " ").trim()
    );
    expect(labels.some((label) => label?.startsWith("Members"))).toBe(false);
  });

  it("selectPublicPreviewTab does nothing when already on a community filter", () => {
    const emitted: string[] = [];
    component.previewFilterChange.subscribe((value) => emitted.push(value));
    component.previewFilter = "total";

    component.selectPublicPreviewTab();

    expect(emitted).toEqual([]);
  });

  it("emits memorize action explanations when Memorize chips are clicked", () => {
    const emitted: string[] = [];
    component.openMemorizeAction.subscribe((value) => emitted.push(value));
    component.previewFilter = "memorize";
    fixture.detectChanges();

    const clickChip = (label: string) => {
      const button = [...fixture.nativeElement.querySelectorAll("button")].find(
        (el: HTMLButtonElement) => el.textContent?.trim() === label
      ) as HTMLButtonElement | undefined;
      expect(button).toBeTruthy();
      button!.click();
    };

    clickChip("Add Verses");
    clickChip("Bible Books");
    clickChip("Recommended");

    expect(emitted).toEqual(["add-verses", "bible-books", "recommended"]);
  });

  it("shows memorize action chips when Memorize is selected", () => {
    component.previewFilter = "memorize";
    fixture.detectChanges();
    const row = fixture.nativeElement.querySelector(
      ".flex.w-full.gap-1.mb-0"
    ) as HTMLElement;
    expect(row.querySelector("#tour-filter-memorize")).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain("Add Verses");
    expect(fixture.nativeElement.textContent).toContain("Bible Books");
    expect(fixture.nativeElement.textContent).toContain("Recommended");
  });

  it("selectPublicPreviewTab emits current when Memorize is selected", () => {
    const emitted: string[] = [];
    component.previewFilterChange.subscribe((value) => emitted.push(value));
    component.previewFilter = "memorize";

    component.selectPublicPreviewTab();

    expect(emitted).toEqual(["current"]);
  });
});
