import { Injectable } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  HOME_RETURN_CONTEXT_STATE_KEY,
  PRESENTATION_HOME_HANDOFF_QUERY_PARAM_KEYS,
  PRESENTATION_HOME_HANDOFF_STATE_KEY,
  PRESENTATION_HOME_NAV_STATE_KEY,
  type HomeReturnContext,
  type PresentationHomeHandoff,
  parsePresentationHomeHandoffFromQueryParams,
  parsePresentationHomeHandoffFromState,
} from "../types/presentation";

export interface PresentationHandoffPageState {
  contentTypes: PresentationHomeHandoff["contentTypes"];
  statusFilters: { current: boolean; answered: boolean };
  selectedPromptCategories: string[];
  selectedPersonalCategories: string[];
  homeReturnContext: HomeReturnContext | null;
}

@Injectable()
export class PresentationHomeHandoffCoordinator {
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
