import {
  applyMultiSelectFilter,
  formatMultiSelectDisplay,
  initPendingFromApplied,
  normalizeWithAvailableFallback,
  toggleMultiSelectItem,
} from "./presentation-settings-filters-state";
import { isAllOptionsSelected } from "./presentation-settings-multi-select";

export function togglePresentationMultiSelectDropdown(params: {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  apply: () => void;
  initPending: () => void;
  closeOther: () => void;
}): void {
  if (params.isOpen) {
    params.apply();
  } else {
    params.closeOther();
    params.initPending();
    params.setOpen(true);
  }
}

export function applyPresentationMultiSelectFilter<T extends string>(params: {
  pending: readonly T[];
  available: readonly T[];
  local: readonly T[];
  setLocal: (next: T[]) => void;
  emit: (next: T[]) => void;
  setOpen: (open: boolean) => void;
  initPending: () => void;
}): void {
  const outcome = applyMultiSelectFilter({
    pending: params.pending,
    available: params.available,
    applied: params.local,
    normalize: (values) =>
      normalizeWithAvailableFallback(values, params.available),
  });
  if (outcome.result === "invalid") {
    params.initPending();
    params.setOpen(false);
    return;
  }
  if (outcome.result === "unchanged") {
    params.setOpen(false);
    return;
  }
  const next = outcome.next ?? [];
  params.setLocal(next);
  params.emit([...next]);
  params.setOpen(false);
}

export function initPresentationMultiSelectPending<T extends string>(
  applied: readonly T[],
  available: readonly T[]
): T[] {
  return initPendingFromApplied(applied, available);
}

export function togglePresentationMultiSelectPending<T extends string>(
  pending: readonly T[],
  value: T
): T[] {
  return toggleMultiSelectItem(pending, value);
}

export function selectAllPresentationMultiSelectPending<T extends string>(
  available: readonly T[]
): T[] {
  return [...available];
}

export function isAllPresentationMultiSelectPendingSelected<T extends string>(
  available: readonly T[],
  pending: readonly T[]
): boolean {
  return isAllOptionsSelected(available, pending);
}

export function isPresentationMultiSelectPendingSelected<T extends string>(
  pending: readonly T[],
  value: T
): boolean {
  return pending.includes(value);
}

export function getPresentationMultiSelectDisplay<T extends string>(
  applied: readonly T[],
  allLabel: string,
  formatItem?: (value: T) => string
): string {
  return formatMultiSelectDisplay(applied, allLabel, formatItem);
}

export interface PresentationMultiSelectFilterFieldConfig<T extends string> {
  getLocal: () => T[];
  setLocal: (next: T[]) => void;
  getAvailable: () => readonly T[];
  emit: (next: T[]) => void;
  closeOther: () => void;
  allLabel: string;
  formatItem?: (value: T) => string;
}

export class PresentationMultiSelectFilterField<T extends string> {
  showDropdown = false;
  pending: T[] = [];

  constructor(private readonly config: PresentationMultiSelectFilterFieldConfig<T>) {}

  initPending(): void {
    this.pending = initPresentationMultiSelectPending(
      this.config.getLocal(),
      this.config.getAvailable()
    );
  }

  toggleDropdown(): void {
    togglePresentationMultiSelectDropdown({
      isOpen: this.showDropdown,
      setOpen: (open) => {
        this.showDropdown = open;
      },
      apply: () => this.apply(),
      initPending: () => this.initPending(),
      closeOther: this.config.closeOther,
    });
  }

  apply(): void {
    applyPresentationMultiSelectFilter({
      pending: this.pending,
      available: this.config.getAvailable(),
      local: this.config.getLocal(),
      setLocal: this.config.setLocal,
      emit: this.config.emit,
      setOpen: (open) => {
        this.showDropdown = open;
      },
      initPending: () => this.initPending(),
    });
  }

  togglePending(value: T): void {
    this.pending = togglePresentationMultiSelectPending(this.pending, value);
  }

  selectAllPending(): void {
    this.pending = selectAllPresentationMultiSelectPending(
      this.config.getAvailable()
    );
  }

  isAllPendingSelected(): boolean {
    return isAllPresentationMultiSelectPendingSelected(
      this.config.getAvailable(),
      this.pending
    );
  }

  isPendingSelected(value: T): boolean {
    return isPresentationMultiSelectPendingSelected(this.pending, value);
  }

  getDisplay(): string {
    return getPresentationMultiSelectDisplay(
      this.config.getLocal(),
      this.config.allLabel,
      this.config.formatItem
    );
  }

  readonly bindIsOptionSelected = (value: T): boolean =>
    this.isPendingSelected(value);
}
