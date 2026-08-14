import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { PresentationSettingsTimerSectionComponent } from "./presentation-settings-timer-section.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("PresentationSettingsTimerSectionComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<PresentationSettingsTimerSectionComponent>;
  let component: PresentationSettingsTimerSectionComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationSettingsTimerSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationSettingsTimerSectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("prayerTimerMinutes", 15);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("renders the help-tour anchor and start button", () => {
    expect(
      fixture.nativeElement.querySelector("#tour-presentation-setting-timer")
    ).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain("Start Prayer Timer");
  });

  it("syncs localPrayerTimerMinutes from input changes", () => {
    fixture.componentRef.setInput("prayerTimerMinutes", 25);
    fixture.detectChanges();

    expect(component.localPrayerTimerMinutes).toBe(25);
  });

  it("emits startPrayerTimer when the start button is clicked", () => {
    const startSpy = vi.fn();
    component.startPrayerTimer.subscribe(startSpy);

    const button = Array.from(
      fixture.nativeElement.querySelectorAll("button")
    ).find((el: Element) =>
      el.textContent?.includes("Start Prayer Timer")
    ) as HTMLButtonElement;
    button.click();

    expect(startSpy).toHaveBeenCalledTimes(1);
  });
});
