import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { PresentationSettingsDisplaySectionComponent } from "./presentation-settings-display-section.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("PresentationSettingsDisplaySectionComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let component: PresentationSettingsDisplaySectionComponent;
  let fixture: ComponentFixture<PresentationSettingsDisplaySectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationSettingsDisplaySectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationSettingsDisplaySectionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("smartMode", false);
    fixture.componentRef.setInput("displayDuration", 10);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  describe("setDuration", () => {
    it("should update localDisplayDuration", () => {
      component.setDuration(30);
      expect(component.localDisplayDuration).toBe(30);
    });

    it("should emit displayDurationChange event", () => {
      const emitSpy = vi.spyOn(component.displayDurationChange, "emit");
      component.setDuration(20);
      expect(emitSpy).toHaveBeenCalledWith(20);
    });
  });

  it("shows duration controls when smart mode is off", () => {
    expect(
      fixture.nativeElement.querySelector("#tour-presentation-setting-duration")
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector("#tour-presentation-setting-smart-info")
    ).toBeNull();
  });

  it("shows smart mode info when smart mode is on", () => {
    fixture.componentRef.setInput("smartMode", true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector("#tour-presentation-setting-smart-info")
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector("#tour-presentation-setting-duration")
    ).toBeNull();
  });

  it("emits smartModeChange when the smart mode toggle changes", () => {
    const emitted: boolean[] = [];
    component.smartModeChange.subscribe((value) => emitted.push(value));

    const checkbox = fixture.nativeElement.querySelector(
      '#tour-presentation-setting-smart input[type="checkbox"]'
    ) as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    expect(emitted).toEqual([true]);
  });
});
