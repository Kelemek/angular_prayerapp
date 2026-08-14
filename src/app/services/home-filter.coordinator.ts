import { Injectable } from "@angular/core";
import type { PrayerFilters } from "../components/prayer-filters/prayer-filters.component";
import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import type { HomeActiveFilter } from "./home-deep-link-host.adapter";

export interface HomeFilterPageState {
  activeFilter: HomeActiveFilter;
  filters: PrayerFilters;
  selectedPromptTypes: string[];
}

export interface HomeFilterHost {
  getPageState(): HomeFilterPageState;
  setActiveFilter(filter: HomeActiveFilter): void;
  setFilters(filters: PrayerFilters): void;
  clearSelectedPromptTypes(): void;
  setSelectedPromptTypes(types: string[]): void;
  getPrompts(): PrayerPrompt[];
  isPromptUnread(promptId: string): boolean;
  applyPrayerFilters(filters: {
    status?: PrayerFilters["status"];
    type?: PrayerFilters["type"];
    search?: string;
  }): void;
  loadPlanningCenterMemberPrayers(): void;
  loadMemorizationItems(): void;
  onFilterChanged(): void;
}

@Injectable()
export class HomeFilterCoordinator {
  private host: HomeFilterHost | null = null;

  bindHost(host: HomeFilterHost): void {
    this.host = host;
  }

  onFiltersChange(filters: PrayerFilters): void {
    const host = this.requireHost();
    const page = host.getPageState();
    host.setFilters({
      ...page.filters,
      searchTerm: filters.searchTerm,
    });
    const next = host.getPageState();
    host.applyPrayerFilters({
      status: next.filters.status,
      type: next.filters.type,
      search: next.filters.searchTerm,
    });
    host.onFilterChanged();
  }

  setFilter(filter: HomeActiveFilter): void {
    const host = this.requireHost();
    const page = host.getPageState();
    host.setActiveFilter(filter);

    if (filter === "prompts") {
      host.setFilters({ searchTerm: page.filters.searchTerm });
      host.clearSelectedPromptTypes();
      host.applyPrayerFilters({ search: "" });
    } else if (filter === "personal") {
      host.setFilters({ searchTerm: page.filters.searchTerm });
      host.applyPrayerFilters({ search: page.filters.searchTerm });
    } else if (filter === "memorize") {
      host.setFilters({ searchTerm: page.filters.searchTerm });
      host.applyPrayerFilters({ search: "" });
      host.loadMemorizationItems();
    } else if (filter === "planning_center_list") {
      host.setFilters({ searchTerm: page.filters.searchTerm });
      host.applyPrayerFilters({ search: page.filters.searchTerm });
      host.loadPlanningCenterMemberPrayers();
    } else if (filter === "total") {
      host.setFilters({ searchTerm: page.filters.searchTerm });
      host.applyPrayerFilters({ search: page.filters.searchTerm });
    } else {
      host.setFilters({
        status: filter,
        searchTerm: page.filters.searchTerm,
      });
      host.applyPrayerFilters({
        status: filter,
        search: page.filters.searchTerm,
      });
    }

    host.onFilterChanged();
  }

  togglePromptType(type: string): void {
    const host = this.requireHost();
    const page = host.getPageState();
    if (page.selectedPromptTypes.length === 1 && page.selectedPromptTypes[0] === type) {
      host.setSelectedPromptTypes([]);
    } else {
      host.setSelectedPromptTypes([type]);
    }
    host.onFilterChanged();
  }

  clearSelectedPromptTypes(): void {
    const host = this.requireHost();
    host.setSelectedPromptTypes([]);
    host.onFilterChanged();
  }

  isPromptTypeSelected(type: string): boolean {
    return this.requireHost().getPageState().selectedPromptTypes.includes(type);
  }

  getPromptCountByType(type: string): number {
    const host = this.requireHost();
    return host
      .getPrompts()
      .filter((prompt) => prompt.type === type).length;
  }

  getUnreadPromptCountByType(type: string): number {
    const host = this.requireHost();
    return host
      .getPrompts()
      .filter(
        (prompt) => prompt.type === type && host.isPromptUnread(prompt.id)
      ).length;
  }

  private requireHost(): HomeFilterHost {
    if (!this.host) {
      throw new Error("HomeFilterCoordinator host is not bound");
    }
    return this.host;
  }
}
