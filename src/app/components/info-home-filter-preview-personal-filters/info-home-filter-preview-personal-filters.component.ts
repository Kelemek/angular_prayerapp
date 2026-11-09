import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS,
  HOME_PERSONAL_SUB_FILTER_CHIP_ACTIVE_CLASS,
  HOME_PERSONAL_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_ROW_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import { HomeSubFilterChipComponent } from "../home-sub-filter-chip/home-sub-filter-chip.component";

@Component({
  selector: "app-info-home-filter-preview-personal-filters",
  standalone: true,
  imports: [CommonModule, HomeSubFilterChipComponent],
  templateUrl: "./info-home-filter-preview-personal-filters.component.html",
  host: { class: "block" },
})
export class InfoHomeFilterPreviewPersonalFiltersComponent {
  readonly subFilterChipWrapClass = HOME_SUB_FILTER_CHIP_WRAP_CLASS;
  readonly namedChipInactiveClass = HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS;
  readonly chipRowClass = HOME_SUB_FILTER_CHIP_ROW_CLASS;
  readonly personalSubFilterChipActiveClass =
    HOME_PERSONAL_SUB_FILTER_CHIP_ACTIVE_CLASS;
  readonly personalSubFilterGroupClass = HOME_PERSONAL_SUB_FILTER_GROUP_CLASS;
  readonly addCategoryChipLayoutClass =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg p-0 text-xs font-medium transition-all";

  @Output() openPersonalCategories = new EventEmitter<void>();
}
