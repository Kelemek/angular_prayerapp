import { Injectable } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { mapHomeFilterToContentType } from "./presentation-settings.service";
import {
  HOME_RETURN_CONTEXT_STATE_KEY,
  PRESENTATION_HOME_HANDOFF_QUERY_PARAM_KEYS,
  PRESENTATION_HOME_HANDOFF_STATE_KEY,
  PRESENTATION_HOME_NAV_STATE_KEY,
  buildPresentationHomeHandoff,
  parseHomeReturnContextFromState,
  serializePresentationHomeHandoffQueryParams,
  type HomePresentationFilter,
  type HomeReturnContext,
  type PersonalCategoryFilterMode,
  type PresentationHomeHandoff,
  parsePresentationHomeHandoffFromQueryParams,
  parsePresentationHomeHandoffFromState,
  type PresentationStatusFilters,
} from "../types/presentation";

export interface HomePresentationHandoffSource {
  activeFilter: HomePresentationFilter;
  selectedPromptTypes: string[];
  selectedPersonalCategories: string[];
  personalCategoryFilterMode: PersonalCategoryFilterMode;
  defaultPrayerView: "current" | "personal" | null | undefined;
}

export interface HomeReturnContextApplier {
  setFilter(filter: HomeReturnContext["activeFilter"]): void;
  setSelectedPromptTypes(types: string[]): void;
  applyPersonalReturnContext(context: {
    personalCategoryFilterMode?: PersonalCategoryFilterMode;
    selectedPersonalCategories?: string[];
  }): void;
  onReturnContextApplied(): void;
}

export interface PresentationHandoffPageState {
  contentTypes: PresentationHomeHandoff["contentTypes"];
  statusFilters: PresentationStatusFilters;
  selectedPromptCategories: string[];
  selectedPersonalCategories: string[];
  homeReturnContext: HomeReturnContext | null;
}

@Injectable()
export class PresentationHomeHandoffCoordinator {
  buildHandoffFromHome(
    source: HomePresentationHandoffSource
  ): PresentationHomeHandoff {
    const defaultPrayerView = source.defaultPrayerView ?? "current";
    return buildPresentationHomeHandoff({
      contentTypes: [
        mapHomeFilterToContentType(source.activeFilter, defaultPrayerView),
      ],
      activeFilter: source.activeFilter,
      selectedPromptTypes: source.selectedPromptTypes,
      selectedPersonalCategories: source.selectedPersonalCategories,
      personalCategoryFilterMode: source.personalCategoryFilterMode,
    });
  }

  getQueryParamsForLink(
    handoff: PresentationHomeHandoff
  ): Record<string, string> | null {
    const params = serializePresentationHomeHandoffQueryParams(handoff);
    return Object.keys(params).length > 0 ? params : null;
  }

  shouldUseNativePresentationNavigation(event: MouseEvent): boolean {
    return (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    );
  }

  navigateToPresentation(
    router: Router,
    handoff: PresentationHomeHandoff
  ): void {
    void router.navigate(["/presentation"], {
      state: {
        [PRESENTATION_HOME_HANDOFF_STATE_KEY]: handoff,
      },
    });
  }

  consumeHomeReturnContext(options: {
    historyState: Record<string, unknown> | null;
    replaceHistoryState: (state: Record<string, unknown>) => void;
  }): HomeReturnContext | null {
    const returnContext = parseHomeReturnContextFromState(options.historyState);
    if (!returnContext) {
      return null;
    }

    options.replaceHistoryState({
      ...(options.historyState ?? {}),
      [HOME_RETURN_CONTEXT_STATE_KEY]: undefined,
    });
    return returnContext;
  }

  applyHomeReturnContext(
    host: HomeReturnContextApplier,
    context: HomeReturnContext
  ): void {
    host.setFilter(context.activeFilter);
    if (
      context.activeFilter === "prompts" &&
      context.selectedPromptTypes?.length
    ) {
      host.setSelectedPromptTypes([...context.selectedPromptTypes]);
    }
    if (context.activeFilter === "personal") {
      host.applyPersonalReturnContext({
        personalCategoryFilterMode: context.personalCategoryFilterMode,
        selectedPersonalCategories: context.selectedPersonalCategories,
      });
    }
    host.onReturnContextApplied();
  }

