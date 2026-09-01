import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoHomeFilterPreviewMemorizeCardComponent } from "./info-home-filter-preview-memorize-card.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";

describe("InfoHomeFilterPreviewMemorizeCardComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let component: InfoHomeFilterPreviewMemorizeCardComponent;
  let fixture: ComponentFixture<InfoHomeFilterPreviewMemorizeCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoHomeFilterPreviewMemorizeCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(
      InfoHomeFilterPreviewMemorizeCardComponent
    );
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("emits openPracticePreview when the verse card is clicked", () => {
    const emitted: void[] = [];
    component.openPracticePreview.subscribe(() => emitted.push(undefined));
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector(
      'button[aria-label="See how verse practice works"]'
    ) as HTMLButtonElement;
    card.click();

    expect(emitted).toHaveLength(1);
  });
});
