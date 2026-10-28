import type { Router } from "@angular/router";
import type { Observable } from "rxjs";
import { firstValueFrom, take } from "rxjs";
import type { PrayerRequest } from "./prayer.service";
import type { UserSessionService } from "./user-session.service";
import type { PrayerCardActionsFacade } from "./prayer-card-actions.facade";
import type { PersonalCategoryFilterMode } from "../types/presentation";
import {
  PERSONAL_PRAYER_WALKTHROUGH_CATEGORY,
  PERSONAL_PRAYER_WALKTHROUGH_DESCRIPTION,
  PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR,
  PRESENTATION_HELP_TOUR_SESSION_KEY,
} from "./help-driver-tour.service";
import type { HomeActiveFilter } from "./home-deep-link-host.adapter";
import {
  groupsWalkthroughCleanupIds,
  type GroupsWalkthroughCleanupGroup,
} from "../lib/groups-walkthrough-cleanup";
import type { GroupsHelpTourPanel } from "../lib/help-tour-hooks";

export interface HomeHelpTourHostBindings {
  getActiveFilter(): HomeActiveFilter;
  getPromptsCount(): number;
  getMemorizedItemsCount(): number;
  getSelectedPromptTypes(): string[];
  setSelectedPromptTypes(types: string[]): void;
  getPersonalCategoryFilterMode(): PersonalCategoryFilterMode;
  setPersonalCategoryFilterMode(mode: PersonalCategoryFilterMode): void;
  getSelectedPersonalCategories(): string[];
  setSelectedPersonalCategories(categories: string[]): void;
  closeHelp(): void;
  openPrayerForm(): void;
  closePrayerForm(): void;
  closeWalkthroughPersonalEdit(): void;
}

export interface HomeHelpTourPrayerFormHooks {
  fillWalkthroughPrayerFor(): void;
  fillWalkthroughDescription(): void;
  ensureWalkthroughPersonalSelected(): void;
  fillWalkthroughCategory(): void;
  fillWalkthroughGroupPrayer(): void;
  submitWalkthroughPrayerForm(): void;
}

export interface HomeHelpTourHost {
  closeHelp(): void;
  markForCheck(): void;
  getActiveFilter(): HomeActiveFilter;
  setFilter(filter: HomeActiveFilter): void;
  getPromptsCount(): number;
  getMemorizedItemsCount(): number;
  clearSelectedPromptTypes(): void;
  openPrayerForm(): void;
  closePrayerForm(): void;
  openUserSettings(): void;
  closeUserSettings(): void;
  openSearchPanel(): void;
  getPrayerFormHooks(): HomeHelpTourPrayerFormHooks | null;
  getWalkthroughPersonalPrayer(): PrayerRequest | undefined;
  openWalkthroughPersonalEdit(prayer: PrayerRequest): void;
  closeWalkthroughPersonalEdit(): void;
  clickWalkthroughAddUpdate(): void;
  narrowToWalkthroughCategoryFilter(): void;
  deleteWalkthroughTestPrayer(): void;
  isPrayerGroupsEnabled(): boolean;
  isChurchMember(): boolean;
  getGroupCount(): number;
  getGroupsPanelHooks(): GroupsHelpTourPanel | null;
  openNewGroupPrayer(groupId: string): void;
  deleteWalkthroughSampleGroups(): Promise<void>;
  findWalkthroughGroupId(): Promise<string | null>;
  getCurrentPrayers(): Promise<PrayerRequest[]>;
  hasSessionEmail(): boolean;
  navigateToPresentation(): void;
  stashPresentationTourSession(json: string): void;
}

export interface HomeHelpTourHostDependencies {
  bindings: HomeHelpTourHostBindings;
  router: Router;
  userSessionService: UserSessionService;
  prayers$: Observable<PrayerRequest[]>;
  prayerCardActions: PrayerCardActionsFacade;
  markForCheck: () => void;
  setFilter: (filter: HomeActiveFilter) => void;
  openUserSettings: () => void;
  closeUserSettings: () => void;
  openSearchPanel: () => void;
  openEditModal: (prayer: PrayerRequest) => void;
  getFilteredPersonalPrayers: () => PrayerRequest[];
  getPrayerFormHooks: () => HomeHelpTourPrayerFormHooks | null;
  refreshHomeCatalog: () => void;
  prayerGroupService: {
    getGroupsSnapshot(): readonly GroupsWalkthroughCleanupGroup[];
    deleteGroup(groupId: string): Promise<void>;
    refreshCatalogAfterWrite(): Promise<void>;
  };
  getGroupsPanel: () => GroupsHelpTourPanel | null;
  openNewGroupPrayer: (groupId: string) => void;
}

export class HomeHelpTourHostAdapter implements HomeHelpTourHost {
  private walkthroughCleanup: Promise<void> | null = null;

  constructor(private readonly deps: HomeHelpTourHostDependencies) {}

  closeHelp(): void {
    this.deps.bindings.closeHelp();
  }

