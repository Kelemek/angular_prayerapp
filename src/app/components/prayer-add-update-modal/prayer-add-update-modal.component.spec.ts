import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrayerAddUpdateModalComponent } from "./prayer-add-update-modal.component";
import { RichTextEditorComponent } from "../rich-text-editor/rich-text-editor.component";
import { ToastService } from "../../services/toast.service";

describe("PrayerAddUpdateModalComponent", () => {
  let component: PrayerAddUpdateModalComponent;
  let mockToast: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockToast = { error: vi.fn() };
    component = new PrayerAddUpdateModalComponent(mockToast as unknown as ToastService);
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

  it("handleSubmit emits payload without resetting until modal closes", () => {
    const flush = vi.fn().mockReturnValue("Test update");
    component.addUpdateRichText = {
      flushMarkdownToForm: flush,
      getPlainText: () => "Test update",
    } as unknown as RichTextEditorComponent;
    component.updateContent = "stale";
    component.updateIsAnonymous = true;
    component.updateMarkAsAnswered = true;
    const spy = vi.spyOn(component.updateSubmit, "emit");

    component.handleSubmit();

    expect(flush).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({
      content: "Test update",
      is_anonymous: true,
      mark_as_answered: true,
    });
    expect(component.updateContent).toBe("stale");
    expect((component as unknown as { isSubmitting: boolean }).isSubmitting).toBe(true);

    component.closeModal();
    expect(component.updateContent).toBe("");
    expect(component.updateIsAnonymous).toBe(false);
    expect(component.updateMarkAsAnswered).toBe(false);
    expect((component as unknown as { isSubmitting: boolean }).isSubmitting).toBe(false);
  });

  it("handleSubmit ignores duplicate calls while submitting", () => {
    component.addUpdateRichText = {
      flushMarkdownToForm: () => "Only once",
      getPlainText: () => "Only once",
    } as unknown as RichTextEditorComponent;
    const spy = vi.spyOn(component.updateSubmit, "emit");

    component.handleSubmit();
    component.handleSubmit();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("handleSubmit uses flushed editor content when updateContent is stale", () => {
    component.addUpdateRichText = {
      flushMarkdownToForm: () => "Typed in editor",
      getPlainText: () => "Typed in editor",
    } as unknown as RichTextEditorComponent;
    component.updateContent = "";
    const spy = vi.spyOn(component.updateSubmit, "emit");

    component.handleSubmit();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Typed in editor" })
    );
  });

  it("handleSubmit uses default content when mark answered with empty body", () => {
    component.updateContent = "";
    component.updateMarkAsAnswered = true;
    const spy = vi.spyOn(component.updateSubmit, "emit");

    component.handleSubmit();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Marked as answered",
        mark_as_answered: true,
      })
    );
  });

  it("handleSubmit does not emit when content is empty and not marking answered", () => {
    component.updateContent = "";
    component.updateMarkAsAnswered = false;
    const spy = vi.spyOn(component.updateSubmit, "emit");

    component.handleSubmit();

    expect(spy).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith("Please enter update content");
  });

  it("handleSubmit shows toast for whitespace-only content", () => {
    component.updateContent = "   \n  ";
    component.updateMarkAsAnswered = false;
    const spy = vi.spyOn(component.updateSubmit, "emit");

    component.handleSubmit();

    expect(spy).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith("Please enter update content");
  });

  it("canSubmit returns true when mark as answered is checked without content", () => {
    component.updateContent = "";
    component.updateMarkAsAnswered = true;

    expect(component.canSubmit()).toBe(true);
  });

  it("canSubmit returns false when content is empty and not marking answered", () => {
    component.updateContent = "";
    component.updateMarkAsAnswered = false;

    expect(component.canSubmit()).toBe(false);
  });

  it("canSubmit returns true when editor has plain text but ngModel is stale", () => {
    component.addUpdateRichText = {
      getPlainText: () => "Typed in editor",
      peekMarkdown: () => "",
    } as unknown as RichTextEditorComponent;
    component.updateContent = "";
    component.updateMarkAsAnswered = false;

    expect(component.canSubmit()).toBe(true);
  });

  it("canSubmit returns true for image-only markdown in ngModel", () => {
    component.updateContent = "![](https://example.com/a.png)";
    component.updateMarkAsAnswered = false;

    expect(component.canSubmit()).toBe(true);
  });

  it("canSubmit returns true when editor has image-only markdown", () => {
    component.addUpdateRichText = {
      getPlainText: () => "",
      peekMarkdown: () => "![](https://example.com/a.png)",
    } as unknown as RichTextEditorComponent;
    component.updateContent = "";
    component.updateMarkAsAnswered = false;

    expect(component.canSubmit()).toBe(true);
  });

  it("canSubmit returns false when already submitting", () => {
    component.updateContent = "An update";
    (component as unknown as { isSubmitting: boolean }).isSubmitting = true;

    expect(component.canSubmit()).toBe(false);
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
