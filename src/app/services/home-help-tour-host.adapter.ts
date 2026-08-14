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
  getPrayerFormHooks(): HomeHelpTourPrayerFormHooks | null;
  getWalkthroughPersonalPrayer(): PrayerRequest | undefined;
  openWalkthroughPersonalEdit(prayer: PrayerRequest): void;
  closeWalkthroughPersonalEdit(): void;
  clickWalkthroughAddUpdate(): void;
  narrowToWalkthroughCategoryFilter(): void;
  deleteWalkthroughTestPrayer(): void;
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
  openEditModal: (prayer: PrayerRequest) => void;
  getFilteredPersonalPrayers: () => PrayerRequest[];
  getPrayerFormHooks: () => HomeHelpTourPrayerFormHooks | null;
  refreshHomeCatalog: () => void;
}

export class HomeHelpTourHostAdapter implements HomeHelpTourHost {
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
