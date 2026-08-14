import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { type PresentationSettingsDropdownOption } from "./presentation-settings-multi-select-dropdown.component";
import { PresentationSettingsMultiSelectFilterRowComponent } from "./presentation-settings-multi-select-filter-row.component";
import { PresentationSettingsSectionCardComponent } from "./presentation-settings-section-card.component";
import { PresentationSettingsPrayerStatusTimeFiltersComponent } from "./presentation-settings-prayer-status-time-filters.component";
import {
  applyOpenPresentationFiltersDropdowns,
  closeOtherPresentationFiltersDropdowns,
  onPresentationFiltersBodyPointerDown,
  resetPresentationFiltersDropdowns,
  type PresentationFiltersDropdownApplyHandlers,
  type PresentationFiltersDropdownState,
} from "../../lib/presentation-settings-filters-dropdown";
import {
  formatPresentationContentTypeLabel,
  formatPresentationTimeFilterLabel,
  getAvailablePresentationContentTypes,
  PRESENTATION_CONTENT_TYPE_OPTIONS,
  PRESENTATION_STATUS_FILTER_OPTIONS,
  PRESENTATION_TIME_FILTER_OPTIONS,
} from "../../lib/presentation-settings-filter-options";
import { PresentationMultiSelectFilterField } from "../../lib/presentation-settings-multi-select-field";
import { PresentationPrayerStatusFilterField } from "../../lib/presentation-settings-prayer-status-filter-field";
import {
  PresentationTimeFilter,
  SelectablePresentationContentType,
  includesPresentationContentType,
  showsPrayerTimeStatusFilters,
} from "../../types/presentation";

