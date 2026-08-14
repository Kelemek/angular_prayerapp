import { describe, it, expect } from "vitest";
import { PresentationSettingsMultiSelectFilterRowComponent } from "./presentation-settings-multi-select-filter-row.component";
import { PresentationMultiSelectFilterField } from "../../lib/presentation-settings-multi-select-field";

describe("PresentationSettingsMultiSelectFilterRowComponent", () => {
  it("should create with a filter field", () => {
    const row = new PresentationSettingsMultiSelectFilterRowComponent<string>();
    let local: string[] = [];
    row.field = new PresentationMultiSelectFilterField({
      getLocal: () => local,
      setLocal: (next) => {
        local = next;
      },
      getAvailable: () => ["a", "b"],
      emit: () => undefined,
      closeOther: () => undefined,
      allLabel: "All",
    });

    expect(row).toBeTruthy();
    expect(row.field.getDisplay()).toBe("All");
  });
});
