import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoHomeFilterPreviewTabsComponent } from "./info-home-filter-preview-tabs.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";

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
    const publicTab = row.querySelector('[role="button"]') as HTMLElement;
    const topButtons = row.querySelectorAll(
      ":scope > button"
    ) as NodeListOf<HTMLButtonElement>;
    const normalize = (el: HTMLElement) =>
      el.textContent?.replace(/\s+/g, " ").trim() ?? "";

    expect(normalize(publicTab)).toBe("Church 1");
    expect(publicTab.className).toContain("z-20");
    const badge = publicTab.querySelector(
      'button[aria-label="About badges"]'
    ) as HTMLButtonElement;
    const tabChrome = publicTab.firstElementChild as HTMLElement;
    expect(tabChrome.textContent?.trim()).toBe("Church");
    expect(badge.previousElementSibling).toBe(tabChrome);
    expect(badge.className).toContain("z-20");
    expect(topButtons).toHaveLength(2);
    expect(normalize(topButtons[0]!)).toBe("Personal");
    expect(normalize(topButtons[1]!)).toBe("Memorize");
  });

  it("highlights Church and shows a Prompts chip when previewFilter is prompts", () => {
    component.previewFilter = "prompts";
    fixture.detectChanges();
    const churchChrome = fixture.nativeElement.querySelector(
      '[role="button"] > div'
    ) as HTMLElement;
    expect(churchChrome.className).toContain("bg-blue-200");
    const promptsChip = [...fixture.nativeElement.querySelectorAll("button")].find(
      (button: HTMLButtonElement) =>
        button.textContent?.trim().startsWith("Prompts")
    ) as HTMLButtonElement | undefined;
    expect(promptsChip).toBeTruthy();
    expect(promptsChip!.textContent?.replace(/\s+/g, " ").trim()).toBe(
      "Prompts (76)"
    );
  });

  it("wraps public preview chips with the same flex-wrap host as prompt types", () => {
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll(
      "button"
    ) as NodeListOf<HTMLButtonElement>;
    const publicChips = [...buttons].filter((button) =>
      /^(Current|Answered|Archived|Total|Prompts) \(/.test(
        button.textContent?.trim() ?? ""
      )
    );
    expect(publicChips).toHaveLength(5);
    for (const button of publicChips) {
      const host = button.parentElement as HTMLElement;
      expect(host.className).toContain("flex-[1_1_0]");
      expect(button.className).toContain("min-w-max");
      expect(button.className).not.toContain("flex-1");
    }
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
