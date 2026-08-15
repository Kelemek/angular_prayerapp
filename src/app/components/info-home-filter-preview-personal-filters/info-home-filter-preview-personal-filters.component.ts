import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS,
  HOME_PERSONAL_SUB_FILTER_CHIP_ACTIVE_CLASS,
  HOME_PERSONAL_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_BASE_CLASS,
  HOME_SUB_FILTER_CHIP_ROW_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_CLASS,
} from "../../lib/home-sub-filter-chip-classes";

@Component({
  selector: "app-info-home-filter-preview-personal-filters",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-home-filter-preview-personal-filters.component.html",
  host: { class: "block" },
})
export class InfoHomeFilterPreviewPersonalFiltersComponent {
  readonly subFilterChipBaseClass = HOME_SUB_FILTER_CHIP_BASE_CLASS;
  readonly subFilterChipWrapClass = HOME_SUB_FILTER_CHIP_WRAP_CLASS;
  readonly namedChipInactiveClass = HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS;
  readonly chipRowClass = HOME_SUB_FILTER_CHIP_ROW_CLASS;
  readonly personalSubFilterChipActiveClass =
    HOME_PERSONAL_SUB_FILTER_CHIP_ACTIVE_CLASS;
  readonly personalSubFilterGroupClass = HOME_PERSONAL_SUB_FILTER_GROUP_CLASS;

  @Output() openPersonalCategories = new EventEmitter<void>();
}
