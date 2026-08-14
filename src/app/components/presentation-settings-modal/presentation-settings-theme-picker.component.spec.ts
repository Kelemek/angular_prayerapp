import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { PresentationSettingsThemePickerComponent } from "./presentation-settings-theme-picker.component";
import type { PresentationSettingsThemeOption } from "./presentation-settings-theme-section.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("PresentationSettingsThemePickerComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<PresentationSettingsThemePickerComponent>;
  let component: PresentationSettingsThemePickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationSettingsThemePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationSettingsThemePickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("theme", "light");
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it.each<[string, PresentationSettingsThemeOption]>([
    ["Dark", "dark"],
    ["System", "system"],
  ])('emits themeChange with "%s" when %s is clicked', (label, theme) => {
    const emitted: PresentationSettingsThemeOption[] = [];
    component.themeChange.subscribe((value) => emitted.push(value));

    const button = Array.from(
      fixture.nativeElement.querySelectorAll("button")
    ).find((el: Element) => el.textContent?.includes(label)) as HTMLButtonElement;
    button.click();

    expect(emitted).toEqual([theme]);
  });

  it("highlights the active theme button", () => {
    fixture.componentRef.setInput("theme", "dark");
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(
      "button"
    ) as NodeListOf<HTMLButtonElement>;
    const darkButton = Array.from(buttons).find((button) =>
      button.textContent?.includes("Dark")
    );
    expect(darkButton?.className).toContain("border-blue-500");
  });
});
