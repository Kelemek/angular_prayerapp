import type { Observable } from "rxjs";
import type { PrayerRequest, PrayerUpdate } from "../services/prayer.service";
import type { PrayerCardActionsFacade } from "../services/prayer-card-actions.facade";
import type { HomePrayerCardActionsController } from "../services/home-prayer-card-actions.controller";
import type { HomeModalController } from "../services/home-modal.controller";
import type { HomeFilterCoordinator } from "../services/home-filter.coordinator";
import type { HomePersonalCategoryController } from "../services/home-personal-category.controller";
import type { HomeMemorizationPanelController } from "../services/home-memorization-panel.controller";
import type { HomeHelpTourLauncher } from "../services/home-help-tour.launcher";
import type { HomeAdminNavigationController } from "../services/home-admin-navigation.controller";
import type { HomePresentationNavigationController } from "../services/home-presentation-navigation.controller";
import type { MemorizationRecommendationsService } from "../services/memorization-recommendations.service";
import type { HomeCatalogStore } from "../services/home-catalog.store";
import type { HomeActiveFilter } from "../services/home-deep-link-host.adapter";
import type { PersonalCategoryFilterMode } from "../types/presentation";
import type { CdkDragDrop } from "@angular/cdk/drag-drop";
import type { HomeHeaderHandlers } from "./home-header-handlers";
import type { HomeModalsHostHandlers } from "./home-modals-host-handlers";
import type { HomePrayerContentHandlers } from "./home-prayer-content-handlers";

export interface HomePageShellDeps {
  prayerCardActions: PrayerCardActionsFacade;
  memberCardActions: HomePrayerCardActionsController;
  modals: HomeModalController;
  filter: HomeFilterCoordinator;
  personalCategory: HomePersonalCategoryController;
  memorizationPanel: HomeMemorizationPanelController;
  helpTour: HomeHelpTourLauncher;
  adminNav: HomeAdminNavigationController;
  presentationNav: HomePresentationNavigationController;
  memorizationRecommendationsService: MemorizationRecommendationsService;
  planningCenterListId: () => string | null;
  catalog: HomeCatalogStore;
  getActiveFilter: () => HomeActiveFilter;
  getPersonalPrayers: () => PrayerRequest[];
}

export interface HomePageShellHandlers {
  header: HomeHeaderHandlers;
  modals: HomeModalsHostHandlers;
  prayerContent: HomePrayerContentHandlers;
}

export interface HomePersonalCategoryFilterActions {
  selectFilterMode(mode: Exclude<PersonalCategoryFilterMode, "named">): void;
  toggleCategory(category: string): void;
  onCategoryDrop(event: CdkDragDrop<string[]>): void;
  onCategoryDragStarted(): void;
  onCategoryDragEnded(): void;
  onPersonalCategoryPointerDown(event: PointerEvent, category: string): void;
  onPersonalCategoryPointerMove(event: PointerEvent): void;
  onPersonalCategoryPointerUp(event?: PointerEvent): void;
  onPersonalCategoryContextMenu(event: MouseEvent, category: string): void;
}

