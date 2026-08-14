import { describe, it, expect, vi } from "vitest";
import { PresentationSettingsDurationControlsComponent } from "./presentation-settings-duration-controls.component";

describe("PresentationSettingsDurationControlsComponent", () => {
  it("emits durationChange when preset is chosen", () => {
    const controls = new PresentationSettingsDurationControlsComponent();
    const emitSpy = vi.spyOn(controls.durationChange, "emit");
    controls.setDuration(20);
    expect(emitSpy).toHaveBeenCalledWith(20);
  });
});
