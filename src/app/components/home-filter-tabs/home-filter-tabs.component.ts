import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Observable } from "rxjs";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";
import { BadgeService } from "../../services/badge.service";
import { isCommunityPrayerFilter, homeHasSubFilterRowBelowTabs } from "../../lib/home-community-filter";
import {
  HOME_SHELL_FILTER_TAB_GAP_CLASSES,
  HOME_SHELL_SECTION_GAP_CLASSES,
} from "../../lib/home-shell-spacing";
import { HomeFilterBadgeButtonComponent } from "../home-filter-badge-button/home-filter-badge-button.component";

@Component({
  selector: "app-home-filter-tabs",
  standalone: true,
  imports: [CommonModule, HomeFilterBadgeButtonComponent],
  templateUrl: "./home-filter-tabs.component.html",
})
export class HomeFilterTabsComponent {
  @Input({ required: true }) activeFilter!: HomeActiveFilter;
  @Input({ required: true }) currentPrayersCount!: number;
  @Input({ required: true }) answeredPrayersCount!: number;
  @Input({ required: true }) totalPrayersCount!: number;
  @Input({ required: true }) promptsCount!: number;
  @Input({ required: true }) personalPrayersCount!: number;
  @Input({ required: true }) memorizedItemsCount!: number;
  @Input({ required: true }) showPlanningCenterMembersFilter!: boolean;
  @Input({ required: true }) planningCenterMembersDisplayCount!: number | string;
  @Input() planningCenterMembersLoading = false;
  @Input({ required: true }) currentPrayerBadge$!: Observable<number>;
  @Input({ required: true }) answeredPrayerBadge$!: Observable<number>;
  @Input({ required: true }) promptBadge$!: Observable<number>;

  @Output() tabSelected = new EventEmitter<HomeActiveFilter>();
  @Output() publicTabSelected = new EventEmitter<void>();

  readonly isCommunityPrayerFilter = isCommunityPrayerFilter;

  get tabRowMarginClass(): string {
    return homeHasSubFilterRowBelowTabs(this.activeFilter, this.promptsCount)
      ? HOME_SHELL_FILTER_TAB_GAP_CLASSES
      : HOME_SHELL_SECTION_GAP_CLASSES;
  }

  constructor(readonly badgeService: BadgeService) {}

  markAllPublicPrayersRead(): void {
    this.badgeService.markAllAsReadByStatus("prayers", "current");
    this.badgeService.markAllAsReadByStatus("prayers", "answered");
  }
}
