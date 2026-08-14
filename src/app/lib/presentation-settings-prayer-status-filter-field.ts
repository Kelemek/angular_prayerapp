import {
  formatStatusFilterDisplay,
  initPendingStatusFilter,
  resolveAppliedStatusFilters,
  statusFiltersMatchApplied,
} from "./presentation-settings-filters-state";
import {
  isAllPresentationMultiSelectPendingSelected,
  isPresentationMultiSelectPendingSelected,
  selectAllPresentationMultiSelectPending,
  togglePresentationMultiSelectDropdown,
  togglePresentationMultiSelectPending,
} from "./presentation-settings-multi-select-field";

export interface PresentationPrayerStatusFilterFieldConfig {
  getStatusFilters: () => { current: boolean; answered: boolean };
  getAvailable: () => readonly string[];
  emit: (next: { current: boolean; answered: boolean }) => void;
  closeOther: () => void;
}

export class PresentationPrayerStatusFilterField {
  showDropdown = false;
  pending: string[] = [];

  constructor(private readonly config: PresentationPrayerStatusFilterFieldConfig) {}

  initPending(): void {
    const { current, answered } = this.config.getStatusFilters();
    this.pending = initPendingStatusFilter(
      current,
      answered,
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
    const applied = resolveAppliedStatusFilters(
      this.pending,
      this.config.getAvailable()
    );
    const { current, answered } = this.config.getStatusFilters();
    if (statusFiltersMatchApplied(applied, current, answered)) {
      this.showDropdown = false;
      return;
    }
    this.config.emit(applied);
    this.showDropdown = false;
  }

  togglePending(value: string): void {
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

  isPendingSelected(value: string): boolean {
    return isPresentationMultiSelectPendingSelected(this.pending, value);
  }

  getDisplay(): string {
    const { current, answered } = this.config.getStatusFilters();
    return formatStatusFilterDisplay(current, answered);
  }

  readonly bindIsOptionSelected = (value: string): boolean =>
    this.isPendingSelected(value);
}
