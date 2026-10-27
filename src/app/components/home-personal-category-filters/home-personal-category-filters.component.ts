import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  CdkDragDrop,
  DragDropModule,
} from "@angular/cdk/drag-drop";
import type { PersonalCategoryFilterMode } from "../../types/presentation";
import {
  HOME_NAV_CHIP_TEXT_LOCK_CLASS,
  HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS,
  HOME_PERSONAL_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS,
  HOME_SUB_FILTER_CHIP_ROW_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import { buildHomeSubFilterChipButtonClass } from "../../lib/home-sub-filter-chip-button-class";
import { HOME_SHELL_SECTION_GAP_CLASSES } from "../../lib/home-shell-spacing";
import { HomeSubFilterChipComponent } from "../home-sub-filter-chip/home-sub-filter-chip.component";
import {
  HomeAddChoiceModalComponent,
  type HomeAddChoiceOption,
} from "../home-add-choice-modal/home-add-choice-modal.component";
import { CardActionsOverflowMenuComponent } from "../card-actions-overflow-menu/card-actions-overflow-menu.component";
import type { CardActionsOverflowItem } from "../card-actions-overflow-menu/card-actions-overflow-menu.types";
import { ConfirmationDialogComponent } from "../confirmation-dialog/confirmation-dialog.component";

type PersonalAddChoice = "prayer" | "category";

@Component({
  selector: "app-home-personal-category-filters",
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    HomeSubFilterChipComponent,
    CardActionsOverflowMenuComponent,
    ConfirmationDialogComponent,
    HomeAddChoiceModalComponent,
  ],
  templateUrl: "./home-personal-category-filters.component.html",
  host: { class: "block" },
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
  @Input() pendingDeletePersonalCategory: string | null = null;
  @Input() personalCategoryDeleteMessage = "";

  @Output() selectFilterMode = new EventEmitter<
    Exclude<PersonalCategoryFilterMode, "named">
  >();
  @Output() toggleCategory = new EventEmitter<string>();
  @Output() categoryDrop = new EventEmitter<CdkDragDrop<string[]>>();
  @Output() categoryDragStarted = new EventEmitter<void>();
  @Output() categoryDragEnded = new EventEmitter<void>();
  @Output() addCategory = new EventEmitter<void>();
  @Output() addPrayer = new EventEmitter<void>();
  @Output() renameCategory = new EventEmitter<string>();
  @Output() deleteCategory = new EventEmitter<string>();
  @Output() confirmDeletePersonalCategory = new EventEmitter<void>();
  @Output() cancelDeletePersonalCategory = new EventEmitter<void>();

  addChooserOpen = false;
  readonly personalAddChoices: readonly HomeAddChoiceOption<PersonalAddChoice>[] = [
    {
      id: "prayer",
      label: "New prayer",
      description: "Private prayer, only you see it",
    },
    {
      id: "category",
      label: "New category",
      description: "A label for prayers only you see",
    },
  ];

  readonly chipHostClass = HOME_WRAP_FILTER_CHIP_FLEX_CLASS;
  /** Square chip matching group “Add a group”; plus icon inside. */
  readonly addCategoryChipLayoutClass =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg p-0 text-xs font-medium transition-all";
  readonly chipButtonClass = HOME_SUB_FILTER_CHIP_DRAG_STRETCH_CLASS;
  readonly namedChipInactiveClass = HOME_PERSONAL_NAMED_CHIP_INACTIVE_CLASS;
  readonly chipRowClass = HOME_SUB_FILTER_CHIP_ROW_CLASS;
  readonly sectionGapClass = HOME_SHELL_SECTION_GAP_CLASSES;
  readonly subFilterGroupClass = HOME_PERSONAL_SUB_FILTER_GROUP_CLASS;

  chipReorderHandlesVisible = false;

  openAddChooser(): void {
    this.addChooserOpen = true;
  }

  closeAddChooser(): void {
    this.addChooserOpen = false;
  }

  onAddChoice(id: PersonalAddChoice): void {
    this.addChooserOpen = false;
    switch (id) {
      case "prayer":
        this.addPrayer.emit();
        return;
      case "category":
        this.addCategory.emit();
        return;
      default: {
        const _exhaustive: never = id;
        return _exhaustive;
      }
    }
  }

  categoryChipShellClass(category: string): string {
    return `${buildHomeSubFilterChipButtonClass({
      base: this.chipButtonClass,
      active: this.isPersonalCategorySelected(category),
      activeClass: this.personalCategoryActiveClass,
      inactiveClass: this.namedChipInactiveClass,
      relative: true,
      disabled: this.isCategorySwapping(category),
      showDragHandle: this.chipReorderHandlesVisible,
    })} ${HOME_NAV_CHIP_TEXT_LOCK_CLASS}`;
  }

  toggleChipReorderHandles(): void {
    this.chipReorderHandlesVisible = !this.chipReorderHandlesVisible;
  }

  categoryOverflowItems(category: string): CardActionsOverflowItem[] {
    if (this.isCategorySwapping(category)) {
      return [];
    }
    const items: CardActionsOverflowItem[] = [];
    if (this.uniqueCategories.length > 1) {
      items.push({
        id: "reorder",
        label: this.chipReorderHandlesVisible ? "Done reordering" : "Reorder",
        icon: "grip",
        tone: "blue",
        ariaLabel: this.chipReorderHandlesVisible
          ? "Hide drag handles"
          : "Show drag handles to reorder",
        onSelect: () => this.toggleChipReorderHandles(),
      });
    }
    items.push(
      {
        id: "edit",
        label: "Rename category",
        icon: "edit",
        tone: "blue",
        ariaLabel: `Rename ${category}`,
        onSelect: () => this.renameCategory.emit(category),
      },
      {
        id: "delete",
        label: "Delete category",
        icon: "trash",
        tone: "red",
        ariaLabel: `Delete ${category}`,
        onSelect: () => this.deleteCategory.emit(category),
      }
    );
    return items;
  }
}
