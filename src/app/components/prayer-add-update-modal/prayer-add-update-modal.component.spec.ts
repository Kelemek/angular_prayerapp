import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrayerAddUpdateModalComponent } from "./prayer-add-update-modal.component";
import { RichTextEditorComponent } from "../rich-text-editor/rich-text-editor.component";

describe("PrayerAddUpdateModalComponent", () => {
  let component: PrayerAddUpdateModalComponent;

  beforeEach(() => {
    component = new PrayerAddUpdateModalComponent();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("showAnonymousOption returns false for personal prayers", () => {
    component.isPersonal = true;
    component.prayerId = "p1";
    expect(component.showAnonymousOption()).toBe(false);
  });

  it("showAnonymousOption returns false for member prayers", () => {
    component.isPersonal = false;
    component.prayerId = "pc-member-123";
    expect(component.showAnonymousOption()).toBe(false);
  });

  it("showAnonymousOption returns true for community prayers", () => {
    component.isPersonal = false;
    component.prayerId = "community-1";
    expect(component.showAnonymousOption()).toBe(true);
  });

  it("handleSubmit emits payload and resets form fields", () => {
    const flush = vi.fn();
    component.addUpdateRichText = {
      flushMarkdownToForm: flush,
    } as unknown as RichTextEditorComponent;
    component.updateContent = "Test update";
    component.updateIsAnonymous = true;
    component.updateMarkAsAnswered = true;
    const spy = vi.spyOn(component.submit, "emit");

    component.handleSubmit();

    expect(flush).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      content: "Test update",
      is_anonymous: true,
      mark_as_answered: true,
    });
    expect(component.updateContent).toBe("");
    expect(component.updateIsAnonymous).toBe(false);
    expect(component.updateMarkAsAnswered).toBe(false);
  });

  it("closeModal emits close and resets form fields", () => {
    component.updateContent = "Draft";
    component.updateIsAnonymous = true;
    component.updateMarkAsAnswered = true;
    const spy = vi.spyOn(component.close, "emit");

    component.closeModal();

    expect(spy).toHaveBeenCalled();
    expect(component.updateContent).toBe("");
    expect(component.updateIsAnonymous).toBe(false);
    expect(component.updateMarkAsAnswered).toBe(false);
  });

  it("resets form when isOpen becomes false without emitting close", () => {
    component.updateContent = "Draft";
    component.updateIsAnonymous = true;
    component.updateMarkAsAnswered = true;
    const closeSpy = vi.spyOn(component.close, "emit");

    component.ngOnChanges({
      isOpen: {
        currentValue: false,
        previousValue: true,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.updateContent).toBe("");
    expect(component.updateIsAnonymous).toBe(false);
    expect(component.updateMarkAsAnswered).toBe(false);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("uses tour element ids when provided", () => {
    component.tourElementIds = {
      content: "tour-prayer-update-content",
      submit: "tour-prayer-update-submit",
    };

    expect(component.updateContentElementId).toBe("tour-prayer-update-content");
    expect(component.submitButtonId).toBe("tour-prayer-update-submit");
  });

  it("falls back to per-prayer element ids when tour ids omitted", () => {
    component.prayerId = "p1";
    component.tourElementIds = null;

    expect(component.updateContentElementId).toBe("updateContent-p1");
    expect(component.anonymousCheckboxInputId).toBe("updateIsAnonymous-p1");
  });
});
