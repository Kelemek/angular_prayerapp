import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoHomeFilterPreviewGroupsCardComponent } from "./info-home-filter-preview-groups-card.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";

describe("InfoHomeFilterPreviewGroupsCardComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let fixture: ComponentFixture<InfoHomeFilterPreviewGroupsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoHomeFilterPreviewGroupsCardComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(InfoHomeFilterPreviewGroupsCardComponent);
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("reflects the selected mock group chip", () => {
    fixture.componentInstance.selectedGroupChip = "care";
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Care Team");
  });
});
