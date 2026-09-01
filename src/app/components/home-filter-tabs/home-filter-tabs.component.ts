import { Component, EventEmitter, inject, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Observable } from "rxjs";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";
import { BadgeService } from "../../services/badge.service";
import { homeHasSubFilterRowBelowTabs, isPublicAreaFilter } from "../../lib/home-community-filter";
import {
  homeFilterTabClass,
  type HomeFilterTabAccent,
} from "../../lib/home-sub-filter-chip-classes";
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
  host: { class: "block" },
})
export class HomeFilterTabsComponent {
  @Input({ required: true }) activeFilter!: HomeActiveFilter;
  @Input({ required: true }) currentPrayerBadge$!: Observable<number>;
  @Input({ required: true }) answeredPrayerBadge$!: Observable<number>;

  @Output() tabSelected = new EventEmitter<HomeActiveFilter>();
  @Output() publicTabSelected = new EventEmitter<void>();

  readonly isPublicAreaFilter = isPublicAreaFilter;

  get hasSubFilterRow(): boolean {
    return homeHasSubFilterRowBelowTabs(this.activeFilter);
  }

  get tabRowMarginClass(): string {
    return this.hasSubFilterRow
      ? HOME_SHELL_FILTER_TAB_GAP_CLASSES
      : HOME_SHELL_SECTION_GAP_CLASSES;
  }

  tabClass(accent: HomeFilterTabAccent, active: boolean): string {
    return homeFilterTabClass({
      accent,
      active,
      hasSubRow: this.hasSubFilterRow,
    });
  }

  readonly badgeService = inject(BadgeService);

  markAllPublicPrayersRead(): void {
    this.badgeService.markAllAsReadByStatus("prayers", "current");
    this.badgeService.markAllAsReadByStatus("prayers", "answered");
  }
}
