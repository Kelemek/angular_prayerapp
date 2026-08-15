import { describe, it, expect, vi } from "vitest";
import { PresentationPrayerStatusFilterField } from "./presentation-settings-prayer-status-filter-field";

describe("PresentationPrayerStatusFilterField", () => {
  const available = ["current", "answered", "archived"] as const;

  const makeField = (status = { current: true, answered: false, archived: false }) => {
    const emit = vi.fn();
    const field = new PresentationPrayerStatusFilterField({
      getStatusFilters: () => status,
      getAvailable: () => [...available],
      emit,
      closeOther: vi.fn(),
    });
    return { field, emit, status };
  };

  it("initializes pending from applied status flags", () => {
    const { field } = makeField({ current: false, answered: false, archived: false });
    field.initPending();
    expect(field.pending).toEqual(["current", "answered", "archived"]);
  });

  it("emits resolved status filters on apply", () => {
    const { field, emit } = makeField({ current: false, answered: false, archived: false });
    field.pending = ["current", "answered"];
    field.apply();
    expect(emit).toHaveBeenCalledWith({
      current: true,
      answered: true,
      archived: false,
    });
    expect(field.showDropdown).toBe(false);
  });

  it("does not emit when applied status is unchanged", () => {
    const { field, emit } = makeField({ current: true, answered: false, archived: false });
    field.pending = ["current"];
    field.showDropdown = true;
    field.apply();
    expect(emit).not.toHaveBeenCalled();
    expect(field.showDropdown).toBe(false);
  });

  it("does not uncheck the last pending status", () => {
    const { field } = makeField();
    field.pending = ["answered"];
    field.togglePending("answered");
    expect(field.pending).toEqual(["answered"]);
  });
});
