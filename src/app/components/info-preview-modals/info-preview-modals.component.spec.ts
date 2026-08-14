import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { InfoPreviewModalsComponent } from "./info-preview-modals.component";
import { setupInfoPreviewComponentResources } from "../info-preview-component-resources.spec-helper";

describe("InfoPreviewModalsComponent", () => {
  beforeAll(async () => {
    await setupInfoPreviewComponentResources();
  });

  let component: InfoPreviewModalsComponent;
  let fixture: ComponentFixture<InfoPreviewModalsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoPreviewModalsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InfoPreviewModalsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture?.destroy();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("starts with no active modal", () => {
    expect(component.activeModal).toBeNull();
  });

  describe("openModal / closeModal", () => {
    it("opens and closes header modal", () => {
      component.openModal({ kind: "header", action: "help" });
      expect(component.activeModal).toEqual({ kind: "header", action: "help" });
      expect(component.headerAction()).toBe("help");
      component.closeModal();
      expect(component.activeModal).toBeNull();
    });

    it("opens and closes prompt categories modal", () => {
      component.openModal({ kind: "promptCategories" });
      expect(component.isModalOpen("promptCategories")).toBe(true);
      component.closeModal();
      expect(component.activeModal).toBeNull();
    });

    it("opens and closes badges modal", () => {
      component.openModal({ kind: "badges" });
      expect(component.isModalOpen("badges")).toBe(true);
      component.closeModal();
      expect(component.activeModal).toBeNull();
    });

    it("opens and closes personal action modal", () => {
      component.openModal({ kind: "personalAction", action: "answered" });
      expect(component.personalPreviewAction()).toBe("answered");
      component.closeModal();
      expect(component.activeModal).toBeNull();
    });

    it("opens and closes personal categories modal", () => {
      component.openModal({ kind: "personalCategories" });
      expect(component.isModalOpen("personalCategories")).toBe(true);
      component.closeModal();
      expect(component.activeModal).toBeNull();
    });

    it("replaces the active modal when opening a different one", () => {
      component.openModal({ kind: "badges" });
      component.openModal({ kind: "header", action: "settings" });
      expect(component.activeModal).toEqual({ kind: "header", action: "settings" });
      expect(component.isModalOpen("badges")).toBe(false);
    });
  });
});
