import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import {
  HomePresentationFilter,
  HomeReturnContext,
  PersonalCategoryFilterMode,
} from "../types/presentation";
import { PresentationHomeHandoffCoordinator } from "./presentation-home-handoff.coordinator";
import { HomePresentationHandoffHostAdapter } from "./home-presentation-handoff-host.adapter";
import type { HomeActiveFilter } from "./home-deep-link-host.adapter";

export interface HomePresentationHandoffSource {
  activeFilter: HomePresentationFilter;
  selectedPromptTypes: string[];
  selectedPersonalCategories: string[];
  personalCategoryFilterMode: PersonalCategoryFilterMode;
  defaultPrayerView: "current" | "personal";
}

export interface HomePresentationNavigationHostBindings {
  setFilter(filter: HomeActiveFilter): void;
  setSelectedPromptTypes(types: string[]): void;
  applyPersonalReturnContext(context: {
    personalCategoryFilterMode?: HomeReturnContext["personalCategoryFilterMode"];
    selectedPersonalCategories?: string[];
  }): void;
  refreshHomeCatalog(): void;
  getHandoffSource(): HomePresentationHandoffSource;
}

@Injectable()
export class HomePresentationNavigationController {
  pendingHomeReturnContext: HomeReturnContext | null = null;
  handoffHost!: HomePresentationHandoffHostAdapter;

  private getHandoffSource: (() => HomePresentationHandoffSource) | null = null;

  constructor(
    private readonly router: Router,
    private readonly homeHandoffCoordinator: PresentationHomeHandoffCoordinator
  ) {}

  bindHost(bindings: HomePresentationNavigationHostBindings): void {
    this.getHandoffSource = bindings.getHandoffSource;
    this.handoffHost = new HomePresentationHandoffHostAdapter({
      setFilter: bindings.setFilter,
      setSelectedPromptTypes: bindings.setSelectedPromptTypes,
      applyPersonalReturnContext: bindings.applyPersonalReturnContext,
      refreshHomeCatalog: bindings.refreshHomeCatalog,
    });
  }

  get presentationHandoffQueryParams(): Record<string, string> | null {
    return this.homeHandoffCoordinator.getQueryParamsForLink(
      this.homeHandoffCoordinator.buildHandoffFromHome(this.requireHandoffSource())
    );
  }

  onPresentationLinkClick(event: MouseEvent): void {
    if (this.homeHandoffCoordinator.shouldUseNativePresentationNavigation(event)) {
      return;
    }
    event.preventDefault();
    this.homeHandoffCoordinator.navigateToPresentation(
      this.router,
      this.homeHandoffCoordinator.buildHandoffFromHome(this.requireHandoffSource())
    );
  }

  consumeHomeReturnContext(): HomeReturnContext | null {
    return this.homeHandoffCoordinator.consumeHomeReturnContext({
      historyState: history.state as Record<string, unknown> | null,
      replaceHistoryState: (state) => history.replaceState(state, ""),
    });
  }

  applyHomeReturnContext(context: HomeReturnContext): void {
    this.homeHandoffCoordinator.applyHomeReturnContext(
      this.handoffHost,
      context
    );
  }

  private requireHandoffSource(): HomePresentationHandoffSource {
    if (!this.getHandoffSource) {
      throw new Error("HomePresentationNavigationController host is not bound");
    }
    return this.getHandoffSource();
  }
}
