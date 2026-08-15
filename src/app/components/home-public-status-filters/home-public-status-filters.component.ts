import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Observable } from "rxjs";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";
import { BadgeService } from "../../services/badge.service";
import {
  HOME_PUBLIC_STATUS_CHIP_THEMES,
  HOME_PUBLIC_SUB_FILTER_GROUP_CLASS,
  HOME_SUB_FILTER_CHIP_BASE_CLASS,
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
})
export class HomePublicStatusFiltersComponent {
  @Input({ required: true }) activeFilter!: HomeActiveFilter;
  @Input({ required: true }) currentPrayersCount!: number;
  @Input({ required: true }) answeredPrayersCount!: number;
  @Input({ required: true }) totalPrayersCount!: number;
  @Input({ required: true }) currentPrayerBadge$!: Observable<number>;
  @Input({ required: true }) answeredPrayerBadge$!: Observable<number>;

  @Output() selectFilter = new EventEmitter<"current" | "answered" | "total">();

  readonly chipThemes = HOME_PUBLIC_STATUS_CHIP_THEMES;
  readonly chipBaseClass = HOME_SUB_FILTER_CHIP_BASE_CLASS;
  readonly sectionGapClass = HOME_SHELL_SECTION_GAP_CLASSES;
  readonly subFilterGroupClass = HOME_PUBLIC_SUB_FILTER_GROUP_CLASS;

  constructor(readonly badgeService: BadgeService) {}
}