export interface HomePageShell {
  handlers: HomePageShellHandlers;
  header: {
    readonly showSearchPanel: boolean;
    readonly presentationHandoffQueryParams: Record<string, string> | null;
    getUserEmailFallback(): string;
  };
  modals: {
    readonly activeFilter: HomeActiveFilter;
    readonly showPrayerForm: boolean;
    readonly showSettings: boolean;
    readonly settingsScrollToSectionId: string | null;
    readonly showHelp: boolean;
    readonly showLogoutConfirmation: boolean;
    readonly showEditPersonalPrayer: boolean;
    readonly editingPrayer: PrayerRequest | null;
    readonly showRenamePersonalCategory: boolean;
    readonly renamingPersonalCategory: string | null;
    readonly personalCategoryRenameDeferInputFocus: boolean;
    readonly isRenamingPersonalCategory: boolean;
    readonly showEditPersonalUpdate: boolean;
    readonly editingUpdate: PrayerUpdate | null;
    readonly editingUpdatePrayerId: string;
    readonly showEditMemberUpdate: boolean;
    readonly editingMemberUpdate: PrayerUpdate | null;
    readonly editingMemberUpdatePrayerId: string;
    readonly planningCenterListId: string | null;
    readonly showAddMemorizedVerse: boolean;
    readonly showAddMemorizedBibleBooks: boolean;
    readonly showMemorizationRecommendations: boolean;
    readonly memorizationRecommendationGroups: HomeMemorizationPanelController["memorizationRecommendationGroups"];
    readonly memorizationRecommendationOwnedKeys: Set<string>;
    readonly addingRecommendationId: string | null;
    readonly memorizationRecommendationsLoading$: Observable<boolean>;
    readonly practiceMemorizedItem: HomeMemorizationPanelController["practiceMemorizedItem"];
    readonly showRemoveMemorizedConfirm: boolean;
    readonly memorizedItemToRemove: HomeMemorizationPanelController["memorizedItemToRemove"];
  };
  personalCategory: {
    readonly filterMode: PersonalCategoryFilterMode;
    readonly personalCategoryActiveClass: string;
    readonly uniqueCategories: string[];
    readonly isCategoryDropListDisabled: boolean;
    readonly canReorderPersonalPrayers: boolean;
    personalCurrentCount(): number;
    personalAnsweredCount(): number;
    isCategorySwapping(category: string): boolean;
    isPersonalCategorySelected(category: string): boolean;
    getCategoryCount(category: string): number;
    readonly actions: HomePersonalCategoryFilterActions;
  };
  readonly getPromptCountByType: (type: string) => number;
  readonly getUnreadPromptCountByType: (type: string) => number;
}

