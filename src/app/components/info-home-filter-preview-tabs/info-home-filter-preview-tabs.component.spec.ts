import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoHomeFilterPreviewTabsComponent } from "./info-home-filter-preview-tabs.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("InfoHomeFilterPreviewTabsComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
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
});
