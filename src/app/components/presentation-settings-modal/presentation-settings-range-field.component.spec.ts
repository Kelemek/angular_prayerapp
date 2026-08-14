import { describe, it, expect, vi } from "vitest";
import { PresentationSettingsRangeFieldComponent } from "./presentation-settings-range-field.component";

describe("PresentationSettingsRangeFieldComponent", () => {
  it("computes valuePercent from min and max", () => {
    const field = new PresentationSettingsRangeFieldComponent();
    field.min = 5;
    field.max = 60;
    field.value = 32.5;
    expect(field.valuePercent).toBe("50%");
  });

  it("emits valueChange when slider updates", () => {
    const field = new PresentationSettingsRangeFieldComponent();
    const emitSpy = vi.spyOn(field.valueChange, "emit");
    field.valueChange.emit(20);
    expect(emitSpy).toHaveBeenCalledWith(20);
  });
});
