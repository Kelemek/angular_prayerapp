import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  CdkDragDrop,
  DragDropModule,
} from "@angular/cdk/drag-drop";
import type { PersonalCategoryFilterMode } from "../../types/presentation";
import {
  HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS,
  HOME_PERSONAL_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import { buildHomeSubFilterChipButtonClass } from "../../lib/home-sub-filter-chip-button-class";
import { HOME_SHELL_SECTION_GAP_CLASSES } from "../../lib/home-shell-spacing";
import { HomeSubFilterChipComponent } from "../home-sub-filter-chip/home-sub-filter-chip.component";

@Component({
  selector: "app-home-personal-category-filters",
  standalone: true,
  imports: [CommonModule, DragDropModule, HomeSubFilterChipComponent],
  templateUrl: "./home-personal-category-filters.component.html",
})
export class HomePersonalCategoryFiltersComponent {
  @Input({ required: true }) personalPrayersCount!: number;
  @Input({ required: true }) filterMode!: PersonalCategoryFilterMode;
  @Input({ required: true }) personalCategoryActiveClass!: string;
  @Input({ required: true }) uniqueCategories!: string[];
  @Input({ required: true }) isCategoryDropListDisabled!: boolean;
  @Input({ required: true }) personalCurrentCount!: number;
  @Input({ required: true }) personalAnsweredCount!: number;
  @Input({ required: true }) isCategorySwapping!: (category: string) => boolean;
  @Input({ required: true }) isPersonalCategorySelected!: (
    category: string
  ) => boolean;
  @Input({ required: true }) getCategoryCount!: (category: string) => number;

  @Output() selectFilterMode = new EventEmitter<
    Exclude<PersonalCategoryFilterMode, "named">
  >();
  @Output() toggleCategory = new EventEmitter<string>();
  @Output() categoryDrop = new EventEmitter<CdkDragDrop<string[]>>();
  @Output() categoryDragStarted = new EventEmitter<void>();
  @Output() categoryDragEnded = new EventEmitter<void>();
  @Output() categoryPointerDown = new EventEmitter<{
    event: PointerEvent;
    category: string;
  }>();
  @Output() categoryPointerMove = new EventEmitter<PointerEvent>();
  @Output() categoryPointerUp = new EventEmitter<PointerEvent>();
  @Output() categoryContextMenu = new EventEmitter<{
    event: MouseEvent;
    category: string;
  }>();

  readonly chipHostClass = HOME_WRAP_FILTER_CHIP_FLEX_CLASS;
  readonly chipButtonClass = HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS;
  readonly namedChipInactiveClass = HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS;
  readonly sectionGapClass = HOME_SHELL_SECTION_GAP_CLASSES;
  readonly subFilterGroupClass = HOME_PERSONAL_SUB_FILTER_GROUP_CLASS;

  categoryChipButtonClass(category: string): string {
    return buildHomeSubFilterChipButtonClass({
      base: this.chipButtonClass,
      active: this.isPersonalCategorySelected(category),
      activeClass: this.personalCategoryActiveClass,
      inactiveClass: this.namedChipInactiveClass,
      disabled: this.isCategorySwapping(category),
    });
  }
}