export function createHomePageShell(deps: HomePageShellDeps): HomePageShell {
  const handlers = createHomePageShellHandlers(deps);

  const header = {
    get showSearchPanel() {
      return deps.modals.showSearchPanel;
    },
    get presentationHandoffQueryParams() {
      return deps.presentationNav.presentationHandoffQueryParams;
    },
    getUserEmailFallback: () => deps.adminNav.getUserEmail(),
  };

  const modals = {
    get activeFilter() {
      return deps.getActiveFilter();
    },
    get showPrayerForm() {
      return deps.modals.showPrayerForm;
    },
    get showSettings() {
      return deps.modals.showSettings;
    },
    get settingsScrollToSectionId() {
      return deps.modals.settingsScrollToSectionId;
    },
    get showHelp() {
      return deps.modals.showHelp;
    },
    get showLogoutConfirmation() {
      return deps.modals.showLogoutConfirmation;
    },
    get showEditPersonalPrayer() {
      return deps.modals.showEditPersonalPrayer;
    },
    get editingPrayer() {
      return deps.modals.editingPrayer;
    },
    get showRenamePersonalCategory() {
      return deps.personalCategory.showRenamePersonalCategory;
    },
    get renamingPersonalCategory() {
      return deps.personalCategory.renamingPersonalCategory;
    },
    get personalCategoryRenameDeferInputFocus() {
      return deps.personalCategory.personalCategoryRenameDeferInputFocus;
    },
    get isRenamingPersonalCategory() {
      return deps.personalCategory.isRenamingPersonalCategory;
    },
    get showEditPersonalUpdate() {
      return deps.modals.showEditPersonalUpdate;
    },
    get editingUpdate() {
      return deps.modals.editingUpdate;
    },
    get editingUpdatePrayerId() {
      return deps.modals.editingUpdatePrayerId;
    },
    get showEditMemberUpdate() {
      return deps.modals.showEditMemberUpdate;
    },
    get editingMemberUpdate() {
      return deps.modals.editingMemberUpdate;
    },
    get editingMemberUpdatePrayerId() {
      return deps.modals.editingMemberUpdatePrayerId;
    },
    get planningCenterListId() {
      return deps.planningCenterListId();
    },
    get showAddMemorizedVerse() {
      return deps.memorizationPanel.showAddMemorizedVerse;
    },
    get showAddMemorizedBibleBooks() {
      return deps.memorizationPanel.showAddMemorizedBibleBooks;
    },
    get showMemorizationRecommendations() {
      return deps.memorizationPanel.showMemorizationRecommendations;
    },
    get memorizationRecommendationGroups() {
      return deps.memorizationPanel.memorizationRecommendationGroups;
    },
    get memorizationRecommendationOwnedKeys() {
      return deps.memorizationPanel.memorizationRecommendationOwnedKeys;
    },
    get addingRecommendationId() {
      return deps.memorizationPanel.addingRecommendationId;
    },
    get memorizationRecommendationsLoading$() {
      return deps.memorizationRecommendationsService.loading$;
    },
    get practiceMemorizedItem() {
      return deps.memorizationPanel.practiceMemorizedItem;
    },
    get showRemoveMemorizedConfirm() {
      return deps.memorizationPanel.showRemoveMemorizedConfirm;
    },
    get memorizedItemToRemove() {
      return deps.memorizationPanel.memorizedItemToRemove;
    },
  };

  const personalCategory = {
    get filterMode() {
      return deps.personalCategory.personalCategoryFilterMode;
    },
    get personalCategoryActiveClass() {
      return deps.personalCategory.personalCategoryActiveClass;
    },
    get uniqueCategories() {
      return deps.personalCategory.uniquePersonalCategories;
    },
    get isCategoryDropListDisabled() {
      return deps.personalCategory.isCategoryDropListDisabled;
    },
    get canReorderPersonalPrayers() {
      return deps.personalCategory.canReorderPersonalPrayers;
    },
    personalCurrentCount: () =>
      deps.personalCategory.personalCurrentPrayersCount(deps.getPersonalPrayers()),
    personalAnsweredCount: () =>
      deps.personalCategory.personalAnsweredPrayersCount(deps.getPersonalPrayers()),
    isCategorySwapping: (category: string) =>
      deps.personalCategory.isCategorySwapping(category),
    isPersonalCategorySelected: (category: string) =>
      deps.personalCategory.isPersonalCategorySelected(category),
    getCategoryCount: (category: string) =>
      deps.catalog.personalCategoryCount(category),
    actions: {
      selectFilterMode: (
        mode: Exclude<PersonalCategoryFilterMode, "named">
      ) => deps.personalCategory.selectPersonalCategoryFilterMode(mode),
      toggleCategory: (category: string) =>
        deps.personalCategory.togglePersonalCategory(category),
      onCategoryDrop: (event: CdkDragDrop<string[]>) =>
        deps.personalCategory.onCategoryDrop(event),
      onCategoryDragStarted: () =>
        deps.personalCategory.onCategoryDragStarted(),
      onCategoryDragEnded: () => deps.personalCategory.onCategoryDragEnded(),
      onPersonalCategoryPointerDown: (event: PointerEvent, category: string) =>
        deps.personalCategory.onPersonalCategoryPointerDown(event, category),
      onPersonalCategoryPointerMove: (event: PointerEvent) =>
        deps.personalCategory.onPersonalCategoryPointerMove(event),
      onPersonalCategoryPointerUp: (event?: PointerEvent) =>
        deps.personalCategory.onPersonalCategoryPointerUp(event),
      onPersonalCategoryContextMenu: (event: MouseEvent, category: string) =>
        deps.personalCategory.onPersonalCategoryContextMenu(event, category),
    },
  };

  return {
    handlers,
    header,
    modals,
    personalCategory,
    getPromptCountByType: (type) => deps.filter.getPromptCountByType(type),
    getUnreadPromptCountByType: (type) =>
      deps.filter.getUnreadPromptCountByType(type),
  };
}

