import type { HomeReturnContextApplier } from "./presentation-home-handoff.coordinator";
import type { HomeReturnContext } from "../types/presentation";
import type { HomeActiveFilter } from "./home-deep-link-host.adapter";

export interface HomePresentationHandoffPageBindings {
  setFilter(filter: HomeActiveFilter): void;
  setSelectedPromptTypes(types: string[]): void;
  applyPersonalReturnContext(context: {
    personalCategoryFilterMode?: HomeReturnContext["personalCategoryFilterMode"];
    selectedPersonalCategories?: string[];
  }): void;
  applyGroupReturnContext(context: {
    groupFilterMode?: HomeReturnContext["groupFilterMode"];
    selectedGroupId?: string | null;
  }): void;
  refreshHomeCatalog(): void;
}

export class HomePresentationHandoffHostAdapter implements HomeReturnContextApplier {
  constructor(private readonly page: HomePresentationHandoffPageBindings) {}

  setFilter(filter: HomeReturnContext["activeFilter"]): void {
    this.page.setFilter(filter);
  }

  setSelectedPromptTypes(types: string[]): void {
    this.page.setSelectedPromptTypes(types);
  }

  applyPersonalReturnContext(context: {
    personalCategoryFilterMode?: HomeReturnContext["personalCategoryFilterMode"];
    selectedPersonalCategories?: string[];
  }): void {
    this.page.applyPersonalReturnContext(context);
  }

  applyGroupReturnContext(context: {
    groupFilterMode?: HomeReturnContext["groupFilterMode"];
    selectedGroupId?: string | null;
  }): void {
    this.page.applyGroupReturnContext(context);
  }

  onReturnContextApplied(): void {
    this.page.refreshHomeCatalog();
  }
}
