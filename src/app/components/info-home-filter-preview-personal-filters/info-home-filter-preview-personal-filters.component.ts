import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  HOME_SUB_FILTER_CHIP_BASE_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_CLASS,
} from "../../lib/home-sub-filter-chip-classes";

@Component({
  selector: "app-info-home-filter-preview-personal-filters",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-home-filter-preview-personal-filters.component.html",
})
export class InfoHomeFilterPreviewPersonalFiltersComponent {
  readonly subFilterChipBaseClass = HOME_SUB_FILTER_CHIP_BASE_CLASS;
  readonly subFilterChipWrapClass = HOME_SUB_FILTER_CHIP_WRAP_CLASS;

  @Output() openPersonalCategories = new EventEmitter<void>();
}
