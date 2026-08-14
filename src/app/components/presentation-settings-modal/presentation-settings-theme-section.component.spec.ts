import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { PresentationSettingsThemeSectionComponent } from "./presentation-settings-theme-section.component";
import type { PresentationSettingsThemeOption } from "./presentation-settings-theme-section.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("PresentationSettingsThemeSectionComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<PresentationSettingsThemeSectionComponent>;
  let component: PresentationSettingsThemeSectionComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationSettingsThemeSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationSettingsThemeSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("renders the help-tour anchor on the section card", () => {
    expect(
      fixture.nativeElement.querySelector("#tour-presentation-setting-theme")
    ).toBeTruthy();
  });

  it("forwards themeChange when a picker option is clicked", () => {
    const emitted: PresentationSettingsThemeOption[] = [];
    component.themeChange.subscribe((value) => emitted.push(value));

    const lightButton = Array.from(
      fixture.nativeElement.querySelectorAll("button")
    ).find((el: Element) => el.textContent?.includes("Light")) as HTMLButtonElement;
    lightButton.click();

    expect(emitted).toEqual(["light"]);
  });
});
