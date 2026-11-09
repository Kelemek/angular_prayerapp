import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoPreviewGroupsModalComponent } from "./info-preview-groups-modal.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";
import { modalShellOverlayText } from "../modal-shell/modal-shell-test-dom";

describe("InfoPreviewGroupsModalComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let fixture: ComponentFixture<InfoPreviewGroupsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoPreviewGroupsModalComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(InfoPreviewGroupsModalComponent);
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("mentions signed-in church members", () => {
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    expect(modalShellOverlayText()).toContain("signed-in church members");
  });
});
