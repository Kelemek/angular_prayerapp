import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoHomeFilterPreviewPrayerMockComponent } from "./info-home-filter-preview-prayer-mock.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";

describe("InfoHomeFilterPreviewPrayerMockComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let fixture: ComponentFixture<InfoHomeFilterPreviewPrayerMockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoHomeFilterPreviewPrayerMockComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(InfoHomeFilterPreviewPrayerMockComponent);
    fixture.componentRef.setInput("borderClass", "!border-[#0047AB]");
    fixture.componentRef.setInput(
      "prayerCreatedAt",
      "2025-01-12T10:30:00.000Z"
    );
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("renders app-card-meta-header-band instead of a floating date", () => {
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector("app-card-meta-header-band")
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector(
        "span.absolute.left-1\\/2"
      )
    ).toBeFalsy();
  });
});
