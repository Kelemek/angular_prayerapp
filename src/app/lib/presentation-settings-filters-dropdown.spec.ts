import { describe, it, expect, vi } from "vitest";
import {
  applyOpenPresentationFiltersDropdowns,
  closeOtherPresentationFiltersDropdowns,
  hasOpenPresentationFiltersDropdown,
  onPresentationFiltersBodyPointerDown,
  resetPresentationFiltersDropdowns,
  type PresentationFilterDropdownField,
  type PresentationFiltersDropdownState,
} from "./presentation-settings-filters-dropdown";

const makeField = (
  overrides: Partial<PresentationFilterDropdownField> = {}
): PresentationFilterDropdownField => ({
  showDropdown: false,
  apply: vi.fn(),
  ...overrides,
});

const makeState = (
  overrides: {
    contentType?: PresentationFilterDropdownField;
    categories?: PresentationFilterDropdownField;
    promptCategories?: PresentationFilterDropdownField;
    status?: PresentationFilterDropdownField;
    timeFilterOpen?: boolean;
  } = {}
): PresentationFiltersDropdownState => ({
  contentType: overrides.contentType ?? makeField(),
  categories: overrides.categories ?? makeField(),
  promptCategories: overrides.promptCategories ?? makeField(),
  status: overrides.status ?? makeField(),
  timeFilter: { open: overrides.timeFilterOpen ?? false },
});

describe("presentation-settings-filters-dropdown", () => {
  it("hasOpenPresentationFiltersDropdown detects any open menu", () => {
    expect(hasOpenPresentationFiltersDropdown(makeState())).toBe(false);
    expect(
      hasOpenPresentationFiltersDropdown(
        makeState({ contentType: makeField({ showDropdown: true }) })
      )
    ).toBe(true);
  });

  it("applyOpenPresentationFiltersDropdowns calls handlers for open menus", () => {
    const applyContentType = vi.fn();
    const applyStatus = vi.fn();
    const state = makeState({
      contentType: makeField({ showDropdown: true, apply: applyContentType }),
      status: makeField({ showDropdown: true, apply: applyStatus }),
      timeFilterOpen: true,
    });

    applyOpenPresentationFiltersDropdowns(state, {
      applyContentType,
      applyCategories: vi.fn(),
      applyPromptCategories: vi.fn(),
      applyStatus,
    });

    expect(applyContentType).toHaveBeenCalled();
    expect(applyStatus).toHaveBeenCalled();
    expect(state.timeFilter.open).toBe(false);
  });

  it("onPresentationFiltersBodyPointerDown ignores clicks inside panel or trigger", () => {
    const applyContentType = vi.fn();
    const state = makeState({
      contentType: makeField({ showDropdown: true, apply: applyContentType }),
    });
    const handlers = {
      applyContentType,
      applyCategories: vi.fn(),
      applyPromptCategories: vi.fn(),
      applyStatus: vi.fn(),
    };

    onPresentationFiltersBodyPointerDown(
      { target: { closest: () => document.createElement("div") } } as unknown as MouseEvent,
      state,
      handlers
    );
    expect(applyContentType).not.toHaveBeenCalled();

    onPresentationFiltersBodyPointerDown(
      { target: { closest: () => null } } as unknown as MouseEvent,
      state,
      handlers
    );
    expect(applyContentType).toHaveBeenCalled();
    expect(state.contentType.showDropdown).toBe(false);
  });

  it("closeOtherPresentationFiltersDropdowns applies open menus except the active one", () => {
    const applyContentType = vi.fn();
    const applyCategories = vi.fn();
    const state = makeState({
      contentType: makeField({ showDropdown: true, apply: applyContentType }),
      categories: makeField({ showDropdown: true, apply: applyCategories }),
    });

    closeOtherPresentationFiltersDropdowns("status", state, {
      applyContentType,
      applyCategories,
      applyPromptCategories: vi.fn(),
      applyStatus: vi.fn(),
    });

    expect(applyContentType).toHaveBeenCalled();
    expect(applyCategories).toHaveBeenCalled();
    expect(state.status.showDropdown).toBe(false);
  });

  it("resetPresentationFiltersDropdowns clears all flags", () => {
    const state = makeState({
      contentType: makeField({ showDropdown: true }),
      timeFilterOpen: true,
    });
    resetPresentationFiltersDropdowns(state);
    expect(hasOpenPresentationFiltersDropdown(state)).toBe(false);
  });
});