  consumeFromNavigation(options: {
    historyState: Record<string, unknown> | null;
    replaceHistoryState: (state: Record<string, unknown>) => void;
    getQueryParam: (key: string) => string | null;
    clearQueryParams: () => void;
  }): PresentationHomeHandoff | null {
    const fromState = parsePresentationHomeHandoffFromState(
      options.historyState
    );
    if (fromState) {
      options.replaceHistoryState({
        ...(options.historyState ?? {}),
        [PRESENTATION_HOME_HANDOFF_STATE_KEY]: undefined,
        [PRESENTATION_HOME_NAV_STATE_KEY]: undefined,
      });
      return fromState;
    }

    const fromQuery = parsePresentationHomeHandoffFromQueryParams(
      options.getQueryParam
    );
    if (fromQuery) {
      options.clearQueryParams();
      return fromQuery;
    }

    return null;
  }

  applyHandoff(
    page: PresentationHandoffPageState,
    handoff: PresentationHomeHandoff
  ): void {
    page.contentTypes = [...handoff.contentTypes];
    if (handoff.statusFilters) {
      page.statusFilters = { ...handoff.statusFilters };
    }
    if (handoff.promptCategories) {
      page.selectedPromptCategories = [...handoff.promptCategories];
    }
    if (handoff.personalCategories) {
      page.selectedPersonalCategories = [...handoff.personalCategories];
    }
    if (handoff.returnContext) {
      page.homeReturnContext = {
        activeFilter: handoff.returnContext.activeFilter,
        ...(handoff.returnContext.selectedPromptTypes
          ? {
              selectedPromptTypes: [
                ...handoff.returnContext.selectedPromptTypes,
              ],
            }
          : {}),
        ...(handoff.returnContext.selectedPersonalCategories
          ? {
              selectedPersonalCategories: [
                ...handoff.returnContext.selectedPersonalCategories,
              ],
            }
          : {}),
        ...(handoff.returnContext.personalCategoryFilterMode
          ? {
              personalCategoryFilterMode:
                handoff.returnContext.personalCategoryFilterMode,
            }
          : {}),
      };
    }
  }

  consumeAndApply(
    page: PresentationHandoffPageState,
    options: {
      historyState: Record<string, unknown> | null;
      replaceHistoryState: (state: Record<string, unknown>) => void;
      getQueryParam: (key: string) => string | null;
      clearQueryParams: () => void;
    }
  ): PresentationHomeHandoff | null {
    const handoff = this.consumeFromNavigation(options);
    if (handoff) {
      this.applyHandoff(page, handoff);
    }
    return handoff;
  }

  consumeAndApplyFromRoute(
    page: PresentationHandoffPageState,
    router: Router,
    route: ActivatedRoute
  ): PresentationHomeHandoff | null {
    const handoff = this.consumeFromRoute(router, route);
    if (handoff) {
      this.applyHandoff(page, handoff);
    }
    return handoff;
  }

  navigateExit(
    router: Router,
    homeReturnContext: HomeReturnContext | null
  ): void {
    if (homeReturnContext) {
      void router.navigate(["/"], {
        state: {
          [HOME_RETURN_CONTEXT_STATE_KEY]: homeReturnContext,
        },
      });
      return;
    }

    void router.navigate(["/"]);
  }

  consumeFromRoute(
    router: Router,
    route: ActivatedRoute
  ): PresentationHomeHandoff | null {
    return this.consumeFromNavigation({
      historyState: history.state as Record<string, unknown> | null,
      replaceHistoryState: (state) => history.replaceState(state, ""),
      getQueryParam: (key) => route.snapshot.queryParamMap.get(key),
      clearQueryParams: () => {
        const clearedParams = Object.fromEntries(
          PRESENTATION_HOME_HANDOFF_QUERY_PARAM_KEYS.map((key) => [key, null])
        );
        void router.navigate([], {
          relativeTo: route,
          queryParams: clearedParams,
          queryParamsHandling: "merge",
          replaceUrl: true,
        });
      },
    });
  }
}
