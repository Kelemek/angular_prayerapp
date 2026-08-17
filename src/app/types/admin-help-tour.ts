export type AdminPrayerEditorCreateTourCallbacks = {
  /** Opens the Create New Prayer form (after the tour highlights the button). */
  openCreatePrayerForm: () => void;
};

/** Hooks for the Prayer Editor “manage” tour (opens edit + add-update UI, then cancels—no save). */
export type AdminPrayerEditorManageTourCallbacks = {
  openEditFormForTour: () => void;
  cancelEditForTour: () => void;
  openAddUpdateFormForTour: () => void;
  cancelAddUpdateForTour: () => void;
  /** If the user closes the tour early, exit edit / add-update so the UI is not left half-open. */
  resetTourUiState: () => void;
};

export type AdminEmailSubscribersTourCallbacks = {
  openAddForm: () => void;
  showPcSearchTab: () => void;
  /** Search Planning Center for “Mark Larson” and select a match when available (no add). May return a Promise. */
  runPlanningCenterSearchTourDemo?: () => void | Promise<void>;
  /** After results appear: select Mark (or first row) so Add Selected Subscriber is enabled. */
  selectTourPlanningCenterMatchFromDemoResults?: () => void;
  /** Tour only: run Add Selected Subscriber to show Manual Entry filled; does not save. */
  applyTourDemoPlanningCenterAdd?: () => void;
  /** After the Add Subscriber highlight: clear name/email so the user does not submit demo data by mistake. */
  clearEmailSubscribersTourDemoForm?: () => void;
};
