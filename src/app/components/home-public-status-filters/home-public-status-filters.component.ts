import { Component, EventEmitter, inject, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Observable } from "rxjs";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";
import { BadgeService } from "../../services/badge.service";
import {
  HOME_PUBLIC_STATUS_CHIP_THEMES,
  HOME_PUBLIC_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_ROW_CLASS,
  HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS,
  HOME_WRAP_FILTER_CHIP_FLEX_CLASS,
} from "../../lib/home-sub-filter-chip-classes";
import { HOME_SHELL_SECTION_GAP_CLASSES } from "../../lib/home-shell-spacing";
import { HomeFilterBadgeButtonComponent } from "../home-filter-badge-button/home-filter-badge-button.component";
import { HomeSubFilterChipComponent } from "../home-sub-filter-chip/home-sub-filter-chip.component";

@Component({
  selector: "app-home-public-status-filters",
  standalone: true,
  imports: [
    CommonModule,
    HomeFilterBadgeButtonComponent,
    HomeSubFilterChipComponent,
  ],
  templateUrl: "./home-public-status-filters.component.html",
  host: { class: "block" },
})
export class HomePublicStatusFiltersComponent {
  @Input({ required: true }) activeFilter!: HomeActiveFilter;
  @Input({ required: true }) currentPrayersCount!: number;
  @Input({ required: true }) answeredPrayersCount!: number;
  @Input({ required: true }) archivedPrayersCount!: number;
  @Input({ required: true }) totalPrayersCount!: number;
  @Input({ required: true }) currentPrayerBadge$!: Observable<number>;
  @Input({ required: true }) answeredPrayerBadge$!: Observable<number>;
  @Input({ required: true }) promptBadge$!: Observable<number>;
  @Input() promptsCount = 0;
  /** When true, the Church panel uses square bottom corners so prompt type chips can attach. */
  @Input() promptsPanelExpanded = false;
  @Input() sectionGapClass = HOME_SHELL_SECTION_GAP_CLASSES;
  @Input({ required: true }) showPlanningCenterMembersFilter!: boolean;
  @Input({ required: true }) planningCenterMembersDisplayCount!: number | string;
  @Input() planningCenterMembersLoading = false;

  @Output() selectFilter = new EventEmitter<
    | "current"
    | "answered"
    | "archived"
    | "total"
    | "prompts"
    | "planning_center_list"
  >();

  readonly chipThemes = HOME_PUBLIC_STATUS_CHIP_THEMES;
  readonly chipHostClass = HOME_WRAP_FILTER_CHIP_FLEX_CLASS;
  readonly chipButtonClass = HOME_SUB_FILTER_CHIP_WRAP_STRETCH_CLASS;
  readonly chipRowClass = HOME_SUB_FILTER_CHIP_ROW_CLASS;
  readonly subFilterGroupClass = HOME_PUBLIC_SUB_FILTER_GROUP_CLASS;
  readonly badgeService = inject(BadgeService);

  get panelGroupClass(): string {
    const base = this.subFilterGroupClass.replace("rounded-b-lg", "").trim();
    const shape = this.promptsPanelExpanded ? "rounded-b-none" : "rounded-b-lg";
    return `${base} ${shape}`;
  }
}
