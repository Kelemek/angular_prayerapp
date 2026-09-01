import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  HOME_PROMPTS_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_ROW_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import { buildHomeSubFilterChipButtonClass } from "../../lib/home-sub-filter-chip-button-class";
import {
  PROMPT_TYPE_CHIP_ACTIVE_CLASS,
  PROMPT_TYPE_CHIP_INACTIVE_CLASS,
} from "../../lib/prompt-type-chip-classes";

@Component({
  selector: "app-info-home-filter-preview-prompts-filters",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./info-home-filter-preview-prompts-filters.component.html",
  host: { class: "block" },
})
export class InfoHomeFilterPreviewPromptsFiltersComponent {
  readonly chipHostClass = HOME_WRAP_FILTER_CHIP_FLEX_CLASS;
  readonly chipButtonStretchClass = HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS;
  readonly chipRowClass = HOME_SUB_FILTER_CHIP_ROW_CLASS;
  readonly promptsSubFilterGroupClass = HOME_PROMPTS_SUB_FILTER_GROUP_CLASS;
  readonly promptTypeActiveClass = PROMPT_TYPE_CHIP_ACTIVE_CLASS;
  readonly promptTypeInactiveClass = PROMPT_TYPE_CHIP_INACTIVE_CLASS;
  /** When true, panel attaches below the Church status row (no top rounding). */
  @Input() attachedUnderPublic = false;

  readonly previewChips = [
    { label: "All Types (76)", active: true },
    { label: "Church (27)", active: false },
    { label: "Family (5)", active: false },
    { label: "Cities (9)", active: false },
  ] as const;

  @Output() openPromptCategories = new EventEmitter<void>();

  chipButtonClass(active: boolean): string {
    return buildHomeSubFilterChipButtonClass({
      base: this.chipButtonStretchClass,
      active,
      activeClass: this.promptTypeActiveClass,
      inactiveClass: this.promptTypeInactiveClass,
    });
  }

  get panelGroupClass(): string {
    const shape = this.attachedUnderPublic ? "rounded-t-none" : "rounded-b-lg";
    return `${this.promptsSubFilterGroupClass} ${shape}`;
  }
}
