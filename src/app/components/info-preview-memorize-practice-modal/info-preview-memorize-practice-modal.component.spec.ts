import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoPreviewMemorizePracticeModalComponent } from "./info-preview-memorize-practice-modal.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";
import {
  modalShellOverlayText,
  modalShellQueryAll,
} from "../modal-shell/modal-shell-test-dom";

function slideSrcs(): string[] {
  return modalShellQueryAll<HTMLImageElement>("img").map(
    (img) => img.getAttribute("src") ?? ""
  );
}

describe("InfoPreviewMemorizePracticeModalComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let component: InfoPreviewMemorizePracticeModalComponent;
  let fixture: ComponentFixture<InfoPreviewMemorizePracticeModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoPreviewMemorizePracticeModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoPreviewMemorizePracticeModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("starts on the Type screenshot and pages with Next and Back", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    expect(modalShellOverlayText()).toContain("1 of 5");
    expect(modalShellOverlayText()).toContain("Type");
    expect(slideSrcs()).toEqual([
      "/info/memorize-practice/light/01-type.png",
      "/info/memorize-practice/dark/01-type.png",
    ]);

    const next = [...modalShellQueryAll<HTMLButtonElement>("button")].find(
      (button: HTMLButtonElement) => button.textContent?.trim() === "Next"
    ) as HTMLButtonElement;
    next.click();
    fixture.detectChanges();

    expect(modalShellOverlayText()).toContain("2 of 5");
    expect(modalShellOverlayText()).toContain("Initials");
    expect(slideSrcs()).toEqual([
      "/info/memorize-practice/light/02-initials.png",
      "/info/memorize-practice/dark/02-initials.png",
    ]);

    const back = [...modalShellQueryAll<HTMLButtonElement>("button")].find(
      (button: HTMLButtonElement) => button.textContent?.trim() === "Back"
    ) as HTMLButtonElement;
    back.click();
    fixture.detectChanges();

    expect(modalShellOverlayText()).toContain("1 of 5");
    expect(modalShellOverlayText()).toContain("Type");
  });

  it("disables Back on the first slide and Next on the last", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    const navButton = (label: string): HTMLButtonElement =>
      [...modalShellQueryAll<HTMLButtonElement>("button")].find(
        (button) => button.textContent?.trim() === label
      ) as HTMLButtonElement;

    expect(navButton("Back").disabled).toBe(true);
    expect(navButton("Next").disabled).toBe(false);

    for (let i = 0; i < 4; i += 1) {
      navButton("Next").click();
      fixture.detectChanges();
    }

    expect(navButton("Back").disabled).toBe(false);
    expect(navButton("Next").disabled).toBe(true);
    expect(modalShellOverlayText()).toContain("Recite");
    expect(modalShellOverlayText()).toContain("5 of 5");
  });

  it("resets to the first slide when reopened", () => {
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    const next = [...modalShellQueryAll<HTMLButtonElement>("button")].find(
      (button: HTMLButtonElement) => button.textContent?.trim() === "Next"
    ) as HTMLButtonElement;
    next.click();
    next.click();
    next.click();
    fixture.detectChanges();
    expect(modalShellOverlayText()).toContain("Reorder");

    fixture.componentRef.setInput("open", false);
    fixture.detectChanges();
    fixture.componentRef.setInput("open", true);
    fixture.detectChanges();

    expect(component.slideIndex).toBe(0);
    expect(modalShellOverlayText()).toContain("Type");
    expect(modalShellOverlayText()).toContain("1 of 5");
  });
});
