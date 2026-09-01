import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { BadgeService } from "../../services/badge.service";
import { HomeFilterTabsComponent } from "./home-filter-tabs.component";

const componentDir = dirname(fileURLToPath(import.meta.url));

function readComponentResource(url: string): string {
  const path = join(componentDir, url);
  if (existsSync(path)) {
    return readFileSync(path, "utf-8");
  }
  throw new Error(`Component resource not found: ${url}`);
}

describe("HomeFilterTabsComponent", () => {
  beforeAll(async () => {
    await resolveComponentResources((url) =>
      Promise.resolve(readComponentResource(url))
    );
  });

  let fixture: ComponentFixture<HomeFilterTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeFilterTabsComponent],
    })
      .overrideProvider(BadgeService, {
        useValue: {
          getBadgeFunctionalityEnabled$: () => of(false),
          markAllAsReadByStatus: vi.fn(),
          markAllAsRead: vi.fn(),
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(HomeFilterTabsComponent);
    fixture.componentInstance.activeFilter = "current";
    fixture.componentInstance.hasPromptSubFilters = true;
    fixture.componentInstance.currentPrayerBadge$ = of(0);
    fixture.componentInstance.answeredPrayerBadge$ = of(0);
    fixture.componentInstance.promptBadge$ = of(0);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("shows main tab labels without catalog counts", () => {
    const labels: Record<string, string> = {
      "tour-filter-public": "Church",
      "tour-filter-personal": "Personal",
      "tour-filter-prompts": "Prompts",
      "tour-filter-memorize": "Memorize",
    };
    for (const [id, label] of Object.entries(labels)) {
      const button = fixture.nativeElement.querySelector(
        `#${id}`
      ) as HTMLButtonElement;
      expect(button).toBeTruthy();
      expect(button.textContent?.replace(/\s+/g, " ").trim()).toBe(label);
    }
  });
});
