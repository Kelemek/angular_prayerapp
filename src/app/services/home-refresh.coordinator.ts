import { Injectable } from "@angular/core";
import type { HomeActiveFilter } from "./home-deep-link-host.adapter";
import type { PrayerService } from "./prayer.service";
import type { UserSessionService } from "./user-session.service";
import type { PersonalCategoryColorService } from "./personal-category-color.service";
import type { MemorizationService } from "./memorization.service";
import type { ToastService } from "./toast.service";
import type { HomePlanningCenterController } from "./home-planning-center.controller";

export interface HomeRefreshHost {
  getActiveFilter(): HomeActiveFilter;
  getPlanningCenterListId(): string | null;
  markForCheck(): void;
  setRefreshing(refreshing: boolean): void;
  shouldThrottleRefresh(now: number, minIntervalMs: number): boolean;
  recordRefreshAttempt(now: number): void;
}

export interface HomeRefreshServices {
  prayerService: PrayerService;
  userSessionService: UserSessionService;
  personalCategoryColorService: PersonalCategoryColorService;
  memorizationService: MemorizationService;
  planningCenter: HomePlanningCenterController;
  toastService: ToastService;
}

@Injectable()
export class HomeRefreshCoordinator {
  private host: HomeRefreshHost | null = null;
  private services: HomeRefreshServices | null = null;

  bindHost(host: HomeRefreshHost, services: HomeRefreshServices): void {
    this.host = host;
    this.services = services;
  }

  async onPullToRefresh(minIntervalMs = 30_000): Promise<void> {
    const host = this.requireHost();
    const services = this.requireServices();
    const now = Date.now();

    if (host.shouldThrottleRefresh(now, minIntervalMs)) {
      return;
    }

    host.recordRefreshAttempt(now);
    host.setRefreshing(true);
    host.markForCheck();

    try {
      const tasks: Promise<unknown>[] = [services.prayerService.loadPrayers(false)];

      const session = services.userSessionService.getCurrentSession();
      if (session?.email) {
        tasks.push(services.prayerService.loadPersonalPrayers(false));
        tasks.push(services.personalCategoryColorService.loadColors(true));
      }

      if (
        host.getActiveFilter() === "planning_center_list" &&
        host.getPlanningCenterListId()
      ) {
        services.planningCenter.loadForCurrentUser(true);
      }

      if (host.getActiveFilter() === "memorize") {
        tasks.push(services.memorizationService.loadItems());
      }

      await Promise.all(tasks);
    } catch (error) {
      console.error("[HomeComponent] Error during pull-to-refresh:", error);
      services.toastService.error("Failed to refresh. Showing last saved data.");
    } finally {
      host.setRefreshing(false);
      host.markForCheck();
    }
  }

  private requireHost(): HomeRefreshHost {
    if (!this.host) {
      throw new Error("HomeRefreshCoordinator host is not bound");
    }
    return this.host;
  }

  private requireServices(): HomeRefreshServices {
    if (!this.services) {
      throw new Error("HomeRefreshCoordinator services are not bound");
    }
    return this.services;
  }
}
