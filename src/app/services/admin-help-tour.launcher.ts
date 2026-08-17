import { Injectable } from '@angular/core';
import {
  ADMIN_HELP_TOUR_IDS,
  isAdminHelpTourId,
  type AdminHelpTourId,
} from '../lib/admin-help-sections';
import {
  AdminHelpDriverTourService,
} from './admin-help-driver-tour.service';

export type AdminHelpTourSettingsTab = 'email' | 'content' | 'tools';

export interface AdminHelpTourHost {
  closeHelp(): void;
  openSettingsTab(tab: AdminHelpTourSettingsTab): void;
  markForCheck(): void;
  getEmailSettings(): AdminHelpTourEmailSettings | undefined;
  getPrayerSearch(): AdminHelpTourPrayerSearch | undefined;
  getPromptManager(): AdminHelpTourPrepare | undefined;
  getPrayerTypesManager(): AdminHelpTourPrepare | undefined;
  getMemorizeRecommendations(): AdminHelpTourMemorizeRecommendations | undefined;
}

export interface AdminHelpTourEmailSettings {
  prepareEmailSubscribersTour(): void;
  prepareEmailSubscribersOverviewTour(): void | Promise<void>;
  openAddSubscriberFormForTour(): void;
  showPlanningCenterTabForTour(): void;
  runPlanningCenterSearchTourDemo(): void | Promise<void>;
  selectTourPlanningCenterMatchFromDemoResults(): void;
  applyTourDemoPlanningCenterAdd(): void;
  clearEmailSubscribersTourDemoForm(): void;
}

export interface AdminHelpTourPrayerSearch {
  preparePrayerEditorTourInitialState(): void;
  openCreatePrayerFormForTour(): void;
  preparePrayerEditorManageTourInitialState(): Promise<boolean>;
  openEditFormForTour(): void;
  cancelEditForTour(): void;
  openAddUpdateFormForTour(): void;
  cancelAddUpdateForTour(): void;
  resetPrayerEditorManageTourUi(): void;
}

export interface AdminHelpTourPrepare {
  prepareTourInitialState(): Promise<unknown>;
}

export interface AdminHelpTourMemorizeRecommendations {
  prepareTourInitialState(): Promise<boolean>;
}

const SETTINGS_TAB_BY_TOUR: Record<AdminHelpTourId, AdminHelpTourSettingsTab> = {
  [ADMIN_HELP_TOUR_IDS.emailSubscribersOverview]: 'email',
  [ADMIN_HELP_TOUR_IDS.emailSubscribers]: 'email',
  [ADMIN_HELP_TOUR_IDS.prayerEditorCreate]: 'tools',
  [ADMIN_HELP_TOUR_IDS.prayerEditorManage]: 'tools',
  [ADMIN_HELP_TOUR_IDS.promptsAndTypes]: 'content',
  [ADMIN_HELP_TOUR_IDS.memorizeRecommendations]: 'content',
};

/** Outer delay after switching Settings tabs so the target section can render. */
const OUTER_DELAY_MS_BY_TOUR: Record<AdminHelpTourId, number> = {
  [ADMIN_HELP_TOUR_IDS.emailSubscribersOverview]: 150,
  [ADMIN_HELP_TOUR_IDS.emailSubscribers]: 150,
  [ADMIN_HELP_TOUR_IDS.prayerEditorCreate]: 200,
  [ADMIN_HELP_TOUR_IDS.prayerEditorManage]: 200,
  [ADMIN_HELP_TOUR_IDS.promptsAndTypes]: 200,
  [ADMIN_HELP_TOUR_IDS.memorizeRecommendations]: 200,
};

@Injectable({ providedIn: 'root' })
export class AdminHelpTourLauncher {
  constructor(private readonly adminHelpDriverTour: AdminHelpDriverTourService) {}

  startSectionTour(sectionId: string, host: AdminHelpTourHost): void {
    if (!isAdminHelpTourId(sectionId)) {
      return;
    }
    host.closeHelp();
    host.openSettingsTab(SETTINGS_TAB_BY_TOUR[sectionId]);
    host.markForCheck();
    window.setTimeout(() => {
      void this.dispatch(sectionId, host);
    }, OUTER_DELAY_MS_BY_TOUR[sectionId]);
  }

