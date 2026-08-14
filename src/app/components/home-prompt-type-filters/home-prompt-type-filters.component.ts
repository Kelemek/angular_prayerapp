import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { BadgeService } from "../../services/badge.service";
import {
  HOME_SUB_FILTER_CHIP_WRAP_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import { HOME_SHELL_SECTION_GAP_CLASSES } from "../../lib/home-shell-spacing";
import { HomeFilterBadgeButtonComponent } from "../home-filter-badge-button/home-filter-badge-button.component";
import { HomeSubFilterChipComponent } from "../home-sub-filter-chip/home-sub-filter-chip.component";

@Component({
  selector: "app-home-prompt-type-filters",
  standalone: true,
  imports: [CommonModule, HomeFilterBadgeButtonComponent, HomeSubFilterChipComponent],
  templateUrl: "./home-prompt-type-filters.component.html",
})
export class HomePromptTypeFiltersComponent {
  @Input({ required: true }) promptsCount!: number;
  @Input({ required: true }) selectedPromptTypes!: string[];
  @Input({ required: true }) uniquePromptTypes!: string[];
  @Input({ required: true }) promptTypeActiveClass!: string;
  @Input({ required: true }) promptTypeInactiveClass!: string;
  @Input({ required: true }) getPromptCountByType!: (type: string) => number;
  @Input({ required: true }) getUnreadPromptCountByType!: (type: string) => number;

  @Output() clearTypes = new EventEmitter<void>();
  @Output() toggleType = new EventEmitter<string>();

  readonly chipWrapClass = HOME_SUB_FILTER_CHIP_WRAP_CLASS;
  readonly sectionGapClass = HOME_SHELL_SECTION_GAP_CLASSES;

  constructor(readonly badgeService: BadgeService) {}
}