@Component({
  selector: "app-presentation-settings-filters-panel",
  standalone: true,
  imports: [
    CommonModule,
    PresentationSettingsMultiSelectFilterRowComponent,
    PresentationSettingsSectionCardComponent,
    PresentationSettingsPrayerStatusTimeFiltersComponent,
  ],
  templateUrl: "./presentation-settings-filters-panel.component.html",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class PresentationSettingsFiltersPanelComponent implements OnInit, OnChanges {
  @Input() contentTypes: SelectablePresentationContentType[] = ["prayers"];
  @Input() timeFilter: PresentationTimeFilter = "all";
  @Input() statusFiltersCurrent = true;
  @Input() statusFiltersAnswered = true;
  @Input() availableCategories: string[] = [];
  @Input() selectedCategories: string[] = [];
  @Input() availablePromptCategories: string[] = [];
  @Input() selectedPromptCategories: string[] = [];
  @Input() hasMappedList = false;
  @Input() modalVisible = false;

  @Output() contentTypesChange = new EventEmitter<SelectablePresentationContentType[]>();
  @Output() timeFilterChange = new EventEmitter<PresentationTimeFilter>();
  @Output() statusFiltersChange = new EventEmitter<{ current: boolean; answered: boolean }>();
  @Output() categoriesChange = new EventEmitter<string[]>();
  @Output() promptCategoriesChange = new EventEmitter<string[]>();

  localContentTypes: SelectablePresentationContentType[] = ["prayers"];
  localSelectedCategories: string[] = [];
  localSelectedPromptCategories: string[] = [];
  localTimeFilter: PresentationTimeFilter = "all";
  readonly timeFilterDropdown = { open: false };

  readonly contentTypeOptions = PRESENTATION_CONTENT_TYPE_OPTIONS;
  readonly statusFilterOptions = PRESENTATION_STATUS_FILTER_OPTIONS;
  readonly timeFilterOptions = PRESENTATION_TIME_FILTER_OPTIONS;

  readonly contentTypeField: PresentationMultiSelectFilterField<SelectablePresentationContentType>;
  readonly categoriesField: PresentationMultiSelectFilterField<string>;
  readonly promptCategoriesField: PresentationMultiSelectFilterField<string>;
  readonly statusField: PresentationPrayerStatusFilterField;

  constructor() {
    this.contentTypeField = new PresentationMultiSelectFilterField({
      getLocal: () => this.localContentTypes,
      setLocal: (next) => {
        this.localContentTypes = next;
      },
      getAvailable: () => this.getAvailableContentTypes(),
      emit: (next) => this.contentTypesChange.emit(next),
      closeOther: () => this.closeOtherDropdowns("contentType"),
      allLabel: "All Content Types",
      formatItem: formatPresentationContentTypeLabel,
    });
    this.categoriesField = new PresentationMultiSelectFilterField({
      getLocal: () => this.localSelectedCategories,
      setLocal: (next) => {
        this.localSelectedCategories = next;
      },
      getAvailable: () => this.availableCategories,
      emit: (next) => this.categoriesChange.emit(next),
      closeOther: () => this.closeOtherDropdowns("categories"),
      allLabel: "All Categories",
    });
    this.promptCategoriesField = new PresentationMultiSelectFilterField({
      getLocal: () => this.localSelectedPromptCategories,
      setLocal: (next) => {
        this.localSelectedPromptCategories = next;
      },
      getAvailable: () => this.availablePromptCategories,
      emit: (next) => this.promptCategoriesChange.emit(next),
      closeOther: () => this.closeOtherDropdowns("promptCategories"),
      allLabel: "All Categories",
    });
    this.statusField = new PresentationPrayerStatusFilterField({
      getStatusFilters: () => ({
        current: this.statusFiltersCurrent,
        answered: this.statusFiltersAnswered,
      }),
      getAvailable: () => [...this.statusFilterOptions],
      emit: (next) => this.statusFiltersChange.emit(next),
      closeOther: () => this.closeOtherDropdowns("status"),
    });
  }

  get contentTypeDropdownOptions(): PresentationSettingsDropdownOption<SelectablePresentationContentType>[] {
    return this.contentTypeOptions.map((option) => ({
      value: option.value,
      label: option.label,
      hidden: !!(option.requiresMappedList && !this.hasMappedList),
    }));
  }

  get categoryDropdownOptions(): PresentationSettingsDropdownOption<string>[] {
    return this.availableCategories.map((category) => ({
      value: category,
      label: category,
    }));
  }

  get promptCategoryDropdownOptions(): PresentationSettingsDropdownOption<string>[] {
    return this.availablePromptCategories.map((category) => ({
      value: category,
      label: category,
    }));
  }

  get statusDropdownOptions(): PresentationSettingsDropdownOption<string>[] {
    return this.statusFilterOptions.map((status) => ({
      value: status,
      label: status.charAt(0).toUpperCase() + status.slice(1),
    }));
  }

  ngOnInit(): void {
    this.syncFromInputs();
    this.initPendingFilters();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["modalVisible"]?.previousValue === true && !this.modalVisible) {
      this.applyOpenDropdowns();
      this.resetDropdownState();
      return;
    }
    if (changes["modalVisible"]?.currentValue === true) {
      this.syncFromInputs();
      this.initPendingFilters();
      this.resetDropdownState();
    }
  }

  syncFromInputs(): void {
    this.localContentTypes = [...this.contentTypes];
    this.localSelectedCategories = [...this.selectedCategories];
    this.localSelectedPromptCategories = [...this.selectedPromptCategories];
    this.localTimeFilter = this.timeFilter;
  }

  initPendingFilters(): void {
    this.contentTypeField.initPending();
    this.initPendingStatusFilter();
  }

  initPendingStatusFilter(): void {
    this.statusField.initPending();
  }

  showsPrayerTimeStatusFilters = showsPrayerTimeStatusFilters;
  includesPresentationContentType = includesPresentationContentType;

  getTimeFilterDisplay(): string {
    return formatPresentationTimeFilterLabel(this.localTimeFilter);
  }

  toggleTimeFilterDropdown(): void {
    if (this.timeFilterDropdown.open) {
      this.timeFilterDropdown.open = false;
    } else {
      this.closeOtherDropdowns("timeFilter");
      this.timeFilterDropdown.open = true;
    }
  }

  selectTimeFilter(value: PresentationTimeFilter): void {
    this.localTimeFilter = value;
    this.timeFilterChange.emit(value);
    this.timeFilterDropdown.open = false;
  }

  onBodyPointerDown(event: MouseEvent): void {
    onPresentationFiltersBodyPointerDown(
      event,
      this.dropdownState(),
      this.dropdownApplyHandlers()
    );
  }

  applyOpenDropdowns(): void {
    applyOpenPresentationFiltersDropdowns(
      this.dropdownState(),
      this.dropdownApplyHandlers()
    );
    this.closePrayerDropdowns();
  }

  resetDropdownState(): void {
    resetPresentationFiltersDropdowns(this.dropdownState());
    this.closePrayerDropdowns();
  }

  private dropdownState(): PresentationFiltersDropdownState {
    return {
      contentType: this.contentTypeField,
      categories: this.categoriesField,
      promptCategories: this.promptCategoriesField,
      status: this.statusField,
      timeFilter: this.timeFilterDropdown,
    };
  }

  private closePrayerDropdowns(): void {
    if (this.statusField.showDropdown) {
      this.statusField.apply();
    }
    this.statusField.showDropdown = false;
    this.timeFilterDropdown.open = false;
  }

  private getAvailableContentTypes(): SelectablePresentationContentType[] {
    return getAvailablePresentationContentTypes(this.hasMappedList);
  }

  private dropdownApplyHandlers(): PresentationFiltersDropdownApplyHandlers {
    return {
      applyContentType: () => this.contentTypeField.apply(),
      applyCategories: () => this.categoriesField.apply(),
      applyPromptCategories: () => this.promptCategoriesField.apply(),
      applyStatus: () => this.statusField.apply(),
    };
  }

  private closeOtherDropdowns(
    except: "contentType" | "timeFilter" | "status" | "categories" | "promptCategories"
  ): void {
    closeOtherPresentationFiltersDropdowns(
      except,
      this.dropdownState(),
      this.dropdownApplyHandlers()
    );
  }
}
