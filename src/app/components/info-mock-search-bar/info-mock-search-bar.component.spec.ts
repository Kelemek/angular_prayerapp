import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoMockSearchBarComponent } from "./info-mock-search-bar.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("InfoMockSearchBarComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<InfoMockSearchBarComponent>;
  let component: InfoMockSearchBarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoMockSearchBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoMockSearchBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("shows placeholder copy", () => {
    expect(fixture.nativeElement.textContent).toContain("Search prayers...");
  });

  it("emits openSearch when the mock field is clicked", () => {
    let opened = false;
    component.openSearch.subscribe(() => {
      opened = true;
    });

    const field = fixture.nativeElement.querySelector(
      ".cursor-pointer"
    ) as HTMLElement;
    field.click();

    expect(opened).toBe(true);
  });
});
