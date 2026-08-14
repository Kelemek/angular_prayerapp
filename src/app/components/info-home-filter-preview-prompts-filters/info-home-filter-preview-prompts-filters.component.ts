import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { HOME_SUB_FILTER_CHIP_WRAP_CLASS } from "../../lib/home-sub-filter-chip-classes";

@Component({
  selector: "app-info-home-filter-preview-prompts-filters",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-home-filter-preview-prompts-filters.component.html",
})
export class InfoHomeFilterPreviewPromptsFiltersComponent {
  readonly subFilterChipWrapClass = HOME_SUB_FILTER_CHIP_WRAP_CLASS;

  @Output() openPromptCategories = new EventEmitter<void>();
}
