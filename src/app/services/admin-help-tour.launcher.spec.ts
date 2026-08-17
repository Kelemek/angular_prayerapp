import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ADMIN_HELP_TOUR_IDS } from '../lib/admin-help-sections';
import { AdminHelpTourLauncher, type AdminHelpTourHost } from './admin-help-tour.launcher';
import type { AdminHelpDriverTourService } from './admin-help-driver-tour.service';

describe('AdminHelpTourLauncher', () => {
  let driverTour: {
    startEmailSubscribersTour: ReturnType<typeof vi.fn>;
    startEmailSubscribersOverviewTour: ReturnType<typeof vi.fn>;
    startPrayerEditorCreateTour: ReturnType<typeof vi.fn>;
    startPrayerEditorManageTour: ReturnType<typeof vi.fn>;
    startPrayerPromptsAndTypesTour: ReturnType<typeof vi.fn>;
    startMemorizeRecommendationsTour: ReturnType<typeof vi.fn>;
  };
  let launcher: AdminHelpTourLauncher;
  let host: AdminHelpTourHost;
  let emailSettings: {
    prepareEmailSubscribersTour: ReturnType<typeof vi.fn>;
    prepareEmailSubscribersOverviewTour: ReturnType<typeof vi.fn>;
    openAddSubscriberFormForTour: ReturnType<typeof vi.fn>;
    showPlanningCenterTabForTour: ReturnType<typeof vi.fn>;
    runPlanningCenterSearchTourDemo: ReturnType<typeof vi.fn>;
    selectTourPlanningCenterMatchFromDemoResults: ReturnType<typeof vi.fn>;
    applyTourDemoPlanningCenterAdd: ReturnType<typeof vi.fn>;
    clearEmailSubscribersTourDemoForm: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    driverTour = {
      startEmailSubscribersTour: vi.fn(),
      startEmailSubscribersOverviewTour: vi.fn(),
      startPrayerEditorCreateTour: vi.fn(),
      startPrayerEditorManageTour: vi.fn(),
      startPrayerPromptsAndTypesTour: vi.fn(),
      startMemorizeRecommendationsTour: vi.fn(),
    };
    launcher = new AdminHelpTourLauncher(driverTour as unknown as AdminHelpDriverTourService);
    emailSettings = {
      prepareEmailSubscribersTour: vi.fn(),
      prepareEmailSubscribersOverviewTour: vi.fn().mockResolvedValue(undefined),
      openAddSubscriberFormForTour: vi.fn(),
      showPlanningCenterTabForTour: vi.fn(),
      runPlanningCenterSearchTourDemo: vi.fn().mockResolvedValue(undefined),
      selectTourPlanningCenterMatchFromDemoResults: vi.fn(),
      applyTourDemoPlanningCenterAdd: vi.fn(),
      clearEmailSubscribersTourDemoForm: vi.fn(),
    };
    host = {
      closeHelp: vi.fn(),
      openSettingsTab: vi.fn(),
      markForCheck: vi.fn(),
      getEmailSettings: () => emailSettings,
      getPrayerSearch: () => undefined,
      getPromptManager: () => undefined,
      getPrayerTypesManager: () => undefined,
      getMemorizeRecommendations: () => undefined,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores unknown section ids', () => {
    launcher.startSectionTour('not_a_tour', host);
    expect(host.closeHelp).not.toHaveBeenCalled();
  });

  it('starts the email subscribers overview tour after prepare', async () => {
    launcher.startSectionTour(ADMIN_HELP_TOUR_IDS.emailSubscribersOverview, host);
    expect(host.closeHelp).toHaveBeenCalled();
    expect(host.openSettingsTab).toHaveBeenCalledWith('email');
    await vi.runAllTimersAsync();
    expect(emailSettings.prepareEmailSubscribersOverviewTour).toHaveBeenCalled();
    expect(driverTour.startEmailSubscribersOverviewTour).toHaveBeenCalled();
  });

  it('starts the email subscribers add-form tour even when email settings is missing', async () => {
    host.getEmailSettings = () => undefined;
    launcher.startSectionTour(ADMIN_HELP_TOUR_IDS.emailSubscribers, host);
    await vi.runAllTimersAsync();
    expect(driverTour.startEmailSubscribersTour).toHaveBeenCalled();
  });

  it('prepares prayer editor create tour on the tools tab', async () => {
    const prayerSearch = {
      preparePrayerEditorTourInitialState: vi.fn(),
      openCreatePrayerFormForTour: vi.fn(),
      preparePrayerEditorManageTourInitialState: vi.fn(),
      openEditFormForTour: vi.fn(),
      cancelEditForTour: vi.fn(),
      openAddUpdateFormForTour: vi.fn(),
      cancelAddUpdateForTour: vi.fn(),
      resetPrayerEditorManageTourUi: vi.fn(),
    };
    host.getPrayerSearch = () => prayerSearch;
    launcher.startSectionTour(ADMIN_HELP_TOUR_IDS.prayerEditorCreate, host);
    expect(host.openSettingsTab).toHaveBeenCalledWith('tools');
    await vi.runAllTimersAsync();
    expect(prayerSearch.preparePrayerEditorTourInitialState).toHaveBeenCalled();
    expect(driverTour.startPrayerEditorCreateTour).toHaveBeenCalled();
  });

  it('prepares prompts and types then starts that tour', async () => {
    const promptManager = { prepareTourInitialState: vi.fn().mockResolvedValue(undefined) };
    const prayerTypesManager = { prepareTourInitialState: vi.fn().mockResolvedValue(undefined) };
    host.getPromptManager = () => promptManager;
    host.getPrayerTypesManager = () => prayerTypesManager;
    launcher.startSectionTour(ADMIN_HELP_TOUR_IDS.promptsAndTypes, host);
    expect(host.openSettingsTab).toHaveBeenCalledWith('content');
    await vi.runAllTimersAsync();
    expect(promptManager.prepareTourInitialState).toHaveBeenCalled();
    expect(prayerTypesManager.prepareTourInitialState).toHaveBeenCalled();
    expect(driverTour.startPrayerPromptsAndTypesTour).toHaveBeenCalled();
  });

  it('prepares prayer editor manage tour then starts it with hasPrayers', async () => {
    const prayerSearch = {
      preparePrayerEditorTourInitialState: vi.fn(),
      openCreatePrayerFormForTour: vi.fn(),
      preparePrayerEditorManageTourInitialState: vi.fn().mockResolvedValue(true),
      openEditFormForTour: vi.fn(),
      cancelEditForTour: vi.fn(),
      openAddUpdateFormForTour: vi.fn(),
      cancelAddUpdateForTour: vi.fn(),
      resetPrayerEditorManageTourUi: vi.fn(),
    };
    host.getPrayerSearch = () => prayerSearch;
    launcher.startSectionTour(ADMIN_HELP_TOUR_IDS.prayerEditorManage, host);
    expect(host.openSettingsTab).toHaveBeenCalledWith('tools');
    await vi.runAllTimersAsync();
    expect(prayerSearch.preparePrayerEditorManageTourInitialState).toHaveBeenCalled();
    expect(driverTour.startPrayerEditorManageTour).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        openEditFormForTour: expect.any(Function),
        cancelEditForTour: expect.any(Function),
      }),
    );
  });

  it('starts memorize recommendations with whether categories exist', async () => {
    const memorize = { prepareTourInitialState: vi.fn().mockResolvedValue(true) };
    host.getMemorizeRecommendations = () => memorize;
    launcher.startSectionTour(ADMIN_HELP_TOUR_IDS.memorizeRecommendations, host);
    await vi.runAllTimersAsync();
    expect(memorize.prepareTourInitialState).toHaveBeenCalled();
    expect(driverTour.startMemorizeRecommendationsTour).toHaveBeenCalledWith(true);
  });
});