  private async dispatch(sectionId: AdminHelpTourId, host: AdminHelpTourHost): Promise<void> {
    switch (sectionId) {
      case ADMIN_HELP_TOUR_IDS.emailSubscribersOverview:
        await this.startEmailSubscribersOverview(host);
        return;
      case ADMIN_HELP_TOUR_IDS.emailSubscribers:
        this.startEmailSubscribers(host);
        return;
      case ADMIN_HELP_TOUR_IDS.prayerEditorCreate:
        this.startPrayerEditorCreate(host);
        return;
      case ADMIN_HELP_TOUR_IDS.prayerEditorManage:
        await this.startPrayerEditorManage(host);
        return;
      case ADMIN_HELP_TOUR_IDS.promptsAndTypes:
        await this.startPromptsAndTypes(host);
        return;
      case ADMIN_HELP_TOUR_IDS.memorizeRecommendations:
        await this.startMemorizeRecommendations(host);
        return;
      default: {
        const _exhaustive: never = sectionId;
        return _exhaustive;
      }
    }
  }

  private async startEmailSubscribersOverview(host: AdminHelpTourHost): Promise<void> {
    await Promise.resolve(host.getEmailSettings()?.prepareEmailSubscribersOverviewTour());
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 100);
    });
    this.adminHelpDriverTour.startEmailSubscribersOverviewTour();
    host.markForCheck();
  }

  private startEmailSubscribers(host: AdminHelpTourHost): void {
    const email = host.getEmailSettings();
    email?.prepareEmailSubscribersTour();
    this.adminHelpDriverTour.startEmailSubscribersTour({
      openAddForm: () => email?.openAddSubscriberFormForTour(),
      showPcSearchTab: () => email?.showPlanningCenterTabForTour(),
      runPlanningCenterSearchTourDemo: () =>
        email?.runPlanningCenterSearchTourDemo() ?? Promise.resolve(),
      selectTourPlanningCenterMatchFromDemoResults: () =>
        email?.selectTourPlanningCenterMatchFromDemoResults(),
      applyTourDemoPlanningCenterAdd: () => email?.applyTourDemoPlanningCenterAdd(),
      clearEmailSubscribersTourDemoForm: () => email?.clearEmailSubscribersTourDemoForm(),
    });
  }

  private startPrayerEditorCreate(host: AdminHelpTourHost): void {
    const search = host.getPrayerSearch();
    search?.preparePrayerEditorTourInitialState();
    this.adminHelpDriverTour.startPrayerEditorCreateTour({
      openCreatePrayerForm: () => search?.openCreatePrayerFormForTour(),
    });
  }

  private async startPrayerEditorManage(host: AdminHelpTourHost): Promise<void> {
    const search = host.getPrayerSearch();
    const hasPrayers = (await search?.preparePrayerEditorManageTourInitialState()) ?? false;
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0);
    });
    this.adminHelpDriverTour.startPrayerEditorManageTour(hasPrayers, {
      openEditFormForTour: () => search?.openEditFormForTour(),
      cancelEditForTour: () => search?.cancelEditForTour(),
      openAddUpdateFormForTour: () => search?.openAddUpdateFormForTour(),
      cancelAddUpdateForTour: () => search?.cancelAddUpdateForTour(),
      resetTourUiState: () => search?.resetPrayerEditorManageTourUi(),
    });
    host.markForCheck();
  }

  private async startPromptsAndTypes(host: AdminHelpTourHost): Promise<void> {
    await host.getPromptManager()?.prepareTourInitialState();
    await host.getPrayerTypesManager()?.prepareTourInitialState();
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 150);
    });
    this.adminHelpDriverTour.startPrayerPromptsAndTypesTour();
    host.markForCheck();
  }

  private async startMemorizeRecommendations(host: AdminHelpTourHost): Promise<void> {
    const hasCategories =
      (await host.getMemorizeRecommendations()?.prepareTourInitialState()) ?? false;
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 150);
    });
    this.adminHelpDriverTour.startMemorizeRecommendationsTour(hasCategories);
    host.markForCheck();
  }
}
