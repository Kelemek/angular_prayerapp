import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrayerDeleteRequestModalComponent } from "./prayer-delete-request-modal.component";

describe("PrayerDeleteRequestModalComponent", () => {
  let component: PrayerDeleteRequestModalComponent;

  beforeEach(() => {
    component = new PrayerDeleteRequestModalComponent();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("handleSubmit emits payload and resets form fields", () => {
    component.deleteReason = "No longer needed";
    const spy = vi.spyOn(component.submit, "emit");

    component.handleSubmit();

    expect(spy).toHaveBeenCalledWith({ reason: "No longer needed" });
    expect(component.deleteReason).toBe("");
  });

  it("closeModal emits close and resets form fields", () => {
    component.deleteReason = "Draft reason";
    const spy = vi.spyOn(component.close, "emit");

    component.closeModal();

    expect(spy).toHaveBeenCalled();
    expect(component.deleteReason).toBe("");
  });

  it("resets form when isOpen becomes false without emitting close", () => {
    component.deleteReason = "Draft reason";
    const closeSpy = vi.spyOn(component.close, "emit");

    component.ngOnChanges({
      isOpen: {
        currentValue: false,
        previousValue: true,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.deleteReason).toBe("");
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("resets form when requestType changes while modal stays open", () => {
    component.isOpen = true;
    component.deleteReason = "Prayer draft";

    component.ngOnChanges({
      requestType: {
        currentValue: "update",
        previousValue: "prayer",
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.deleteReason).toBe("");
  });

  it("resets form when updateId changes while modal stays open", () => {
    component.isOpen = true;
    component.requestType = "update";
    component.deleteReason = "First update draft";

    component.ngOnChanges({
      updateId: {
        currentValue: "upd-2",
        previousValue: "upd-1",
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.deleteReason).toBe("");
  });

  it("modalTitle reflects request type", () => {
    component.requestType = "prayer";
    expect(component.modalTitle).toBe("Request Prayer Deletion");

    component.requestType = "update";
    expect(component.modalTitle).toBe("Request Update Deletion");
  });

  it("reasonFieldId uses prayer id for prayer requests", () => {
    component.requestType = "prayer";
    component.prayerId = "p1";
    expect(component.reasonFieldId).toBe("deleteReason-p1");
  });

  it("reasonFieldId uses update id for update requests", () => {
    component.requestType = "update";
    component.updateId = "upd-1";
    expect(component.reasonFieldId).toBe("updateDeleteReason-upd-1");
  });
});
