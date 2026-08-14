import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Observable } from "rxjs";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";
import { HomeFilterCoordinator } from "../../services/home-filter.coordinator";
import { HomePlanningCenterController } from "../../services/home-planning-center.controller";
import { HomeMemorizationPanelController } from "../../services/home-memorization-panel.controller";
import { BadgeService } from "../../services/badge.service";

@Component({
  selector: "app-home-filter-tabs",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./home-filter-tabs.component.html",
})
export class HomeFilterTabsComponent {
  @Input({ required: true }) activeFilter!: HomeActiveFilter;
  @Input({ required: true }) currentPrayersCount!: number;
  @Input({ required: true }) answeredPrayersCount!: number;
  @Input({ required: true }) totalPrayersCount!: number;
  @Input({ required: true }) promptsCount!: number;
  @Input({ required: true }) personalPrayersCount!: number;
  @Input({ required: true }) currentPrayerBadge$!: Observable<number>;
  @Input({ required: true }) answeredPrayerBadge$!: Observable<number>;
  @Input({ required: true }) promptBadge$!: Observable<number>;

  constructor(
    readonly filter: HomeFilterCoordinator,
    readonly badgeService: BadgeService,
    readonly planningCenter: HomePlanningCenterController,
    readonly memorizationPanel: HomeMemorizationPanelController
  ) {}
}