export function createHomePageShellHandlers(
  deps: HomePageShellDeps
): HomePageShellHandlers {
  return {
    header: {
      openLogoutConfirmation: () => {
        deps.modals.showLogoutConfirmation = true;
      },
      openHelp: () => {
        deps.modals.showHelp = true;
      },
      toggleSearchPanel: () => deps.modals.toggleSearchPanel(),
      openUserSettings: () => deps.modals.openUserSettings(),
      openPrayerForm: () => {
        deps.modals.showPrayerForm = true;
      },
      navigateToAdmin: () => deps.adminNav.navigateToAdmin(),
      onPresentationLinkClick: (event) =>
        deps.presentationNav.onPresentationLinkClick(event),
    },
    modals: {
      onPrayerFormClose: () => deps.modals.onPrayerFormClose(),
      closeUserSettings: () => deps.modals.closeUserSettings(),
      onSettingsScrollToSectionComplete: () =>
        deps.modals.onSettingsScrollToSectionComplete(),
      closeHelp: () => {
        deps.modals.showHelp = false;
      },
      startHelpSectionTour: (section) => deps.helpTour.startSectionTour(section),
      startFullGuidedTour: (sections) =>
        deps.helpTour.startFullGuidedTour(sections),
      handleLogout: () => void deps.modals.handleLogout(),
      cancelLogout: () => {
        deps.modals.showLogoutConfirmation = false;
      },
      closeEditPersonalPrayer: () => {
        deps.modals.showEditPersonalPrayer = false;
      },
      onPersonalPrayerSaved: () => deps.modals.onPersonalPrayerSaved(),
      closeRenamePersonalCategory: () =>
        deps.personalCategory.closeRenamePersonalCategoryModal(),
      saveRenamedPersonalCategory: (name) =>
        void deps.personalCategory.saveRenamedPersonalCategory(name),
      closeEditPersonalUpdate: () => {
        deps.modals.showEditPersonalUpdate = false;
      },
      onPersonalUpdateSaved: () => deps.modals.onPersonalUpdateSaved(),
      closeEditMemberUpdate: () => {
        deps.modals.showEditMemberUpdate = false;
      },
      onMemberUpdateSaved: () => deps.modals.onMemberUpdateSaved(),
      closeAddMemorizedVerse: () => {
        deps.memorizationPanel.showAddMemorizedVerse = false;
      },
      onMemorizedVerseAdded: () =>
        deps.memorizationPanel.onMemorizedVerseAdded(),
      closeAddMemorizedBibleBooks: () => {
        deps.memorizationPanel.showAddMemorizedBibleBooks = false;
      },
      closeMemorizationRecommendations: () => {
        deps.memorizationPanel.showMemorizationRecommendations = false;
      },
      addRecommendedVerse: (rec) =>
        void deps.memorizationPanel.addRecommendedVerse(rec),
      closeMemorizationPractice: () =>
        deps.memorizationPanel.closeMemorizationPractice(),
      onMemorizationPracticeComplete: (result) =>
        void deps.memorizationPanel.onMemorizationPracticeComplete(result),
      onMemorizationPersistInProgress: (payload) =>
        deps.memorizationPanel.onMemorizationPersistInProgress(payload),
      onMemorizationClearInProgress: () =>
        deps.memorizationPanel.onMemorizationClearInProgress(),
      openSettingsFromReciteFeedback: () =>
        deps.modals.openSettingsFromReciteFeedback(),
      confirmRemoveMemorizedItem: () =>
        void deps.memorizationPanel.removeMemorizedItemConfirmed(),
      cancelRemoveMemorizedItem: () => {
        deps.memorizationPanel.showRemoveMemorizedConfirm = false;
      },
    },
    prayerContent: {
      deleteCard: (prayer) => deps.prayerCardActions.deleteCard(prayer),
      deletePrompt: (id) => void deps.prayerCardActions.deletePrompt(id),
      onCardAddUpdate: (prayer, event) =>
        void deps.memberCardActions.onCardAddUpdate(prayer, event),
      onCardDeleteUpdate: (prayer, event) =>
        void deps.memberCardActions.onCardDeleteUpdate(prayer, event),
      requestDeletion: (request) =>
        void deps.prayerCardActions.requestDeletion(request),
      requestUpdateDeletion: (request) =>
        void deps.prayerCardActions.requestUpdateDeletion(request),
      editMemberUpdate: (event) =>
        deps.modals.openEditMemberUpdateModal(event),
      toggleMemberUpdateAnswered: (event) =>
        void deps.memberCardActions.toggleMemberUpdateAnswered(event),
      editPersonalPrayer: (prayer) => deps.modals.openEditModal(prayer),
      editPersonalUpdate: (event) => deps.modals.openEditUpdateModal(event),
      togglePromptType: (type) => deps.filter.togglePromptType(type),
      onPersonalPrayerDrop: (event) =>
        deps.personalCategory.onPersonalPrayerDrop(event),
      openMemorizationAddVerses: () => {
        deps.memorizationPanel.showAddMemorizedVerse = true;
      },
      openMemorizationBibleBooks: () => {
        deps.memorizationPanel.showAddMemorizedBibleBooks = true;
      },
      openMemorizationRecommendations: () =>
        deps.memorizationPanel.openMemorizationRecommendations(),
      openMemorizationPractice: (item) =>
        deps.memorizationPanel.openMemorizationPractice(item),
      confirmRemoveMemorizedItem: (item) =>
        deps.memorizationPanel.confirmRemoveMemorizedItem(item),
    },
  };
}
