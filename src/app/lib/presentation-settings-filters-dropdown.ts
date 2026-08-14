export interface PresentationFilterDropdownField {
  showDropdown: boolean;
  apply: () => void;
}

export interface PresentationFiltersDropdownState {
  contentType: PresentationFilterDropdownField;
  categories: PresentationFilterDropdownField;
  promptCategories: PresentationFilterDropdownField;
  status: PresentationFilterDropdownField;
  timeFilter: { open: boolean };
}

export type PresentationFiltersDropdownKey =
  | "contentType"
  | "timeFilter"
  | "status"
  | "categories"
  | "promptCategories";

export interface PresentationFiltersDropdownApplyHandlers {
  applyContentType: () => void;
  applyCategories: () => void;
  applyPromptCategories: () => void;
  applyStatus: () => void;
}

export function hasOpenPresentationFiltersDropdown(
  state: PresentationFiltersDropdownState
): boolean {
  return (
    state.contentType.showDropdown ||
    state.categories.showDropdown ||
    state.promptCategories.showDropdown ||
    state.status.showDropdown ||
    state.timeFilter.open
  );
}

export function resetPresentationFiltersDropdowns(
  state: PresentationFiltersDropdownState
): void {
  state.contentType.showDropdown = false;
  state.categories.showDropdown = false;
  state.promptCategories.showDropdown = false;
  state.status.showDropdown = false;
  state.timeFilter.open = false;
}

export function applyOpenPresentationFiltersDropdowns(
  state: PresentationFiltersDropdownState,
  handlers: PresentationFiltersDropdownApplyHandlers
): void {
  if (state.contentType.showDropdown) {
    handlers.applyContentType();
  }
  if (state.categories.showDropdown) {
    handlers.applyCategories();
  }
  if (state.promptCategories.showDropdown) {
    handlers.applyPromptCategories();
  }
  if (state.status.showDropdown) {
    handlers.applyStatus();
  }
  state.timeFilter.open = false;
}

export function closeOtherPresentationFiltersDropdowns(
  except: PresentationFiltersDropdownKey,
  state: PresentationFiltersDropdownState,
  handlers: PresentationFiltersDropdownApplyHandlers
): void {
  if (except !== "contentType") {
    if (state.contentType.showDropdown) {
      handlers.applyContentType();
    } else {
      state.contentType.showDropdown = false;
    }
  }
  if (except !== "categories") {
    if (state.categories.showDropdown) {
      handlers.applyCategories();
    } else {
      state.categories.showDropdown = false;
    }
  }
  if (except !== "promptCategories") {
    if (state.promptCategories.showDropdown) {
      handlers.applyPromptCategories();
    } else {
      state.promptCategories.showDropdown = false;
    }
  }
  if (except !== "timeFilter") {
    state.timeFilter.open = false;
  }
  if (except !== "status") {
    if (state.status.showDropdown) {
      handlers.applyStatus();
    }
    state.status.showDropdown = false;
  }
}

export function onPresentationFiltersBodyPointerDown(
  event: MouseEvent,
  state: PresentationFiltersDropdownState,
  handlers: PresentationFiltersDropdownApplyHandlers
): void {
  if (!hasOpenPresentationFiltersDropdown(state)) {
    return;
  }
  const target = event.target as Element;
  if (target.closest("[data-settings-dropdown-panel]")) {
    return;
  }
  if (target.closest("[data-settings-dropdown-trigger]")) {
    return;
  }
  applyOpenPresentationFiltersDropdowns(state, handlers);
  resetPresentationFiltersDropdowns(state);
}
