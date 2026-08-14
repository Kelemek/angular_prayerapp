import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { PresentationSettingsSectionCardComponent } from "./presentation-settings-section-card.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("PresentationSettingsSectionCardComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<PresentationSettingsSectionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PresentationSettingsSectionCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PresentationSettingsSectionCardComponent);
    fixture.componentInstance.title = "Filters";
    fixture.componentInstance.subtitle = "Narrow the deck";
    fixture.componentInstance.tourAnchorId = "tour-test-anchor";
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("renders title, subtitle, and tour anchor id", () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector("#tour-test-anchor")).toBeTruthy();
    expect(el.textContent).toContain("Filters");
    expect(el.textContent).toContain("Narrow the deck");
  });
});