  markForCheck(): void {
    this.deps.markForCheck();
  }

  getActiveFilter(): HomeActiveFilter {
    return this.deps.bindings.getActiveFilter();
  }

  setFilter(filter: HomeActiveFilter): void {
    this.deps.setFilter(filter);
  }

  getPromptsCount(): number {
    return this.deps.bindings.getPromptsCount();
  }

  getMemorizedItemsCount(): number {
    return this.deps.bindings.getMemorizedItemsCount();
  }

  clearSelectedPromptTypes(): void {
    this.deps.bindings.setSelectedPromptTypes([]);
    this.deps.refreshHomeCatalog();
  }

  openPrayerForm(): void {
    this.deps.bindings.openPrayerForm();
  }

  closePrayerForm(): void {
    this.deps.bindings.closePrayerForm();
  }

  openUserSettings(): void {
    this.deps.openUserSettings();
  }

  closeUserSettings(): void {
    this.deps.closeUserSettings();
  }

  openSearchPanel(): void {
    this.deps.openSearchPanel();
  }

  getPrayerFormHooks(): HomeHelpTourPrayerFormHooks | null {
    return this.deps.getPrayerFormHooks();
  }

  getWalkthroughPersonalPrayer(): PrayerRequest | undefined {
    return this.deps.getFilteredPersonalPrayers().find(
      (p) =>
        p.prayer_for === PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR &&
        p.description === PERSONAL_PRAYER_WALKTHROUGH_DESCRIPTION
    );
  }

  openWalkthroughPersonalEdit(prayer: PrayerRequest): void {
    this.deps.openEditModal(prayer);
  }

  closeWalkthroughPersonalEdit(): void {
    this.deps.bindings.closeWalkthroughPersonalEdit();
  }

  clickWalkthroughAddUpdate(): void {
    document.getElementById("tour-walkthrough-add-update")?.click();
  }

  narrowToWalkthroughCategoryFilter(): void {
    this.deps.bindings.setPersonalCategoryFilterMode("named");
    this.deps.bindings.setSelectedPersonalCategories([
      PERSONAL_PRAYER_WALKTHROUGH_CATEGORY,
    ]);
    this.deps.refreshHomeCatalog();
  }

  deleteWalkthroughTestPrayer(): void {
    const prayer = this.getWalkthroughPersonalPrayer();
    if (prayer) {
      void this.deps.prayerCardActions.deleteCard(prayer);
    }
  }

  isPrayerGroupsEnabled(): boolean {
    return this.deps.userSessionService.getCurrentSession()?.prayerGroupsEnabled === true;
  }

  isChurchMember(): boolean {
    return this.deps.userSessionService.getCurrentSession()?.isChurchMember !== false;
  }

  getGroupCount(): number {
    return this.deps.prayerGroupService.getGroupsSnapshot().length;
  }

  getGroupsPanelHooks(): GroupsHelpTourPanel | null {
    return this.deps.getGroupsPanel();
  }

  openNewGroupPrayer(groupId: string): void {
    this.deps.openNewGroupPrayer(groupId);
  }

  deleteWalkthroughSampleGroups(): Promise<void> {
    if (this.walkthroughCleanup) {
      return this.walkthroughCleanup;
    }
    const run = this.performWalkthroughCleanup().finally(() => {
      if (this.walkthroughCleanup === run) {
        this.walkthroughCleanup = null;
      }
    });
    this.walkthroughCleanup = run;
    return run;
  }

  async findWalkthroughGroupId(): Promise<string | null> {
    return (await this.refreshedWalkthroughGroupIds())[0] ?? null;
  }

  // createGroup does not wait for the catalog reload, so re-read before deciding
  // which rows are the sample group.
  private async refreshedWalkthroughGroupIds(): Promise<string[]> {
    try {
      await this.deps.prayerGroupService.refreshCatalogAfterWrite();
    } catch {
      // Keep scanning the snapshot already in memory.
    }
    return groupsWalkthroughCleanupIds(this.deps.prayerGroupService.getGroupsSnapshot());
  }

  private async performWalkthroughCleanup(): Promise<void> {
    const ids = await this.refreshedWalkthroughGroupIds();
    for (const id of ids) {
      try {
        await this.deps.prayerGroupService.deleteGroup(id);
      } catch {
        // A repeat, or a row that is already gone, ends in the same state.
      }
    }
  }

  async getCurrentPrayers(): Promise<PrayerRequest[]> {
    try {
      return await firstValueFrom(this.deps.prayers$.pipe(take(1)));
    } catch {
      return [];
    }
  }

  hasSessionEmail(): boolean {
    return !!this.deps.userSessionService.getCurrentSession()?.email?.trim();
  }

  navigateToPresentation(): void {
    void this.deps.router.navigate(["/presentation"]);
  }

  stashPresentationTourSession(json: string): void {
    try {
      sessionStorage.setItem(PRESENTATION_HELP_TOUR_SESSION_KEY, json);
    } catch {
      /* ignore quota / private mode */
    }
  }
}
