import { describe, it, expect } from "vitest";
import {
  formatStatusFilterDisplay,
  initPendingStatusFilter,
  resolveAppliedStatusFilters,
  statusFiltersMatchApplied,
} from "./presentation-settings-filters-state";
import {
  applyPresentationMultiSelectFilter,
  PresentationMultiSelectFilterField,
  togglePresentationMultiSelectDropdown,
} from "./presentation-settings-multi-select-field";
import {
  formatPresentationContentTypeLabel,
  getAvailablePresentationContentTypes,
} from "./presentation-settings-filter-options";

describe("presentation-settings-filters-state status helpers", () => {
  const available = ["current", "answered", "archived"];

  it("initPendingStatusFilter returns all when none active", () => {
    expect(initPendingStatusFilter(false, false, available)).toEqual(available);
  });

  it("initPendingStatusFilter reflects active flags", () => {
    expect(initPendingStatusFilter(true, false, available)).toEqual(["current"]);
    expect(initPendingStatusFilter(true, true, available)).toEqual([
      "current",
      "answered",
    ]);
  });

  it("resolveAppliedStatusFilters treats all selected as none", () => {
    expect(
      resolveAppliedStatusFilters(["current", "answered", "archived"], available)
    ).toEqual({ current: false, answered: false });
  });

  it("formatStatusFilterDisplay shows active labels", () => {
    expect(formatStatusFilterDisplay(true, false)).toBe("Current");
    expect(formatStatusFilterDisplay(false, false)).toBe("All Statuses");
  });

  it("statusFiltersMatchApplied compares resolved values", () => {
    const applied = { current: true, answered: false };
    expect(statusFiltersMatchApplied(applied, true, false)).toBe(true);
    expect(statusFiltersMatchApplied(applied, false, false)).toBe(false);
  });
});

describe("presentation-settings-multi-select-field", () => {
  it("togglePresentationMultiSelectDropdown opens and closes via apply", () => {
    let open = false;
    let applied = false;
    togglePresentationMultiSelectDropdown({
      isOpen: false,
      setOpen: (value) => {
        open = value;
      },
      apply: () => {
        applied = true;
      },
      initPending: () => undefined,
      closeOther: () => undefined,
    });
    expect(open).toBe(true);
    expect(applied).toBe(false);

    togglePresentationMultiSelectDropdown({
      isOpen: true,
      setOpen: (value) => {
        open = value;
      },
      apply: () => {
        applied = true;
      },
      initPending: () => undefined,
      closeOther: () => undefined,
    });
    expect(applied).toBe(true);
  });

  it("applyPresentationMultiSelectFilter emits when values change", () => {
    let local = ["prayers"] as const;
    let emitted: string[] | undefined;
    let open = true;
    applyPresentationMultiSelectFilter({
      pending: ["prompts"],
      available: getAvailablePresentationContentTypes(false),
      local,
      setLocal: (next) => {
        local = next as typeof local;
      },
      emit: (next) => {
        emitted = next;
      },
      setOpen: (value) => {
        open = value;
      },
      initPending: () => undefined,
    });
    expect(emitted).toEqual(["prompts"]);
    expect(open).toBe(false);
  });

  it("formatPresentationContentTypeLabel maps known types", () => {
    expect(formatPresentationContentTypeLabel("prayers")).toBe("Prayers");
  });
});

describe("PresentationMultiSelectFilterField", () => {
  it("applies pending selections and emits changes", () => {
    let local = ["prayers"] as string[];
    let emitted: string[] | undefined;
    const field = new PresentationMultiSelectFilterField<string>({
      getLocal: () => local,
      setLocal: (next) => {
        local = next;
      },
      getAvailable: () => ["prayers", "prompts"],
      emit: (next) => {
        emitted = next;
      },
      closeOther: () => undefined,
      allLabel: "All",
    });
    field.pending = ["prompts"];
    field.apply();
    expect(emitted).toEqual(["prompts"]);
    expect(field.showDropdown).toBe(false);
  });
});
