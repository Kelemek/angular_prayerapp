import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoMockAppHeaderComponent } from "./info-mock-app-header.component";
import type { InfoHeaderPreviewAction } from "../../lib/info-home-filter-preview.types";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("InfoMockAppHeaderComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<InfoMockAppHeaderComponent>;
  let component: InfoMockAppHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoMockAppHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoMockAppHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("uses brandingImageUrl for the church logo", () => {
    fixture.componentRef.setInput(
      "brandingImageUrl",
      "https://example.com/logo.png"
    );
    fixture.detectChanges();

    const img = fixture.nativeElement.querySelector("img") as HTMLImageElement;
    expect(img.src).toBe("https://example.com/logo.png");
  });

  it("falls back to favicon when brandingImageUrl is empty", () => {
    const img = fixture.nativeElement.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/favicon.ico");
  });

  it.each<[string, InfoHeaderPreviewAction]>([
    ["Pray", "pray"],
    ["Request", "request"],
  ])('emits "%s" when %s button is clicked', (label, action) => {
    const emitted: InfoHeaderPreviewAction[] = [];
    component.openHeaderPreview.subscribe((value) => emitted.push(value));

    const button = Array.from(
      fixture.nativeElement.querySelectorAll("button")
    ).find((el: Element) => el.textContent?.includes(label)) as HTMLButtonElement;
    button.click();

    expect(emitted).toEqual([action]);
  });

  it("emits settings when the settings chip is clicked", () => {
    const emitted: InfoHeaderPreviewAction[] = [];
    component.openHeaderPreview.subscribe((value) => emitted.push(value));

    const buttons = fixture.nativeElement.querySelectorAll(
      "button"
    ) as NodeListOf<HTMLButtonElement>;
    buttons[2].click();

    expect(emitted).toEqual(["settings"]);
  });

  it("emits help when the help chip is clicked", () => {
    const emitted: InfoHeaderPreviewAction[] = [];
    component.openHeaderPreview.subscribe((value) => emitted.push(value));

    const buttons = fixture.nativeElement.querySelectorAll(
      "button"
    ) as NodeListOf<HTMLButtonElement>;
    buttons[0].click();

    expect(emitted).toEqual(["help"]);
  });

  it("emits toggleSearch when the search chip is clicked", () => {
    let toggled = false;
    component.toggleSearch.subscribe(() => {
      toggled = true;
    });

    const button = fixture.nativeElement.querySelector(
      'button[title="Search"]'
    ) as HTMLButtonElement;
    button.click();

    expect(toggled).toBe(true);
  });

  it("reflects showSearchPanel on the search chip aria-expanded", () => {
    const button = fixture.nativeElement.querySelector(
      'button[title="Search"]'
    ) as HTMLButtonElement;
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fixture.componentRef.setInput("showSearchPanel", true);
    fixture.detectChanges();

    expect(button.getAttribute("aria-expanded")).toBe("true");
  });
});
